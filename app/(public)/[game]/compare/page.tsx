import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import prisma from '@/lib/prisma';
import {
  Swords,
  Trophy,
  Crown,
  Users,
  Target,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  Award,
  Crosshair,
} from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import { sameFamily } from '@/lib/game-queries';
import {
  COMPARE_GAME_WINDOW,
  aggregateByMap,
  getPlayerCompareMetrics,
  getPlayerCompareProfile,
  getPlayerCompareResults,
  getPopularCompareOptions,
  getTeamCompareMetrics,
  getTeamCompareProfile,
  getTeamCompareResults,
  getPlayerCompareEvents,
  getTeamCompareEvents,
  recordComparePicks,
  type CompareEventEntry,
  type CompareMetricValue,
  type CompareMetrics,
  type CompareRange,
} from '@/lib/compare-stats';
import { fetchEntityStanding, type EntityStanding } from '@/lib/krafton-data';
import { COMPARE_METRIC_COLUMNS, formatSurvivalAverage } from '@/lib/event-metrics';
import { BenchmarkNote, BenchmarkTable, type BenchmarkRow } from '@/components/compare/benchmark-table';
import { MapGrid } from '@/components/compare/map-grid';
import { KraftonRankBand } from '@/components/compare/krafton-rank-band';
import { ConsistencyCompare } from '@/components/compare/consistency-compare';
import { FormCompare, type CompareFormPoint } from '@/components/compare/form-compare';
import { EventOverlap, type CompareEventRow } from '@/components/compare/event-overlap';
import { canonical, SITE_NAME } from '@/lib/seo';

/**
 * Metrics that read better per game than as a running total: a damage or
 * survival pile simply grows with games played, so a total flatters whoever has
 * played more. Assists, knockouts and grenade elims stay as totals.
 */
const PER_GAME_METRICS = new Set(['damage', 'survivalTime', 'utilitiesTotal']);

/**
 * How a per-game figure prints. Damage is a big number where decimals are
 * noise, survival needs seconds so two close averages don't render identically.
 */
const PER_GAME_FORMAT: Record<string, (value: number) => string> = {
  damage: (value) => `${Math.round(value)}`,
  survivalTime: formatSurvivalAverage,
  utilitiesTotal: (value) => value.toFixed(2),
};

/**
 * The detail metrics as benchmark rows — same labels and formats the profile
 * cards use, so a comparison can never disagree with a profile about what a
 * metric is called or how it prints.
 */
function buildMetricRows(a: CompareMetrics | null, b: CompareMetrics | null): BenchmarkRow[] {
  return COMPARE_METRIC_COLUMNS.map((column) => {
    const entryA = a?.metrics[column.key];
    const entryB = b?.metrics[column.key];
    const perGame = PER_GAME_METRICS.has(column.key);

    // Averaged over the games that recorded the metric, never over every game.
    const resolve = (entry: CompareMetricValue | undefined) => {
      if (!entry || entry.value === null) return null;
      if (!perGame) return entry.value;
      return entry.samples > 0 ? entry.value / entry.samples : null;
    };

    const formatValue = (value: number | null) => {
      if (value === null) return '—';
      const perGameFormat = perGame ? PER_GAME_FORMAT[column.key] : undefined;
      if (perGameFormat) return perGameFormat(value);
      return column.format ? column.format(value) : value.toLocaleString('en-IN');
    };

    return {
      label: perGame ? `Avg ${column.label} / Match` : column.label,
      valA: resolve(entryA),
      valB: resolve(entryB),
      format: formatValue,
      reportedA: entryA?.includesReported ?? false,
      reportedB: entryB?.includesReported ?? false,
    };
  });
}

/** Events both sides appeared in, newest first, with each side's finishing rank. */
function buildEventOverlap(eventsA: CompareEventEntry[], eventsB: CompareEventEntry[]): CompareEventRow[] {
  const byId = new Map(eventsB.map((entry) => [entry.tournamentId, entry]));
  const rows: CompareEventRow[] = [];

  for (const entryA of eventsA) {
    const entryB = byId.get(entryA.tournamentId);
    if (!entryB) continue;
    rows.push({
      tournamentId: entryA.tournamentId,
      name: entryA.name,
      shortName: entryA.shortName,
      series: entryA.series,
      season: entryA.season,
      slug: entryA.slug,
      startDateMs: entryA.startDateMs,
      rankA: entryA.rank,
      rankB: entryB.rank,
    });
  }

  rows.sort((a, b) => (b.startDateMs ?? 0) - (a.startDateMs ?? 0));
  return rows;
}

/** Last ten games oldest → newest, for the form lanes. */
function buildForm<T>(
  rows: readonly T[],
  valueOf: (row: T) => number,
  winOf: (row: T) => boolean,
  idOf: (row: T) => string,
  titleOf: (row: T) => string,
): CompareFormPoint[] {
  return rows
    .slice(0, 10)
    .map((row) => ({ id: idOf(row), value: valueOf(row), highlight: winOf(row), title: titleOf(row) }))
    .reverse();
}

/**
 * The same lane, but tinting the best game rather than a won one — what an
 * individual's form is judged on when there is no team result to read.
 */
function buildTopForm<T>(
  rows: readonly T[],
  valueOf: (row: T) => number,
  idOf: (row: T) => string,
  titleOf: (row: T) => string,
): CompareFormPoint[] {
  const recent = rows.slice(0, 10);
  const best = recent.reduce((max, row) => Math.max(max, valueOf(row)), 0);
  return recent
    .map((row) => ({
      id: idOf(row),
      value: valueOf(row),
      highlight: best > 0 && valueOf(row) === best,
      title: titleOf(row),
    }))
    .reverse();
}

/*
 * The bare picker is a real landing page and gets a canonical. Any URL carrying
 * an entity pair is one of an unbounded set of permutations whose content is
 * determined entirely by the query string, so it is kept out of the index —
 * `follow` stays on so the links inside are still crawled.
 */
export async function generateMetadata({
  params: routeParams,
  searchParams,
}: ComparePageProps): Promise<Metadata> {
  const { game } = await routeParams;
  const params = await searchParams;
  const hasPairing = Boolean(params.teamA || params.teamB || params.playerA || params.playerB);

  if (hasPairing) {
    return {
      title: `Head-to-Head Comparison | ${SITE_NAME}`,
      robots: { index: false, follow: true },
    };
  }

  return {
    title: `Head-to-Head Comparison — Teams & Players | ${SITE_NAME}`,
    description:
      'Compare esports teams and players side-by-side with match history, KRAFTON rankings, win rates, and direct head-to-head records.',
    ...canonical(gameHref(game, 'compare')),
  };
}

export const dynamic = 'force-dynamic';

interface ComparePageProps {
  params: Promise<{ game: string }>;
  searchParams: Promise<{
    type?: string;
    range?: string;
    teamA?: string;
    teamB?: string;
    playerA?: string;
    playerB?: string;
  }>;
}

/** Rebuilds the query with one key changed — used by both the mode and range tabs. */
function toggleHref(
  game: string,
  params: Record<string, string | undefined>,
  key: string,
  value: string
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  q.set(key, value);
  return `/${game}/compare?${q.toString()}`;
}

export default async function ComparePage({
  params: routeParams,
  searchParams,
}: ComparePageProps) {
  const { game } = await routeParams;
  const params = await searchParams;
  const isPlayerMode = params.type === 'players';
  const range: CompareRange = params.range === '6m' ? '6m' : 'lifetime';
  const rangePeriod =
    range === '6m'
      ? 'the past six months'
      : `up to the ${COMPARE_GAME_WINDOW.toLocaleString('en-IN')} most recent recorded games`;

  // Default picker lists: the 50 most-compared entities (recomputed at most
  // once per day). Typing queries /api/compare/search over the whole database.
  const [popularTeams, popularPlayers] = await Promise.all([
    getPopularCompareOptions('teams').catch(() => []),
    getPopularCompareOptions('players').catch(() => []),
  ]);

  if (!isPlayerMode) {
    // Team comparison mode
    const slugA = params.teamA || '';
    const slugB = params.teamB || '';

    // Track explicit comparisons for the "most compared" default lists —
    // never count views where a side fell back to the default.
    if (params.teamA && params.teamB && params.teamA !== params.teamB) {
      const [pa, pb] = await Promise.all([
        getTeamCompareProfile(params.teamA),
        getTeamCompareProfile(params.teamB),
      ]);
      const ids = [pa?.id, pb?.id].filter(Boolean) as string[];
      if (ids.length > 0) await recordComparePicks('TEAM', ids);
    }

    const [teamA, teamB] = await Promise.all([
      slugA ? getTeamCompareProfile(slugA) : null,
      slugB ? getTeamCompareProfile(slugB) : null,
    ]);

    const teamAGame = teamA?.game?.slug || DEFAULT_GAME_SLUG;
    const teamBGame = teamB?.game?.slug || DEFAULT_GAME_SLUG;
    // Cross-game pairing is allowed only within one family (BGMI ↔ PUBG Mobile ↔
    // Game for Peace), never across families (BGMI ↔ Valorant). The same game is
    // always comparable; a one-sided sheet is not a pairing yet.
    const teamsComparable = !teamA || !teamB || (await sameFamily(teamAGame, teamBGame));

    // The pickers ship only the popular default list — inject the two teams
    // actually on the compare sheet so their labels/icons resolve on reload.
    const teamOptions = [
      ...popularTeams.filter((o) => o.value !== slugA && o.value !== slugB),
      ...(teamA && slugA ? [{ value: slugA, label: teamA.name, subtitle: teamA.tag || null, imageUrl: teamA.logoUrl || null }] : []),
      ...(teamB && slugB ? [{ value: slugB, label: teamB.name, subtitle: teamB.tag || null, imageUrl: teamB.logoUrl || null }] : []),
    ];

    const isSameTeam = Boolean(teamA && teamB && teamA.id === teamB.id);

    // Head-to-head calculations
    let sharedMatchesCount = 0;
    let teamAWinsInShared = 0;
    let teamBWinsInShared = 0;
    let teamAWwcdInShared = 0;
    let teamBWwcdInShared = 0;
    let teamAElimsInShared = 0;
    let teamBElimsInShared = 0;
    let teamAPointsInShared = 0;
    let teamBPointsInShared = 0;

    const lifetimeA = { matches: 0, wwcd: 0, placePoints: 0, elims: 0, totalPoints: 0 };
    const lifetimeB = { matches: 0, wwcd: 0, placePoints: 0, elims: 0, totalPoints: 0 };
    let teamMetricsA: CompareMetrics | null = null;
    let teamMetricsB: CompareMetrics | null = null;
    let teamResultsA: Awaited<ReturnType<typeof getTeamCompareResults>> = [];
    let teamResultsB: Awaited<ReturnType<typeof getTeamCompareResults>> = [];
    let teamStandingA: EntityStanding | null = null;
    let teamStandingB: EntityStanding | null = null;
    let teamEventsA: CompareEventEntry[] = [];
    let teamEventsB: CompareEventEntry[] = [];

    if (teamA && teamB && !isSameTeam && teamsComparable) {
      const [resultsA, resultsB, metricsA, metricsB, standingA, standingB, eventsA, eventsB] =
        await Promise.all([
          getTeamCompareResults(teamA.id, range),
          getTeamCompareResults(teamB.id, range),
          getTeamCompareMetrics(teamA.id, range),
          getTeamCompareMetrics(teamB.id, range),
          fetchEntityStanding('TEAM', teamA.id).catch(() => null),
          fetchEntityStanding('TEAM', teamB.id).catch(() => null),
          getTeamCompareEvents(teamA.id, range),
          getTeamCompareEvents(teamB.id, range),
        ]);
      teamMetricsA = metricsA;
      teamMetricsB = metricsB;
      teamResultsA = resultsA;
      teamResultsB = resultsB;
      teamStandingA = standingA;
      teamStandingB = standingB;
      teamEventsA = eventsA;
      teamEventsB = eventsB;

      // Calculate lifetime aggregates
      for (const r of resultsA) {
        lifetimeA.matches += 1;
        if (r.wwcd) lifetimeA.wwcd += 1;
        lifetimeA.placePoints += r.placePoints;
        lifetimeA.elims += r.elimsPoints;
        lifetimeA.totalPoints += r.totalPoints;
      }
      for (const r of resultsB) {
        lifetimeB.matches += 1;
        if (r.wwcd) lifetimeB.wwcd += 1;
        lifetimeB.placePoints += r.placePoints;
        lifetimeB.elims += r.elimsPoints;
        lifetimeB.totalPoints += r.totalPoints;
      }

      const mapB = new Map(resultsB.map((r) => [r.matchGameId, r]));
      for (const rA of resultsA) {
        const rB = mapB.get(rA.matchGameId);
        if (rB) {
          sharedMatchesCount++;
          if (rA.rank < rB.rank) teamAWinsInShared++;
          else if (rB.rank < rA.rank) teamBWinsInShared++;
          if (rA.wwcd) teamAWwcdInShared++;
          if (rB.wwcd) teamBWwcdInShared++;
          teamAElimsInShared += rA.elimsPoints;
          teamBElimsInShared += rB.elimsPoints;
          teamAPointsInShared += rA.totalPoints;
          teamBPointsInShared += rB.totalPoints;
        }
      }
    }

    const teamMapsA = aggregateByMap(
      teamResultsA,
      (row) => row.matchGame.mapName,
      (row) => row.wwcd,
      (row) => row.elimsPoints,
    );
    const teamMapsB = aggregateByMap(
      teamResultsB,
      (row) => row.matchGame.mapName,
      (row) => row.wwcd,
      (row) => row.elimsPoints,
    );

    const teamFormA = buildForm(
      teamResultsA,
      (row) => row.totalPoints,
      (row) => row.wwcd,
      (row) => row.matchGameId,
      (row) => `${row.totalPoints} pts · rank #${row.rank}${row.wwcd ? ' · WWCD' : ''}`,
    );
    const teamFormB = buildForm(
      teamResultsB,
      (row) => row.totalPoints,
      (row) => row.wwcd,
      (row) => row.matchGameId,
      (row) => `${row.totalPoints} pts · rank #${row.rank}${row.wwcd ? ' · WWCD' : ''}`,
    );

    const sharedEvents = buildEventOverlap(teamEventsA, teamEventsB);

    // Mode toggle keeps the ENTIRE current query (both modes' params) — a
    // round-trip teams → players → teams restores the exact comparison.
    const modeToggleHref = (type: string) => toggleHref(game, params, 'type', type);
    const rangeToggleHref = (next: CompareRange) => toggleHref(game, params, 'range', next);

    const teamRows: BenchmarkRow[] =
      teamA && teamB
        ? [
            {
              label: 'Championships',
              valA: teamA.tournamentsWon.length,
              valB: teamB.tournamentsWon.length,
              format: (v) => `${v ?? 0} Titles`,
            },
            {
              label: 'Runner-up Finishes',
              valA: teamA.tournamentsRunnerUp.length,
              valB: teamB.tournamentsRunnerUp.length,
              format: (v) => `${v ?? 0} Times`,
            },
            {
              label: 'Matches Recorded',
              valA: lifetimeA.matches,
              valB: lifetimeB.matches,
              format: (v) => `${v ?? 0} Games`,
            },
            {
              label: 'Total Chicken Dinners',
              valA: lifetimeA.wwcd,
              valB: lifetimeB.wwcd,
              format: (v) => `${v ?? 0} WWCD`,
            },
            {
              label: 'Win Rate %',
              valA: lifetimeA.matches ? (lifetimeA.wwcd / lifetimeA.matches) * 100 : 0,
              valB: lifetimeB.matches ? (lifetimeB.wwcd / lifetimeB.matches) * 100 : 0,
              format: (v) => `${(v ?? 0).toFixed(1)}%`,
            },
            // Scorecards store elimination POINTS, never a raw elimination count,
            // so the label says points rather than implying a body count.
            {
              label: 'Placement Points',
              valA: lifetimeA.placePoints,
              valB: lifetimeB.placePoints,
              format: (v) => `${v ?? 0}`,
            },
            {
              label: 'Avg Placement Points / Match',
              valA: lifetimeA.matches ? lifetimeA.placePoints / lifetimeA.matches : 0,
              valB: lifetimeB.matches ? lifetimeB.placePoints / lifetimeB.matches : 0,
              format: (v) => `${(v ?? 0).toFixed(2)}`,
            },
            {
              label: 'Elimination Points',
              valA: lifetimeA.elims,
              valB: lifetimeB.elims,
              format: (v) => `${v ?? 0}`,
            },
            {
              label: 'Avg Elimination Points / Match',
              valA: lifetimeA.matches ? lifetimeA.elims / lifetimeA.matches : 0,
              valB: lifetimeB.matches ? lifetimeB.elims / lifetimeB.matches : 0,
              format: (v) => `${(v ?? 0).toFixed(2)}`,
            },
            {
              label: 'Total Points',
              valA: lifetimeA.totalPoints,
              valB: lifetimeB.totalPoints,
              format: (v) => `${v ?? 0}`,
            },
            {
              label: 'Avg Total Points / Match',
              valA: lifetimeA.matches ? lifetimeA.totalPoints / lifetimeA.matches : 0,
              valB: lifetimeB.matches ? lifetimeB.totalPoints / lifetimeB.matches : 0,
              format: (v) => `${(v ?? 0).toFixed(2)}`,
            },
            ...buildMetricRows(teamMetricsA, teamMetricsB),
          ]
        : [];

    return (
      <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white py-6 sm:py-8">
        <div className="max-w-[var(--page-max-width)] w-full mx-auto px-4 sm:px-6 space-y-8 lg:px-8">
          {/* Header Banner */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
              <Swords className="h-3.5 w-3.5" />
              <span>Head-to-Head Analytics</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  Head-to-Head Comparison
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Direct match lobby encounters, lifetime production benchmarks, and roster comparisons.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* How much history the whole sheet covers */}
                <div className="flex items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
                  <Link
                    href={rangeToggleHref('lifetime')}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${range === 'lifetime' ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Lifetime
                  </Link>
                  <Link
                    href={rangeToggleHref('6m')}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${range === '6m' ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Past 6 months
                  </Link>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="flex items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
                  <Link
                    href={modeToggleHref("teams")}
                    className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600 transition-all"
                  >
                    Teams
                  </Link>
                  <Link
                    href={modeToggleHref("players")}
                    className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-all"
                  >
                    Players
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Selectors Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <form method="GET" action={gameHref(game, 'compare')} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <input type="hidden" name="type" value="teams" />
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Team A</label>
                <SearchableSelect
                  name="teamA"
                  defaultValue={slugA || ''}
                  placeholder="Select Team A..."
                  searchPlaceholder="Search team (e.g. SouL, GodL, Entity)..."
                  options={teamOptions}
                  searchUrl={`/api/compare/search?type=teams&game=${game}`}
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Team B</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      name="teamB"
                      defaultValue={slugB || ''}
                      placeholder="Select Team B..."
                      searchPlaceholder="Search team (e.g. SouL, GodL, Entity)..."
                      options={teamOptions}
                      searchUrl={`/api/compare/search?type=teams&game=${game}`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl bg-[#0A5FC4] text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-sm shrink-0 h-[42px] cursor-pointer"
                  >
                    Compare
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Team vs Team Header Board */}
          {isSameTeam ? (
            <div className="rounded-3xl border border-amber-400/40 bg-amber-400/10 p-10 text-center">
              <Swords className="mx-auto h-8 w-8 text-amber-500" />
              <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Both slots have the same team
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                Pick two different squads in the selectors above to run a head-to-head comparison.
              </p>
            </div>
          ) : !teamsComparable ? (
            <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-10 text-center">
              <Swords className="mx-auto h-8 w-8 text-rose-500" />
              <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Different game families cannot be compared
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                {teamA?.name} plays {teamA?.game?.name ?? 'another game'} and {teamB?.name} plays{' '}
                {teamB?.game?.name ?? 'another game'}. Only squads from the same family — for example
                BGMI, PUBG Mobile and Game for Peace — can be compared.
              </p>
            </div>
          ) : !teamA || !teamB ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 p-10 text-center dark:border-slate-700 dark:bg-white/[0.02]">
              <Swords className="mx-auto h-8 w-8 text-slate-400 opacity-50" />
              <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Pick two teams to compare
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
                Select Team A and Team B above, then hit Compare for head-to-head analytics,
                direct encounters, and roster benchmarks.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="grid grid-cols-1 sm:grid-cols-11 gap-6 items-center">
                  {/* Team A */}
                  <div className="sm:col-span-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center dark:border-white/10 dark:bg-[#141e33]">
                      {teamA.logoUrl ? (
                        <Image src={teamA.logoUrl} alt={teamA.name} fill className="object-contain p-2" />
                      ) : (
                        <span className="text-2xl font-black text-[#0A5FC4]">{teamA.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                        {teamA.region || 'Global'}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                        {teamA.name}
                      </h2>
                      <Link href={gameHref(teamAGame, `teams/${teamA.slug}`)} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                        View Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* VS badge */}
                  <div className="sm:col-span-1 flex flex-col items-center justify-center text-center">
                    <span className="h-12 w-12 rounded-full border-2 border-[#0A5FC4]/30 bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300 flex items-center justify-center font-black text-sm shadow-sm">
                      VS
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-2">{sharedMatchesCount} Battles</span>
                  </div>

                  {/* Team B */}
                  <div className="sm:col-span-5 flex flex-col sm:flex-row-reverse items-center gap-4 text-center sm:text-right">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center dark:border-white/10 dark:bg-[#141e33]">
                      {teamB.logoUrl ? (
                        <Image src={teamB.logoUrl} alt={teamB.name} fill className="object-contain p-2" />
                      ) : (
                        <span className="text-2xl font-black text-[#0A5FC4]">{teamB.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                        {teamB.region || 'Global'}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                        {teamB.name}
                      </h2>
                      <Link href={gameHref(teamBGame, `teams/${teamB.slug}`)} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                        View Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank leads the sheet — it is the one durable verdict on the pair */}
              <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm dark:border-white/10">
                <KraftonRankBand
                  labelA={teamA.name}
                  rankA={teamStandingA?.rank ?? null}
                  labelB={teamB.name}
                  rankB={teamStandingB?.rank ?? null}
                />
              </section>

              {/* Direct Head-to-Head Records */}
              <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Swords className="h-4.5 w-4.5 text-[#0A5FC4] dark:text-blue-300" />
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Direct Encounters (Same Match Lobby)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{sharedMatchesCount} Shared Matches</span>
                </div>

                <div className="p-6 space-y-6">
                  {sharedMatchesCount > 0 ? (
                    <div className="space-y-6">
                      {/* Metric 1: Head-to-head higher placement score */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={teamAWinsInShared >= teamBWinsInShared ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                            {teamA.name}: {teamAWinsInShared} Out-placements
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Higher Placement</span>
                          <span className={teamBWinsInShared >= teamAWinsInShared ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                            {teamB.name}: {teamBWinsInShared} Out-placements
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-[#0A5FC4] h-full transition-all"
                            style={{ width: `${(teamAWinsInShared / (sharedMatchesCount || 1)) * 100}%` }}
                          />
                          <div
                            className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
                            style={{ width: `${(teamBWinsInShared / (sharedMatchesCount || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 2: WWCD count in shared matches */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={teamAWwcdInShared >= teamBWwcdInShared ? 'text-amber-500 font-black' : 'text-slate-400'}>
                            {teamAWwcdInShared} Chicken Dinners
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">WWCD In Shared Matches</span>
                          <span className={teamBWwcdInShared >= teamAWwcdInShared ? 'text-amber-500 font-black' : 'text-slate-400'}>
                            {teamBWwcdInShared} Chicken Dinners
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-amber-400 h-full transition-all"
                            style={{
                              width: `${
                                teamAWwcdInShared + teamBWwcdInShared > 0
                                   ? (teamAWwcdInShared / (teamAWwcdInShared + teamBWwcdInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                          <div
                            className="bg-amber-600 h-full transition-all"
                            style={{
                              width: `${
                                teamAWwcdInShared + teamBWwcdInShared > 0
                                  ? (teamBWwcdInShared / (teamAWwcdInShared + teamBWwcdInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Metric 3: Elimination points in shared matches */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={teamAElimsInShared >= teamBElimsInShared ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}>
                            {teamAElimsInShared} Shared Elims
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Head-to-Head Eliminations</span>
                          <span className={teamBElimsInShared >= teamAElimsInShared ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}>
                            {teamBElimsInShared} Shared Elims
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{
                              width: `${
                                teamAElimsInShared + teamBElimsInShared > 0
                                  ? (teamAElimsInShared / (teamAElimsInShared + teamBElimsInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                          <div
                            className="bg-emerald-700 h-full transition-all"
                            style={{
                              width: `${
                                teamAElimsInShared + teamBElimsInShared > 0
                                  ? (teamBElimsInShared / (teamAElimsInShared + teamBElimsInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Metric 4: Total points earned in the shared lobbies */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={teamAPointsInShared >= teamBPointsInShared ? 'text-[#0A5FC4] dark:text-blue-300 font-black' : 'text-slate-400'}>
                            {teamAPointsInShared} pts
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Points In Shared Matches</span>
                          <span className={teamBPointsInShared >= teamAPointsInShared ? 'text-[#0A5FC4] dark:text-blue-300 font-black' : 'text-slate-400'}>
                            {teamBPointsInShared} pts
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-[#0A5FC4] h-full transition-all"
                            style={{
                              width: `${
                                teamAPointsInShared + teamBPointsInShared > 0
                                  ? (teamAPointsInShared / (teamAPointsInShared + teamBPointsInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                          <div
                            className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
                            style={{
                              width: `${
                                teamAPointsInShared + teamBPointsInShared > 0
                                  ? (teamBPointsInShared / (teamAPointsInShared + teamBPointsInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-xs text-slate-400">
                      These two organizations haven&apos;t competed in the same match lobbies yet in the database.
                    </p>
                  )}
                </div>
              </section>

              <FormCompare
                labelA={teamA.name}
                labelB={teamB.name}
                formA={teamFormA}
                formB={teamFormB}
                unit="pts"
                highlightLabel="Match win"
              />

              {/* Franchise Lifetime Statistics Comparison Table */}
              <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4.5 w-4.5 text-amber-500" />
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Franchise Lifetime Benchmarks
                    </h3>
                  </div>
                </div>

                <BenchmarkTable labelA={teamA.name} labelB={teamB.name} rows={teamRows} />
                <BenchmarkNote period={rangePeriod} />
              </section>

              {/* Side by Side Active Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Team A Roster */}
                <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                      <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{teamA.name} Line-up</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{teamA.players.length} Players</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {teamA.players.map((p) => (
                      <Link
                        key={p.id}
                        href={gameHref(teamAGame, `players/${p.slug || p.ign.toLowerCase()}`)}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between hover:border-[#0A5FC4] hover:shadow-xs transition-all dark:border-white/5 dark:bg-[#141e33]/50 text-xs"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{p.ign}</span>
                        <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">{p.role || 'Player'}</span>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Team B Roster */}
                <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                      <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{teamB.name} Line-up</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{teamB.players.length} Players</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {teamB.players.map((p) => (
                      <Link
                        key={p.id}
                        href={gameHref(teamBGame, `players/${p.slug || p.ign.toLowerCase()}`)}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between hover:border-[#0A5FC4] hover:shadow-xs transition-all dark:border-white/5 dark:bg-[#141e33]/50 text-xs"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{p.ign}</span>
                        <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">{p.role || 'Player'}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              <ConsistencyCompare
                labelA={teamA.name}
                labelB={teamB.name}
                zeroA={teamResultsA.filter((row) => row.elimsPoints === 0).length}
                zeroB={teamResultsB.filter((row) => row.elimsPoints === 0).length}
                fiveA={teamResultsA.filter((row) => row.elimsPoints >= 5).length}
                fiveB={teamResultsB.filter((row) => row.elimsPoints >= 5).length}
                gamesA={teamResultsA.length}
                gamesB={teamResultsB.length}
                unit="Elim-Point"
              />

              <EventOverlap labelA={teamA.name} labelB={teamB.name} rows={sharedEvents} />

              <MapGrid
                labelA={teamA.name}
                labelB={teamB.name}
                mapsA={teamMapsA}
                mapsB={teamMapsB}
                elimsLabel="Elim Points"
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // PLAYER COMPARISON MODE
  // ==========================================
  const slugA = params.playerA || '';
  const slugB = params.playerB || '';

  // Track explicit comparisons for the "most compared" default lists.
  if (params.playerA && params.playerB && params.playerA !== params.playerB) {
    const [pa, pb] = await Promise.all([
      getPlayerCompareProfile(params.playerA),
      getPlayerCompareProfile(params.playerB),
    ]);
    const ids = [pa?.id, pb?.id].filter(Boolean) as string[];
    if (ids.length > 0) await recordComparePicks('PLAYER', ids);
  }

  const [playerA, playerB] = await Promise.all([
    slugA ? getPlayerCompareProfile(slugA) : null,
    slugB ? getPlayerCompareProfile(slugB) : null,
  ]);

  const playerAGame = playerA?.game?.slug || DEFAULT_GAME_SLUG;
  const playerBGame = playerB?.game?.slug || DEFAULT_GAME_SLUG;
  // Same rule as teams: only players from the same game family may be paired.
  const playersComparable = !playerA || !playerB || (await sameFamily(playerAGame, playerBGame));

  const playerOptions = [
    ...popularPlayers.filter((o) => o.value !== slugA && o.value !== slugB),
    ...(playerA && slugA ? [{ value: slugA, label: playerA.ign, subtitle: playerA.currentTeam?.name || null, imageUrl: playerA.avatarUrl || null }] : []),
    ...(playerB && slugB ? [{ value: slugB, label: playerB.ign, subtitle: playerB.currentTeam?.name || null, imageUrl: playerB.avatarUrl || null }] : []),
  ];

  const isSamePlayer = Boolean(playerA && playerB && playerA.id === playerB.id);

  let sharedMatchesCount = 0;
  let elimsSharedA = 0;
  let elimsSharedB = 0;

  const lifetimeA = { matches: 0, elims: 0 };
  const lifetimeB = { matches: 0, elims: 0 };
  let playerMetricsA: CompareMetrics | null = null;
  let playerMetricsB: CompareMetrics | null = null;
  let playerResultsA: Awaited<ReturnType<typeof getPlayerCompareResults>> = [];
  let playerResultsB: Awaited<ReturnType<typeof getPlayerCompareResults>> = [];
  let playerStandingA: EntityStanding | null = null;
  let playerStandingB: EntityStanding | null = null;
  let playerEventsA: CompareEventEntry[] = [];
  let playerEventsB: CompareEventEntry[] = [];

  if (playerA && playerB && !isSamePlayer && playersComparable) {
    const [statsA, statsB, metricsA, metricsB, standingA, standingB, eventsA, eventsB] =
      await Promise.all([
        getPlayerCompareResults(playerA.id, range),
        getPlayerCompareResults(playerB.id, range),
        getPlayerCompareMetrics(playerA.id, range),
        getPlayerCompareMetrics(playerB.id, range),
        fetchEntityStanding('PLAYER', playerA.id).catch(() => null),
        fetchEntityStanding('PLAYER', playerB.id).catch(() => null),
        getPlayerCompareEvents(playerA.id, range),
        getPlayerCompareEvents(playerB.id, range),
      ]);
    playerMetricsA = metricsA;
    playerMetricsB = metricsB;
    playerResultsA = statsA;
    playerResultsB = statsB;
    playerStandingA = standingA;
    playerStandingB = standingB;
    playerEventsA = eventsA;
    playerEventsB = eventsB;

    for (const s of statsA) {
      lifetimeA.matches++;
      lifetimeA.elims += s.playerElims;
    }
    for (const s of statsB) {
      lifetimeB.matches++;
      lifetimeB.elims += s.playerElims;
    }

    const mapB = new Map(statsB.map((s) => [s.matchGameId, s]));
    for (const sA of statsA) {
      const sB = mapB.get(sA.matchGameId);
      if (sB) {
        sharedMatchesCount++;
        elimsSharedA += sA.playerElims;
        elimsSharedB += sB.playerElims;
      }
    }
  }

  const playerMapsA = aggregateByMap(
    playerResultsA,
    (row) => row.matchGame.mapName,
    // A player's map "win" is the team winning the game they played in.
    (row) => row.teamWwcd,
    (row) => row.playerElims,
  );
  const playerMapsB = aggregateByMap(
    playerResultsB,
    (row) => row.matchGame.mapName,
    (row) => row.teamWwcd,
    (row) => row.playerElims,
  );

  // A player's lane marks their best game, not a team result they did not own.
  const playerFormA = buildTopForm(
    playerResultsA,
    (row) => row.playerElims,
    (row) => row.matchGameId,
    (row) => `${row.playerElims} elims${row.teamWwcd ? ' · WWCD' : ''}`,
  );
  const playerFormB = buildTopForm(
    playerResultsB,
    (row) => row.playerElims,
    (row) => row.matchGameId,
    (row) => `${row.playerElims} elims${row.teamWwcd ? ' · WWCD' : ''}`,
  );

  const sharedEvents = buildEventOverlap(playerEventsA, playerEventsB);

  // Mode toggle keeps the ENTIRE current query (both modes' params) — a
  // round-trip teams → players → teams restores the exact comparison.
  const modeToggleHref = (type: string) => toggleHref(game, params, 'type', type);
  const rangeToggleHref = (next: CompareRange) => toggleHref(game, params, 'range', next);

  const playerRows: BenchmarkRow[] =
    playerA && playerB
      ? [
          {
            label: 'Total Career Matches',
            valA: lifetimeA.matches,
            valB: lifetimeB.matches,
            format: (v) => `${v ?? 0}`,
          },
          {
            label: 'Career Eliminations',
            valA: lifetimeA.elims,
            valB: lifetimeB.elims,
            format: (v) => `${v ?? 0} Kills`,
          },
          {
            label: 'Eliminations / Match',
            valA: lifetimeA.matches ? lifetimeA.elims / lifetimeA.matches : null,
            valB: lifetimeB.matches ? lifetimeB.elims / lifetimeB.matches : null,
            format: (v) => (v === null ? '—' : v.toFixed(2)),
          },
          ...buildMetricRows(playerMetricsA, playerMetricsB),
          {
            label: 'Primary Role',
            valA: null,
            valB: null,
            format: () => '—',
            formatCustomA: playerA.role || 'Athlete',
            formatCustomB: playerB.role || 'Athlete',
          },
        ]
      : [];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white py-6 sm:py-8">
      <div className="max-w-[var(--page-max-width)] w-full mx-auto px-4 sm:px-6 space-y-8 lg:px-8">
        {/* Header Banner */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <Swords className="h-3.5 w-3.5" />
            <span>Head-to-Head Analytics</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                Player vs Player Comparison
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                Direct lobby encounters, career production benchmarks, and head-to-head fragging metrics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* How much history the whole sheet covers */}
              <div className="flex items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
                <Link
                  href={rangeToggleHref('lifetime')}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${range === 'lifetime' ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  Lifetime
                </Link>
                <Link
                  href={rangeToggleHref('6m')}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${range === '6m' ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  Past 6 months
                </Link>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
                <Link
                  href={modeToggleHref("teams")}
                  className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-all"
                >
                  Teams
                </Link>
                <Link
                  href={modeToggleHref("players")}
                  className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600 transition-all"
                >
                  Players
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Selection Selectors Form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <form method="GET" action={gameHref(game, 'compare')} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <input type="hidden" name="type" value="players" />
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Player A</label>
              <SearchableSelect
                name="playerA"
                defaultValue={slugA || ''}
                placeholder="Select Player A..."
                searchPlaceholder="Search player IGN (e.g. Jonathan, Manya)..."
                options={playerOptions}
                searchUrl={`/api/compare/search?type=players&game=${game}`}
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Player B</label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <SearchableSelect
                    name="playerB"
                    defaultValue={slugB || ''}
                    placeholder="Select Player B..."
                    searchPlaceholder="Search player IGN (e.g. Jonathan, Manya)..."
                    options={playerOptions}
                    searchUrl={`/api/compare/search?type=players&game=${game}`}
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#0A5FC4] text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-sm shrink-0 h-[42px] cursor-pointer"
                >
                  Compare
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Player vs Player Masthead */}
        {isSamePlayer ? (
          <div className="rounded-3xl border border-amber-400/40 bg-amber-400/10 p-10 text-center">
            <Swords className="mx-auto h-8 w-8 text-amber-500" />
            <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Both slots have the same player
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
              Pick two different players in the selectors above to run the head-to-head comparison.
            </p>
          </div>
        ) : !playersComparable ? (
          <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 p-10 text-center">
            <Crosshair className="mx-auto h-8 w-8 text-rose-500" />
            <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Different game families cannot be compared
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
              {playerA?.ign} plays {playerA?.game?.name ?? 'another game'} and {playerB?.ign} plays{' '}
              {playerB?.game?.name ?? 'another game'}. Only players from the same family — for example
              BGMI, PUBG Mobile and Game for Peace — can be compared.
            </p>
          </div>
        ) : !playerA || !playerB ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 p-10 text-center dark:border-slate-700 dark:bg-white/[0.02]">
            <Crosshair className="mx-auto h-8 w-8 text-slate-400 opacity-50" />
            <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Pick two players to compare
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
              Select Player A and Player B above, then hit Compare for lobby encounters, career
              benchmarks, and head-to-head fragging metrics.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="grid grid-cols-1 sm:grid-cols-11 gap-6 items-center">
                {/* Player A */}
                <div className="sm:col-span-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center overflow-hidden dark:border-white/10 dark:bg-[#141e33]">
                    {playerA.avatarUrl ? (
                      <Image src={playerA.avatarUrl} alt={playerA.ign} fill className="object-contain object-bottom" />
                    ) : (
                      <span className="text-2xl font-black text-[#0A5FC4]">{playerA.ign.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                      {playerA.currentTeam?.name || 'Free Agent'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                      {playerA.ign}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{playerA.role || 'Athlete'}</p>
                    <Link href={gameHref(playerAGame, `players/${playerA.slug}`)} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                      View Profile <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* VS badge */}
                <div className="sm:col-span-1 flex flex-col items-center justify-center text-center">
                  <span className="h-12 w-12 rounded-full border-2 border-[#0A5FC4]/30 bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300 flex items-center justify-center font-black text-sm shadow-sm">
                    VS
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-2">{sharedMatchesCount} Shared</span>
                </div>

                {/* Player B */}
                <div className="sm:col-span-5 flex flex-col sm:flex-row-reverse items-center gap-4 text-center sm:text-right">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center overflow-hidden dark:border-white/10 dark:bg-[#141e33]">
                    {playerB.avatarUrl ? (
                      <Image src={playerB.avatarUrl} alt={playerB.ign} fill className="object-contain object-bottom" />
                    ) : (
                      <span className="text-2xl font-black text-[#0A5FC4]">{playerB.ign.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                      {playerB.currentTeam?.name || 'Free Agent'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                      {playerB.ign}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{playerB.role || 'Athlete'}</p>
                    <Link href={gameHref(playerBGame, `players/${playerB.slug}`)} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                      View Profile <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Rank leads the sheet — it is the one durable verdict on the pair */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm dark:border-white/10">
              <KraftonRankBand
                labelA={playerA.ign}
                rankA={playerStandingA?.rank ?? null}
                labelB={playerB.ign}
                rankB={playerStandingB?.rank ?? null}
              />
            </section>

            {/* Direct Head-to-Head Encounters */}
            <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Swords className="h-4.5 w-4.5 text-[#0A5FC4] dark:text-blue-300" />
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Direct Lobby Encounters
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">{sharedMatchesCount} Shared Matches</span>
              </div>

              <div className="p-6">
                {sharedMatchesCount > 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className={elimsSharedA >= elimsSharedB ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                          {playerA.ign}: {elimsSharedA} Elims
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Head-to-Head Eliminations</span>
                        <span className={elimsSharedB >= elimsSharedA ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                          {playerB.ign}: {elimsSharedB} Elims
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                        <div
                          className="bg-[#0A5FC4] h-full transition-all"
                          style={{
                            width: `${
                              elimsSharedA + elimsSharedB > 0
                                ? (elimsSharedA / (elimsSharedA + elimsSharedB)) * 100
                                : 50
                            }%`,
                          }}
                        />
                        <div
                          className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
                          style={{
                            width: `${
                              elimsSharedA + elimsSharedB > 0
                                ? (elimsSharedB / (elimsSharedA + elimsSharedB)) * 100
                                : 50
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No shared match lobbies recorded between {playerA.ign} and {playerB.ign} yet.
                  </p>
                )}
              </div>
            </section>

            <FormCompare
              labelA={playerA.ign}
              labelB={playerB.ign}
              formA={playerFormA}
              formB={playerFormB}
              unit="elims"
              highlightLabel="Top game"
            />

            {/* Lifetime Career Benchmarks Table */}
            <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-[#0A5FC4] dark:text-blue-300" />
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Career Production Benchmarks
                  </h3>
                </div>
              </div>

              <BenchmarkTable labelA={playerA.ign} labelB={playerB.ign} rows={playerRows} />
              <BenchmarkNote period={rangePeriod} />
            </section>

            <ConsistencyCompare
              labelA={playerA.ign}
              labelB={playerB.ign}
              zeroA={playerResultsA.filter((row) => row.playerElims === 0).length}
              zeroB={playerResultsB.filter((row) => row.playerElims === 0).length}
              fiveA={playerResultsA.filter((row) => row.playerElims >= 5).length}
              fiveB={playerResultsB.filter((row) => row.playerElims >= 5).length}
              gamesA={playerResultsA.length}
              gamesB={playerResultsB.length}
              unit="Elim"
            />

            <EventOverlap labelA={playerA.ign} labelB={playerB.ign} rows={sharedEvents} />

            <MapGrid
              labelA={playerA.ign}
              labelB={playerB.ign}
              mapsA={playerMapsA}
              mapsB={playerMapsB}
              elimsLabel="Elims"
            />
          </>
        )}
      </div>
    </div>
  );
}
