/* Standings display configuration: types, defaults, normalization and shared
   helpers consumed by the public detail page, the standings panel and the
   admin editors. Pure module — no React. */

export type StandingsLogoMode = 'BOTH' | 'TEAM' | 'COUNTRY' | 'NONE';
export type StandingsFilterKey = 'day' | 'map' | 'group';
export type StandingsColumnKey = 'mp' | 'wwcd' | 'place' | 'elims' | 'total' | 'form';
export type StandingsStageMode = 'STAGE' | 'CUMULATIVE';
export type StandingsGroupMode = 'CUMULATIVE' | 'PER_GROUP';

export interface ZoneRule {
  from: number;
  to: number;
  label: string;
}

export interface StandingsStageConfig {
  mode: StandingsStageMode;
  groupMode: StandingsGroupMode;
  filters: StandingsFilterKey[];
  zones: ZoneRule[];
}

export interface StandingsConfig {
  logoMode: StandingsLogoMode;
  showOverall: boolean;
  filters: StandingsFilterKey[];
  columns: StandingsColumnKey[];
  zones: ZoneRule[];
  stages: Record<string, Partial<Omit<StandingsStageConfig, 'mode'> & { mode: StandingsStageMode }>>;
}

export const DEFAULT_STANDINGS_CONFIG: StandingsConfig = {
  logoMode: 'BOTH',
  showOverall: true,
  filters: ['day', 'map', 'group'],
  columns: ['mp', 'wwcd', 'place', 'elims', 'total', 'form'],
  zones: [],
  stages: {},
};

export const STANDINGS_COLUMN_DEFS: { key: StandingsColumnKey; label: string; short: string }[] = [
  { key: 'mp', label: 'Matches Played', short: 'MP' },
  { key: 'wwcd', label: 'WWCD', short: 'WWCD' },
  { key: 'place', label: 'Placement Points', short: 'Place' },
  { key: 'elims', label: 'Elimination Points', short: 'Elims' },
  { key: 'total', label: 'Total Points', short: 'Total' },
  { key: 'form', label: 'Last 5 Matches', short: 'Form' },
];

export const STANDINGS_FILTER_DEFS: { key: StandingsFilterKey; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'map', label: 'Map' },
  { key: 'group', label: 'Group' },
];

const LOGO_MODES: StandingsLogoMode[] = ['BOTH', 'TEAM', 'COUNTRY', 'NONE'];
const FILTER_KEYS: StandingsFilterKey[] = ['day', 'map', 'group'];
const COLUMN_KEYS: StandingsColumnKey[] = ['mp', 'wwcd', 'place', 'elims', 'total', 'form'];
const STAGE_MODES: StandingsStageMode[] = ['STAGE', 'CUMULATIVE'];
const GROUP_MODES: StandingsGroupMode[] = ['CUMULATIVE', 'PER_GROUP'];

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function normalizeZones(v: unknown): ZoneRule[] {
  return asArray(v)
    .map((z) => {
      const row = z as Record<string, unknown>;
      const from = Number(row?.from);
      const to = Number(row?.to);
      const label = String(row?.label ?? '').trim();
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from || !label) return null;
      return { from: Math.round(from), to: Math.round(to), label };
    })
    .filter((z): z is ZoneRule => z !== null);
}

function normalizeFilters(v: unknown, fallback: StandingsFilterKey[]): StandingsFilterKey[] {
  const list = asArray(v).filter((f): f is StandingsFilterKey => FILTER_KEYS.includes(f as StandingsFilterKey));
  return v === undefined ? fallback : list;
}

function normalizeColumns(v: unknown): StandingsColumnKey[] {
  const list = asArray(v).filter((c): c is StandingsColumnKey => COLUMN_KEYS.includes(c as StandingsColumnKey));
  return list.length > 0 ? list : [...COLUMN_KEYS];
}

export function normalizeStandingsConfig(raw: unknown): StandingsConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cfg: StandingsConfig = {
    logoMode: LOGO_MODES.includes(src.logoMode as StandingsLogoMode)
      ? (src.logoMode as StandingsLogoMode)
      : DEFAULT_STANDINGS_CONFIG.logoMode,
    showOverall: typeof src.showOverall === 'boolean' ? src.showOverall : true,
    filters: normalizeFilters(src.filters, DEFAULT_STANDINGS_CONFIG.filters),
    columns: normalizeColumns(src.columns),
    zones: normalizeZones(src.zones),
    stages: {},
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
  stageType?: string | null;
  format?: string | null;
}): string {
  if (m.stage?.name) return m.stage.name;
  if (m.stageType) return m.stageType;
  const format = m.format ?? '';
  if (format.includes(' · ')) {
    const parsed = format.split(' · ')[1]?.split(' (')[0];
    if (parsed) return parsed;
  }
  return 'Grand Finals';
}

export function matchDayKey(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function matchRelativeDayKey(date: Date | string, stageFirstDay: string): string {
  const d = new Date(date).getTime();
  const base = new Date(`${stageFirstDay}T00:00:00Z`).getTime();
  const diffDays = Math.floor((d - base) / 86_400_000);
  return String(Math.max(0, diffDays) + 1);
}

/* ── champion / runner-up resolution from prize distribution ── */

interface PrizeRankEntry {
  rank?: string;
  recipientType?: string;
  teamId?: string;
  playerId?: string;
  teamName?: string;
  playerName?: string;
}

function singleRankNumber(rankStr: string): number | null {
  const clean = rankStr.toLowerCase().trim();
  // Ranges ("5th - 8th", "17-32") never identify a single placement.
  if (/(\d+)\s*(?:st|nd|rd|th)?\s*[-–—]|\bto\b/.test(clean) && /\d+\s*[-–—]\s*\d+/.test(clean)) return null;
  const m = clean.match(/(?:#|\b)(\d+)(?:st|nd|rd|th)?\b/);
  return m ? parseInt(m[1], 10) : null;
}

export function resolvePrizeRecipients(
  prizeDistribution: unknown,
  teamsById: Map<string, { name: string }>,
  playersById: Map<string, { ign: string }>
): { winner?: string; runnerUp?: string } {
  const raw = prizeDistribution as
    | { stages?: Array<{ stageName?: string; ranks?: unknown[] }> }
    | Array<Record<string, unknown>>
    | null
    | undefined;
  if (!raw) return {};

  const stages: Array<{ stageName?: string; ranks: PrizeRankEntry[] }> = Array.isArray(raw)
    ? [{ stageName: 'Grand Finals', ranks: raw as PrizeRankEntry[] }]
    : Array.isArray(raw.stages)
      ? raw.stages.map((s) => ({ stageName: s.stageName, ranks: (s.ranks ?? []) as PrizeRankEntry[] }))
      : [];

  const withRanks = stages.filter((s) => s.ranks.length > 0);
  if (withRanks.length === 0) return {};
  const stage =
    withRanks.find((s) => (s.stageName ?? '').toLowerCase().includes('final')) ?? withRanks[0];

  const nameFor = (entry: PrizeRankEntry): string | undefined => {
    if (entry.recipientType === 'PLAYER') {
      return (entry.playerId ? playersById.get(entry.playerId)?.ign : undefined) ?? entry.playerName ?? undefined;
    }
    return (entry.teamId ? teamsById.get(entry.teamId)?.name : undefined) ?? entry.teamName ?? undefined;
  };

  const pick = (placement: number): string | undefined => {
    for (const entry of stage.ranks) {
      if (!entry?.rank) continue;
      if (singleRankNumber(String(entry.rank)) === placement) {
        const name = nameFor(entry);
        if (name) return name;
      }
    }
    return undefined;
  };

  return { winner: pick(1), runnerUp: pick(2) };
}

/* ── payloads shared between the server page and the client panel ── */

export interface StandingsTeamMeta {
  name: string;
  displayName?: string | null;
  tag?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  countryCode?: string | null;
}

export interface StandingsMatchResult {
  teamId: string;
  team?: { id: string; name: string; tag?: string | null; logoUrl?: string | null };
  rank: number;
  wwcd?: boolean;
  placePoints?: number;
  elimsPoints?: number;
  bonusPoints?: number;
  totalPoints?: number;
  damage?: number;
  headshots?: number;
  longestElim?: number;
  grenadeElims?: number;
  utilitiesTotal?: number;
  rescues?: number;
}

export interface StandingsMatchLite {
  id: string;
  stageName: string;
  day: string;
  mapName: string | null;
  groupName: string | null;
  scheduledAt: string;
  status: string;
  results: StandingsMatchResult[];
}

export interface StandingsStageSummary {
  stageName: string;
  matchesCount: number;
  completedMatchesCount: number;
}
