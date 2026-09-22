/* Standings display configuration: types, defaults, normalization and shared
   helpers consumed by the public detail page, the standings panel and the
   admin editors. Pure module — no React. */

export type StandingsLogoMode = 'BOTH' | 'TEAM' | 'COUNTRY' | 'NONE';
export type StandingsFilterKey = 'day' | 'map' | 'group';
export type StandingsColumnKey =
  | 'mp'
  | 'wwcd'
  | 'place'
  | 'elims'
  | 'bonus'
  | 'total'
  | 'damage'
  | 'damageReceived'
  | 'healing'
  | 'headshots'
  | 'assists'
  | 'knockouts'
  | 'longestElim'
  | 'vehicleElims'
  | 'grenadeElims'
  | 'smokesUsed'
  | 'grenadesUsed'
  | 'molotovsUsed'
  | 'flashUsed'
  | 'airdrops'
  | 'rescues'
  | 'distDrove'
  | 'distWalk'
  | 'form';
export type StandingsStageMode = 'STAGE' | 'CUMULATIVE';
export type StandingsGroupMode = 'CUMULATIVE' | 'PER_GROUP';

export type ZoneColor =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple'
  | 'pink'
  | 'cyan'
  | 'teal'
  | 'gold'
  | 'slate'
  | 'emerald'
  | 'amber'
  | 'rose';

/**
 * The colour choices offered wherever a qualification/advancement zone is configured.
 *
 * One list, read by both the Standings editor and the Format editor: the two used to
 * offer different sets, so a colour picked in one place could not be picked in the other.
 * Labels are the display names; `key` is what is stored.
 */
export const ZONE_COLOR_OPTIONS: { key: ZoneColor; label: string }[] = [
  { key: 'blue', label: 'Blue' },
  { key: 'green', label: 'Green' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'orange', label: 'Orange' },
  { key: 'red', label: 'Red' },
  { key: 'purple', label: 'Purple' },
  { key: 'pink', label: 'Pink' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'teal', label: 'Teal' },
  { key: 'gold', label: 'Gold' },
  { key: 'slate', label: 'Gray / Slate' },
];

export interface ZoneRule {
  from: number;
  to: number;
  label: string;
  color?: ZoneColor | string;
  targetStageName?: string;
  targetStageId?: string;
  targetGroupName?: string; // e.g. "Group A" in target stage
}

export interface StandingsStageConfig {
  mode: StandingsStageMode;
  groupMode: StandingsGroupMode;
  filters: StandingsFilterKey[];
  zones: ZoneRule[];
}

export interface StandingsCustomTab {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  includeStages: string[];
  zones?: ZoneRule[];
  groupZones?: Record<string, ZoneRule[]>;
  excludeEliminatedFromStages?: string[];
  excludeEliminatedFromStage?: string; // backwards compatibility
  precedenceFromTabIds?: string[];
  precedenceFromTabId?: string; // backwards compatibility
  hidePrecedenceQualified?: boolean;
}

export interface StandingsNavigationItem {
  id: string;
  type: 'STAGE' | 'CUSTOM_TAB' | 'OVERALL';
  label: string;
  shortLabel?: string;
  stageName?: string;
  includeStages?: string[];
  zones?: ZoneRule[];
  description?: string;
  excludeEliminatedFromStages?: string[];
  excludeEliminatedFromStage?: string; // backwards compatibility
  precedenceFromTabIds?: string[];
  precedenceFromTabId?: string; // backwards compatibility
  hidePrecedenceQualified?: boolean;
  // Tier 3 group sub-tabs configuration
  enableGroupSubTabs?: boolean;
  showOverallInGroupTabs?: boolean;
  groupName?: string;
  groups?: string[];
  groupZones?: Record<string, ZoneRule[]>;
}

export type MatchColumnKey =
  | 'place'
  | 'elims'
  | 'bonus'
  | 'total'
  | 'damage'
  | 'damageReceived'
  | 'healing'
  | 'headshots'
  | 'assists'
  | 'knockouts'
  | 'longestElim'
  | 'vehicleElims'
  | 'grenadeElims'
  | 'smokesUsed'
  | 'grenadesUsed'
  | 'molotovsUsed'
  | 'flashUsed'
  | 'airdrops'
  | 'rescues';

export const MATCH_COLUMN_DEFS: {
  key: MatchColumnKey;
  label: string;
  short: string;
  category: 'Scoring' | 'Combat' | 'Utility';
}[] = [
  // Scoring
  { key: 'place', label: 'Placement Points', short: 'Place', category: 'Scoring' },
  { key: 'elims', label: 'Elimination Points', short: 'Elims', category: 'Scoring' },
  { key: 'bonus', label: 'Bonus Points', short: 'Bonus', category: 'Scoring' },
  { key: 'total', label: 'Total Points', short: 'Total', category: 'Scoring' },

  // Combat Stats
  { key: 'damage', label: 'Total Damage', short: 'Damage', category: 'Combat' },
  { key: 'damageReceived', label: 'Damage Received', short: 'Dmg Recv', category: 'Combat' },
  { key: 'healing', label: 'Healing Done', short: 'Healing', category: 'Combat' },
  { key: 'headshots', label: 'Headshots', short: 'HS', category: 'Combat' },
  { key: 'assists', label: 'Assists', short: 'Assists', category: 'Combat' },
  { key: 'knockouts', label: 'Knockouts', short: 'Knocks', category: 'Combat' },
  { key: 'longestElim', label: 'Longest Elimination', short: 'Longest', category: 'Combat' },
  { key: 'vehicleElims', label: 'Vehicle Eliminations', short: 'Veh Elims', category: 'Combat' },
  { key: 'grenadeElims', label: 'Grenade Eliminations', short: 'Nade Elims', category: 'Combat' },

  // Utilities & Support
  { key: 'smokesUsed', label: 'Smokes Used', short: 'Smokes', category: 'Utility' },
  { key: 'grenadesUsed', label: 'Frag Grenades Used', short: 'Frags', category: 'Utility' },
  { key: 'molotovsUsed', label: 'Molotovs Used', short: 'Mollies', category: 'Utility' },
  { key: 'flashUsed', label: 'Flashes Used', short: 'Flash', category: 'Utility' },
  { key: 'airdrops', label: 'Airdrops Looted', short: 'Airdrops', category: 'Utility' },
  { key: 'rescues', label: 'Rescues / Revives', short: 'Revives', category: 'Utility' },
];

export const DEFAULT_MATCH_COLUMNS: MatchColumnKey[] = ['place', 'elims', 'damage', 'total'];

export interface StandingsTabGroup {
  id: string;
  name: string;
  items: StandingsNavigationItem[];
}

export type PlayerStatColumnKey =
  | 'elims'
  | 'powerplay'
  | 'avgElims'
  | 'maxElims'
  | 'zeroElimsMatches'
  | 'fivePlusElimsMatches'
  | 'damage'
  | 'headshots'
  | 'assists'
  | 'knockouts'
  | 'survivalTime'
  | 'healing'
  | 'damageReceived'
  | 'utilities'
  | 'totalDist'
  | 'mvp';

export const PLAYER_STAT_COLUMN_DEFS: { key: PlayerStatColumnKey; label: string; short: string }[] = [
  { key: 'elims', label: 'Eliminations', short: 'Elims' },
  { key: 'powerplay', label: 'Powerplay Finishes', short: 'Powerplay' },
  { key: 'avgElims', label: 'Avg Elims / Match', short: 'Avg/M' },
  { key: 'maxElims', label: 'Max Elims in Match', short: 'Max Elims' },
  { key: 'zeroElimsMatches', label: '0-Elim Matches', short: '0 Elims' },
  { key: 'fivePlusElimsMatches', label: '5+ Elim Matches', short: '5+ Elims' },
  { key: 'damage', label: 'Total Damage', short: 'Damage' },
  { key: 'headshots', label: 'Headshots', short: 'HS' },
  { key: 'assists', label: 'Assists', short: 'Assists' },
  { key: 'knockouts', label: 'Knockouts', short: 'Knocks' },
  { key: 'survivalTime', label: 'Survival Time', short: 'Survival' },
  { key: 'healing', label: 'Healing Done', short: 'Healing' },
  { key: 'damageReceived', label: 'Damage Received', short: 'Dmg Recv' },
  { key: 'utilities', label: 'Utilities Used', short: 'Utilities' },
  { key: 'totalDist', label: 'Total Distance', short: 'Distance' },
  { key: 'mvp', label: 'MVP Awards', short: 'MVP' },
];

export type PlayerMetricField =
  | 'elims'
  | 'damage'
  | 'headshots'
  | 'assists'
  | 'knockouts'
  | 'survivalTime'
  | 'healing'
  | 'damageReceived'
  | 'utilities'
  | 'totalDist'
  | 'powerplay';

export type PlayerMetricAggregator =
  | 'sum'
  | 'avg'
  | 'max'
  | 'min'
  | 'count_zero'
  | 'count_gte';

export interface CustomPlayerColumn {
  id: string;
  label: string;
  short?: string;
  metric: PlayerMetricField;
  aggregator: PlayerMetricAggregator;
  threshold?: number;
}

export const PLAYER_METRIC_FIELDS: { key: PlayerMetricField; label: string; defaultUnit?: string }[] = [
  { key: 'elims', label: 'Eliminations' },
  { key: 'damage', label: 'Damage' },
  { key: 'powerplay', label: 'Powerplay Finishes' },
  { key: 'headshots', label: 'Headshots' },
  { key: 'assists', label: 'Assists' },
  { key: 'knockouts', label: 'Knockouts' },
  { key: 'survivalTime', label: 'Survival Time', defaultUnit: 's' },
  { key: 'healing', label: 'Healing Done' },
  { key: 'damageReceived', label: 'Damage Received' },
  { key: 'utilities', label: 'Utilities Used' },
  { key: 'totalDist', label: 'Total Distance', defaultUnit: 'm' },
];

export const PLAYER_METRIC_AGGREGATORS: {
  key: PlayerMetricAggregator;
  label: string;
  description: string;
}[] = [
  { key: 'max', label: 'Max in a Match (Peak)', description: 'Highest single-match performance' },
  { key: 'avg', label: 'Average / Match', description: 'Average per match played' },
  { key: 'sum', label: 'Sum (Total)', description: 'Total sum across all matches' },
  { key: 'count_zero', label: '0-Value Matches', description: 'Number of matches where metric was 0' },
  { key: 'count_gte', label: 'Threshold Matches (≥ X)', description: 'Number of matches where metric ≥ X' },
  { key: 'min', label: 'Min in a Match', description: 'Lowest single-match performance' },
];

const METRIC_ABBR: Record<PlayerMetricField, string> = {
  elims: 'Elims',
  damage: 'Dmg',
  powerplay: 'PP',
  headshots: 'HS',
  assists: 'Ast',
  knockouts: 'Knocks',
  survivalTime: 'Surv',
  healing: 'Heal',
  damageReceived: 'DmgRecv',
  utilities: 'Utils',
  totalDist: 'Dist',
};

export function generateCustomColumnLabel(
  metric: PlayerMetricField,
  aggregator: PlayerMetricAggregator,
  threshold?: number
): { label: string; short: string } {
  const m = PLAYER_METRIC_FIELDS.find((f) => f.key === metric);
  const mName = m?.label || metric;
  const abbr = METRIC_ABBR[metric] || mName.slice(0, 5);

  switch (aggregator) {
    case 'max':
      return { label: `Max ${mName} in Match`, short: `Max ${abbr}` };
    case 'avg':
      return { label: `Avg ${mName} / Match`, short: `Avg ${abbr}/M` };
    case 'sum':
      return { label: `Total ${mName}`, short: `Tot ${abbr}` };
    case 'count_zero':
      return { label: `0-${mName} Matches`, short: `0 ${abbr}` };
    case 'count_gte': {
      const th = threshold ?? (metric === 'damage' ? 500 : 5);
      return { label: `${th}+ ${mName} Matches`, short: `${th}+ ${abbr}` };
    }
    case 'min':
      return { label: `Min ${mName} in Match`, short: `Min ${abbr}` };
  }
}

export interface StatisticsConfig {
  defaultView?: 'players' | 'teams';
  playerColumns?: PlayerStatColumnKey[];
  customPlayerColumns?: CustomPlayerColumn[];
  defaultTeamPointsMode?: 'sum' | 'avg' | 'max';
}

/** Public surfaces that each choose how a team is drawn: crest, flag, both, or neither. */
export type DisplaySurface = 'overview' | 'standings' | 'matches' | 'teams' | 'prizepool' | 'statistics';

export const DISPLAY_SURFACES: { key: DisplaySurface; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'standings', label: 'Standings' },
  { key: 'matches', label: 'Matches' },
  { key: 'teams', label: 'Teams' },
  { key: 'prizepool', label: 'Prize Pool' },
  { key: 'statistics', label: 'Statistics' },
];

export type TournamentTabId =
  | 'overview'
  | 'standings'
  | 'matches'
  | 'progression'
  | 'format'
  | 'teams'
  | 'prizepool'
  | 'statistics';

export const TOURNAMENT_AVAILABLE_TABS: {
  id: TournamentTabId;
  label: string;
  description: string;
}[] = [
  { id: 'overview', label: 'Overview', description: 'Hero banner, quick stats, winner podium, and schedule preview' },
  { id: 'standings', label: 'Standings', description: 'Points table, qualification lines, group rankings, and tiebreakers' },
  { id: 'matches', label: 'Matches', description: 'Match scorecards, map results, team combat breakdowns' },
  { id: 'progression', label: 'Progression', description: 'Stage qualification tree, pathway, and seed brackets' },
  { id: 'format', label: 'Format', description: 'Rules, scoring matrix, stage schedule, and advancement conditions' },
  { id: 'teams', label: 'Teams', description: 'Participating squads, rosters, country flags, and seed labels' },
  { id: 'prizepool', label: 'Prize Pool', description: 'Total prize distribution, stage rewards, and special awards' },
  { id: 'statistics', label: 'Statistics', description: 'Player kill leaderboards, damage metrics, and team ratings' },
];

export const ALL_TOURNAMENT_TAB_IDS: TournamentTabId[] = TOURNAMENT_AVAILABLE_TABS.map((t) => t.id);

export interface StandingsConfig {
  /** How each public surface draws a team. Surfaces default to the crest alone, so a stored
      config that predates this setting renders exactly as it did before. */
  logoModeBySurface: Record<DisplaySurface, StandingsLogoMode>;
  showOverall: boolean;
  /** Whether teams level on points get a tiebreaker badge beside their name. Admins switch this
      off during live events, where the badges churn as results land. */
  showTiebreakers: boolean;
  filters: StandingsFilterKey[];
  columns: StandingsColumnKey[];
  matchColumns?: MatchColumnKey[];
  zones: ZoneRule[];
  stages: Record<string, Partial<Omit<StandingsStageConfig, 'mode'> & { mode: StandingsStageMode }>>;
  customTabs?: StandingsCustomTab[];
  tabGroups?: StandingsTabGroup[];
  statisticsConfig?: StatisticsConfig;
  visibleTabs?: TournamentTabId[];
}

/** Every surface starts on the crest alone: no tournament shows a flag until it is asked to. */
export const DEFAULT_SURFACE_LOGO_MODE: StandingsLogoMode = 'TEAM';

export const DEFAULT_STANDINGS_CONFIG: StandingsConfig = {
  logoModeBySurface: {
    overview: DEFAULT_SURFACE_LOGO_MODE,
    standings: DEFAULT_SURFACE_LOGO_MODE,
    matches: DEFAULT_SURFACE_LOGO_MODE,
    teams: DEFAULT_SURFACE_LOGO_MODE,
    prizepool: DEFAULT_SURFACE_LOGO_MODE,
    statistics: DEFAULT_SURFACE_LOGO_MODE,
  },
  showOverall: true,
  showTiebreakers: true,
  filters: ['day', 'map', 'group'],
  columns: ['mp', 'wwcd', 'place', 'elims', 'total', 'form'],
  matchColumns: ['place', 'elims', 'damage', 'total'],
  zones: [],
  stages: {},
  customTabs: [],
  tabGroups: [],
  statisticsConfig: {
    defaultView: 'players',
    playerColumns: ['elims', 'powerplay', 'avgElims'],
  },
  visibleTabs: [...ALL_TOURNAMENT_TAB_IDS],
};

export const STANDINGS_COLUMN_DEFS: {
  key: StandingsColumnKey;
  label: string;
  short: string;
  category: 'Scoring' | 'Combat' | 'Utility' | 'Movement';
}[] = [
  // Scoring & Core
  { key: 'mp', label: 'Matches Played', short: 'MP', category: 'Scoring' },
  { key: 'wwcd', label: 'WWCD / Wins', short: 'WWCD', category: 'Scoring' },
  { key: 'place', label: 'Placement Points', short: 'Place', category: 'Scoring' },
  { key: 'elims', label: 'Elimination Points', short: 'Elims', category: 'Scoring' },
  { key: 'bonus', label: 'Bonus Points', short: 'Bonus', category: 'Scoring' },
  { key: 'total', label: 'Total Points', short: 'Total', category: 'Scoring' },
  { key: 'form', label: 'Last 5 Matches', short: 'Form', category: 'Scoring' },

  // Combat Stats
  { key: 'damage', label: 'Total Damage', short: 'Damage', category: 'Combat' },
  { key: 'damageReceived', label: 'Damage Received', short: 'Dmg Recv', category: 'Combat' },
  { key: 'healing', label: 'Healing Done', short: 'Healing', category: 'Combat' },
  { key: 'headshots', label: 'Headshots', short: 'HS', category: 'Combat' },
  { key: 'assists', label: 'Assists', short: 'Assists', category: 'Combat' },
  { key: 'knockouts', label: 'Knockouts (Knocks)', short: 'Knocks', category: 'Combat' },
  { key: 'longestElim', label: 'Longest Elimination (m)', short: 'Longest', category: 'Combat' },
  { key: 'vehicleElims', label: 'Vehicle Eliminations', short: 'Veh Elims', category: 'Combat' },
  { key: 'grenadeElims', label: 'Grenade Eliminations', short: 'Nade Elims', category: 'Combat' },

  // Utilities & Support
  { key: 'smokesUsed', label: 'Smokes Used', short: 'Smokes', category: 'Utility' },
  { key: 'grenadesUsed', label: 'Frag Grenades Used', short: 'Frags', category: 'Utility' },
  { key: 'molotovsUsed', label: 'Molotovs Used', short: 'Mollies', category: 'Utility' },
  { key: 'flashUsed', label: 'Flashbangs Used', short: 'Flash', category: 'Utility' },
  { key: 'airdrops', label: 'Airdrops Looted', short: 'Airdrops', category: 'Utility' },
  { key: 'rescues', label: 'Rescues / Revives', short: 'Revives', category: 'Utility' },

  // Movement
  { key: 'distDrove', label: 'Distance Driven (km)', short: 'Drive', category: 'Movement' },
  { key: 'distWalk', label: 'Distance Walked (km)', short: 'Walk', category: 'Movement' },
];

export const STANDINGS_FILTER_DEFS: { key: StandingsFilterKey; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'map', label: 'Map' },
  { key: 'group', label: 'Group' },
];

const LOGO_MODES: StandingsLogoMode[] = ['BOTH', 'TEAM', 'COUNTRY', 'NONE'];
const FILTER_KEYS: StandingsFilterKey[] = ['day', 'map', 'group'];
const COLUMN_KEYS: StandingsColumnKey[] = [
  'mp',
  'wwcd',
  'place',
  'elims',
  'bonus',
  'total',
  'damage',
  'damageReceived',
  'healing',
  'headshots',
  'assists',
  'knockouts',
  'longestElim',
  'vehicleElims',
  'grenadeElims',
  'smokesUsed',
  'grenadesUsed',
  'molotovsUsed',
  'flashUsed',
  'airdrops',
  'rescues',
  'distDrove',
  'distWalk',
  'form',
];
const STAGE_MODES: StandingsStageMode[] = ['STAGE', 'CUMULATIVE'];
const GROUP_MODES: StandingsGroupMode[] = ['CUMULATIVE', 'PER_GROUP'];

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function normalizeZones(v: unknown): ZoneRule[] {
  const list: ZoneRule[] = [];
  for (const z of asArray(v)) {
    if (!z || typeof z !== 'object') continue;
    const row = z as Record<string, unknown>;
    const from = Number(row?.from);
    const to = Number(row?.to);
    const label = String(row?.label ?? '').trim();
    const color = row?.color ? String(row.color).trim() : undefined;
    const targetStageName = row?.targetStageName ? String(row.targetStageName).trim() : undefined;
    const targetStageId = row?.targetStageId ? String(row.targetStageId).trim() : undefined;
    const targetGroupName = row?.targetGroupName ? String(row.targetGroupName).trim() : undefined;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from || !label) continue;
    list.push({
      from: Math.round(from),
      to: Math.round(to),
      label,
      ...(color ? { color } : {}),
      ...(targetStageName ? { targetStageName } : {}),
      ...(targetStageId ? { targetStageId } : {}),
      ...(targetGroupName ? { targetGroupName } : {}),
    });
  }
  return list;
}

export function resolveZoneTargetStage(zone: ZoneRule, availableStages: string[]): string | undefined {
  if (zone.targetStageName && availableStages.some((s) => s.toLowerCase() === zone.targetStageName!.toLowerCase())) {
    return availableStages.find((s) => s.toLowerCase() === zone.targetStageName!.toLowerCase());
  }
  // Intelligent heuristic: if zone label mentions an available stage, infer it
  const cleanLabel = zone.label.toLowerCase();
  const matched = availableStages.find((s) => {
    const cleanStage = s.toLowerCase();
    return cleanLabel === cleanStage || cleanLabel.includes(cleanStage);
  });
  return matched;
}

function normalizeFilters(v: unknown, fallback: StandingsFilterKey[]): StandingsFilterKey[] {
  const list = asArray(v).filter((f): f is StandingsFilterKey => FILTER_KEYS.includes(f as StandingsFilterKey));
  return v === undefined ? fallback : list;
}

function normalizeColumns(v: unknown): StandingsColumnKey[] {
  const list = asArray(v).filter((c): c is StandingsColumnKey => COLUMN_KEYS.includes(c as StandingsColumnKey));
  return list.length > 0 ? list : [...COLUMN_KEYS];
}

const MATCH_COLUMN_KEYS: MatchColumnKey[] = MATCH_COLUMN_DEFS.map((c) => c.key);

function normalizeMatchColumns(v: unknown): MatchColumnKey[] {
  const list = asArray(v).filter((c): c is MatchColumnKey => MATCH_COLUMN_KEYS.includes(c as MatchColumnKey));
  return list.length > 0 ? list : [...DEFAULT_MATCH_COLUMNS];
}

function normalizeExcludeStages(rawObj: Record<string, unknown>): string[] {
  const arr = asArray(rawObj.excludeEliminatedFromStages).map((s) => String(s).trim()).filter(Boolean);
  if (arr.length > 0) return arr;
  if (rawObj.excludeEliminatedFromStage) {
    const single = String(rawObj.excludeEliminatedFromStage).trim();
    if (single) return [single];
  }
  return [];
}

function normalizePrecedenceTabs(rawObj: Record<string, unknown>): string[] {
  const arr = asArray(rawObj.precedenceFromTabIds).map((s) => String(s).trim()).filter(Boolean);
  if (arr.length > 0) return arr;
  if (rawObj.precedenceFromTabId) {
    const single = String(rawObj.precedenceFromTabId).trim();
    if (single) return [single];
  }
  return [];
}

export function normalizeCustomTabs(v: unknown): StandingsCustomTab[] {
  const list: StandingsCustomTab[] = [];
  for (let idx = 0; idx < asArray(v).length; idx++) {
    const tab = asArray(v)[idx];
    if (!tab || typeof tab !== 'object') continue;
    const t = tab as Record<string, unknown>;
    const label = String(t?.label || '').trim();
    if (!label) continue;
    const id = String(t?.id || `custom-tab-${idx + 1}`).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const shortLabel = t?.shortLabel ? String(t.shortLabel).trim() : undefined;
    const description = t?.description ? String(t.description).trim() : undefined;
    const includeStages = asArray(t?.includeStages).map((s) => String(s).trim()).filter(Boolean);
    const zones = t?.zones ? normalizeZones(t.zones) : undefined;
    const excludeEliminatedFromStages = normalizeExcludeStages(t);
    const precedenceFromTabIds = normalizePrecedenceTabs(t);
    const hidePrecedenceQualified = typeof t?.hidePrecedenceQualified === 'boolean' ? t.hidePrecedenceQualified : false;

    list.push({
      id,
      label,
      ...(shortLabel ? { shortLabel } : {}),
      ...(description ? { description } : {}),
      includeStages,
      ...(zones ? { zones } : {}),
      ...(excludeEliminatedFromStages.length > 0 ? { excludeEliminatedFromStages } : {}),
      ...(precedenceFromTabIds.length > 0 ? { precedenceFromTabIds } : {}),
      ...(hidePrecedenceQualified ? { hidePrecedenceQualified } : {}),
    });
  }
  return list;
}

export function normalizeTabGroups(v: unknown): StandingsTabGroup[] {
  const list: StandingsTabGroup[] = [];
  for (let gIdx = 0; gIdx < asArray(v).length; gIdx++) {
    const group = asArray(v)[gIdx];
    if (!group || typeof group !== 'object') continue;
    const g = group as Record<string, unknown>;
    const name = String(g?.name || '').trim();
    if (!name) continue;
    const id = String(g?.id || `tab-group-${gIdx + 1}`).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    const items: StandingsNavigationItem[] = [];
    for (let iIdx = 0; iIdx < asArray(g?.items).length; iIdx++) {
      const item = asArray(g.items)[iIdx];
      if (!item || typeof item !== 'object') continue;
      const it = item as Record<string, unknown>;
      const label = String(it?.label || '').trim();
      if (!label) continue;
      const type = (['STAGE', 'CUSTOM_TAB', 'OVERALL'].includes(it?.type as string)
        ? it.type
        : 'STAGE') as 'STAGE' | 'CUSTOM_TAB' | 'OVERALL';
      const itemId = String(it?.id || `item-${iIdx + 1}`).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const stageName = it?.stageName ? String(it.stageName).trim() : undefined;
      const includeStages = asArray(it?.includeStages).map((s) => String(s).trim()).filter(Boolean);
      const zones = it?.zones ? normalizeZones(it.zones) : undefined;
      const shortLabel = it?.shortLabel ? String(it.shortLabel).trim() : undefined;
      const description = it?.description ? String(it.description).trim() : undefined;
      const excludeEliminatedFromStages = normalizeExcludeStages(it);
      const precedenceFromTabIds = normalizePrecedenceTabs(it);
      const hidePrecedenceQualified =
        typeof it?.hidePrecedenceQualified === 'boolean' ? it.hidePrecedenceQualified : false;

      const enableGroupSubTabs = Boolean(it?.enableGroupSubTabs);
      const showOverallInGroupTabs = typeof it?.showOverallInGroupTabs === 'boolean' ? it.showOverallInGroupTabs : true;
      const groupName = it?.groupName ? String(it.groupName).trim() : undefined;
      const groups = asArray(it?.groups).map((g) => String(g).trim()).filter(Boolean);
      const groupZones = it?.groupZones && typeof it.groupZones === 'object'
        ? (Object.fromEntries(
            Object.entries(it.groupZones as Record<string, unknown>).map(([k, v]) => [k, normalizeZones(v)])
          ) as Record<string, ZoneRule[]>)
        : undefined;

      items.push({
        id: itemId,
        type,
        label,
        ...(shortLabel ? { shortLabel } : {}),
        ...(stageName ? { stageName } : {}),
        ...(includeStages.length > 0 ? { includeStages } : {}),
        ...(zones ? { zones } : {}),
        ...(description ? { description } : {}),
        ...(excludeEliminatedFromStages.length > 0 ? { excludeEliminatedFromStages } : {}),
        ...(precedenceFromTabIds.length > 0 ? { precedenceFromTabIds } : {}),
        ...(hidePrecedenceQualified ? { hidePrecedenceQualified } : {}),
        ...(enableGroupSubTabs ? { enableGroupSubTabs: true, showOverallInGroupTabs } : {}),
        ...(groupName ? { groupName } : {}),
        ...(groups.length > 0 ? { groups } : {}),
        ...(groupZones ? { groupZones } : {}),
      });
    }

    list.push({
      id,
      name,
      items,
    });
  }
  return list;
}

export function normalizeCustomPlayerColumn(raw: unknown): CustomPlayerColumn | null {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const metric = String(c.metric || '') as PlayerMetricField;
  if (!PLAYER_METRIC_FIELDS.some((m) => m.key === metric)) return null;

  const aggregator = String(c.aggregator || 'max') as PlayerMetricAggregator;
  if (!PLAYER_METRIC_AGGREGATORS.some((a) => a.key === aggregator)) return null;

  const id = c.id ? String(c.id).trim() : `${metric}_${aggregator}`;
  const auto = generateCustomColumnLabel(metric, aggregator, typeof c.threshold === 'number' ? c.threshold : undefined);
  const label = c.label ? String(c.label).trim() : auto.label;
  const short = c.short ? String(c.short).trim() : auto.short;
  const threshold = typeof c.threshold === 'number' && !isNaN(c.threshold) ? c.threshold : undefined;

  return {
    id,
    label,
    short,
    metric,
    aggregator,
    threshold,
  };
}

export function normalizeStatisticsConfig(v: unknown): StatisticsConfig {
  const s = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const defaultView = s.defaultView === 'teams' ? 'teams' : 'players';
  const playerColumns = asArray(s.playerColumns)
    .map(String)
    .filter((k): k is PlayerStatColumnKey =>
      PLAYER_STAT_COLUMN_DEFS.some((d) => d.key === k)
    );
  const customPlayerColumns = asArray(s.customPlayerColumns)
    .map(normalizeCustomPlayerColumn)
    .filter((c): c is CustomPlayerColumn => Boolean(c));
  const defaultTeamPointsMode =
    s.defaultTeamPointsMode === 'avg' || s.defaultTeamPointsMode === 'max'
      ? s.defaultTeamPointsMode
      : 'sum';
  return {
    defaultView,
    playerColumns: playerColumns.length > 0 ? playerColumns : undefined,
    customPlayerColumns: customPlayerColumns.length > 0 ? customPlayerColumns : undefined,
    defaultTeamPointsMode,
  };
}

export function normalizeLogoModeBySurface(v: unknown): Record<DisplaySurface, StandingsLogoMode> {
  const src = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const out = {} as Record<DisplaySurface, StandingsLogoMode>;
  for (const { key } of DISPLAY_SURFACES) {
    out[key] = LOGO_MODES.includes(src[key] as StandingsLogoMode)
      ? (src[key] as StandingsLogoMode)
      : DEFAULT_SURFACE_LOGO_MODE;
  }
  return out;
}

/**
 * Reads the per-surface team-mark choice out of a whole stored standings config.
 *
 * The choice lives under `logoModeBySurface`. Handing `normalizeLogoModeBySurface` the whole
 * config instead of that nested object finds no surface keys, so every tab reads back the
 * default — indistinguishable on screen from "the choice I saved was not kept", and the next
 * save then writes those defaults over the stored value. Always read through here.
 */
export function logoModesFromConfig(config: unknown): Record<DisplaySurface, StandingsLogoMode> {
  const src = (config && typeof config === 'object' ? config : {}) as Record<string, unknown>;
  return normalizeLogoModeBySurface(src.logoModeBySurface);
}

function normalizeVisibleTabs(raw: unknown): TournamentTabId[] {
  if (!Array.isArray(raw)) return [...ALL_TOURNAMENT_TAB_IDS];
  const valid = raw.filter((id): id is TournamentTabId => ALL_TOURNAMENT_TAB_IDS.includes(id as TournamentTabId));
  return valid.length > 0 ? valid : [...ALL_TOURNAMENT_TAB_IDS];
}

export function normalizeStandingsConfig(raw: unknown): StandingsConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cfg: StandingsConfig = {
    logoModeBySurface: normalizeLogoModeBySurface(src.logoModeBySurface),
    showOverall: typeof src.showOverall === 'boolean' ? src.showOverall : true,
    showTiebreakers: typeof src.showTiebreakers === 'boolean' ? src.showTiebreakers : true,
    filters: normalizeFilters(src.filters, DEFAULT_STANDINGS_CONFIG.filters),
    columns: normalizeColumns(src.columns),
    matchColumns: normalizeMatchColumns(src.matchColumns),
    zones: normalizeZones(src.zones),
    stages: {},
    customTabs: normalizeCustomTabs(src.customTabs),
    tabGroups: normalizeTabGroups(src.tabGroups),
    statisticsConfig: normalizeStatisticsConfig(src.statisticsConfig),
    visibleTabs: normalizeVisibleTabs(src.visibleTabs),
  };

  const stages = (src.stages && typeof src.stages === 'object' ? src.stages : {}) as Record<string, unknown>;
  for (const [name, value] of Object.entries(stages)) {
    const s = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    cfg.stages[name] = {
      ...(STAGE_MODES.includes(s.mode as StandingsStageMode) ? { mode: s.mode as StandingsStageMode } : {}),
      ...(GROUP_MODES.includes(s.groupMode as StandingsGroupMode)
        ? { groupMode: s.groupMode as StandingsGroupMode }
        : {}),
      ...(s.filters !== undefined ? { filters: normalizeFilters(s.filters, []) } : {}),
      ...(s.zones !== undefined ? { zones: normalizeZones(s.zones) } : {}),
    };
  }
  return cfg;
}

export function stageKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getStageConfig(cfg: StandingsConfig, stageName: string): StandingsStageConfig {
  const key = stageKey(stageName);
  let entry: StandingsConfig['stages'][string] | undefined = cfg.stages[stageName];
  if (!entry) {
    for (const [name, value] of Object.entries(cfg.stages)) {
      const k = stageKey(name);
      if (k === key || k.includes(key) || key.includes(k)) {
        entry = value;
        break;
      }
    }
  }
  return {
    mode: entry?.mode ?? 'STAGE',
    groupMode: entry?.groupMode ?? 'CUMULATIVE',
    filters: entry?.filters ?? cfg.filters,
    zones: entry?.zones ?? cfg.zones,
  };
}

export function zoneForRank(zones: ZoneRule[] | undefined, rank: number): ZoneRule | null {
  if (!zones?.length) return null;
  return zones.find((z) => rank >= z.from && rank <= z.to) ?? null;
}

/* ── match metadata helpers ── */

export function matchStageLabel(m: {
  stage?: { name?: string | null } | null;
  format?: string | null;
}): string {
  if (m.stage?.name?.trim()) return m.stage.name.trim();
  if (m.format) {
    const parts = m.format.split('·').map((p) => p.trim());
    if (parts.length >= 2) {
      const candidate = parts[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
      if (candidate && !candidate.toLowerCase().startsWith('overall')) {
        return candidate;
      }
    }
    return m.format.trim();
  }
  return 'Grand Finals';
}

export function matchDayLabel(scheduledAt: Date | string | null | undefined): string {
  if (!scheduledAt) return '1';
  const d = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  if (isNaN(d.getTime())) return '1';
  return String(d.getUTCDate());
}

export function matchDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function matchRelativeDayKey(date: Date, firstDayKey: string): string {
  const matchKey = matchDayKey(date);
  if (!firstDayKey || matchKey === firstDayKey) return '1';
  const first = new Date(`${firstDayKey}T00:00:00Z`).getTime();
  const current = new Date(`${matchKey}T00:00:00Z`).getTime();
  const diff = Math.round((current - first) / (1000 * 60 * 60 * 24));
  return String(Math.max(1, diff + 1));
}

export interface StandingsMatchLite {
  id: string;
  stageName: string;
  matchNumber?: number | null;
  overallMatchNumber?: number | null;
  day: string;
  mapName: string | null;
  groupName: string | null;
  status: string;
  scheduledAt: string;
  results: Array<{
    teamId: string;
    rank: number;
    wwcd: boolean;
    placePoints: number;
    elimsPoints: number;
    bonusPoints?: number;
    totalPoints: number;
    damage?: number;
    headshots?: number;
    assists?: number;
  }>;
}

export interface StandingsTeamMeta {
  name: string;
  slug?: string | null;
  displayName?: string | null;
  tag?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  countryCode?: string | null;
  [key: string]: unknown;
}

export interface StandingsStageSummary {
  stageName: string;
  matchesCount: number;
  completedMatchesCount: number;
}

/**
 * Flattens prize distribution rows from any supported shape:
 * 1. Flat array of prize rank items: `[{ rank: 1, prize: 1000 }, ...]`
 * 2. Array of stage objects: `[{ stageName: 'Finals', ranks: [...] }, ...]`
 * 3. Structured object with `stages`: `{ stages: [{ ranks: [...] }] }`
 */
export function flattenPrizeRanks(prizeDistribution: unknown): Array<Record<string, unknown>> {
  if (!prizeDistribution) return [];

  // Case 1: Array (either flat ranks or stage objects with .ranks)
  if (Array.isArray(prizeDistribution)) {
    const list: Array<Record<string, unknown>> = [];
    for (const item of prizeDistribution) {
      if (!item || typeof item !== 'object') continue;
      const stageRanks = (item as Record<string, unknown>).ranks;
      if (Array.isArray(stageRanks)) {
        for (const r of stageRanks) {
          if (r && typeof r === 'object') list.push(r as Record<string, unknown>);
        }
      } else {
        list.push(item as Record<string, unknown>);
      }
    }
    return list;
  }

  // Case 2: Object with `stages: [...]`
  if (typeof prizeDistribution === 'object') {
    const stages = (prizeDistribution as Record<string, unknown>).stages;
    if (Array.isArray(stages)) {
      const list: Array<Record<string, unknown>> = [];
      for (const st of stages) {
        if (!st || typeof st !== 'object') continue;
        const ranks = (st as Record<string, unknown>).ranks;
        if (Array.isArray(ranks)) {
          for (const r of ranks) {
            if (r && typeof r === 'object') list.push(r as Record<string, unknown>);
          }
        }
      }
      return list;
    }
  }

  return [];
}

export interface PrizeResolvedEntry {
  rank: string;
  prize: number;
  percentage?: number;
  rewardType?: string;
  customReward?: string;
  recipientType?: string;
  teamId?: string;
  playerId?: string;
  recipientName?: string;
}

export function resolvePrizeRecipients(
  prizeDistribution: unknown,
  teamsById: Map<string, { name?: string | null; displayName?: string | null; tag?: string | null } | null | undefined>,
  playersById: Map<string, { ign?: string | null } | null | undefined>
): {
  entries: PrizeResolvedEntry[];
  winner: string | null;
  runnerUp: string | null;
} {
  const rows = flattenPrizeRanks(prizeDistribution);
  let winner: string | null = null;
  let runnerUp: string | null = null;

  const entries = rows.map((r) => {
    const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const teamId = row.teamId ? String(row.teamId) : undefined;
    const playerId = row.playerId ? String(row.playerId) : undefined;
    const place = typeof row.place === 'number' ? row.place : typeof row.rank === 'number' ? row.rank : undefined;

    const team = teamId ? teamsById.get(teamId) ?? null : null;
    const player = playerId ? playersById.get(playerId) ?? null : null;
    if (place === 1 && team && !winner) winner = team.displayName || team.name || null;
    if (place === 2 && team && !runnerUp) runnerUp = team.displayName || team.name || null;

    return {
      ...row,
      team,
      player,
    } as unknown as PrizeResolvedEntry;
  });

  return {
    entries,
    winner,
    runnerUp,
  };
}
