// KRAFTON-style rolling rankings engine.
// Faithful port of the legacy MediaWiki Lua module (Cargo RankingData_* tables).

export interface TeamRankingRow {
  tournament: string;
  tier: string;
  endDate: string; // YYYY-MM-DD
  team: string;
  rank: number;
}

export interface PlayerRankingRow {
  tournament: string;
  tier: string;
  endDate: string; // YYYY-MM-DD
  player: string;
  team: string;
  finishes: number;
  mvpTourney: boolean;
  mvpFinals: boolean;
  igl: boolean;
  survivor: boolean;
  emerging: boolean;
}

export interface RankedTeam {
  rank: number;
  name: string;
  latestTourney: string;
  events: number;
  yearPoints: Record<string, number>;
  points: number;
}

export interface RankedPlayer {
  rank: number;
  name: string;
  slug?: string;
  team: string;
  latestTourney: string;
  events: number;
  totalFinishes: number;
  points: number;
}

// =================================================================
// TIME-BASED POINT TRANSFERS / ROSTER ACQUISITIONS
// Points earned BEFORE `before` transfer to `new`.
// Points earned AFTER stay with the old org (new roster signed).
// Keys must be lowercase.
// =================================================================
export const ROSTER_TRANSFERS: Record<string, Array<{ new: string; before: string }>> = {
  'k9 esports': [{ new: 'Divine Gaming', before: '2026-04-30' }],
  'true rippers': [{ new: 'Team Apex Gaming', before: '2026-04-30' }],
};

export type RosterTransferRules = Record<string, Array<{ new: string; before: string }>>;

/** DB-managed rules (admin panel) merged over the built-in defaults; same key overrides. */
export function mergeTransferRules(dbRules?: RosterTransferRules): RosterTransferRules {
  return dbRules ? { ...ROSTER_TRANSFERS, ...dbRules } : ROSTER_TRANSFERS;
}

const DAY_SECONDS = 86_400;

function timestamp(dateStr: string): number {
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  // Noon UTC, mirroring the Lua os.time({hour=12}) anchor
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) / 1000;
}

function resolveActiveTeam(teamName: string, eventDateStr: string, rules: RosterTransferRules): string {
  if (!teamName) return '';
  const tLower = teamName.toLowerCase();
  const teamRules = rules[tLower];
  if (!teamRules) return teamName;

  const eventTs = timestamp(eventDateStr);
  if (!eventTs) return teamName;

  for (const rule of teamRules) {
    if (eventTs <= timestamp(rule.before)) {
      // Recursively resolve in case the new org was itself acquired later
      return resolveActiveTeam(rule.new, eventDateStr, rules);
    }
  }
  return teamName;
}

export function getActiveTeamName(teamName: string, eventDateStr: string): string {
  return resolveActiveTeam(teamName, eventDateStr, ROSTER_TRANSFERS);
}

const TEAM_BASE_TABLE: Record<string, number[]> = {
  publisher: [1000, 800, 700, 600, 500],
  'tier 1': [800, 700, 600, 500, 400],
  'tier 2': [600, 500, 400, 300, 250],
  'tier 3': [400, 350, 300, 250, 200],
};
const TEAM_BASE_RANGES: Array<[number, number, number[]]> = [
  [6, 10, [400, 300, 200, 150]],
  [11, 20, [300, 200, 150, 100]],
  [21, 30, [200, 100, 75, 50]],
  [31, 48, [100, 50, 35, 25]],
];

export function getTeamBasePoints(tier: string, rank: number): number {
  const t = (tier || '').toLowerCase();
  const col = t.includes('publisher')
    ? 0
    : t.includes('tier 1')
      ? 1
      : t.includes('tier 2')
        ? 2
        : t.includes('tier 3')
          ? 3
          : -1;
  if (col === -1) return 0;

  for (const [min, max, table] of TEAM_BASE_RANGES) {
    if (rank >= min && rank <= max) return table[col];
  }
  const top = TEAM_BASE_TABLE[t];
  if (top && rank >= 1 && rank <= 5) return top[rank - 1];
  return 0;
}

export function getTeamDecay(days: number): number {
  if (days <= 180) return 1;
  if (days <= 270) return 0.75;
  if (days <= 365) return 0.5;
  if (days <= 1095) return 0.1;
  return 0;
}

export function getPlayerDecay(days: number): number {
  if (days <= 180) return 1;
  if (days <= 240) return 0.75;
  if (days <= 300) return 0.5;
  if (days <= 365) return 0.25;
  if (days <= 1095) return 0.1;
  return 0;
}

/** Undecayed player points: finishes × tier multiplier + flat award bonuses. */
export function getPlayerBasePoints(
  finishes: number,
  tier: string,
  flags: { mvpTourney?: boolean; mvpFinals?: boolean; igl?: boolean; survivor?: boolean; emerging?: boolean }
): number {
  const t = (tier || '').toLowerCase();
  let mult = 1;
  if (t.includes('publisher')) mult = 2;
  else if (t.includes('tier 1')) mult = 1.5;

  let base = (finishes || 0) * mult;
  if (flags.mvpTourney) base += 20;
  if (flags.mvpFinals) base += 10;
  if (flags.igl) base += 10;
  if (flags.survivor) base += 10;
  if (flags.emerging) base += 5;
  return base;
}

interface AccTeam {
  name: string;
  latestTourney: string;
  events: number;
  yearPoints: Record<string, number>;
  points: number;
}

export function computeTeamRankings(
  rows: TeamRankingRow[],
  asOf: Date = new Date(),
  rules: RosterTransferRules = ROSTER_TRANSFERS
): RankedTeam[] {
  const targetTs = Math.floor(asOf.getTime() / 1000);
  const acc = new Map<string, AccTeam>();

  for (const r of rows) {
    const team = resolveActiveTeam(r.team, r.endDate, rules);
    const endTs = timestamp(r.endDate);
    if (!team || !endTs || endTs > targetTs) continue;

    let d = acc.get(team);
    if (!d) {
      d = { name: team, latestTourney: r.tournament, events: 0, yearPoints: {}, points: 0 };
      acc.set(team, d);
    }

    const days = Math.max(0, Math.floor((targetTs - endTs) / DAY_SECONDS));
    const base = getTeamBasePoints(r.tier, r.rank);
    const finalPts = base * getTeamDecay(days);

    const year = r.endDate.slice(0, 4);
    d.yearPoints[year] = (d.yearPoints[year] ?? 0) + base;

    if (finalPts > 0) {
      d.points += finalPts;
      d.events += 1;
    }
  }

  const list = [...acc.values()]
    .filter((d) => d.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((d, i) => ({ rank: i + 1, ...d }));

  return list;
}

interface AccPlayer {
  name: string;
  team: string;
  latestTourney: string;
  events: number;
  totalFinishes: number;
  points: number;
}

export function computePlayerRankings(
  rows: PlayerRankingRow[],
  asOf: Date = new Date(),
  rules: RosterTransferRules = ROSTER_TRANSFERS
): RankedPlayer[] {
  const targetTs = Math.floor(asOf.getTime() / 1000);
  const acc = new Map<string, AccPlayer>();

  for (const r of rows) {
    const endTs = timestamp(r.endDate);
    if (!r.player || !endTs || endTs > targetTs) continue;

    const activeTeam = resolveActiveTeam(r.team || '', r.endDate, rules);

    let d = acc.get(r.player);
    if (!d) {
      d = {
        name: r.player,
        team: activeTeam,
        latestTourney: r.tournament,
        events: 0,
        totalFinishes: 0,
        points: 0,
      };
      acc.set(r.player, d);
    } else if ((!d.team || d.team === '') && activeTeam !== '') {
      d.team = activeTeam;
    }

    const days = Math.max(0, Math.floor((targetTs - endTs) / DAY_SECONDS));

    const base = getPlayerBasePoints(r.finishes || 0, r.tier, {
      mvpTourney: r.mvpTourney,
      mvpFinals: r.mvpFinals,
      igl: r.igl,
      survivor: r.survivor,
      emerging: r.emerging,
    });

    const finalPts = base * getPlayerDecay(days);
    if (finalPts > 0) {
      d.totalFinishes += r.finishes || 0;
      d.points += finalPts;
      d.events += 1;
    }
  }

  const list = [...acc.values()]
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((x, i) => ({ rank: i + 1, ...x }));

  return list;
}
