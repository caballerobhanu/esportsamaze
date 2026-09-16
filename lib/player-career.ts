/**
 * Career history derived from event participation.
 *
 * The transfer ledger is admin-only history, so it can no longer be the source of
 * a player's tenure list — most players have no recorded transfer. Their real
 * record is the events they appeared in: a run of consecutive events for the same
 * team is one tenure, and a change of team is the boundary between two.
 *
 * Pure module: no Prisma, no React (unit-tested in tests/player-career.test.ts).
 */

export interface CareerAppearance {
  teamId: string;
  /** The event's start date — the date this appearance belongs to. */
  date: Date;
  /** Staff role recorded on the event roster, when any. */
  role?: string | null;
}

export interface CareerSpan {
  start: Date | null;
  /** Null while the player is still on the team. */
  end: Date | null;
}

export interface CareerTeam {
  teamId: string;
  roles: string[];
  spans: CareerSpan[];
}

function timeOf(date: Date | null): number {
  return date ? date.getTime() : 0;
}

/**
 * Folds appearances into per-team tenures, sorted most recent first.
 *
 * A tenure ends when the player next appears for a different team (so the span
 * reads "Jun 2026 – Aug 2026"), or stays open when it is the player's current
 * team — a player who was last seen elsewhere and never returned is closed at
 * their final appearance rather than shown as "Present".
 */
export function buildCareerHistory(
  appearances: readonly CareerAppearance[],
  currentTeamId: string | null,
): CareerTeam[] {
  const ordered = appearances
    .filter((a) => a.teamId && !Number.isNaN(a.date.getTime()))
    .slice()
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() || (a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0),
    );

  // Consecutive appearances for one team collapse into a single run.
  const runs: { teamId: string; start: Date; last: Date; end: Date | null }[] = [];
  for (const appearance of ordered) {
    const current = runs[runs.length - 1];
    if (current && current.teamId === appearance.teamId) {
      current.last = appearance.date;
    } else {
      runs.push({ teamId: appearance.teamId, start: appearance.date, last: appearance.date, end: null });
    }
  }

  for (let i = 0; i < runs.length; i += 1) {
    const next = runs[i + 1];
    if (next) {
      runs[i].end = next.start;
    } else {
      runs[i].end = runs[i].teamId === currentTeamId ? null : runs[i].last;
    }
  }

  const byTeam = new Map<string, CareerTeam>();
  for (const run of runs) {
    const entry = byTeam.get(run.teamId) ?? { teamId: run.teamId, roles: [], spans: [] };
    entry.spans.push({ start: run.start, end: run.end });
    byTeam.set(run.teamId, entry);
  }

  for (const appearance of ordered) {
    if (!appearance.role) continue;
    const entry = byTeam.get(appearance.teamId);
    if (entry && !entry.roles.includes(appearance.role)) entry.roles.push(appearance.role);
  }

  for (const entry of byTeam.values()) {
    entry.spans.sort((a, b) => {
      if (!a.end && b.end) return -1;
      if (a.end && !b.end) return 1;
      return timeOf(b.start) - timeOf(a.start);
    });
  }

  return [...byTeam.values()].sort((a, b) => {
    const aLatest = a.spans[0];
    const bLatest = b.spans[0];
    if (!aLatest?.end && bLatest?.end) return -1;
    if (aLatest?.end && !bLatest?.end) return 1;
    return (timeOf(bLatest?.end) || timeOf(bLatest?.start)) - (timeOf(aLatest?.end) || timeOf(aLatest?.start));
  });
}
