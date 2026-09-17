/**
 * Classification of prize-distribution rows.
 *
 * A distribution row is either a PLACEMENT on the prize ladder (rank → money)
 * or an AWARD (a standalone honour such as "Best IGL"). Which one it is decides
 * two things that must never disagree:
 *
 *   - whether its cash counts toward a team's prize money (placements do), and
 *   - whether it appears in the trophy cabinet as an honour (awards do).
 *
 * `kind` is the stored answer and is authoritative. Rows written before `kind`
 * existed are classified from their label, which is why `parseRankRange` has to
 * understand every shape the old free-text ranks were entered in — including the
 * bands ("5th - 8th", "Top 4") the old check missed, which is how placements
 * ended up in the awards cabinet.
 *
 * Pure module: no Prisma, no React, no IO.
 */

export type PrizeRowKind = 'PLACEMENT' | 'AWARD';

export interface PrizeRowLike {
  kind?: unknown;
  from?: unknown;
  to?: unknown;
  rank?: unknown;
}

export interface RankRange {
  from: number;
  /** Equal to `from` for a single rank; higher for a shared band. */
  to: number;
}

function toOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/**
 * Reads a rank out of any shape this field has been stored in: a number, "3",
 * "1st", "21th Place", "Rank 4", "2nd position", "5th - 8th", "1st to 2nd",
 * "Top 4". Returns null for anything that is not a finishing position, which is
 * what makes an award label ("Best IGL") classifiable.
 */
export function parseRankRange(value: unknown): RankRange | null {
  if (typeof value === 'number') {
    const n = Math.trunc(value);
    return Number.isFinite(n) && n >= 1 ? { from: n, to: n } : null;
  }
  if (typeof value !== 'string') return null;

  const text = value.trim().toLowerCase();
  if (!text) return null;

  const band = (from: number, to: number): RankRange | null =>
    Number.isFinite(from) && Number.isFinite(to) && from >= 1 && to >= from ? { from, to } : null;

  // "top 4" is ranks 1-4; "top 5-8" is a band inside the top. Trailing wording is
  // allowed — a real label reads "Top 6 teams".
  const top = text.match(/^top\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\b/);
  if (top) {
    const first = Number(top[1]);
    return top[2] ? band(first, Number(top[2])) : band(1, first);
  }

  // "5th - 8th place", "1st to 2nd", "4-6"
  const range = text.match(
    /(\d{1,3})\s*(?:st|nd|rd|th)?\s*(?:place|position)?\s*(?:[-–—]|\bto\b)\s*(\d{1,3})/
  );
  if (range) return band(Number(range[1]), Number(range[2]));

  /*
   * "1st", "21th Place", "2nd position", "Rank 4" — and anything descriptive
   * after it, because the stored wording reads "1st Place (Champion)".
   *
   * The ordinal or the word place/position is required rather than optional: on
   * its own, a leading number proves nothing, and "2026 Season" must not read as
   * rank 2026.
   */
  const numbered = text.match(
    /^\s*#?\s*(\d{1,3})\s*(?:st|nd|rd|th)\b|^\s*#?\s*(\d{1,3})\s*(?:place|position)\b|^\s*rank\s*(\d{1,3})\b/
  );
  if (numbered) {
    const value = Number(numbered[1] ?? numbered[2] ?? numbered[3]);
    return band(value, value);
  }

  // A bare number, and nothing else.
  const bare = text.match(/^\s*#?\s*(\d{1,3})\s*$/);
  if (bare) return band(Number(bare[1]), Number(bare[1]));

  return null;
}

/**
 * The label to store for a placement. Kept in the row so the podium and the
 * ladder can print it without re-deriving, and so a row written today is still
 * readable by the label fallback.
 */
export function rankLabel(from: number, to?: number | null): string {
  if (to != null && to > from) return `${toOrdinal(from)} - ${toOrdinal(to)}`;
  return toOrdinal(from);
}

/**
 * True when a label reads as a finishing position. An empty label counts as a
 * placement: an unlabelled row is an unfinished ladder entry, not an honour.
 */
export function isPlacementLabel(label: unknown): boolean {
  if (typeof label !== 'string') return false;
  if (!label.trim()) return true;
  return parseRankRange(label) !== null;
}

/**
 * The stored `kind` when present, otherwise the label. Both the prizepool tab
 * and the trophy cabinet call this, so they cannot disagree about a row.
 */
export function classifyPrizeRow(row: PrizeRowLike): PrizeRowKind {
  if (row.kind === 'PLACEMENT' || row.kind === 'AWARD') return row.kind;

  if (typeof row.from === 'number' && Number.isFinite(row.from) && row.from >= 1) {
    return 'PLACEMENT';
  }

  return isPlacementLabel(row.rank) ? 'PLACEMENT' : 'AWARD';
}

/** The numeric range a row covers, or null for an award. */
export function prizeRowRange(row: PrizeRowLike): RankRange | null {
  if (classifyPrizeRow(row) === 'AWARD') return null;

  const from = typeof row.from === 'number' && Number.isFinite(row.from) ? Math.trunc(row.from) : null;
  if (from != null && from >= 1) {
    const to = typeof row.to === 'number' && Number.isFinite(row.to) ? Math.trunc(row.to) : from;
    return to >= from ? { from, to } : { from, to: from };
  }

  return parseRankRange(row.rank);
}
