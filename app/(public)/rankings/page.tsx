import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { loadTransferRules } from '@/lib/ranking-rules';
import { computeTeamRankings, computePlayerRankings } from '@/lib/krafton-rankings';
import { ArrowRight, BarChart3, Clock3, ShieldCheck, Swords, Trophy } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'KRAFTON Rankings | Esports Amaze — Official Team & Player Power Rankings',
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
    <div className="flex flex-1 flex-col">

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-4 sm:px-6 sm:py-5">
        {/* ── Masthead ── */}
        <div className="mb-8 space-y-4">
          <span className="ed-chip text-(--ed-stone)">
            <BarChart3 className="h-3.5 w-3.5 text-(--ed-blue)" />
            Official KRAFTON Power Rankings
          </span>
          <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Rankings</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-(--ed-stone)">
            Rolling points earned across Publisher and Tier events, decayed by recency so recent form
            weighs heaviest. Roster acquisitions carry points to the new organisation up to the cutoff date.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="ed-chip text-(--ed-stone)"><Clock3 className="h-3 w-3 text-(--ed-blue)" /> Decay-adjusted</span>
            <span className="ed-chip text-(--ed-stone)"><Swords className="h-3 w-3 text-(--ed-blue)" /> Publisher events ×2 for players</span>
            <span className="ed-chip text-(--ed-stone)"><ShieldCheck className="h-3 w-3 text-(--ed-blue)" /> Transfer-aware</span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="mb-6 flex gap-5 border-b border-(--ed-hair)">
          <Link href="/rankings?tab=teams" className={`ed-tab ${tab === 'teams' ? 'ed-tab-active' : ''}`}>
            <Trophy className="h-4 w-4" /> Teams <span className="num text-xs text-(--ed-stone)">{teams.length}</span>
          </Link>
          <Link href="/rankings?tab=players" className={`ed-tab ${tab === 'players' ? 'ed-tab-active' : ''}`}>
            <Swords className="h-4 w-4" /> Players <span className="num text-xs text-(--ed-stone)">{players.length}</span>
          </Link>
        </div>

        {/* ── Podium ── */}
        {podium.length > 0 && (
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {podium.map((entry, i) => {
              const medal = MEDAL_STYLES[i];
              const isTeam = tab === 'teams';
              const name = isTeam ? (entry as (typeof teams)[number]).name : (entry as (typeof players)[number]).name;
              const teamName = isTeam ? name : (entry as (typeof players)[number]).team;
              const meta = teamLogoFor(teamName);
              const first = i === 0;
              return (
                <div
                  key={name}
                  className={`ed-card relative flex flex-col items-center gap-3 border-2 p-6 text-center sm:p-7 ${medal.ring} ${
                    first ? 'sm:-translate-y-3 sm:shadow-xl' : ''
                  }`}
                >
                  <span className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${medal.badge}`}>
                    {first ? 'Champion' : i === 1 ? 'Runner-up' : '3rd Place'}
                  </span>
                  <div className="mt-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-(--ed-hair) bg-(--ed-canvas)">
                    {meta?.logoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={meta.logoUrl} alt="" className="h-full w-full object-contain p-1.5 dark:hidden" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={meta.imageDarkUrl || meta.logoUrl}
                          alt=""
                          aria-hidden="true"
                          className="hidden h-full w-full object-contain p-1.5 dark:block"
                        />
                      </>
                    ) : (
                      <span className="font-display text-xl font-medium text-(--ed-blue)">
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-display text-lg font-medium tracking-tight text-(--ed-ink)">
                      {isTeam && meta?.slug ? (
                        <Link href={`/teams/${meta.slug}`} className="transition-colors hover:text-[var(--ed-blue)]">{name}</Link>
                      ) : (
                        name
                      )}
                    </p>
                    {!isTeam && (
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${medal.label}`}>
                        {(entry as (typeof players)[number]).team || 'Free Agent'}
                      </p>
                    )}
                  </div>
                  <p className="font-display text-3xl font-medium tracking-tight text-(--ed-blue)">
                    <span className="num">{entry.points.toFixed(1)}</span>
                    <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-(--ed-stone)">pts</span>
                  </p>
                  <p className="ed-label num">
                    {entry.events} events
                    {!isTeam && ` · ${(entry as (typeof players)[number]).totalFinishes} finishes`}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Full table ── */}
        <div className="ed-card mb-12">
          <div className="ed-card-head">
            <h2 className="ed-label">
              {tab === 'teams' ? 'Team standings' : 'Player standings'} · top {tableRows.length}
            </h2>
            <span className="ed-label">Decay-adjusted · as of today</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-(--ed-hair)">
                <tr>
                  <th className="ed-th w-14 text-center">#</th>
                  <th className="ed-th">{tab === 'teams' ? 'Team' : 'Player'}</th>
                  {tab === 'teams' ? (
                    <>
                      <th className="ed-th hidden text-center sm:table-cell">Events</th>
                      {yearKeys.map((y) => (
                        <th key={y} className="ed-th hidden text-center lg:table-cell">{y} Pts</th>
                      ))}
                    </>
                  ) : (
                    <>
                      <th className="ed-th hidden text-center sm:table-cell">Tournaments</th>
                      <th className="ed-th hidden text-center sm:table-cell">Finishes</th>
                    </>
                  )}
                  <th className="ed-th text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--ed-hair)">
                {tableRows.map((entry, i) => {
                  const rank = i + 1;
                  const medal = rank <= 3 ? MEDAL_STYLES[rank - 1] : null;

                  if (tab === 'teams') {
                    const t = entry as (typeof teams)[number];
                    const meta = teamLogos.get(t.name.toLowerCase());
                    return (
                      <tr key={t.name} className={`transition-colors hover:bg-(--ed-canvas)/60 ${medal ? medal.ring.replace('border-2 ', '') : ''}`}>
                        <td className="num px-3 py-2.5 text-center font-mono text-xs text-(--ed-stone)">{rank}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-(--ed-hair) bg-(--ed-canvas)">
                              {meta?.logoUrl ? (
                                <>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={meta.logoUrl} alt="" className="h-full w-full object-contain p-0.5 dark:hidden" />
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={meta.imageDarkUrl || meta.logoUrl} alt="" aria-hidden="true" className="hidden h-full w-full object-contain p-0.5 dark:block" />
                                </>
                              ) : (
                                <span className="text-[10px] font-bold text-(--ed-blue)">{t.name.slice(0, 2).toUpperCase()}</span>
                              )}
                            </span>
                            {meta?.slug ? (
                              <Link href={`/teams/${meta.slug}`} className="font-medium text-(--ed-ink) transition-colors hover:text-[var(--ed-blue)]">
                                {t.name}
                              </Link>
                            ) : (
                              <span className="font-medium text-(--ed-ink)">{t.name}</span>
                            )}
                          </span>
                        </td>
                        <td className="num hidden px-3 py-2.5 text-center text-(--ed-stone) sm:table-cell">{t.events}</td>
                        {yearKeys.map((y) => (
                          <td key={y} className="num hidden px-3 py-2.5 text-center text-(--ed-stone) lg:table-cell">
                            {t.yearPoints[y] ?? 0}
                          </td>
                        ))}
                        <td className="num px-3 py-2.5 text-right font-semibold text-(--ed-blue)">{t.points.toFixed(1)}</td>
                      </tr>
                    );
                  }

                  const p = entry as (typeof players)[number];
                  const meta = teamLogos.get(p.team.toLowerCase());
                  return (
                    <tr key={p.name} className={`transition-colors hover:bg-(--ed-canvas)/60 ${medal ? medal.ring.replace('border-2 ', '') : ''}`}>
                      <td className="num px-3 py-2.5 text-center font-mono text-xs text-(--ed-stone)">{rank}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-(--ed-hair) bg-(--ed-canvas)">
                            {meta?.logoUrl ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={meta.logoUrl} alt="" className="h-full w-full object-contain p-0.5 dark:hidden" />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={meta.imageDarkUrl || meta.logoUrl} alt="" aria-hidden="true" className="hidden h-full w-full object-contain p-0.5 dark:block" />
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-(--ed-blue)">{p.name.slice(0, 2).toUpperCase()}</span>
                            )}
                          </span>
                          <span className="min-w-0">
                            {p.slug ? (
                              <Link href={`/players/${p.slug}`} className="block truncate font-medium text-(--ed-ink) transition-colors hover:text-[var(--ed-blue)]">
                                {p.name}
                              </Link>
                            ) : (
                              <span className="block truncate font-medium text-(--ed-ink)">{p.name}</span>
                            )}
                            {p.team && meta?.slug ? (
                              <Link href={`/teams/${meta.slug}`} className="block truncate text-[11px] font-semibold text-(--ed-stone) transition-colors hover:text-[var(--ed-blue)]">
                                {p.team}
                              </Link>
                            ) : (
                              <span className="block truncate text-[11px] font-semibold text-(--ed-stone)">{p.team || 'Free Agent'}</span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="num hidden px-3 py-2.5 text-center text-(--ed-stone) sm:table-cell">{p.events}</td>
                      <td className="num hidden px-3 py-2.5 text-center text-(--ed-stone) sm:table-cell">{p.totalFinishes}</td>
                      <td className="num px-3 py-2.5 text-right font-semibold text-(--ed-blue)">{p.points.toFixed(1)}</td>
                    </tr>
                  );
                })}
                {tableRows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-(--ed-stone)">No ranking data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Methodology ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="ed-card p-5">
            <p className="ed-label mb-3 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-(--ed-blue)" /> Team base points</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-(--ed-stone)">
                  <th className="py-1 text-left font-semibold">Finish</th>
                  <th className="py-1 text-center font-semibold">Publisher</th>
                  <th className="py-1 text-center font-semibold">Tier 1</th>
                  <th className="py-1 text-center font-semibold">Tier 2</th>
                  <th className="py-1 text-center font-semibold">Tier 3</th>
                </tr>
              </thead>
              <tbody className="num divide-y divide-(--ed-hair) text-(--ed-ink)">
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
                      <td key={ci} className={ci === 0 ? 'py-1.5 text-(--ed-stone)' : 'py-1.5 text-center'}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ed-card p-5">
            <p className="ed-label mb-3 flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-(--ed-blue)" /> Decay by event age</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-(--ed-stone)">
                  <th className="py-1 text-left font-semibold">Age</th>
                  <th className="py-1 text-center font-semibold">Team</th>
                  <th className="py-1 text-center font-semibold">Player</th>
                </tr>
              </thead>
              <tbody className="num divide-y divide-(--ed-hair) text-(--ed-ink)">
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
                      <td key={ci} className={ci === 0 ? 'py-1.5 text-(--ed-stone)' : 'py-1.5 text-center'}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ed-label mt-3">Player scoring</p>
            <p className="mt-1 text-xs leading-relaxed text-(--ed-stone)">
              Eliminations × tier multiplier (Publisher ×2, Tier 1 ×1.5) plus flat bonuses:
              MVP +20 · Finals MVP +10 · IGL +10 · Survivor +10 · Emerging +5.
            </p>
          </div>

          <div className="ed-card p-5">
            <p className="ed-label mb-3 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-(--ed-blue)" /> Roster acquisitions</p>
            <p className="text-xs leading-relaxed text-(--ed-stone)">
              When an organisation&rsquo;s roster is acquired, points earned up to the announced cutoff date
              transfer to the acquiring org; anything after stays with the original name. Chains resolve
              recursively, so double acquisitions attribute correctly.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-(--ed-stone)">
              Events excluded by the editorial team never contribute points. Standings recompute
              automatically as events age through the decay brackets.
            </p>
            <Link href="/#krafton-rankings" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ed-blue)] transition-colors hover:underline">
              Homepage widget <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>

    </div>
  );
}
