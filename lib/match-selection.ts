/**
 * Which fixture a matches surface opens on, and which stage a match belongs to.
 *
 * Pure and React-free so both rules can be pinned by tests: on a rendered page the
 * difference only shows up when a stage happens to contain an unplayed fixture,
 * which is exactly the case that used to open an empty scorecard.
 */

/** The shape these rules need — satisfied by `MatchLite` and by a bare test fixture. */
export interface SelectableMatch {
  id: string;
  matchNumber?: number | null;
  teamResults?: readonly unknown[] | null;
}

/** True when a match actually carries a scorecard. */
export function matchHasResults(match: SelectableMatch): boolean {
  return (match.teamResults?.length ?? 0) > 0;
}

/**
 * The match a stage should open on.
 *
 * With results present, the latest one that has a scorecard — the most recent
 * thing that actually happened. With none, the FIRST fixture of the stage, so an
 * event that has not started yet opens on its opening match rather than on its
 * last one.
 */
export function defaultMatchFor<T extends SelectableMatch>(matches: readonly T[]): T | null {
  if (matches.length === 0) return null;
  const scored = matches.filter(matchHasResults);
  if (scored.length > 0) return scored[scored.length - 1] ?? null;
  return matches[0] ?? null;
}

/**
 * The stage a matches surface should open on, given stages in schedule order.
 *
 * The latest stage that has any result — so an ongoing event opens on the stage
 * being played, not on a later one that is scheduled but untouched. When no stage
 * has a result at all (an upcoming event), the first stage.
 *
 * A finished event falls out of the same rule: every stage has results, so the
 * latest stage wins, which is its final stage.
 */
export function initialStageIndex(groups: readonly { matches: readonly SelectableMatch[] }[]): number {
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].matches.some(matchHasResults)) return i;
  }
  return 0;
}

/**
 * Index of the stage holding a match, or -1 when no stage has it.
 *
 * A `matchId` deep link (the format calendar's scorecard link) names the match
 * but not the stage it lives in. Without resolving the stage from the id, the id
 * misses the default stage's list and the surface silently opens its own default
 * instead of the clicked match.
 */
export function stageIndexForMatchId(
  groups: readonly { matches: readonly SelectableMatch[] }[],
  matchId: string | null | undefined
): number {
  if (!matchId) return -1;
  return groups.findIndex((group) => group.matches.some((match) => match.id === matchId));
}
