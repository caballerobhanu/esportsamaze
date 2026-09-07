import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { loadTransferRules } from '@/lib/ranking-rules';
import { computeTeamRankings, computePlayerRankings } from '@/lib/krafton-rankings';
import { ArrowRight, BarChart3, Clock3, ShieldCheck, Swords, Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'KRAFTON Rankings | eSportsAmaze — Official Team & Player Power Rankings',
  description:
    'Official KRAFTON power rankings for BGMI and PUBG Mobile teams and players — decay-adjusted rolling points across Publisher and Tier events, with roster-acquisition transfers.',
};

interface RankingTeamMeta {
  logoUrl: string | null;
  imageDarkUrl: string | null;
  slug: string | null;
}

const MEDAL_STYLES = [
  { ring: 'border-amber-400/60 bg-amber-400/10', badge: 'bg-amber-400 text-white', label: 'text-amber-600 dark:text-amber-300' },
  { ring: 'border-slate-300 dark:border-slate-500 bg-slate-400/10', badge: 'bg-slate-400 text-white', label: 'text-slate-500 dark:text-slate-300' },
  { ring: 'border-orange-400/50 bg-orange-400/10', badge: 'bg-orange-400 text-white', label: 'text-orange-600 dark:text-orange-300' },
];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === 'players' ? 'players' : 'teams';

  const [teamRows, playerRows, rules] = await Promise.all([
    prisma.teamRanking.findMany({
      orderBy: { endDate: 'desc' },
      include: {
        team: { select: { name: true, logoUrl: true, imageDarkUrl: true, slug: true } },
        tournament: { select: { name: true, rankingIncluded: true } },
      },
    }),
    prisma.playerRanking.findMany({
      orderBy: { endDate: 'desc' },
      include: {
        player: { select: { ign: true, slug: true } },
        team: { select: { name: true, slug: true } },
        tournament: { select: { name: true, rankingIncluded: true } },
      },
    }),
    loadTransferRules(),
  ]);

  // Events excluded from KRAFTON rankings never contribute; unlinked rows are manual entries → included
  const eligibleTeamRows = teamRows.filter((r) => !r.tournamentId || r.tournament?.rankingIncluded !== false);
  const eligiblePlayerRows = playerRows.filter((r) => !r.tournamentId || r.tournament?.rankingIncluded !== false);

  const teamLogos = new Map<string, RankingTeamMeta>();
  for (const r of teamRows) {
    teamLogos.set(r.team.name.toLowerCase(), {
      logoUrl: r.team.logoUrl,
      imageDarkUrl: r.team.imageDarkUrl,
      slug: r.team.slug,
    });
  }

  const teams = computeTeamRankings(
    eligibleTeamRows.map((r) => ({
      tournament: r.tournament?.name ?? '—',
      tier: r.tier,
      endDate: r.endDate.toISOString().slice(0, 10),
      team: r.team.name,
      rank: r.rank,
    })),
    new Date(),
    rules
  ).slice(0, 100);

  const players = computePlayerRankings(
    eligiblePlayerRows.map((r) => ({
      tournament: r.tournament?.name ?? '—',
      tier: r.tier,
      endDate: r.endDate.toISOString().slice(0, 10),
      player: r.player.ign,
      team: r.team?.name ?? '',
      finishes: r.finishes,
      mvpTourney: r.mvpTourney > 0,
      mvpFinals: r.mvpFinals > 0,
      igl: r.igl > 0,
      survivor: r.survivor > 0,
      emerging: r.emerging > 0,
    })),
    new Date(),
    rules
  ).slice(0, 100);

  const podium = tab === 'teams' ? teams.slice(0, 3) : players.slice(0, 3);
  const tableRows = tab === 'teams' ? teams : players;
  // Year columns follow whatever events actually exist in the DB
  const yearKeys =
    teamRows.length + playerRows.length > 0
      ? Array.from(
          new Set(
            [...teamRows, ...playerRows].map((r) => String(r.endDate.getUTCFullYear()))
          )
        ).sort()
      : [String(new Date().getUTCFullYear())];

  const teamLogoFor = (name: string) => teamLogos.get(name.toLowerCase());

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Masthead ── */}
        <div className="mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Official KRAFTON Power Rankings</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Power Rankings
          </h1>
          <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            Rolling points earned across Publisher and Tier events, decayed by recency so recent form
            weighs heaviest. Roster acquisitions carry points to the new organisation up to the cutoff date.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/60 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              <Clock3 className="h-3 w-3 text-[#0A5FC4] dark:text-blue-300" /> Decay-adjusted
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/60 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              <Swords className="h-3 w-3 text-[#0A5FC4] dark:text-blue-300" /> Publisher events ×2 for players
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/60 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              <ShieldCheck className="h-3 w-3 text-[#0A5FC4] dark:text-blue-300" /> Transfer-aware
            </span>
          </div>
        </div>

        {/* ── Capsule Tab Dock ── */}
        <div className="mb-10 flex items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10 w-fit">
          <Link
            href="/rankings?tab=teams"
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'teams'
                ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" /> Teams ({teams.length})
          </Link>
          <Link
            href="/rankings?tab=players"
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'players'
                ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Swords className="h-4 w-4" /> Players ({players.length})
          </Link>
        </div>

        {/* ── Podium ── */}
        {podium.length > 0 && (
          <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3 items-end">
            {podium.map((entry, i) => {
              const isTeam = tab === 'teams';
              const name = isTeam ? (entry as (typeof teams)[number]).name : (entry as (typeof players)[number]).name;
              const teamName = isTeam ? name : (entry as (typeof players)[number]).team;
              const meta = teamLogoFor(teamName);
              const first = i === 0;

              return (
                <div
                  key={name}
                  className={`rounded-3xl border border-slate-200 bg-white p-6 text-center sm:p-8 shadow-sm dark:border-white/10 dark:bg-[#0b1220] relative flex flex-col items-center gap-3 transition-all ${
                    first
                      ? 'sm:-translate-y-4 ring-2 ring-amber-400/50 shadow-xl bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-[#0b1220] dark:to-[#0b1220]'
                      : i === 1
                        ? 'bg-gradient-to-b from-slate-50/50 via-white to-white dark:from-slate-900/20 dark:via-[#0b1220] dark:to-[#0b1220]'
                        : 'bg-gradient-to-b from-orange-50/50 via-white to-white dark:from-orange-950/20 dark:via-[#0b1220] dark:to-[#0b1220]'
                  }`}
                >
                  <span
                    className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-xs ${
                      first
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 ring-2 ring-white dark:ring-[#0b1220]'
                        : i === 1
                          ? 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-100 ring-2 ring-white dark:ring-[#0b1220]'
                          : 'bg-amber-700 text-white ring-2 ring-white dark:ring-[#0b1220]'
                    }`}
                  >
                    {first ? '👑 Champion' : i === 1 ? 'Runner-up' : '3rd Place'}
                  </span>

                  <div className="mt-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#141e33] shadow-xs">
                    {meta?.logoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={meta.logoUrl} alt="" className="h-full w-full object-contain p-1 dark:hidden" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={meta.imageDarkUrl || meta.logoUrl}
                          alt=""
                          aria-hidden="true"
                          className="hidden h-full w-full object-contain p-1 dark:block"
                        />
                      </>
                    ) : (
                      <span className="text-2xl font-black text-[#0A5FC4] dark:text-blue-300">
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      {isTeam && meta?.slug ? (
                        <Link href={`/teams/${meta.slug}`} className="transition-colors hover:text-[#0A5FC4] dark:hover:text-blue-400">{name}</Link>
                      ) : (
                        name
                      )}
                    </p>
                    {!isTeam && (
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                        {(entry as (typeof players)[number]).team || 'Free Agent'}
                      </p>
                    )}
                  </div>

                  <p className="text-3xl font-black tracking-tight text-[#0A5FC4] dark:text-blue-300">
                    <span>{entry.points.toFixed(1)}</span>
                    <span className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">pts</span>
                  </p>

                  <p className="text-xs font-bold text-slate-400">
                    {entry.events} events
                    {!isTeam && ` · ${(entry as (typeof players)[number]).totalFinishes} finishes`}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Full table ── */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220] mb-12">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              {tab === 'teams' ? 'Team standings' : 'Player standings'} · Top {tableRows.length}
            </h2>
            <span className="text-[11px] font-bold text-slate-400">Decay-adjusted · as of today</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50/30 border-b border-slate-100 dark:bg-white/[0.01] dark:border-white/5">
                <tr>
                  <th className="py-3 px-3.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-14">#</th>
                  <th className="py-3 px-3.5 text-[11px] font-black uppercase tracking-wider text-slate-400">{tab === 'teams' ? 'Team' : 'Player'}</th>
                  {tab === 'teams' ? (
                    <>
                      <th className="py-3 px-3.5 hidden text-center text-[11px] font-black uppercase tracking-wider text-slate-400 sm:table-cell">Events</th>
                      {yearKeys.map((y) => (
                        <th key={y} className="py-3 px-3.5 hidden text-center text-[11px] font-black uppercase tracking-wider text-slate-400 lg:table-cell">{y} Pts</th>
                      ))}
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-3.5 hidden text-center text-[11px] font-black uppercase tracking-wider text-slate-400 sm:table-cell">Tournaments</th>
                      <th className="py-3 px-3.5 hidden text-center text-[11px] font-black uppercase tracking-wider text-slate-400 sm:table-cell">Finishes</th>
                    </>
                  )}
                  <th className="py-3 px-3.5 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {tableRows.map((entry, i) => {
                  const rank = i + 1;

                  if (tab === 'teams') {
                    const t = entry as (typeof teams)[number];
                    const meta = teamLogos.get(t.name.toLowerCase());
                    return (
                      <tr key={t.name} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-3.5 py-3 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-xs">1</span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold text-xs">2</span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-600/20 text-amber-700 dark:text-amber-400 font-bold text-xs">3</span>
                          ) : (
                            <span className="font-bold text-slate-400 text-xs">{rank}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-1 dark:border-white/10 dark:bg-[#141e33]">
                              {meta?.logoUrl ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={meta.logoUrl} alt="" className="h-full w-full object-contain dark:hidden" />
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={meta.imageDarkUrl || meta.logoUrl} alt="" aria-hidden="true" className="hidden h-full w-full object-contain dark:block" />
                                </>
                              ) : (
                                <span className="text-xs font-black text-[#0A5FC4]">{t.name.slice(0, 2).toUpperCase()}</span>
                              )}
                            </span>
                            {meta?.slug ? (
                              <Link href={`/teams/${meta.slug}`} className="font-bold text-slate-900 hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors">
                                {t.name}
                              </Link>
                            ) : (
                              <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                            )}
                          </span>
                        </td>
                        <td className="hidden px-3.5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 sm:table-cell">{t.events}</td>
                        {yearKeys.map((y) => (
                          <td key={y} className="hidden px-3.5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 lg:table-cell">
                            {t.yearPoints[y] ?? 0}
                          </td>
                        ))}
                        <td className="px-3.5 py-3 text-right font-black text-[#0A5FC4] dark:text-blue-300">{t.points.toFixed(1)}</td>
                      </tr>
                    );
                  }

                  const p = entry as (typeof players)[number];
                  const meta = teamLogos.get(p.team.toLowerCase());
                  return (
                    <tr key={p.name} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-3.5 py-3 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-xs">1</span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold text-xs">2</span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-600/20 text-amber-700 dark:text-amber-400 font-bold text-xs">3</span>
                        ) : (
                          <span className="font-bold text-slate-400 text-xs">{rank}</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-1 dark:border-white/10 dark:bg-[#141e33]">
                            {meta?.logoUrl ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={meta.logoUrl} alt="" className="h-full w-full object-contain dark:hidden" />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={meta.imageDarkUrl || meta.logoUrl} alt="" aria-hidden="true" className="hidden h-full w-full object-contain dark:block" />
                              </>
                            ) : (
                              <span className="text-xs font-black text-[#0A5FC4]">{p.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </span>
                          <span className="min-w-0">
                            {p.slug ? (
                              <Link href={`/players/${p.slug}`} className="block truncate font-bold text-slate-900 hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors">
                                {p.name}
                              </Link>
                            ) : (
                              <span className="block truncate font-bold text-slate-900 dark:text-white">{p.name}</span>
                            )}
                            {p.team && meta?.slug ? (
                              <Link href={`/teams/${meta.slug}`} className="block truncate text-[11px] font-bold text-slate-400 hover:text-[#0A5FC4] transition-colors">
                                {p.team}
                              </Link>
                            ) : (
                              <span className="block truncate text-[11px] font-bold text-slate-400">{p.team || 'Free Agent'}</span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="hidden px-3.5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 sm:table-cell">{p.events}</td>
                      <td className="hidden px-3.5 py-3 text-center font-bold text-slate-500 dark:text-slate-400 sm:table-cell">{p.totalFinishes}</td>
                      <td className="px-3.5 py-3 text-right font-black text-[#0A5FC4] dark:text-blue-300">{p.points.toFixed(1)}</td>
                    </tr>
                  );
                })}
                {tableRows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No ranking data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Methodology ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              <Trophy className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" /> Team base points
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-2 text-left">Finish</th>
                  <th className="py-2 text-center">Publisher</th>
                  <th className="py-2 text-center">Tier 1</th>
                  <th className="py-2 text-center">Tier 2</th>
                  <th className="py-2 text-center">Tier 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-bold text-slate-700 dark:text-slate-300">
                {[
                  ['1st', 1000, 800, 600, 400],
                  ['2nd', 800, 700, 500, 350],
                  ['3rd', 700, 600, 400, 300],
                  ['4th', 600, 500, 300, 250],
                  ['5th', 500, 400, 250, 200],
                  ['6–10th', 400, 300, 200, 150],
                  ['11–20th', 300, 200, 150, 100],
                  ['21–30th', 200, 100, 75, 50],
                  ['31–48th', 100, 50, 35, 25],
                ].map((row) => (
                  <tr key={row[0] as string}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={ci === 0 ? 'py-2 text-slate-400 font-bold' : 'py-2 text-center font-black'}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              <Clock3 className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" /> Decay by event age
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-2 text-left">Age</th>
                  <th className="py-2 text-center">Team</th>
                  <th className="py-2 text-center">Player</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-bold text-slate-700 dark:text-slate-300">
                {[
                  ['≤ 6 months', '100%', '100%'],
                  ['≤ 8 months', '75%', '75%'],
                  ['≤ 10 months', '50%', '50%'],
                  ['≤ 12 months', '50%', '25%'],
                  ['≤ 3 years', '10%', '10%'],
                  ['older', '0', '0'],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={ci === 0 ? 'py-2 text-slate-400 font-bold' : 'py-2 text-center font-black'}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Player scoring</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              Eliminations × tier multiplier (Publisher ×2, Tier 1 ×1.5) plus flat bonuses:
              MVP +20 · Finals MVP +10 · IGL +10 · Survivor +10 · Emerging +5.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" /> Roster acquisitions
            </p>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              When an organisation&rsquo;s roster is acquired, points earned up to the announced cutoff date
              transfer to the acquiring org; anything after stays with the original name. Chains resolve
              recursively, so double acquisitions attribute correctly.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              Events excluded by the editorial team never contribute points. Standings recompute
              automatically as events age through the decay brackets.
            </p>
            <Link href="/#krafton-rankings" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#0A5FC4] hover:underline dark:text-blue-400">
              <span>Homepage widget</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
