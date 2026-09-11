import * as React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  Globe,
  ShieldCheck,
  Swords,
  Trophy,
  UserMinus,
  Users,
  Briefcase,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { loadTransferRules } from '@/lib/ranking-rules';
import { computeTeamRankings } from '@/lib/krafton-rankings';

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

interface RosterEntry {
  ign: string;
  role?: string;
  captain?: boolean;
}

function parseRoster(json: unknown): RosterEntry[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((entry) =>
      typeof entry === 'string' ? { ign: entry } : (entry as { ign?: string; role?: string; captain?: boolean })
    )
    .filter((e): e is RosterEntry => Boolean(e && e.ign));
}

const teamSocialIcons: Record<string, typeof Globe> = {
  instagram: Globe,
  youtube: Globe,
  twitter: Globe,
  x: Globe,
  discord: Globe,
  website: Globe,
};

function socialLinkHref(key: string, value: string) {
  const clean = value.trim();
  if (/^(javascript|data|vbscript):/i.test(clean)) return '#';
  if (/^https?:\/\//i.test(clean)) return clean;
  const handle = clean.replace(/^@/, '');
  if (key === 'instagram') return `https://instagram.com/${handle}`;
  if (key === 'youtube') return `https://youtube.com/@${handle}`;
  if (key === 'twitter' || key === 'x') return `https://twitter.com/${handle}`;
  if (key === 'discord') return `https://discord.gg/${handle}`;
  return `https://${clean}`;
}

export async function generateMetadata({
  params,
}: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const team = await prisma.team.findFirst({
    where: {
      // Keep in sync with the page query below — a team reachable by
      // displayName/id must not render with "Team Not Found" metadata.
      OR: [
        { slug },
        { tag: { equals: slug, mode: 'insensitive' } },
        { name: { equals: slug, mode: 'insensitive' } },
        { displayName: { equals: slug, mode: 'insensitive' } },
        { id: slug },
      ],
    },
    select: { name: true, tag: true, logoUrl: true },
  });

  if (!team) return { title: 'Team Not Found — eSportsAmaze' };
  const label = `${team.name}${team.tag ? ` [${team.tag}]` : ''}`;
  return {
    title: `${label} — eSportsAmaze`,
    description: `${label} profile — roster, tournament history, KRAFTON ranking and match statistics.`,
    openGraph: { images: team.logoUrl ? [team.logoUrl] : undefined },
  };
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;

  // 1. Fetch team by slug (or legacy tag/name/id)
  const team = await prisma.team.findFirst({
    where: {
      OR: [
        { slug },
        { tag: { equals: slug, mode: 'insensitive' } },
        { name: { equals: slug, mode: 'insensitive' } },
        { displayName: { equals: slug, mode: 'insensitive' } },
        { id: slug },
      ],
    },
    include: {
      game: true,
      players: { orderBy: { ign: 'asc' } },
      tournamentRosters: { include: { tournament: true } },
      tournamentsWon: { select: { id: true, name: true, slug: true } },
      tournamentsRunnerUp: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!team) notFound();

  const [prevCandidate, nextCandidate] = await Promise.all([
    prisma.team.findFirst({
      where: { name: { lt: team.name } },
      orderBy: { name: 'desc' },
      select: { id: true, slug: true, tag: true, name: true },
    }),
    prisma.team.findFirst({
      where: { name: { gt: team.name } },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, tag: true, name: true },
    }),
  ]);

  const prevTeam =
    prevCandidate ||
    (await prisma.team.findFirst({
      where: { id: { not: team.id } },
      orderBy: { name: 'desc' },
      select: { id: true, slug: true, tag: true, name: true },
    }));

  const nextTeam =
    nextCandidate ||
    (await prisma.team.findFirst({
      where: { id: { not: team.id } },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, tag: true, name: true },
    }));

  // Transfer ledger → players who previously represented this team
  // (both as destination "teamId" and as the departed team "fromTeamId")
  const transfers = await prisma.transfer.findMany({
    where: { OR: [{ teamId: team.id }, { fromTeamId: team.id }] },
    orderBy: { date: 'desc' },
    include: { player: { select: { id: true, ign: true, slug: true, avatarUrl: true, role: true } } },
  });

  // KRAFTON standing for this org (points attributed to the active org name)
  const [teamRankingRows, transferRules] = await Promise.all([
    prisma.teamRanking.findMany({
      include: {
        team: { select: { name: true } },
        tournament: { select: { rankingIncluded: true } },
      },
    }),
    loadTransferRules(),
  ]);
  const krafton =
    computeTeamRankings(
      teamRankingRows
        .filter((r) => !r.tournamentId || r.tournament?.rankingIncluded !== false)
        .map((r) => ({
          tournament: 'Event',
          tier: r.tier,
          endDate: r.endDate.toISOString().slice(0, 10),
          team: r.team.name,
          rank: r.rank,
        })),
      new Date(),
      transferRules
    ).find((t) => t.name.toLowerCase() === team.name.toLowerCase()) ?? null;

  const validTournaments = team.tournamentRosters.filter((tt) => tt && tt.tournament);
  const sortedTournaments = [...validTournaments].sort(
    (a, b) => (b.tournament.startDate?.getTime() ?? 0) - (a.tournament.startDate?.getTime() ?? 0)
  );
  const socials = (team.socialLinks ?? {}) as Record<string, string>;
  const roster = team.players || [];
  const playingRoster = roster.filter((p) => p.isPlayer);
  const staffRoster = roster.filter((p) => p.staffRole);
  const titles = team.tournamentsWon?.length ?? 0;

  // Per-event line-ups recorded on each tournament roster entry
  const eventLineups = sortedTournaments
    .map((tt) => ({ tt, entries: parseRoster(tt.rosterJson) }))
    .filter(({ entries }) => entries.length > 0);

  // Former members: most recent transfer per player who is no longer on the roster
  const currentIds = new Set(roster.map((p) => p.id));
  const seenPlayers = new Set<string>();
  const pastPlayers = transfers.filter((t) => {
    if (currentIds.has(t.player.id) || seenPlayers.has(t.player.id)) return false;
    seenPlayers.add(t.player.id);
    return true;
  });

  const teamHref = (t: { slug: string | null; tag: string | null; id: string }) => `/teams/${t.slug || t.tag || t.id}`;

  const profileStats = [
    { label: 'Titles Won', value: titles || '—', icon: Trophy },
    { label: 'Roster Size', value: playingRoster.length, icon: Users },
    { label: 'Events', value: validTournaments.length, icon: CalendarDays },
    { label: 'Founded', value: team.founded ? new Date(team.founded).getFullYear() : '—', icon: ShieldCheck },
  ];

  // Link event-lineup IGNs to player profiles where we can match them
  const ignToSlug = new Map(roster.map((p) => [p.ign.trim().toLowerCase(), p.slug || null]));

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        {/* watermark + brand wash */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(10,95,196,.16),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(10,95,196,.05)_42%,rgba(10,95,196,.05)_43%,transparent_43%)] dark:bg-[radial-gradient(circle_at_80%_-10%,rgba(37,99,235,.24),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,.03)_42%,rgba(255,255,255,.03)_43%,transparent_43%)]" />
        <div className="pointer-events-none absolute -bottom-8 right-0 select-none text-[16vw] font-black uppercase leading-none tracking-tighter text-slate-900/[0.04] dark:text-white/[0.03]">
          {team.tag || team.name}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-5 sm:px-6 lg:px-8">
          {/* breadcrumb + pager */}
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
              <Link href="/" className="hover:text-[#0A5FC4]">Home</Link>
              <span>/</span>
              <span>{team.game?.name || 'Esports'}</span>
              <span>/</span>
              <span className="text-[#0A5FC4] dark:text-blue-300">Team profile</span>
            </div>
            <div className="flex gap-2">
              {prevTeam && (
                <Link
                  href={teamHref(prevTeam)}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                  aria-label={`Previous team: ${prevTeam.name}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              )}
              {nextTeam && (
                <Link
                  href={teamHref(nextTeam)}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                  aria-label={`Next team: ${nextTeam.name}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="grid items-center gap-10 pb-12 lg:grid-cols-[auto_1fr] lg:pb-16">
            {/* Logo card */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rotate-2 rounded-[2.8rem] bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20" />
                <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-[2.5rem] border-8 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-64 sm:w-64">
                  {team.logoUrl ? (
                    <Image src={team.logoUrl} alt={team.name} fill className="object-contain p-4" priority />
                  ) : (
                    <div className="text-5xl font-black text-[#0A5FC4]/40">{team.tag || team.name.slice(0, 2).toUpperCase()}</div>
                  )}
                  <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white dark:border-[#182338]">
                    <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>

            {/* Identity */}
            <div className="text-center lg:text-left">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {team.status || 'Active'}
                </span>
                <span className="rounded-full bg-[#0A5FC4]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                  {team.game?.name || 'Esports'}
                </span>
                {titles > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">
                    <Crown className="h-3.5 w-3.5" /> {titles}× Champion
                  </span>
                )}
                {krafton && (
                  <Link
                    href="/rankings"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] transition-colors hover:bg-[#0A5FC4]/20 dark:text-blue-300"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> #{krafton.rank} KRAFTON Ranking
                  </Link>
                )}
              </div>
              <h1 className="text-4xl font-black uppercase tracking-[-.05em] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
                {team.name}
              </h1>
              <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                {team.region || 'Global'} region
                {team.sponsors && (
                  <>
                    <span className="mx-2 text-slate-300">•</span> Sponsored by {team.sponsors}
                  </>
                )}
              </p>
              {Object.keys(socials).length > 0 && (
                <div className="mt-6 flex justify-center gap-2 lg:justify-start">
                  {Object.entries(socials).map(([key, value]) => {
                    const Icon = teamSocialIcons[key] || Globe;
                    return (
                      <a
                        key={key}
                        href={socialLinkHref(key, String(value))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                        aria-label={key}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Stat band */}
          <div className="grid grid-cols-2 divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10 md:grid-cols-4 md:divide-x">
            {profileStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 px-2 py-6">
                <Icon className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                <span className="text-3xl font-black tracking-tight">{value}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BODY ============ */}
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
          <div className="space-y-8">
            {/* Roster */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                    Line-up
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">Active roster</h2>
                </div>
                <Users className="h-6 w-6 text-slate-300 dark:text-slate-700" />
              </div>

              {playingRoster.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {playingRoster.map((player) => (
                    <Link
                      key={player.id}
                      href={`/players/${player.slug || player.ign.toLowerCase()}`}
                      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-black/40">
                        {player.avatarUrl ? (
                          <Image src={player.avatarUrl} alt={player.ign} fill className="object-cover" />
                        ) : (
                          <span className="font-black text-slate-400">{player.ign.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-lg font-black uppercase tracking-tight transition-colors group-hover:text-[#0A5FC4]">
                          {player.ign}
                        </h4>
                        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                          {player.role || 'Player'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0A5FC4]" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">
                  No active roster found for this team.
                </div>
              )}

              {staffRoster.length > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
                  <p className="ed-label mb-3 text-[10px] font-black uppercase tracking-[.2em] text-slate-400">
                    Support staff
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {staffRoster.map((member) => (
                      <Link
                        key={member.id}
                        href={`/players/${member.slug || member.ign.toLowerCase()}`}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                      >
                        <Briefcase className="h-4 w-4 shrink-0 text-[#0A5FC4] dark:text-blue-300" />
                        <span className="truncate text-sm font-extrabold transition-colors group-hover:text-[#0A5FC4]">
                          {member.ign}
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {member.staffRole || member.role || 'Staff'}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Event line-ups — squad recorded for each specific event */}
            {eventLineups.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                      Event by event
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Event line-ups</h2>
                  </div>
                  <Swords className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                </div>
                <p className="mb-6 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  Rosters are tracked per event, so a player&rsquo;s line-up here reflects only the
                  events they played for {team.name}.
                </p>
                <div className="space-y-5">
                  {eventLineups.map(({ tt, entries }) => (
                    <div
                      key={tt.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <Link
                          href={`/tournaments/${tt.tournament.slug}`}
                          className="truncate text-sm font-extrabold transition-colors hover:text-[#0A5FC4]"
                        >
                          {tt.tournament.name}
                        </Link>
                        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {tt.tournament.startDate ? new Date(tt.tournament.startDate).getFullYear() : 'TBD'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entries.map((entry, i) => {
                          const slug = ignToSlug.get(entry.ign.trim().toLowerCase());
                          const chip = (
                            <>
                              <span className="font-extrabold">{entry.ign}</span>
                              {entry.role && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {entry.role}
                                </span>
                              )}
                              {entry.captain && (
                                <span className="rounded bg-amber-400/20 px-1 py-px text-[9px] font-black uppercase text-amber-600 dark:text-amber-300">
                                  C
                                </span>
                              )}
                            </>
                          );
                          return slug ? (
                            <Link
                              key={`${entry.ign}-${i}`}
                              href={`/players/${slug}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                            >
                              {chip}
                            </Link>
                          ) : (
                            <span
                              key={`${entry.ign}-${i}`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/5"
                            >
                              {chip}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Former members from the transfer ledger */}
            {pastPlayers.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                      Transfer history
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Past players</h2>
                  </div>
                  <UserMinus className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                </div>
                <div className="grid gap-2">
                  {pastPlayers.map((transfer) => (
                    <Link
                      key={`${transfer.player.id}-${transfer.id}`}
                      href={`/players/${transfer.player.slug || transfer.player.ign.toLowerCase()}`}
                      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-black/40">
                        {transfer.player.avatarUrl ? (
                          <Image src={transfer.player.avatarUrl} alt={transfer.player.ign} fill className="object-cover" />
                        ) : (
                          <span className="text-sm font-black text-slate-400">
                            {transfer.player.ign.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-extrabold transition-colors group-hover:text-[#0A5FC4]">
                          {transfer.player.ign}
                        </h4>
                        {transfer.player.role && (
                          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                            {transfer.player.role}
                          </p>
                        )}
                      </div>
                      <span
                        className={
                          'shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ' +
                          (transfer.type === 'LEFT'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : transfer.type === 'LOANED'
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')
                        }
                      >
                        {transfer.type}
                      </span>
                      <span className="hidden shrink-0 text-xs font-bold text-slate-400 sm:block">
                        {new Date(transfer.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Trophy cabinet */}
            {(team.tournamentsWon?.length || team.tournamentsRunnerUp?.length) ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                      Silverware
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Trophy cabinet</h2>
                  </div>
                  <Trophy className="h-6 w-6 text-amber-400" />
                </div>
                <div className="space-y-3">
                  {team.tournamentsWon?.map((t) => (
                    <Link
                      key={`won-${t.id}`}
                      href={`/tournaments/${t.slug}`}
                      className="flex items-center gap-4 rounded-2xl border border-amber-300/50 bg-amber-400/10 p-4 transition hover:border-amber-400"
                    >
                      <div className="rounded-xl bg-amber-400 p-2 text-white"><Trophy className="h-4 w-4" /></div>
                      <span className="flex-1 text-sm font-extrabold">{t.name}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">Champion</span>
                    </Link>
                  ))}
                  {team.tournamentsRunnerUp?.map((t) => (
                    <Link
                      key={`ru-${t.id}`}
                      href={`/tournaments/${t.slug}`}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="rounded-xl bg-slate-400 p-2 text-white"><Crown className="h-4 w-4" /></div>
                      <span className="flex-1 text-sm font-extrabold">{t.name}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Runner-up</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* Recent events timeline */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-6 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
                <h2 className="text-lg font-black">Recent events</h2>
              </div>

              {sortedTournaments.length > 0 ? (
                <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5 dark:border-white/10">
                  {sortedTournaments.map((tt) => (
                    <li key={tt.id} className="relative">
                      <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#0A5FC4] dark:border-[#0b1220]" />
                      <Link href={`/tournaments/${tt.tournament.slug}`} className="group block">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="line-clamp-2 text-sm font-extrabold transition-colors group-hover:text-[#0A5FC4]">
                            {tt.tournament.name}
                          </h4>
                          {tt.finalRank && (
                            <span className="shrink-0 rounded-md bg-[#0A5FC4]/10 px-2 py-0.5 text-xs font-black text-[#0A5FC4] dark:text-blue-300">
                              #{tt.finalRank}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <CalendarDays className="h-3 w-3" />
                          {tt.tournament.startDate ? new Date(tt.tournament.startDate).getFullYear() : 'TBD'}
                          <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                        </p>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-white/10">
                  No tournament history available.
                </div>
              )}
            </section>

            {/* Team details */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="mb-6 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
                <h2 className="text-lg font-black">Team details</h2>
              </div>
              <dl className="space-y-4 text-sm">
                {[
                  ['Region', team.region || 'Global'],
                  ['Founded', team.founded ? new Date(team.founded).getFullYear().toString() : 'Unknown'],
                  ['Status', team.status || 'Active'],
                  ['Game', team.game?.name || 'Not listed'],
                  ['Roster', `${roster.length} players`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-white/10"
                  >
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="text-right font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* KRAFTON ranking */}
            <section className="overflow-hidden rounded-3xl bg-[#0A5FC4] p-6 text-white shadow-xl shadow-blue-900/15">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">KRAFTON ranking</p>
                  <p className="mt-3 text-5xl font-black tracking-tight">{krafton ? `#${krafton.rank}` : '—'}</p>
                </div>
                <BarChart3 className="h-6 w-6 text-amber-300" />
              </div>
              <p className="mt-5 text-sm leading-6 text-blue-100">
                {krafton
                  ? `${krafton.points.toFixed(1)} decay-adjusted points across ${krafton.events} ranking event${krafton.events === 1 ? '' : 's'}.`
                  : 'No decayed ranking points yet — results in ranking-eligible events will add up here.'}
              </p>
              <Link
                href="/rankings"
                className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white hover:text-amber-200"
              >
                View full rankings <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            {/* Verified card */}
            <section className="overflow-hidden rounded-3xl bg-[#0A5FC4] p-6 text-white shadow-xl shadow-blue-900/15">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">Verification</p>
                  <p className="mt-3 text-2xl font-black tracking-tight">Verified team profile</p>
                </div>
                <ShieldCheck className="h-6 w-6 text-amber-300" />
              </div>
              <p className="mt-5 text-sm leading-6 text-blue-100">
                Roster, results, and identity data for {team.name} are maintained by eSportsAmaze.
              </p>
            </section>
          </aside>
        </div>
      </section>

    </div>
  );
}
