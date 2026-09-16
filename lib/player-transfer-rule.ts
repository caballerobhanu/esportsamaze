/**
 * The single rule for a movement's origin team.
 *
 * `Transfer` rows are admin-recorded history (imports never write them), so the
 * only derived value left is each row's `fromTeamId`. Pure module: no Prisma, no
 * React (unit-tested in tests/player-transfers.test.ts).
 */

export type PlayerTransferType = 'JOINED' | 'LEFT' | 'LOANED' | 'BENCHED';

export interface TransferRecord {
  id: string;
  type: PlayerTransferType;
  /** Destination team for JOINED/LOANED/BENCHED; the team left for LEFT. */
  teamId: string;
  date: Date;
  /** Falls back to the id when two rows share a date (same-instant tiebreak). */
  createdAt?: Date | null;
}

function timeOf(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Chronological order with a deterministic same-instant tiebreak. The tiebreak
 * matters because two moves recorded on the same day are exactly the ambiguity
 * that lets the ledger and the cached team disagree: without it the fold below
 * would depend on whatever order the database happened to return.
 */
export function orderTransfers<T extends TransferRecord>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => {
    const byDate = timeOf(a.date) - timeOf(b.date);
    if (byDate !== 0) return byDate;
    const byCreated = timeOf(a.createdAt) - timeOf(b.createdAt);
    if (byCreated !== 0) return byCreated;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * The team each movement departed from, keyed by transfer id.
 *
 * A decisive movement (JOINED/LOANED/BENCHED) departs from the team of the
 * previous decisive movement — or from nothing, if it is the earliest. LEFT
 * records a departure, so it never has an origin.
 *
 * Derived rather than entered: the origin is a function of the timeline, so
 * importing a June event after an August one (or re-dating a row) can never
 * leave a movement claiming it came from a team it actually went to later.
 */
export function deriveTransferOrigins(
  rows: readonly TransferRecord[],
): Map<string, string | null> {
  const origins = new Map<string, string | null>();
  let lastTeam: string | null = null;
  for (const transfer of orderTransfers(rows)) {
    if (transfer.type === 'LEFT') {
      origins.set(transfer.id, null);
    } else {
      origins.set(transfer.id, lastTeam);
      lastTeam = transfer.teamId;
    }
  }
  return origins;
}
