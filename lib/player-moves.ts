/**
 * Moves derived from event participation.
 *
 * A player has moved only when they actually appear for a **different team in a
 * later event**. Deliberately:
 *
 *  - **Absence is not a departure.** A player missing from one event's roster may
 *    simply not have been listed there; that alone must not invent a move.
 *  - **A first appearance is not an arrival.** There is nothing before it to have
 *    come from, so a player who only ever appears for one team never "arrives".
 *
 * Admin-recorded transfers are layered on top by the caller; this module only
 * derives what the rosters themselves prove.
 *
 * Pure module: no Prisma, no React (unit-tested in tests/player-moves.test.ts).
 */

export interface Appearance {
  playerId: string;
  teamId: string;
  /** The event's start date. */
  date: Date;
}

export interface DerivedMove {
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  /** The date of the event the player turned out for the new team. */
  date: Date;
}

export function deriveMoves(appearances: readonly Appearance[]): DerivedMove[] {
  const byPlayer = new Map<string, Appearance[]>();
  for (const appearance of appearances) {
    const list = byPlayer.get(appearance.playerId);
    if (list) list.push(appearance);
    else byPlayer.set(appearance.playerId, [appearance]);
  }

  const moves: DerivedMove[] = [];
  for (const [playerId, list] of byPlayer) {
    const ordered = list
      .slice()
      .sort(
        (a, b) =>
          a.date.getTime() - b.date.getTime() ||
          (a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0),
      );

    for (let i = 1; i < ordered.length; i += 1) {
      const previous = ordered[i - 1];
      const current = ordered[i];
      if (previous.teamId === current.teamId) continue;
      moves.push({
        playerId,
        fromTeamId: previous.teamId,
        toTeamId: current.teamId,
        date: current.date,
      });
    }
  }
  return moves;
}
