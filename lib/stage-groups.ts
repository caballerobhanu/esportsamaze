/**
 * Pending seats: a place in a draw whose team is not known yet, defined by where it comes
 * from — a source stage, a group within it, and a finishing position.
 *
 * Kept free of React so the label, the identity and the resolution are unit-testable, and
 * so the server can build the rankings these resolve against.
 */

/** Where a seat's team will come from. */
export interface PendingSeatSource {
  /** The stage the team qualifies out of, by name. */
  stage: string;
  /** The group within that stage. Blank/null for a single-lobby source stage. */
  group?: string | null;
  /** Finishing position within that group, 1-based. */
  rank: number;
}

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/** Key into the per-stage-per-group finishing orders the server builds. */
export function groupRankingKey(stage: string, group?: string | null): string {
  return `${norm(stage)}|${norm(group)}`;
}

/** "Group A #1", or "Super Weekend 1 #3" when the source stage has no groups. */
export function pendingSeatLabel(source: PendingSeatSource): string {
  const stage = (source?.stage ?? '').trim();
  const group = source?.group?.trim();

  if (!stage && !group) return 'Pending';
  if (group) return `${group} #${source.rank}`;
  return `${stage} #${source.rank}`;
}

/**
 * Stable identity for a pending slot — the React key, and what stops the same source being
 * placed twice in one stage.
 */
export function pendingSeatKey(source: PendingSeatSource): string {
  return `src|${norm(source?.stage)}|${norm(source?.group)}|${source?.rank}`;
}

/**
 * The team currently holding a pending slot, or null while its source stage is unplayed.
 * `groupRankings` maps groupRankingKey to teamIds in finishing order.
 */
export function resolvePendingTeamId(
  source: PendingSeatSource | null | undefined,
  groupRankings: Record<string, string[]>
): string | null {
  if (!source) return null;
  if (!Number.isFinite(source.rank) || source.rank < 1) return null;

  const ranked = groupRankings[groupRankingKey(source.stage, source.group)];
  return ranked?.[source.rank - 1] ?? null;
}
