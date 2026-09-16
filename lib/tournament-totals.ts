/**
 * Reported tournament totals — the DAY → STAGE → EVENT ladder.
 *
 * Match-free by construction: these rows have no relation to Match / MatchGame /
 * MatchPlayerStat, so they are never averaged per game and never summed with
 * match data. They are read team-wise and player-wise only.
 *
 * The ladder rolls UPWARD and children win:
 *
 *   - a stage level is the sum of its day rows when any exist, otherwise the
 *     stage row that was entered;
 *   - the event level is the sum of its stage levels when any exist, otherwise
 *     the event row that was entered.
 *
 * Because a parent is only ever read from its own row when it has NO children, a
 * parent can never be summed together with its own children — the double-count
 * this model exists to prevent. Entering both is flagged at input, never merged.
 *
 * Only summable values are stored (totals and counts); averages are derived
 * downstream. A metric missing from some children is reported as partial rather
 * than silently under-summed.
 *
 * Pure module: no Prisma, no React (unit-tested in tests/tournament-totals.test.ts).
 */

import type { MetricAggregate } from './player-stats';

export type AggregateScopeValue = 'DAY' | 'STAGE' | 'EVENT';

export interface SliceIdentity {
  scope: AggregateScopeValue;
  /** The stage this slice belongs to; null when the event defines no stages. */
  stageId: string | null;
  /** Free-text slice label: "Day 3", "Grand Finals", "" for a whole event. */
  label: string;
}

/**
 * Stored identity of a slice. Kept as a string because a nullable `stageId`
 * cannot take part in a Postgres unique index — NULLs are distinct, so duplicate
 * slices would slip through unnoticed.
 */
export function sliceKey(identity: SliceIdentity): string {
  if (identity.scope === 'EVENT') return 'EVENT';
  if (identity.scope === 'STAGE') return `STAGE:${identity.stageId ?? '-'}`;
  return `DAY:${identity.stageId ?? '-'}:${identity.label.trim().toLowerCase()}`;
}

export interface ReportedTotalsRow extends SliceIdentity {
  metrics: Record<string, number | null>;
}

export interface ResolvedTotals {
  scope: AggregateScopeValue;
  stageId: string | null;
  label: string;
  /** True when this level was summed from its children rather than entered. */
  derived: boolean;
  metrics: Record<string, MetricAggregate>;
}

function asEntered(metrics: Record<string, number | null>): Record<string, MetricAggregate> {
  const out: Record<string, MetricAggregate> = {};
  for (const [key, value] of Object.entries(metrics)) {
    out[key] = { value, samples: value === null ? 0 : 1, total: 1 };
  }
  return out;
}

/** Sum child totals per metric, recording how many children carried each one. */
function sumChildren(children: readonly ResolvedTotals[]): Record<string, MetricAggregate> {
  const out: Record<string, MetricAggregate> = {};
  const keys = new Set<string>();
  for (const child of children) for (const key of Object.keys(child.metrics)) keys.add(key);

  for (const key of keys) {
    let sum = 0;
    let samples = 0;
    for (const child of children) {
      const metric = child.metrics[key];
      if (!metric || metric.value === null) continue;
      sum += metric.value;
      samples += 1;
    }
    out[key] = { value: samples > 0 ? sum : null, samples, total: children.length };
  }
  return out;
}

/**
 * Resolves the whole ladder for one entity (a team or a player).
 *
 * Returns every day slice as entered, each stage that is either entered or
 * derivable from days, and the event when it is entered or derivable from stages.
 * A level that cannot be resolved is simply absent — a partial ladder must not
 * be presented as a complete total.
 */
export function resolveTotalsLadder(rows: readonly ReportedTotalsRow[]): ResolvedTotals[] {
  const entered = new Map<string, ReportedTotalsRow>();
  for (const row of rows) entered.set(sliceKey(row), row);

  const resolved: ResolvedTotals[] = [];
  const stageKeys = new Set<string>();

  // Day slices are always as entered.
  for (const row of rows) {
    if (row.scope !== 'DAY') continue;
    stageKeys.add(row.stageId ?? '');
    resolved.push({
      scope: 'DAY',
      stageId: row.stageId,
      label: row.label,
      derived: false,
      metrics: asEntered(row.metrics),
    });
  }

  // Stage slices: entered, plus any stage that has day rows — days win.
  const stageIds = new Set<string>();
  for (const row of rows) {
    if (row.scope === 'STAGE') stageIds.add(row.stageId ?? '');
    if (row.scope === 'DAY') stageIds.add(row.stageId ?? '');
  }

  const stages: ResolvedTotals[] = [];
  for (const stageId of stageIds) {
    const days = resolved.filter((slice) => slice.scope === 'DAY' && (slice.stageId ?? '') === stageId);
    const stageRow = entered.get(sliceKey({ scope: 'STAGE', stageId: stageId || null, label: '' }));

    if (days.length > 0) {
      stages.push({
        scope: 'STAGE',
        stageId: stageId || null,
        label: stageRow?.label ?? '',
        derived: true,
        metrics: sumChildren(days),
      });
      continue;
    }
    if (stageRow) {
      stages.push({
        scope: 'STAGE',
        stageId: stageRow.stageId,
        label: stageRow.label,
        derived: false,
        metrics: asEntered(stageRow.metrics),
      });
    }
  }
  resolved.push(...stages);

  // Event slice: sum of stages when any exist, else the entered event row.
  const eventRow = entered.get('EVENT');
  if (stages.length > 0) {
    resolved.push({
      scope: 'EVENT',
      stageId: null,
      label: eventRow?.label ?? '',
      derived: true,
      metrics: sumChildren(stages),
    });
  } else if (eventRow) {
    resolved.push({
      scope: 'EVENT',
      stageId: null,
      label: eventRow.label,
      derived: false,
      metrics: asEntered(eventRow.metrics),
    });
  }

  return resolved;
}

/**
 * The granularity an event's totals were actually captured at, so a surface can
 * say "day-wise" instead of implying the figures are per game. Days win over
 * stages because the ladder rolls upward: a stage is read from its days, and the
 * event from its stages, so the deepest entered level is the honest label.
 */
export function reportedLevel(rows: readonly ReportedTotalsRow[]): AggregateScopeValue {
  if (rows.some((row) => row.scope === 'DAY')) return 'DAY';
  if (rows.some((row) => row.scope === 'STAGE')) return 'STAGE';
  return 'EVENT';
}

/**
 * Resolves one entity's EVENT-level total per tournament, keyed by tournament id.
 *
 * Used by profiles, where a team or player spans several events: an event with no
 * reported rows is simply absent from the map — never present as a zero.
 */
export function resolveEventTotals(
  rows: readonly (ReportedTotalsRow & { tournamentId: string })[],
): Map<string, { metrics: Record<string, MetricAggregate>; derived: boolean; level: AggregateScopeValue }> {
  const byEvent = new Map<string, ReportedTotalsRow[]>();
  for (const row of rows) {
    const list = byEvent.get(row.tournamentId) ?? [];
    list.push(row);
    byEvent.set(row.tournamentId, list);
  }

  const resolved = new Map<
    string,
    { metrics: Record<string, MetricAggregate>; derived: boolean; level: AggregateScopeValue }
  >();
  for (const [tournamentId, list] of byEvent) {
    const event = resolveTotalsLadder(list).find((slice) => slice.scope === 'EVENT');
    if (event) {
      resolved.set(tournamentId, {
        metrics: event.metrics,
        derived: event.derived,
        level: reportedLevel(list),
      });
    }
  }
  return resolved;
}

/**
 * Computed match data always wins; a reported total only fills what computed
 * data does not cover. Used wherever both sources can describe the same metric.
 */
export function preferComputed<T>(computed: T | null | undefined, reported: T | null | undefined): T | null {
  if (computed !== null && computed !== undefined) return computed;
  return reported ?? null;
}
