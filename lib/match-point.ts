/* Match point / smash rule — the win-condition engine.
 *
 * A team plays toward a points threshold; once it is at/above the threshold, winning a match
 * (1st place) crowns it champion. A team must already be at/above the threshold BEFORE the match
 * it wins — crossing the threshold in that same match does not count. If the match limit is
 * reached with no such win, the points leader is champion.
 *
 * Pure module — no React — so the maths is unit-testable and shared by the public panels.
 */

import { stageKey, type MatchPointRule, type MatchPointThresholdMode, type StandingsMatchLite } from './standings-config';

export interface MatchPointResult {
  applies: boolean;
  threshold: number | null;
  thresholdSource: MatchPointThresholdMode | null;
  leaderTeamId: string | null;
  leaderPoints: number | null;
  eligibleFromDay: number | null;
  championTeamId: string | null;
  championVia: 'SMASH' | 'POINTS' | null;
  decisiveMatchId: string | null;
  decisiveMatchNumber: number | null;
  /** Teams at/above the threshold on the points shown (current cumulative). */
  onMatchPointTeamIds: string[];
  /** The stage is finished: every match completed, or the match limit reached. */
  complete: boolean;
}

const EMPTY: MatchPointResult = {
  applies: false,
  threshold: null,
  thresholdSource: null,
  leaderTeamId: null,
  leaderPoints: null,
  eligibleFromDay: null,
  championTeamId: null,
  championVia: null,
  decisiveMatchId: null,
  decisiveMatchNumber: null,
  onMatchPointTeamIds: [],
  complete: false,
};

/** Same tolerant stage-name match used elsewhere (extra wording / case tolerated). */
function sameStage(a: string, b: string): boolean {
  const ka = stageKey(a);
  const kb = stageKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

function orderKey(m: StandingsMatchLite): [number, number, number] {
  const overall =
    m.overallMatchNumber != null && Number.isFinite(Number(m.overallMatchNumber))
      ? Number(m.overallMatchNumber)
      : Number.POSITIVE_INFINITY;
  const num =
    m.matchNumber != null && Number.isFinite(Number(m.matchNumber))
      ? Number(m.matchNumber)
      : Number.POSITIVE_INFINITY;
  const t = new Date(m.scheduledAt).getTime();
  return [overall, num, Number.isFinite(t) ? t : Number.POSITIVE_INFINITY];
}

function compareMatches(a: StandingsMatchLite, b: StandingsMatchLite): number {
  const ka = orderKey(a);
  const kb = orderKey(b);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
}

function leaderOf(totals: Map<string, number>): { teamId: string | null; points: number } {
  let teamId: string | null = null;
  let points = Number.NEGATIVE_INFINITY;
  for (const [id, pts] of totals) {
    if (pts > points) {
      points = pts;
      teamId = id;
    }
  }
  return { teamId, points: Number.isFinite(points) ? points : 0 };
}

export function computeMatchPoint(
  rule: MatchPointRule,
  stageMatches: readonly StandingsMatchLite[],
  opts: { basePoints?: Record<string, number> } = {}
): MatchPointResult {
  if (!rule.enabled || !rule.stage) return EMPTY;

  const base = opts.basePoints ?? {};
  const scoped = stageMatches
    .filter((m) => sameStage(rule.stage, m.stageName))
    .slice()
    .sort(compareMatches);
  if (scoped.length === 0) return EMPTY;

  /* ── threshold ── */
  let threshold: number | null = null;
  let thresholdSource: MatchPointThresholdMode | null = null;
  let leaderTeamId: string | null = null;
  let leaderPoints: number | null = null;

  if (rule.thresholdMode === 'FIXED') {
    if (!Number.isFinite(rule.fixedThreshold)) return EMPTY;
    threshold = Number(rule.fixedThreshold);
    thresholdSource = 'FIXED';
  } else {
    if (!Number.isFinite(rule.checkpointDay) || !Number.isFinite(rule.leaderOffset)) return EMPTY;
    const checkpoint = scoped.filter((m) => Number(m.day) <= Number(rule.checkpointDay));
    if (checkpoint.length === 0) return EMPTY;

    const totals = new Map<string, number>(Object.entries(base));
    for (const m of checkpoint) {
      for (const r of m.results) totals.set(r.teamId, (totals.get(r.teamId) ?? 0) + (r.totalPoints || 0));
    }
    const leader = leaderOf(totals);
    if (!leader.teamId) return EMPTY;
    leaderTeamId = leader.teamId;
    leaderPoints = leader.points;
    threshold = leader.points + Number(rule.leaderOffset);
    thresholdSource = 'LEADER_PLUS';
  }

  if (threshold === null || !Number.isFinite(threshold)) return EMPTY;

  const eligibleFromDay = Number.isFinite(rule.eligibleFromDay)
    ? Number(rule.eligibleFromDay)
    : rule.thresholdMode === 'LEADER_PLUS'
      ? Number(rule.checkpointDay ?? 0) + 1
      : 1;
  const limit =
    Number.isFinite(rule.matchLimit) && Number(rule.matchLimit) > 0
      ? Number(rule.matchLimit)
      : Number.POSITIVE_INFINITY;

  /* ── walk the stage in order ── */
  const running = new Map<string, number>(Object.entries(base));
  let championTeamId: string | null = null;
  let championVia: 'SMASH' | 'POINTS' | null = null;
  let decisiveMatchId: string | null = null;
  let decisiveMatchNumber: number | null = null;

  for (let i = 0; i < scoped.length; i++) {
    const match = scoped[i];
    const eligible = Number(match.day) >= eligibleFromDay && i + 1 <= limit;

    // Pre-match cumulative is the check, so a team cannot clinch in the match it crosses in.
    if (eligible && championTeamId === null) {
      const winner = match.results.find((r) => r.rank === 1);
      if (winner && (running.get(winner.teamId) ?? 0) >= threshold) {
        championTeamId = winner.teamId;
        championVia = 'SMASH';
        decisiveMatchId = match.id;
        decisiveMatchNumber = match.overallMatchNumber ?? match.matchNumber ?? i + 1;
      }
    }

    for (const r of match.results) {
      running.set(r.teamId, (running.get(r.teamId) ?? 0) + (r.totalPoints || 0));
    }
  }

  const allCompleted = scoped.every((m) => m.status === 'COMPLETED');
  const complete = allCompleted || (Number.isFinite(limit) && scoped.length >= limit);

  if (championTeamId === null && complete) {
    const leader = leaderOf(running);
    if (leader.teamId) {
      championTeamId = leader.teamId;
      championVia = 'POINTS';
    }
  }

  const onMatchPointTeamIds = [...running.entries()]
    .filter(([, points]) => points >= threshold!)
    .map(([teamId]) => teamId);

  return {
    applies: true,
    threshold,
    thresholdSource,
    leaderTeamId,
    leaderPoints,
    eligibleFromDay,
    championTeamId,
    championVia,
    decisiveMatchId,
    decisiveMatchNumber,
    onMatchPointTeamIds,
    complete,
  };
}
