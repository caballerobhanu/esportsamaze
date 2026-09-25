import prisma from '@/lib/prisma';
import { deriveTournamentStatus } from '@/lib/tournament-math';

type DerivedStatus = ReturnType<typeof deriveTournamentStatus>;

/**
 * Statuses the calendar can never take an event out of.
 *
 * A finished event stays COMPLETED and a called-off one stays CANCELED. Neither
 * is a date to re-derive, and re-deriving would undo a decision a person made —
 * once an event is over, it is over.
 */
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELED']);

/**
 * Which stored statuses no longer match their dates. Pure, so the rule can be
 * tested without a database.
 */
export function statusRefreshes(
  rows: readonly {
    id: string;
    status: string;
    startDate: Date | string;
    endDate: Date | string;
  }[]
): { id: string; from: string; to: DerivedStatus }[] {
  return rows
    .filter((row) => !TERMINAL_STATUSES.has(row.status))
    .map((row) => ({
      id: row.id,
      from: row.status,
      to: deriveTournamentStatus(row.startDate, row.endDate),
    }))
    .filter((row) => row.to !== row.from);
}

/**
 * Brings every unfinished event's status up to date from its dates.
 *
 * Called when the admin opens the tournaments list — the one place these rows are
 * read as a set — so an event the calendar has moved past (one that started, or
 * ended, since it was last saved) is corrected without a scheduled job.
 *
 * Only unfinished events move on. A COMPLETED or CANCELED row is left exactly as
 * it is, however its dates read.
 */
export async function refreshDerivedTournamentStatuses(): Promise<
  { id: string; from: string; to: DerivedStatus }[]
> {
  const rows = await prisma.tournament.findMany({
    select: { id: true, status: true, startDate: true, endDate: true },
  });

  const moved = statusRefreshes(rows);
  if (moved.length === 0) return [];

  await prisma.$transaction(
    moved.map((row) => prisma.tournament.update({ where: { id: row.id }, data: { status: row.to } }))
  );

  return moved;
}
