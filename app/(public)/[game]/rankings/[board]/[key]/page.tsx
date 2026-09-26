import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Calendar, Clock, Trophy } from 'lucide-react';
import {
  fetchBoardEntries,
  fetchEntityEntries,
  fetchProfileSlug,
  fetchTeamTransfers,
  fetchFutureKraftonEvents,
} from '@/lib/krafton-data';
import {
  computeBoard,
  computeEntityFutureProjections,
  computeEntityRankMilestones,
  computeEntityRankTrend,
  computeNextDecay,
  computeUnifiedNextUpdate,
} from '@/lib/krafton-standings';
import prisma from '@/lib/prisma';
import { RankTrendChart } from '@/components/rankings/rank-trend-chart';
import { TournamentName } from '@/components/ui/tournament-name';
import type { KraftonBoard } from '@prisma/client';
import { absoluteUrl, breadcrumbJsonLd, canonical, SITE_NAME } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import { DEFAULT_GAME_SLUG, gameHref, RANKINGS_GAME_SLUG } from '@/lib/games';
import { AdSlot } from '@/components/ads/ad-slot';
import { AD_PLACEMENTS } from '@/lib/ads';

export const dynamic = 'force-dynamic';

type Params = Promise<{ game: string; board: string; key: string }>;

const isPlayerBoard = (board: string) => board === 'player';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { game, board: boardParam, key } = await params;
  // Rankings exist only for the game that owns the board.
  if (game !== RANKINGS_GAME_SLUG) notFound();
  const board: KraftonBoard = isPlayerBoard(boardParam) ? 'PLAYER' : 'TEAM';
  const isPlayers = isPlayerBoard(boardParam);
  const boardSegment = isPlayers ? 'player' : 'team';
  const boardLabel = isPlayers ? 'player' : 'team';

  /*
   * An entity's id and its slug both resolve to this same breakdown, and the
   * site links both forms — the homepage uses ids, the rankings board uses
   * slugs. Canonicalising to the slug form is what stops one entity existing at
   * two indexed URLs. Snapshot query params never reach the canonical either.
   */
  const build = (entityName: string, canonicalKey: string): Metadata => {
    const path = `/rankings/${boardSegment}/${canonicalKey}`;
    const title = `${entityName} KRAFTON Ranking Points | ${SITE_NAME}`;
    const description = `KRAFTON ranking points breakdown for ${entityName} — ${boardLabel} points earned at each event, placement and elimination bonuses, award bonuses, decay schedule and rank trend.`;
    return {
      title,
      description,
      openGraph: { title, description, type: 'profile', url: absoluteUrl(path) },
      ...canonical(path),
    };
  };

  try {
    const entries = await fetchEntityEntries(board, decodeURIComponent(key));
    const entityName = entries[0]?.entityName || decodeURIComponent(key).replace(/-/g, ' ');
    // Mirror fetchProfileSlug(): a team falls back to its tag when slug is null.
    const slug = await fetchProfileSlug(board, entries[0]?.entityId ?? null);
    return build(entityName, slug || key);
  } catch {
    return build(decodeURIComponent(key).replace(/-/g, ' '), key);
  }
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function toSlug(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default async function RankingDetailPage({ params }: { params: Params }) {
  const { game, board: boardParam, key } = await params;
  if (game !== RANKINGS_GAME_SLUG) notFound();
  if (boardParam !== 'team' && boardParam !== 'player') notFound();
  const board: KraftonBoard = isPlayerBoard(boardParam) ? 'PLAYER' : 'TEAM';
  const isPlayers = isPlayerBoard(boardParam);

  const entries = await fetchEntityEntries(board, decodeURIComponent(key));
  if (entries.length === 0) notFound();

  // Full board to resolve active rank & total points, plus future events
  const [allEntries, allTransfers, futureEvents] = await Promise.all([
    fetchBoardEntries(board),
    fetchTeamTransfers(),
    fetchFutureKraftonEvents(),
  ]);

  const fullBoard = computeBoard(allEntries, allTransfers);
  const myKey = entries[0].entityId || entries[0].entityName.toLowerCase();
  const me = fullBoard.find((b) => b.key === myKey) ?? null;
  const rank = Math.max(1, fullBoard.findIndex((b) => b.key === myKey) + 1);

  const entityName = entries[0].entityName;
  const latestTeam =
    [...entries].sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime()).find((e) => e.teamName)?.teamName ??
    null;
  const totalPoints = me?.totalPoints ?? 0;
  const profileSlug = await fetchProfileSlug(board, entries[0].entityId);
  const profileHref = profileSlug
    ? gameHref(DEFAULT_GAME_SLUG, isPlayers ? `players/${profileSlug}` : `teams/${profileSlug}`)
    : null;

  // Per-event contributions (from the entity's board entry)
  const contributions = me?.contributions ?? [];

  // Next upcoming decay milestone
  const nextDecay = computeNextDecay(contributions);

  // Unified next update (earlier of next decay or future event end date)
  const nextUpdate = computeUnifiedNextUpdate(nextDecay, futureEvents);

  // Future projections timeline
  const futureProjections = computeEntityFutureProjections(myKey, board, allEntries, allTransfers);

  // Rank trend data for chart (both additions and decay dates)
  const trend = computeEntityRankTrend(myKey, board, allEntries, allTransfers);

  // Historical milestones: peak rank reached, days at peak, days in top 5
  const rankMilestones = computeEntityRankMilestones(myKey, board, allEntries, allTransfers);

  const totalFinishes = contributions.reduce((s, c) => s + (c.finishes || 0), 0);
  const totalAwards = contributions.reduce(
    (s, c) =>
      s +
      (c.awards?.mvp || 0) +
      (c.awards?.finalsMvp || 0) +
      (c.awards?.igl || 0) +
      (c.awards?.survivor || 0) +
      (c.awards?.emerging || 0),
    0
  );
  const nonTransferContributions = contributions.filter((c) => !c.transferredFrom);
  const bestFinish =
    nonTransferContributions.length > 0
      ? Math.min(...nonTransferContributions.map((c) => c.rank || 999))
      : 999;
  const basePointsTotal = contributions.reduce((s, c) => s + (c.basePoints || 0), 0);

  // The Team Name column prints each team's short code rather than the full name.
  // The entry rows carry a team name (and often no id), so resolve every referenced
  // team by id and by name in one query, falling back to the full name when a team
  // has no tag. The names come only from data already on the page.
  const tableContributions = [...contributions, ...(me?.transferredOutContributions ?? [])];

  // The board is pinned to one game, but a contribution's event may belong to a
  // sibling game in the same family — so each event link carries its own game.
  const contributionKeys = [
    ...new Set(
      tableContributions
        .map((c) => c.tournamentSlug || c.tournamentId)
        .filter((key): key is string => Boolean(key)),
    ),
  ];
  const contributionTournaments = contributionKeys.length
    ? await prisma.tournament.findMany({
        where: { OR: [{ slug: { in: contributionKeys } }, { id: { in: contributionKeys } }] },
        select: { id: true, slug: true, game: { select: { slug: true } } },
      })
    : [];
  const gameByTournamentKey = new Map<string, string>();
  for (const t of contributionTournaments) {
    if (!t.game?.slug) continue;
    gameByTournamentKey.set(t.slug, t.game.slug);
    gameByTournamentKey.set(t.id, t.game.slug);
  }
  const tournamentHrefForKey = (tournamentKey: string) =>
    gameHref(gameByTournamentKey.get(tournamentKey) || game, `tournaments/${encodeURIComponent(tournamentKey)}`);
  const referencedTeamIds = new Set(
    tableContributions
      .flatMap((c) => [c.teamId, c.transferredFromTeamId])
      .filter((id): id is string => Boolean(id)),
  );
  if (!isPlayers && entries[0].entityId) referencedTeamIds.add(entries[0].entityId);

  const referencedTeamNames = new Set(
    tableContributions
      .flatMap((c) => [c.teamName, c.transferredFrom])
      .filter((name): name is string => Boolean(name))
      .map((name) => name.trim().toLowerCase()),
  );

  const teams =
    referencedTeamIds.size || referencedTeamNames.size
      ? await prisma.team.findMany({
          where: {
            OR: [
              ...(referencedTeamIds.size ? [{ id: { in: [...referencedTeamIds] } }] : []),
              ...[...referencedTeamNames].map((name) => ({
                name: { equals: name, mode: 'insensitive' as const },
              })),
            ],
          },
          select: { id: true, name: true, tag: true },
        })
      : [];
  const teamTagById = new Map(teams.map((t) => [t.id, t.tag]));
  const teamTagByName = new Map(teams.map((t) => [t.name.trim().toLowerCase(), t.tag]));
  const shortTeamName = (id: string | null | undefined, name: string): string =>
    (id ? teamTagById.get(id) : null) ?? teamTagByName.get(name.trim().toLowerCase()) ?? name;

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'KRAFTON Rankings', path: isPlayers ? '/rankings?board=players' : '/rankings' },
    { name: entityName, path: `/rankings/${isPlayers ? 'player' : 'team'}/${key}` },
  ]);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <JsonLd data={breadcrumbs} />
      <main className="mx-auto w-full max-w-[var(--page-max-width)] px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
          <Link href={gameHref(DEFAULT_GAME_SLUG, 'rankings')} className="hover:text-[#0A5FC4]">
            KRAFTON Rankings
          </Link>
          <span>/</span>
          <Link
            href={isPlayers ? `${gameHref(DEFAULT_GAME_SLUG, 'rankings')}?board=players` : gameHref(DEFAULT_GAME_SLUG, 'rankings')}
            className="hover:text-[#0A5FC4]"
          >
            {isPlayers ? 'Player Rankings' : 'Team Rankings'}
          </Link>
          <span>/</span>
          <span className="text-[#0A5FC4] dark:text-blue-300">{entityName}</span>
        </div>

        {/* Top Hero Card — matches profile page #0A5FC4 design */}
        <section className="mb-6 overflow-hidden rounded-3xl bg-[#0A5FC4] p-5 text-white shadow-xl shadow-blue-900/15 sm:mb-8 sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[.15em] text-blue-100">
                <Trophy className="h-3 w-3 text-amber-300" />
                KRAFTON Ranking Breakdown
              </div>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
                {entityName}
              </h1>
              {isPlayers && latestTeam && (
                <p className="mt-2 text-xs font-bold text-blue-100">
                  Current / Latest Team: <span className="font-extrabold text-white">{latestTeam}</span>
                </p>
              )}
              {me?.transferredInFrom && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white">
                  <span>⇄ Points transferred in from</span>
                  <Link
                    href={gameHref(DEFAULT_GAME_SLUG, `rankings/team/${encodeURIComponent(toSlug(me.transferredInFrom))}`)}
                    className="inline-flex items-center gap-0.5 font-black underline hover:text-blue-200 transition-colors"
                  >
                    <span>{me.transferredInFrom}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </p>
              )}
              {me?.transferredOutTo && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-bold text-amber-200">
                  <span>⇄ Pre-cutoff points transferred to</span>
                  <Link
                    href={gameHref(DEFAULT_GAME_SLUG, `rankings/team/${encodeURIComponent(toSlug(me.transferredOutTo))}`)}
                    className="inline-flex items-center gap-0.5 font-black underline hover:text-white transition-colors"
                  >
                    <span>{me.transferredOutTo}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 self-start sm:self-auto">
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">Official Rank</p>
                <p className="mt-1 text-4xl font-black tracking-tight text-white sm:text-5xl">#{rank}</p>
              </div>
              <Trophy className="hidden h-10 w-10 text-amber-300 sm:block" />
            </div>
          </div>

          {/* Stat Cards Grid — matches profile page styling */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
              <p className="text-xl font-black sm:text-2xl">{fmt(totalPoints)}</p>
              <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                Current Points
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
              <p className="text-xl font-black text-amber-300 sm:text-2xl">
                {rankMilestones.highestRank !== null ? `#${rankMilestones.highestRank}` : '—'}
              </p>
              <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                Highest Rank
              </p>
              {rankMilestones.highestRank !== null && (
                <p className="mt-0.5 text-[10px] font-bold text-white/90">
                  {rankMilestones.daysAtHighest}{rankMilestones.isCurrentlyAtHighest ? '*' : ''} days
                </p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
              <p className="text-xl font-black sm:text-2xl">
                {rankMilestones.daysInTop5 > 0 ? `${rankMilestones.daysInTop5}${rankMilestones.isCurrentlyInTop5 ? '*' : ''}d` : '0d'}
              </p>
              <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                Days in Top 5
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-white/90">
                {rankMilestones.isCurrentlyInTop5 ? 'Currently Top 5' : 'Cumulative'}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
              <p className="text-xl font-black sm:text-2xl">{entries.length}</p>
              <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                Events
              </p>
            </div>
            {isPlayers ? (
              <>
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
                  <p className="text-xl font-black sm:text-2xl">{totalFinishes}</p>
                  <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                    GF Elims
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
                  <p className="text-xl font-black sm:text-2xl">{totalAwards}</p>
                  <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                    Award Bonuses
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
                  <p className="text-xl font-black sm:text-2xl">{bestFinish === 999 ? '—' : `#${bestFinish}`}</p>
                  <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                    Best Finish
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 p-3 text-center sm:p-4">
                  <p className="text-xl font-black sm:text-2xl">{fmt(basePointsTotal)}</p>
                  <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 sm:text-[10px]">
                    Base Points
                  </p>
                </div>
              </>
            )}
          </div>
          {(rankMilestones.isCurrentlyAtHighest || rankMilestones.isCurrentlyInTop5) && (
            <p className="mt-2.5 text-[11px] font-medium text-blue-100/90 flex items-center gap-1.5">
              <span className="font-black text-amber-300">*</span> Active ongoing streak as of today
            </p>
          )}

          {/* Dual CTAs on Hero Card */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {profileHref && (
              <Link
                href={profileHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0A5FC4] shadow-sm transition hover:bg-blue-50"
              >
                Visit {isPlayers ? 'player' : 'team'} profile <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link
              href={isPlayers ? `${gameHref(DEFAULT_GAME_SLUG, 'rankings')}?board=players` : gameHref(DEFAULT_GAME_SLUG, 'rankings')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/20 hover:text-amber-200"
            >
              Full Leaderboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* One unit under the hero: the entity's own standing above is the content. */}
        <AdSlot placement={AD_PLACEMENTS.pageTop} />

        {/* Section: Rank Trend Graph */}
        <div className="mb-10">
          <RankTrendChart trend={trend} entityName={entityName} />
        </div>

        {/* Section: Points Breakdown Table */}
        <section className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Audit log
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Points Breakdown
              </h2>
            </div>
            <Trophy className="h-6 w-6 text-slate-300 dark:text-slate-700" />
          </div>
          <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
            Events contributing to the current {fmt(totalPoints)} total points balance
            {me?.transferredOutPoints ? ` (plus ${fmt(me.transferredOutPoints)} points transferred to ${me.transferredOutTo})` : ''}.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <th className="pb-3">Tournament / Event</th>
                  <th className="pb-3 text-center">Team Name</th>
                  {isPlayers ? (
                    <>
                      <th className="pb-3 text-center">Elims (GF)</th>
                      <th className="pb-3 text-center">Awards</th>
                      <th className="pb-3 text-center">Points Earned</th>
                      <th className="pb-3 text-right">Current Value</th>
                    </>
                  ) : (
                    <>
                      <th className="pb-3 text-center">Rank</th>
                      <th className="pb-3 text-center">Points Earned</th>
                      <th className="pb-3 text-right">Current Value</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {(() => {
                  const hasAnyRebrand = !isPlayers
                    ? contributions.some((c) => {
                        const team = (c.teamName || c.transferredFrom || '').trim().toLowerCase();
                        return team && team !== entityName.trim().toLowerCase();
                      })
                    : true;

                  const activeRows = contributions.map((c) => {
                    const rawTeam = (c.teamName || c.transferredFrom || (!isPlayers ? entityName : '')).trim();
                    const normalizedTeam = rawTeam.toLowerCase();

                    // Always show team name — no deduplication
                    const displayTeam = rawTeam || '—';

                    // Short code for the cell; the full name stays on hover.
                    const rowTeamId = c.teamName
                      ? c.teamId ?? (!isPlayers ? entries[0].entityId : null)
                      : c.transferredFromTeamId;
                    const shortTeam = displayTeam !== '—' ? shortTeamName(rowTeamId, displayTeam) : displayTeam;

                    const isDifferentTeam = !isPlayers
                      ? normalizedTeam !== entityName.trim().toLowerCase()
                      : true;

                    let targetTeamKey: string | null = null;
                    if (isDifferentTeam && displayTeam !== '—') {
                      if (c.transferredFromTeamId) {
                        targetTeamKey = c.transferredFromTeamId;
                      } else if (c.teamId) {
                        targetTeamKey = c.teamId;
                      } else {
                        const match = fullBoard.find(
                          (b) =>
                            b.board === 'TEAM' &&
                            (b.entityName.trim().toLowerCase() === normalizedTeam ||
                              (c.transferredFrom &&
                                b.entityName.trim().toLowerCase() === c.transferredFrom.trim().toLowerCase()))
                        );
                        targetTeamKey = match ? match.key : rawTeam;
                      }
                    }

                    const targetSlug = displayTeam !== '—' ? toSlug(displayTeam) : (c.transferredFrom ? toSlug(c.transferredFrom) : (targetTeamKey ? toSlug(targetTeamKey) : null));
                    const targetHref = targetSlug ? gameHref(DEFAULT_GAME_SLUG, `rankings/team/${encodeURIComponent(targetSlug)}`) : null;

                    return (
                      <tr key={c.entryId} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.01]">
                        {/* 1. Tournament / Event */}
                        <td className="py-3 font-semibold text-slate-900 dark:text-white">
                          <div>
                            {c.tournamentSlug || c.tournamentId ? (
                              <Link
                                href={tournamentHrefForKey(c.tournamentSlug || c.tournamentId!)}
                                className="group/tourneylink inline-flex items-center gap-1 font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400"
                                title={`View tournament: ${c.eventName}`}
                              >
                                <TournamentName name={c.eventName} shortName={c.eventShortName} />
                                <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover/tourneylink:-translate-y-0.5 group-hover/tourneylink:translate-x-0.5 group-hover/tourneylink:opacity-100" />
                              </Link>
                            ) : (
                              <TournamentName name={c.eventName} shortName={c.eventShortName} />
                            )}
                            <span className="block text-[11px] font-normal text-slate-400">
                              {c.tier} · {fmtDate(c.endDate)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Team Name (shown only when changed, links to team detail if different) */}
                        <td className="py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {displayTeam !== '—' ? (
                            isDifferentTeam && targetHref ? (
                              <Link
                                href={targetHref}
                                className="group/teamlink inline-flex items-center gap-1 font-bold text-[#0A5FC4] transition-colors hover:underline dark:text-blue-400"
                                title={`View ${displayTeam} ranking breakdown`}
                              >
                                <span title={displayTeam}>{shortTeam}</span>
                                <ArrowUpRight className="h-3 w-3 opacity-60 transition-transform group-hover/teamlink:-translate-y-0.5 group-hover/teamlink:translate-x-0.5 group-hover/teamlink:opacity-100" />
                              </Link>
                            ) : (
                              <span className="font-bold text-slate-900 dark:text-white" title={displayTeam}>{shortTeam}</span>
                            )
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {isPlayers ? (
                          <>
                            {/* 3. Finishes */}
                            <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                              {c.finishes}
                            </td>

                            {/* 4. Awards */}
                            <td className="py-3 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {c.awards.mvp > 0 && (
                                  <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-600 dark:text-purple-400">
                                    MVP{c.awards.mvp > 1 ? ` ×${c.awards.mvp}` : ''}
                                  </span>
                                )}
                                {c.awards.finalsMvp > 0 && (
                                  <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-600 dark:text-purple-400">
                                    FMVP
                                  </span>
                                )}
                                {c.awards.igl > 0 && (
                                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-600 dark:text-blue-400">
                                    IGL
                                  </span>
                                )}
                                {c.awards.survivor > 0 && (
                                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                    Surv
                                  </span>
                                )}
                                {c.awards.emerging > 0 && (
                                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">
                                    Emerg
                                  </span>
                                )}
                                {!c.awards.mvp &&
                                  !c.awards.finalsMvp &&
                                  !c.awards.igl &&
                                  !c.awards.survivor &&
                                  !c.awards.emerging && (
                                    <span className="text-[10px] text-slate-400">—</span>
                                  )}
                              </div>
                            </td>

                            {/* 5. Points Earned */}
                            <td className="py-3 text-center font-mono font-semibold text-slate-500">
                              {fmt(c.basePoints)}
                            </td>

                            {/* 6. Current Value */}
                            <td className="py-3 text-right font-mono text-sm font-black text-[#0A5FC4] dark:text-blue-300">
                              {fmt(c.points)}
                            </td>
                          </>
                        ) : (
                          <>
                            {/* 3. Rank */}
                            <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                              #{c.rank}
                            </td>

                            {/* 4. Points Earned */}
                            <td className="py-3 text-center font-mono font-semibold text-slate-500">
                              {fmt(c.basePoints)}
                            </td>

                            {/* 5. Current Value */}
                            <td className="py-3 text-right font-mono text-sm font-black text-[#0A5FC4] dark:text-blue-300">
                              {fmt(c.points)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });

                  const transferredRows = me?.transferredOutContributions && me.transferredOutContributions.length > 0 ? (
                    <>
                      <tr className="border-t-2 border-dashed border-blue-200 bg-blue-50/70 dark:border-blue-800/40 dark:bg-blue-950/20">
                        <td colSpan={isPlayers ? 6 : 5} className="py-2.5 px-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                                ⇄ Points Transferred to{' '}
                              </span>
                              <Link
                                href={gameHref(DEFAULT_GAME_SLUG, `rankings/team/${encodeURIComponent(toSlug(me.transferredOutTo || ''))}`)}
                                className="group/transferredlink inline-flex items-center gap-0.5 font-black text-[#0A5FC4] underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-white transition-colors"
                              >
                                <span>{me.transferredOutTo}</span>
                                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/transferredlink:-translate-y-0.5 group-hover/transferredlink:translate-x-0.5" />
                              </Link>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#0A5FC4] dark:text-blue-300">
                              {fmt(me.transferredOutPoints || 0)} pts transferred
                            </span>
                          </div>
                        </td>
                      </tr>
                      {me.transferredOutContributions.map((c) => (
                        <tr key={`transferred-${c.entryId}`} className="opacity-80 transition-colors hover:bg-slate-50/60 hover:opacity-100 dark:hover:bg-white/[0.01]">
                          {/* 1. Tournament / Event */}
                          <td className="py-3 font-semibold text-slate-900 dark:text-white">
                            <div>
                              {c.tournamentSlug || c.tournamentId ? (
                                <Link
                                  href={tournamentHrefForKey(c.tournamentSlug || c.tournamentId!)}
                                  className="group/tourneylink inline-flex items-center gap-1 font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400"
                                  title={`View tournament: ${c.eventName}`}
                                >
                                  <TournamentName name={c.eventName} shortName={c.eventShortName} />
                                  <ArrowUpRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover/tourneylink:-translate-y-0.5 group-hover/tourneylink:translate-x-0.5 group-hover/tourneylink:opacity-100" />
                                </Link>
                              ) : (
                                <TournamentName name={c.eventName} shortName={c.eventShortName} />
                              )}
                              <span className="block text-[11px] font-normal text-slate-400">
                                {c.tier} · {fmtDate(c.endDate)}
                              </span>
                            </div>
                          </td>

                          {/* 2. Team Name */}
                          <td className="py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-slate-900 dark:text-white" title={c.teamName || entityName}>
                              {shortTeamName(c.teamId, c.teamName || entityName)}
                            </span>
                          </td>

                          {isPlayers ? (
                            <>
                              <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {c.finishes}
                              </td>
                              <td className="py-3 text-center text-[10px] text-slate-400">—</td>
                              <td className="py-3 text-center font-mono font-semibold text-slate-500">
                                {fmt(c.basePoints)}
                              </td>
                              <td className="py-3 text-right font-mono text-sm font-black text-[#0A5FC4] dark:text-blue-300">
                                {fmt(c.points)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                                #{c.rank}
                              </td>
                              <td className="py-3 text-center font-mono font-semibold text-slate-500">
                                {fmt(c.basePoints)}
                              </td>
                              <td className="py-3 text-right font-mono text-sm font-black text-[#0A5FC4] dark:text-blue-300">
                                {fmt(c.points)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </>
                  ) : null;

                  return (
                    <>
                      {activeRows}
                      {transferredRows}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section: Future Decay Projections (Next 3 drops) */}
        {futureProjections.length > 0 && (
          <section className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                  Decay schedule
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  Projected Points Decay Schedule
                </h2>
              </div>
              <Calendar className="h-6 w-6 text-slate-300 dark:text-slate-700" />
            </div>
            <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
              Next 3 future drop-off dates when older events step down in multiplier, assuming no new points are earned.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                    <th className="pb-3">Scheduled Date</th>
                    <th className="pb-3">Event Affecting</th>
                    <th className="pb-3 text-center">Decay Change</th>
                    <th className="pb-3 text-center">Point Loss</th>
                    <th className="pb-3 text-right">Projected Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs dark:divide-white/10">
                  {futureProjections.slice(0, 3).map((p, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-white/[0.01]">
                      <td className="py-3 font-bold font-sans text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-400" />
                          <span>{p.dateStr}</span>
                          <span className="ml-1 hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400 font-mono sm:inline">
                            in {p.daysRemaining}d
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-sans text-slate-700 dark:text-slate-300">
                        <TournamentName
                          name={p.eventName}
                          shortName={contributions.find((c) => c.eventName === p.eventName)?.eventShortName ?? null}
                        />
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-slate-500">
                          {Math.round(p.fromMultiplier * 100)}% →{' '}
                          <strong className="text-amber-600 dark:text-amber-400">
                            {Math.round(p.toMultiplier * 100)}%
                          </strong>
                        </span>
                      </td>
                      <td className="py-3 text-center font-bold text-rose-600 dark:text-rose-400">
                        -{fmt(p.pointLoss)}
                      </td>
                      <td className="py-3 text-right font-black text-[#0A5FC4] dark:text-blue-300 font-sans text-sm">
                        {fmt(p.projectedTotalPoints)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Closing unit: the points breakdown and projections above are the content. */}
        <AdSlot placement={AD_PLACEMENTS.pageEnd} />
      </main>
    </div>
  );
}
