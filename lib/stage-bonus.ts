/* Period-based bonus / headstart engine.
 *
 * A rule splits a source stage's matches into periods (each day, a window of days, or the whole
 * stage), ranks each period with the shared standings logic, and awards points to its top teams.
 * The accumulated total is what a target stage carries as a headstart.
 *
 * Pure module — no React — so the maths is unit-testable and shared by the public panel.
 */

import { calculateTournamentStandings } from './tournament-math';
import { stageKey, type StandingsMatchLite, type StageBonusRule } from './standings-config';

export interface BonusPeriodGroup {
  key: string;
  label: string;
  dayFrom: string;
  dayTo: string;
  matches: StandingsMatchLite[];
}

export interface BonusPeriodResult extends BonusPeriodGroup {
  winners: { teamId: string; rank: number; points: number }[];
}

export interface BonusComputation {
  /** Accumulated bonus per team — the headstart the target stage adds. */
  byTeam: Record<string, number>;
  periods: BonusPeriodResult[];
  /** teamId → periodKey → points, for a per-team × per-period grid. */
  byTeamPeriod: Record<string, Record<string, number>>;
}

function dayNumber(day: string): number {
  const n = Number.parseInt(day, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Distinct days present in a match set, ordered 1, 2, 3 … */
function distinctDays(matches: readonly StandingsMatchLite[]): string[] {
  const set = new Set<string>();
  for (const match of matches) {
    const day = match.day != null ? String(match.day) : '';
    if (day) set.add(day);
  }
  return [...set].sort((a, b) => dayNumber(a) - dayNumber(b));
}

/** A stage name matches when its normalised key matches, tolerating extra suffixes. */
function sameStage(a: string, b: string): boolean {
  const ka = stageKey(a);
  const kb = stageKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

/** Split a rule's source-stage matches into its configured periods. */
export function groupBonusPeriods(
  rule: StageBonusRule,
  matches: readonly StandingsMatchLite[]
): BonusPeriodGroup[] {
  let scoped = matches.filter((m) => rule.sourceStages.some((s) => sameStage(s, m.stageName)));
  // An optional day picker restricts which match days take part (relative day numbers).
  if (rule.days && rule.days.length > 0) {
    const allowed = new Set(rule.days.map(String));
    scoped = scoped.filter((m) => allowed.has(String(m.day)));
  }
  if (scoped.length === 0) return [];

  if (rule.period === 'STAGE') {
    const days = distinctDays(scoped);
    return [
      {
        key: 'stage',
        label: rule.label || 'Stage',
        dayFrom: days[0] ?? '',
        dayTo: days[days.length - 1] ?? '',
        matches: [...scoped],
      },
    ];
  }

  if (rule.period === 'DAY_WINDOW') {
    const width = Math.max(1, Math.floor(rule.windowDays ?? 2));
    const days = distinctDays(scoped).map(dayNumber);
    const groups: BonusPeriodGroup[] = [];
    for (let i = 0; i < days.length; i += width) {
      const chunk = days.slice(i, i + width);
      const key = `w${Math.floor(i / width) + 1}`;
      const set = new Set(chunk.map(String));
      groups.push({
        key,
        label: chunk.length > 1 ? `Days ${chunk[0]}–${chunk[chunk.length - 1]}` : `Day ${chunk[0]}`,
        dayFrom: String(chunk[0]),
        dayTo: String(chunk[chunk.length - 1]),
        matches: scoped.filter((m) => set.has(String(dayNumber(String(m.day))))),
      });
    }
    return groups;
  }

  // DAY (default): one group per match day.
  return distinctDays(scoped).map((day) => ({
    key: `d${day}`,
    label: `Day ${day}`,
    dayFrom: day,
    dayTo: day,
    matches: scoped.filter((m) => String(m.day) === day),
  }));
}

/**
 * MANUAL rule: the typed-in points are the bonus. There is no match data to rank, so the
 * `matches` argument is ignored and each typed period becomes one column of the grid.
 */
function manualBonus(rule: StageBonusRule): BonusComputation {
  const byTeam: Record<string, number> = {};
  const byTeamPeriod: Record<string, Record<string, number>> = {};
  const periods: BonusPeriodResult[] = [];

  (rule.manualPeriods ?? []).forEach((period, pIdx) => {
    const key = `p${pIdx + 1}`;
    const winners: BonusPeriodResult['winners'] = [];

    [...period.entries]
      .filter((entry) => entry.teamId && Number.isFinite(entry.points) && entry.points > 0)
      .sort((a, b) => b.points - a.points)
      .forEach((entry, i) => {
        byTeam[entry.teamId] = (byTeam[entry.teamId] ?? 0) + entry.points;
        const perPeriod = byTeamPeriod[entry.teamId] ?? (byTeamPeriod[entry.teamId] = {});
        perPeriod[key] = (perPeriod[key] ?? 0) + entry.points;
        winners.push({ teamId: entry.teamId, rank: i + 1, points: entry.points });
      });

    periods.push({
      key,
      label: period.label || `Period ${pIdx + 1}`,
      dayFrom: '',
      dayTo: '',
      matches: [],
      winners,
    });
  });

  return { byTeam, periods, byTeamPeriod };
}

/** Rank every period and award the rule's points to its top teams. */
export function computeStageBonus(
  rule: StageBonusRule,
  matches: readonly StandingsMatchLite[]
): BonusComputation {
  if (rule.mode === 'MANUAL') return manualBonus(rule);

  const byTeam: Record<string, number> = {};
  const byTeamPeriod: Record<string, Record<string, number>> = {};
  const periods: BonusPeriodResult[] = [];

  for (const group of groupBonusPeriods(rule, matches)) {
    const standings = calculateTournamentStandings(group.matches.flatMap((m) => m.results));
    const winners: BonusPeriodResult['winners'] = [];

    for (let i = 0; i < rule.awards.length && i < standings.length; i++) {
      const teamId = standings[i]?.teamId;
      const points = rule.awards[i];
      if (!teamId || !Number.isFinite(points) || points <= 0) continue;

      winners.push({ teamId, rank: i + 1, points });
      byTeam[teamId] = (byTeam[teamId] ?? 0) + points;
      const perPeriod = byTeamPeriod[teamId] ?? (byTeamPeriod[teamId] = {});
      perPeriod[group.key] = (perPeriod[group.key] ?? 0) + points;
    }

    periods.push({ ...group, winners });
  }

  return { byTeam, periods, byTeamPeriod };
}

/** The rule whose source stages cover `stageName`, if any — used for per-period displays. */
export function bonusRuleForSource(
  rules: readonly StageBonusRule[],
  stageName: string
): StageBonusRule | null {
  return rules.find((r) => r.sourceStages.some((s) => sameStage(s, stageName))) ?? null;
}

/** The total headstart a target stage should add, and the rule that produced it. */
export function headstartFor(
  rules: readonly StageBonusRule[],
  matches: readonly StandingsMatchLite[],
  stageName: string
): { byTeam: Record<string, number>; rule: StageBonusRule | null } {
  const rule = rules.find((r) => r.targetStages.some((s) => sameStage(s, stageName))) ?? null;
  if (!rule) return { byTeam: {}, rule: null };
  return { byTeam: computeStageBonus(rule, matches).byTeam, rule };
}
