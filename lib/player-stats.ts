/**
 * Coverage-aware player statistics.
 *
 * Event scorecards arrive in inconsistent shapes: BMPS 2026 carries damage,
 * headshots and survival on every row, BGMS 2026 carries eliminations only. So
 * every aggregate here reports HOW MUCH data produced it, and divides by the rows
 * that actually recorded the metric — never by all rows.
 *
 * "Not recorded" is null, never 0: a metric nobody logged reports `value: null`
 * with `samples: 0`, so a caller can show an em dash instead of inventing a zero.
 *
 * Day-wise and whole-event summaries do NOT come through here — they arrive as
 * reported totals in their own tables and are never mixed with match-wise rows.
 *
 * Pure module: no Prisma, no React (unit-tested in tests/player-stats.test.ts).
 */

/** A value plus the evidence behind it. */
export interface MetricAggregate {
  value: number | null;
  /** Rows that actually recorded the metric — the honest denominator. */
  samples: number;
  /** Rows considered. */
  total: number;
}

const isRecorded = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Eliminations, tolerating the legacy `kills` alias importers still write. */
export function eliminations(row: {
  playerElims: number | null;
  kills: number | null;
}): number {
  return Math.max(row.playerElims ?? 0, row.kills ?? 0);
}

/** Mean of a metric across the rows that recorded it. Null when none did. */
export function averageRecorded<T>(
  rows: readonly T[],
  pick: (row: T) => number | null | undefined,
): MetricAggregate {
  let sum = 0;
  let samples = 0;
  for (const row of rows) {
    const value = pick(row);
    if (!isRecorded(value)) continue;
    sum += value;
    samples += 1;
  }
  return { value: samples > 0 ? sum / samples : null, samples, total: rows.length };
}

/** Sum of a metric across the rows that recorded it. Null when none did. */
export function sumRecorded<T>(
  rows: readonly T[],
  pick: (row: T) => number | null | undefined,
): MetricAggregate {
  let sum = 0;
  let samples = 0;
  for (const row of rows) {
    const value = pick(row);
    if (!isRecorded(value)) continue;
    sum += value;
    samples += 1;
  }
  return { value: samples > 0 ? sum : null, samples, total: rows.length };
}

/** Largest recorded value, with its row. Null when none recorded it. */
export function maxRecorded<T>(
  rows: readonly T[],
  pick: (row: T) => number | null | undefined,
): { value: number | null; samples: number; total: number; row: T | null } {
  let best: number | null = null;
  let bestRow: T | null = null;
  let samples = 0;
  for (const row of rows) {
    const value = pick(row);
    if (!isRecorded(value)) continue;
    samples += 1;
    if (best === null || value > best) {
      best = value;
      bestRow = row;
    }
  }
  return { value: best, samples, total: rows.length, row: bestRow };
}

/** How many rows recorded a truthy flag. Null value when nothing was recorded. */
export function countFlagged<T>(
  rows: readonly T[],
  pick: (row: T) => boolean | null | undefined,
): MetricAggregate {
  let hits = 0;
  let samples = 0;
  for (const row of rows) {
    const value = pick(row);
    if (value === null || value === undefined) continue;
    samples += 1;
    if (value) hits += 1;
  }
  return { value: samples > 0 ? hits : null, samples, total: rows.length };
}

/** Share of rows (0–1) whose recorded value satisfies a test. Null when none did. */
export function shareRecorded<T>(
  rows: readonly T[],
  pick: (row: T) => number | null | undefined,
  test: (value: number) => boolean,
): MetricAggregate {
  let hits = 0;
  let samples = 0;
  for (const row of rows) {
    const value = pick(row);
    if (!isRecorded(value)) continue;
    samples += 1;
    if (test(value)) hits += 1;
  }
  return { value: samples > 0 ? hits / samples : null, samples, total: rows.length };
}

export interface MetricSpec<T> {
  key: string;
  label: string;
  pick: (row: T) => number | null | undefined;
}

export interface MetricCoverage {
  key: string;
  label: string;
  samples: number;
  total: number;
}

/**
 * Which metrics an event actually recorded, so the UI can say "damage — not
 * recorded" instead of showing a number derived from half the data.
 */
export function metricCoverage<T>(rows: readonly T[], specs: MetricSpec<T>[]): MetricCoverage[] {
  return specs.map((spec) => {
    let samples = 0;
    for (const row of rows) if (isRecorded(spec.pick(row))) samples += 1;
    return { key: spec.key, label: spec.label, samples, total: rows.length };
  });
}
