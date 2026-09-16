/**
 * Detailed per-event metrics — the telemetry beyond matches and eliminations.
 *
 * These numbers exist at different levels per event: some events carry them on
 * every scorecard (BMPS 2026), others only as reported day / stage / event
 * totals (PMWC 2026), and some carry neither. A metric is therefore resolved
 * PER METRIC — match-wise when the scorecards actually recorded it, otherwise
 * from the reported ladder — and the row is labelled with the level it came
 * from. The two sources are never summed or averaged together, and a metric
 * missing from both stays absent rather than printing as a zero.
 *
 * Pure module: no Prisma, no React.
 */

import type { AggregateScopeValue } from './tournament-totals';
import type { MetricAggregate } from './player-stats';

/** Where a row's numbers came from: a scorecard, or a reported slice level. */
export type MetricSource = 'MATCH' | AggregateScopeValue;

/** How match-wise rows roll up into one event figure. */
export type MetricAggregation = 'sum' | 'max';

export interface MetricColumn {
  key: string;
  label: string;
  /** Defaults to a sum; `max` is for a best-of (longest elimination). */
  aggregate?: MetricAggregation;
  /** Overrides the default thousands-separated number. */
  format?: (value: number) => string;
}

/** A match-wise accessor. Labels live on `MetricColumn`, not here. */
export interface MetricSpec<T> {
  key: string;
  aggregate?: MetricAggregation;
  pick: (row: T) => number | null | undefined;
}

export interface EventMetricCoverage {
  samples: number;
  total: number;
}

export interface EventMetricRow {
  tournamentId: string;
  tournamentName: string;
  tournamentShortName: string | null;
  tournamentSeries: string | null;
  tournamentSeason: string | null;
  tournamentSlug: string;
  startDateMs: number | null;
  /** Present on player rows; omitted when the entity IS the team. */
  teamName?: string | null;
  teamSlug?: string | null;
  level: MetricSource;
  /** Summed from child slices rather than entered at this level. */
  derived: boolean;
  /** At least one metric was not recorded everywhere it could have been. */
  partial: boolean;
  metrics: Record<string, number | null>;
  /** Where EACH metric came from — a row can be part scorecard, part reported. */
  sources: Record<string, MetricSource>;
  /** Match-wise sample size per metric — the honest denominator. */
  coverage: Record<string, EventMetricCoverage>;
}

/** Total survived, from summed seconds. */
export function formatSurvivalTotal(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Mean survival in one game, to the second. A minute-rounded average can render
 * two different figures identically, which then reads as a tie that still shows
 * a winner's star.
 */
export function formatSurvivalAverage(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secondsPart = Math.round(seconds % 60);
  return `${minutes}m ${secondsPart}s`;
}

/**
 * Player columns. The two leading ones are the scorecard basics: they carry an
 * event that has no scorecards at all, and are dropped for any event that does.
 */
export const PLAYER_METRIC_COLUMNS: MetricColumn[] = [
  { key: 'matches', label: 'MP' },
  { key: 'playerElims', label: 'Elims' },
  { key: 'damage', label: 'Damage' },
  { key: 'assists', label: 'Assists' },
  { key: 'knockouts', label: 'Knockouts' },
  { key: 'survivalTime', label: 'Survival', format: formatSurvivalTotal },
  { key: 'grenadeElims', label: 'Grenade Elims' },
  { key: 'utilitiesTotal', label: 'Utilities' },
];

/** Team columns: the same telemetry, plus the scoring a scorecard-less event needs. */
export const TEAM_METRIC_COLUMNS: MetricColumn[] = [
  { key: 'placement', label: 'Place' },
  { key: 'matches', label: 'MP' },
  { key: 'wwcd', label: 'WWCD' },
  { key: 'placePoints', label: 'Place Pts' },
  { key: 'elimsPoints', label: 'Elims Pts' },
  { key: 'bonusPoints', label: 'Bonus' },
  { key: 'totalPoints', label: 'Total' },
  { key: 'damage', label: 'Damage' },
  { key: 'assists', label: 'Assists' },
  { key: 'knockouts', label: 'Knockouts' },
  { key: 'survivalTime', label: 'Survival', format: formatSurvivalTotal },
  { key: 'grenadeElims', label: 'Grenade Elims' },
  { key: 'utilitiesTotal', label: 'Utilities' },
];

/** The detail fields every scorecard carries, player row or team row. */
export interface DetailMetricFields {
  damage: number | null;
  assists: number | null;
  knockouts: number | null;
  survivalTime: number | null;
  grenadeElims: number | null;
  utilitiesTotal: number | null;
}

/** One list, so a profile card and a compare table can never label differently. */
export const DETAIL_METRIC_SPECS: MetricSpec<DetailMetricFields>[] = [
  { key: 'damage', pick: (row) => row.damage },
  { key: 'assists', pick: (row) => row.assists },
  { key: 'knockouts', pick: (row) => row.knockouts },
  { key: 'survivalTime', pick: (row) => row.survivalTime },
  { key: 'grenadeElims', pick: (row) => row.grenadeElims },
  { key: 'utilitiesTotal', pick: (row) => row.utilitiesTotal },
];

/**
 * The detail metrics as a compare sheet — derived from the player column list so
 * the labels and formats cannot drift from the profile cards.
 */
export const COMPARE_METRIC_COLUMNS: MetricColumn[] = PLAYER_METRIC_COLUMNS.filter((column) =>
  DETAIL_METRIC_SPECS.some((spec) => spec.key === column.key),
);

/** Ladder metrics the first card already owns whenever scorecards exist. */
export const PLAYER_BASIC_KEYS = ['matches', 'playerElims'] as const;
export const TEAM_BASIC_KEYS = [
  'placement',
  'matches',
  'wwcd',
  'placePoints',
  'elimsPoints',
  'bonusPoints',
  'totalPoints',
] as const;

export interface EventMatchAggregate {
  /** Games the entity has a scorecard for in this event. */
  games: number;
  metrics: Record<string, number | null>;
  coverage: Record<string, EventMetricCoverage>;
}

/**
 * Rolls one entity's scorecards up per event, metric by metric.
 *
 * A metric's value is null unless at least one row recorded it, and its
 * coverage carries how many rows did — so "damage over 41 of 84 games" is
 * knowable rather than implied.
 */
export function aggregateMetricsByEvent<T>(
  rows: readonly T[],
  tournamentIdOf: (row: T) => string | null,
  specs: readonly MetricSpec<T>[],
): Map<string, EventMatchAggregate> {
  const byEvent = new Map<string, { games: number; sums: Record<string, number>; maxes: Record<string, number>; samples: Record<string, number> }>();

  for (const row of rows) {
    const tournamentId = tournamentIdOf(row);
    if (!tournamentId) continue;
    let entry = byEvent.get(tournamentId);
    if (!entry) {
      entry = { games: 0, sums: {}, maxes: {}, samples: {} };
      byEvent.set(tournamentId, entry);
    }
    entry.games += 1;
    for (const spec of specs) {
      const value = spec.pick(row);
      if (value === null || value === undefined || !Number.isFinite(value)) continue;
      entry.samples[spec.key] = (entry.samples[spec.key] ?? 0) + 1;
      if (spec.aggregate === 'max') {
        entry.maxes[spec.key] = Math.max(entry.maxes[spec.key] ?? value, value);
      } else {
        entry.sums[spec.key] = (entry.sums[spec.key] ?? 0) + value;
      }
    }
  }

  const aggregates = new Map<string, EventMatchAggregate>();
  for (const [tournamentId, entry] of byEvent) {
    const metrics: Record<string, number | null> = {};
    const coverage: Record<string, EventMetricCoverage> = {};
    for (const spec of specs) {
      const samples = entry.samples[spec.key] ?? 0;
      const value = samples === 0 ? null : spec.aggregate === 'max' ? entry.maxes[spec.key] : entry.sums[spec.key];
      metrics[spec.key] = value ?? null;
      coverage[spec.key] = { samples, total: entry.games };
    }
    aggregates.set(tournamentId, { games: entry.games, metrics, coverage });
  }
  return aggregates;
}

export interface EventMetricIdentity {
  tournamentId: string;
  tournamentName: string;
  tournamentShortName: string | null;
  tournamentSeries: string | null;
  tournamentSeason: string | null;
  tournamentSlug: string;
  startDateMs: number | null;
  teamName?: string | null;
  teamSlug?: string | null;
}

/**
 * Merges the two sources into one row per event.
 *
 * Match-wise wins per metric; the ladder fills only what the scorecards did not
 * record. The ladder's basic keys (matches, eliminations, points) are dropped
 * from any event that has scorecards at all, because the first card already
 * carries them from a source that cannot disagree. A row is labelled `MATCH`
 * when any of its figures came from a scorecard, otherwise the ladder's level.
 */
export function mergeEventMetrics({
  matchAggregates,
  ladder,
  identityFor,
  basicKeys,
  columns,
}: {
  matchAggregates: Map<string, EventMatchAggregate>;
  ladder: Map<string, { metrics: Record<string, MetricAggregate>; derived: boolean; level: AggregateScopeValue }>;
  identityFor: (tournamentId: string) => EventMetricIdentity | null;
  basicKeys: readonly string[];
  columns: readonly MetricColumn[];
}): EventMetricRow[] {
  const allowed = new Set(columns.map((column) => column.key));
  const tournamentIds = new Set([...matchAggregates.keys(), ...ladder.keys()]);

  const rows: EventMetricRow[] = [];
  for (const tournamentId of tournamentIds) {
    const identity = identityFor(tournamentId);
    if (!identity) continue;

    const matchAggregate = matchAggregates.get(tournamentId);
    const ladderAggregate = ladder.get(tournamentId);
    const hasScorecards = Boolean(matchAggregate && matchAggregate.games > 0);

    const metrics: Record<string, number | null> = {};
    const sources: Record<string, MetricSource> = {};
    const coverage: Record<string, EventMetricCoverage> = {};
    let usedMatchWise = false;

    if (matchAggregate) {
      for (const [key, value] of Object.entries(matchAggregate.metrics)) {
        if (!allowed.has(key) || value === null) continue;
        metrics[key] = value;
        sources[key] = 'MATCH';
        coverage[key] = matchAggregate.coverage[key] ?? { samples: 0, total: matchAggregate.games };
        usedMatchWise = true;
      }
    }

    if (ladderAggregate) {
      for (const [key, aggregate] of Object.entries(ladderAggregate.metrics)) {
        if (!allowed.has(key) || metrics[key] !== undefined) continue;
        if (hasScorecards && basicKeys.includes(key)) continue;
        if (aggregate.value === null) continue;
        metrics[key] = aggregate.value;
        sources[key] = ladderAggregate.level;
        coverage[key] = { samples: aggregate.samples, total: aggregate.total };
      }
    }

    const presentKeys = Object.keys(metrics);
    if (presentKeys.length === 0) continue;

    rows.push({
      ...identity,
      level: usedMatchWise ? 'MATCH' : ladderAggregate?.level ?? 'EVENT',
      derived: usedMatchWise ? false : ladderAggregate?.derived ?? false,
      partial: presentKeys.some((key) => coverage[key] && coverage[key].samples < coverage[key].total),
      metrics,
      sources,
      coverage,
    });
  }

  rows.sort((a, b) => (b.startDateMs ?? 0) - (a.startDateMs ?? 0));
  return rows;
}
