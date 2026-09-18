/**
 * Pure paste-table parser shared by the admin bulk importers.
 *
 * Users refill data by copy-pasting from Excel and only include the columns they
 * actually have. Two rules keep that honest:
 *
 *   1. Columns are resolved by header NAME. A column the paste does not carry
 *      maps to `undefined`, which the write path (`teamDetailPayload` /
 *      `playerDetailPayload`) stores as NULL — never a fabricated `0`. Only
 *      scoring fields (`elims`, `bonusPoints`) keep a zero fallback, because a
 *      match always has a known elimination / bonus count.
 *   2. Header detection accepts ANY recognised column alias. A stats-only header
 *      row — exactly what a "just the columns I have" paste produces — must not
 *      be mistaken for data and read positionally, which would write values into
 *      the wrong columns. When no header is found the parser reads positionally
 *      and reports `mode: 'positional'` so the UI can warn before ingesting.
 *
 * Because a dropped header is invisible in the rows (the mapper just falls back),
 * `parsePaste` also reports `unrecognisedHeaders` and `resolvedKeys` so the
 * preview can show what was ignored and what a missing scoring column becomes —
 * see `describeScoringFallbacks`.
 *
 * Pure module: no Prisma, no React, no IO.
 */
import { parseWwcd } from './tournament-math';

export type PasteMode = 'excel' | 'json';
/**
 * What a paste is for. `schedule` books fixtures and carries no team, player or
 * result column at all — see `SCHEDULE_PASTE_COLUMNS`.
 */
export type PasteTarget = 'teams' | 'players' | 'schedule';

/** How the pasted columns were resolved. */
export type PasteReadMode = 'header' | 'positional' | 'json';

export interface ParsedPaste {
  rows: Record<string, any>[];
  error: string | null;
  /** `positional` means no header row was recognised — interpretation changed. */
  mode: PasteReadMode;
  /**
   * Header mode only: canonical row keys the header row resolved to. Empty when
   * there is no header (`positional`) or no header row at all (`json`), because
   * those reads have no column names to resolve.
   */
  resolvedKeys: string[];
  /**
   * Header mode only, in first-row order and de-duplicated: header tokens that
   * matched no column alias. The mapper drops such a column silently — an
   * unrecognised `Bonus Pts` header is why `bonusPoints` reads back as `0` — so
   * the preview must name them before ingest.
   */
  unrecognisedHeaders: string[];
}

export interface PasteColumn {
  /** Key on the parsed row object. */
  key: string;
  /** Human label for the pre-import preview. */
  label: string;
  /** Detail (nullable telemetry) column — reported as "stored blank" when absent. */
  detail?: boolean;
}

/** Columns the team-row mapping produces, in ingest order. */
export const TEAM_PASTE_COLUMNS: readonly PasteColumn[] = [
  { key: 'Tournament', label: 'Tournament' },
  { key: 'Stage', label: 'Stage' },
  { key: 'Date', label: 'Date' },
  { key: 'TimeFormat', label: 'Time format' },
  { key: 'Time', label: 'Time' },
  { key: 'OverallMatch', label: 'Overall match' },
  { key: 'StageMatch', label: 'Stage match' },
  { key: 'Map', label: 'Map' },
  { key: 'Group', label: 'Group' },
  { key: 'Type', label: 'Type' },
  { key: 'team', label: 'Team' },
  { key: 'rank', label: 'Rank' },
  { key: 'wwcd', label: 'WWCD' },
  { key: 'placePoints', label: 'Place points' },
  { key: 'elims', label: 'Elims (scoring)' },
  { key: 'bonusPoints', label: 'Bonus points (scoring)' },
  { key: 'totalPoints', label: 'Total points' },
  { key: 'survivalTime', label: 'Survival time', detail: true },
  { key: 'damage', label: 'Damage', detail: true },
  { key: 'healing', label: 'Healing', detail: true },
  { key: 'damageReceived', label: 'Damage received', detail: true },
  { key: 'headshots', label: 'Headshots', detail: true },
  { key: 'assists', label: 'Assists', detail: true },
  { key: 'knockouts', label: 'Knockouts', detail: true },
  { key: 'longestElim', label: 'Longest elim', detail: true },
  { key: 'vehicleElims', label: 'Vehicle elims', detail: true },
  { key: 'grenadeElims', label: 'Grenade elims', detail: true },
  { key: 'smokesUsed', label: 'Smokes', detail: true },
  { key: 'grenadesUsed', label: 'Grenades', detail: true },
  { key: 'molotovsUsed', label: 'Molotovs', detail: true },
  { key: 'flashUsed', label: 'Flash', detail: true },
  { key: 'airdrops', label: 'Airdrops', detail: true },
  { key: 'rescues', label: 'Rescues', detail: true },
  { key: 'distDrove', label: 'Distance drove', detail: true },
  { key: 'distWalk', label: 'Distance walked', detail: true },
];

/** Columns the player-row mapping produces, in ingest order. */
export const PLAYER_PASTE_COLUMNS: readonly PasteColumn[] = [
  { key: 'Tournament', label: 'Tournament' },
  { key: 'Stage', label: 'Stage' },
  { key: 'Date', label: 'Date' },
  { key: 'TimeFormat', label: 'Time format' },
  { key: 'Time', label: 'Time' },
  { key: 'OverallMatch', label: 'Overall match' },
  { key: 'StageMatch', label: 'Stage match' },
  { key: 'Map', label: 'Map' },
  { key: 'Group', label: 'Group' },
  { key: 'Type', label: 'Type' },
  { key: 'isVerified', label: 'Verified' },
  { key: 'player', label: 'Player' },
  { key: 'team', label: 'Team' },
  { key: 'role', label: 'Role' },
  { key: 'elims', label: 'Elims (scoring)' },
  { key: 'team_rank', label: 'Team rank (scoring)' },
  { key: 'team_wwcd', label: 'Team WWCD (scoring)' },
  { key: 'team_place', label: 'Team place pts (scoring)' },
  { key: 'team_elims', label: 'Team elim pts (scoring)' },
  { key: 'team_total', label: 'Team total pts (scoring)' },
  { key: 'bonusPoints', label: 'Team bonus pts (scoring)' },
  { key: 'playerPowerplay', label: 'Powerplay', detail: true },
  { key: 'damage', label: 'Damage', detail: true },
  { key: 'survivalTime', label: 'Survival time', detail: true },
  { key: 'healing', label: 'Healing', detail: true },
  { key: 'damageReceived', label: 'Damage received', detail: true },
  { key: 'headshots', label: 'Headshots', detail: true },
  { key: 'assists', label: 'Assists', detail: true },
  { key: 'knockouts', label: 'Knockouts', detail: true },
  { key: 'longestElim', label: 'Longest elim', detail: true },
  { key: 'vehicleElims', label: 'Vehicle elims', detail: true },
  { key: 'grenadeElims', label: 'Grenade elims', detail: true },
  { key: 'smokesUsed', label: 'Smokes', detail: true },
  { key: 'grenadesUsed', label: 'Grenades', detail: true },
  { key: 'molotovsUsed', label: 'Molotovs', detail: true },
  { key: 'flashUsed', label: 'Flash', detail: true },
  { key: 'utilities', label: 'Utilities total', detail: true },
  { key: 'airdrops', label: 'Airdrops', detail: true },
  { key: 'rescues', label: 'Rescues', detail: true },
  { key: 'distDrove', label: 'Distance drove', detail: true },
  { key: 'distWalk', label: 'Distance walked', detail: true },
  { key: 'total_dist', label: 'Total distance', detail: true },
  { key: 'isMvp', label: 'MVP', detail: true },
];

/**
 * Columns a schedule-only paste carries: the fixture's identity, and nothing
 * scored.
 *
 * Booking a match and scoring it are separate acts — a fixture exists, and is
 * ordered and displayed, before any squad is attached to it. So a sheet that
 * names only the when/where must import on its own rather than being refused
 * for want of a team column it was never meant to have.
 */
export const SCHEDULE_PASTE_COLUMNS: readonly PasteColumn[] = [
  { key: 'Tournament', label: 'Tournament' },
  { key: 'Stage', label: 'Stage' },
  { key: 'Date', label: 'Date' },
  { key: 'TimeFormat', label: 'Time format' },
  { key: 'Time', label: 'Time' },
  { key: 'OverallMatch', label: 'Overall match' },
  { key: 'StageMatch', label: 'Stage match' },
  { key: 'Map', label: 'Map' },
  { key: 'Group', label: 'Group' },
  { key: 'Type', label: 'Type' },
];

export function pasteColumnsFor(target: PasteTarget): readonly PasteColumn[] {
  if (target === 'players') return PLAYER_PASTE_COLUMNS;
  if (target === 'schedule') return SCHEDULE_PASTE_COLUMNS;
  return TEAM_PASTE_COLUMNS;
}

/** Lowercase, strip quotes and punctuation — the form the column aliases use. */
function normaliseHeaderToken(token: string): string {
  return token.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/[^a-z0-9_]/g, '');
}

/**
 * Canonical `colMap` keys a normalised header token stands for.
 *
 * Returned as a list because a single alias can legitimately fill two slots
 * (`team_wwcd` also answers `wwcd`). An empty list means "not a column alias".
 *
 * Aliases stay conservative: every accepted spelling is a contraction of the
 * canonical name (`placepoints` → `placepts`, `place_pts`, `placement_pts`), so a
 * bare token that could mean any column (`pts`, `points`, `p`, `b`) is never
 * mapped. A dropped alias is not harmless — the mapper falls through to a
 * rank-derived placement and a computed total — so the preview reports the
 * tokens this function rejects.
 */
export function resolveHeaderColumns(cleanToken: string): string[] {
  switch (cleanToken) {
    case 'tournament':
    case 'tourney':
    case 'tournament_name':
      return ['tournament'];
    case 'stage':
    case 'stage_name':
      return ['stage'];
    case 'date':
    case 'match_date':
      return ['date'];
    case 'timeformat':
    case 'time_format':
    case 'tz':
      return ['timeformat'];
    case 'time':
    case 'match_time':
      return ['time'];
    case 'overallmatch':
    case 'overall_match':
    case 'overall':
    case 'overallmatchnumber':
      return ['overallmatch'];
    case 'stagematch':
    case 'stage_match':
    case 'match':
    case 'matchnumber':
    case 'stagematchnumber':
      return ['stagematch'];
    case 'map':
    case 'mapname':
    case 'map_name':
      return ['map'];
    case 'group':
    case 'groupname':
    case 'group_name':
      return ['group'];
    case 'type':
    case 'matchtype':
    case 'match_type':
    case 'environment':
      return ['type'];
    case 'verified':
    case 'isverified':
    case 'qualifier':
    case 'isqualifier':
    case 'openqualifier':
      return ['isverified'];
    case 'player':
    case 'ign':
    case 'player_ign':
    case 'playername':
    case 'player_name':
      return ['player'];
    case 'team':
    case 'teamname':
    case 'team_name':
    case 'squad':
    case 'tag':
      return ['team'];
    case 'role':
    case 'player_role':
      return ['role'];
    case 'elims':
    case 'kills':
    case 'player_elims':
    case 'playerelims':
    case 'finishes':
    case 'kp':
    // "Elims Pts" / "Elim Pts" / "Elim Points" — the spellings a sheet that
    // counts eliminations AS points actually uses.
    case 'elimspts':
    case 'elims_pts':
    case 'elimpts':
    case 'elim_pts':
    case 'elimpoints':
    case 'elim_points':
      return ['elims'];
    case 'team_rank':
    case 'teamrank':
      return ['team_rank'];
    case 'team_wwcd':
    case 'teamwwcd':
    case 'iswwcd':
    case 'is_wwcd':
      return ['team_wwcd', 'wwcd'];
    case 'team_place':
    case 'teamplace':
    case 'team_placepoints':
    case 'teamplacepoints':
      return ['team_place'];
    case 'team_elims':
    case 'teamelims':
    case 'team_elimspoints':
    case 'teamelimspoints':
      return ['team_elims'];
    case 'team_total':
    case 'teamtotal':
    case 'team_totalpoints':
    case 'teamtotalpoints':
      return ['team_total'];
    case 'rank':
    case 'pos':
    case 'placement':
      return ['rank'];
    case 'wwcd':
    case 'winner':
    case 'chicken':
    case 'win':
    case 'won':
      return ['wwcd', 'team_wwcd'];
    case 'placepoints':
    case 'place_points':
    case 'pp':
    // "Place Pts" / "Placement Points" / "Placement Pts".
    case 'placepts':
    case 'place_pts':
    case 'placementpoints':
    case 'placementpts':
    case 'placement_pts':
      return ['placepoints'];
    case 'bonuspoints':
    case 'bonus_points':
    case 'bonus':
    // "Bonus Pts" / "Bonus Point".
    case 'bonuspts':
    case 'bonus_pts':
    case 'bonuspoint':
    case 'bonus_point':
      return ['bonuspoints'];
    case 'totalpoints':
    case 'total_points':
    case 'total':
    // "Total Pts" / "Total Point".
    case 'totalpts':
    case 'total_pts':
    case 'totalpoint':
    case 'total_point':
      return ['totalpoints'];
    case 'damage':
    case 'dmg':
    case 'player_damage':
      return ['damage'];
    case 'survivaltime':
    case 'survival_time':
    case 'surv':
    case 'survived':
      return ['survivaltime'];
    case 'healing':
    case 'heal':
    case 'heals':
      return ['healing'];
    case 'damagereceived':
    case 'damage_received':
    case 'dmgrcv':
    case 'dmg_rcv':
      return ['damagereceived'];
    case 'headshots':
    case 'headshot':
    case 'hs':
      return ['headshots'];
    case 'assists':
    case 'assist':
    case 'ast':
      return ['assists'];
    case 'knockouts':
    case 'knockout':
    case 'knocks':
    case 'knock':
      return ['knockouts'];
    case 'longestelim':
    case 'longest_elim':
    case 'longestkill':
      return ['longestelim'];
    case 'vehicleelims':
    case 'vehicle_elims':
    case 'vehiclekills':
      return ['vehicleelims'];
    case 'grenadeelims':
    case 'grenade_elims':
    case 'grenadekills':
    case 'nadeelims':
      return ['grenadeelims'];
    case 'smokesused':
    case 'smokes_used':
    case 'smokes':
    case 'smoke':
      return ['smokesused'];
    case 'grenadesused':
    case 'grenades_used':
    case 'grenades':
    case 'nades':
      return ['grenadesused'];
    case 'molotovsused':
    case 'molotovs_used':
    case 'molotovs':
    case 'molis':
      return ['molotovsused'];
    case 'flashused':
    case 'flash_used':
    case 'flash':
      return ['flashused'];
    case 'utilities':
    case 'util':
    case 'utilitiestotal':
    case 'total_utilities':
      return ['utilities'];
    case 'airdrops':
    case 'airdrop':
    case 'drops':
    case 'crates':
      return ['airdrops'];
    case 'rescues':
    case 'rescue':
    case 'revives':
    case 'revive':
      return ['rescues'];
    case 'distdrove':
    case 'dist_drove':
    case 'drove':
    case 'drive':
      return ['distdrove'];
    case 'distwalk':
    case 'dist_walk':
    case 'walk':
    case 'walked':
      return ['distwalk'];
    case 'total_dist':
    case 'totaldist':
    case 'total_distance':
    case 'distance':
      return ['total_dist'];
    case 'playerpowerplay':
    case 'player_powerplay':
    case 'powerplay':
      return ['playerpowerplay'];
    case 'ismvp':
    case 'is_mvp':
    case 'mvp':
      return ['ismvp'];
    default:
      return [];
  }
}

/**
 * True when any cell in the first row is a recognised column alias — i.e. the
 * row is a header, even if it only names stats and none of the identity columns.
 */
export function looksLikeHeaderRow(tokens: readonly string[]): boolean {
  return tokens.some((token) => resolveHeaderColumns(normaliseHeaderToken(token)).length > 0);
}

/** Build the alias → index map for a recognised header row. */
function buildColumnMap(tokens: readonly string[]): Record<string, number> {
  const colMap: Record<string, number> = {};
  tokens.forEach((token, idx) => {
    for (const key of resolveHeaderColumns(normaliseHeaderToken(token))) {
      colMap[key] = idx;
    }
  });
  return colMap;
}

/**
 * First-row tokens no alias answers to, in paste order and de-duplicated. They
 * are reported verbatim (trimmed, original casing) so the preview can echo the
 * user's own spelling back at them.
 */
function collectUnrecognisedHeaders(tokens: readonly string[]): string[] {
  const unknown: string[] = [];

  for (const token of tokens) {
    const label = token.trim().replace(/^["']|["']$/g, '');
    if (label === '') continue; // trailing delimiter / blank column
    if (resolveHeaderColumns(normaliseHeaderToken(token)).length > 0) continue;
    if (unknown.includes(label)) continue;
    unknown.push(label);
  }

  return unknown;
}

/** Split a paste into non-empty, trimmed lines. */
function pasteLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function splitCells(line: string, delimiter: string | RegExp): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
}

function detectDelimiter(firstLine: string): string | RegExp {
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(',')) return ',';
  return /\s{2,}/;
}

function numeric(value: string | undefined): number | undefined {
  return value != null && value !== '' ? Number(value) : undefined;
}

/**
 * Parse a pasted Excel/TSV table or JSON array into importer rows.
 *
 * `mode` in the result tells the caller whether a header row was found: when it
 * is `'positional'` the values were assigned by column order, so an absent
 * column can silently shift into the wrong slot and the UI must warn. The
 * `unrecognisedHeaders` / `resolvedKeys` pair only carries values in header
 * mode, where the header row is what decides a column's meaning.
 */
export function parsePaste(rawText: string, mode: PasteMode, target: PasteTarget): ParsedPaste {
  if (!rawText.trim()) {
    return {
      rows: [],
      error: null,
      mode: mode === 'json' ? 'json' : 'positional',
      resolvedKeys: [],
      unrecognisedHeaders: [],
    };
  }

  if (mode === 'json') {
    try {
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) {
        return {
          rows: [],
          error: 'JSON root must be an Array of objects.',
          mode: 'json',
          resolvedKeys: [],
          unrecognisedHeaders: [],
        };
      }
      return { rows: parsed, error: null, mode: 'json', resolvedKeys: [], unrecognisedHeaders: [] };
    } catch (err: any) {
      return {
        rows: [],
        error: `JSON Syntax Error: ${err?.message || err}`,
        mode: 'json',
        resolvedKeys: [],
        unrecognisedHeaders: [],
      };
    }
  }

  const lines = pasteLines(rawText);
  if (lines.length === 0) {
    return { rows: [], error: null, mode: 'positional', resolvedKeys: [], unrecognisedHeaders: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerTokens = splitCells(lines[0], delimiter);
  const hasHeader = looksLikeHeaderRow(headerTokens);
  const colMap = hasHeader ? buildColumnMap(headerTokens) : {};
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = dataLines
    .map((line) => {
      const parts = splitCells(line, delimiter);
      if (parts.length < 2) return null;

      const getVal = (key: string, defaultColIdx?: number): string | undefined => {
        if (hasHeader) {
          const idx = colMap[key];
          if (idx != null && parts[idx] !== undefined && parts[idx] !== '') return parts[idx];
          return undefined;
        }
        if (defaultColIdx != null && parts[defaultColIdx] !== undefined && parts[defaultColIdx] !== '') {
          return parts[defaultColIdx];
        }
        return undefined;
      };

      if (target === 'players') return buildPlayerRow(getVal);
      if (target === 'schedule') return buildScheduleRow(getVal);
      return buildTeamRow(getVal);
    })
    .filter(Boolean) as Record<string, any>[];

  return {
    rows,
    error: null,
    mode: hasHeader ? 'header' : 'positional',
    resolvedKeys: hasHeader ? Object.keys(colMap) : [],
    unrecognisedHeaders: hasHeader ? collectUnrecognisedHeaders(headerTokens) : [],
  };
}

type GetVal = (key: string, defaultColIdx?: number) => string | undefined;

function buildPlayerRow(getVal: GetVal): Record<string, any> {
  return {
    Tournament: getVal('tournament', 0) || '',
    Stage: getVal('stage', 1) || 'Grand Finals',
    Date: getVal('date', 2),
    TimeFormat: getVal('timeformat', 3) || 'IST',
    Time: getVal('time', 4),
    OverallMatch: numeric(getVal('overallmatch', 5)),
    StageMatch: numeric(getVal('stagematch', 6)) ?? 1,
    Map: getVal('map', 7) || 'Erangel',
    Group: getVal('group', 8),
    Type: getVal('type') || getVal('matchtype'),
    isVerified: getVal('isverified'),
    player: getVal('player', 9) || '',
    team: getVal('team', 10) || '',
    role: getVal('role', 11),
    // Scoring: a match always has a known elimination count.
    elims: numeric(getVal('elims', 12)) ?? 0,
    // Detail telemetry: absent stays undefined → NULL, never a fabricated 0.
    playerPowerplay: numeric(getVal('playerpowerplay', 13)),
    team_rank: numeric(getVal('team_rank', 14)),
    team_wwcd: (() => {
      const raw = getVal('team_wwcd', 15) ?? getVal('wwcd');
      if (raw != null) return parseWwcd(raw);
      const rank = numeric(getVal('team_rank', 14));
      return rank === 1 ? true : undefined;
    })(),
    team_place: numeric(getVal('team_place', 16)),
    team_elims: numeric(getVal('team_elims', 17)),
    team_total: numeric(getVal('team_total', 18)),
    // Team bonus is a team-level figure even on a player row, and the only
    // team column a player sheet spells without the `Team ` prefix. Header
    // mode only: the positional slot order has no `Bonus Pts` place.
    bonusPoints: numeric(getVal('bonuspoints')),
    damage: numeric(getVal('damage', 19)),
    survivalTime: numeric(getVal('survivaltime', 20)),
    healing: numeric(getVal('healing', 21)),
    damageReceived: numeric(getVal('damagereceived', 22)),
    headshots: numeric(getVal('headshots', 23)),
    assists: numeric(getVal('assists', 24)),
    knockouts: numeric(getVal('knockouts', 25)),
    longestElim: numeric(getVal('longestelim', 26)),
    vehicleElims: numeric(getVal('vehicleelims', 27)),
    grenadeElims: numeric(getVal('grenadeelims', 28)),
    smokesUsed: numeric(getVal('smokesused', 29)),
    grenadesUsed: numeric(getVal('grenadesused', 30)),
    molotovsUsed: numeric(getVal('molotovsused', 31)),
    flashUsed: numeric(getVal('flashused', 32)),
    utilities: numeric(getVal('utilities', 33)),
    airdrops: numeric(getVal('airdrops', 34)),
    rescues: numeric(getVal('rescues', 35)),
    distDrove: numeric(getVal('distdrove', 36)),
    distWalk: numeric(getVal('distwalk', 37)),
    total_dist: numeric(getVal('total_dist', 38)),
    isMvp: getVal('ismvp', 39) ?? undefined,
  };
}

function buildTeamRow(getVal: GetVal): Record<string, any> {
  const teamRankVal = numeric(getVal('rank', 10)) ?? 1;
  const rawTeamWwcd =
    getVal('wwcd', 11) ?? getVal('team_wwcd') ?? getVal('teamwwcd') ?? getVal('winner') ?? getVal('chicken') ?? getVal('win');
  const isTeamWwcdVal = rawTeamWwcd != null ? parseWwcd(rawTeamWwcd, teamRankVal) : teamRankVal === 1;

  return {
    Tournament: getVal('tournament', 0) || '',
    Stage: getVal('stage', 1) || 'Grand Finals',
    Date: getVal('date', 2) || undefined,
    TimeFormat: getVal('timeformat', 3) || 'IST',
    Time: getVal('time', 4) || undefined,
    OverallMatch: getVal('overallmatch', 5) || undefined,
    StageMatch: getVal('stagematch', 6) || 1,
    Map: getVal('map', 7) || 'Erangel',
    Group: getVal('group', 8) || undefined,
    team: getVal('team', 9) || '',
    rank: teamRankVal,
    wwcd: isTeamWwcdVal,
    placePoints: numeric(getVal('placepoints', 12)),
    // Scoring: elims and bonus points are always known for a scorecard.
    elims: numeric(getVal('elims', 13)) ?? 0,
    bonusPoints: numeric(getVal('bonuspoints', 14)) ?? 0,
    totalPoints: numeric(getVal('totalpoints', 15)),
    // Detail telemetry: absent stays NULL. `survivalTime` in particular must not
    // default to 1680 — that asserts a full-length match nobody recorded.
    survivalTime: numeric(getVal('survivaltime', 16)),
    damage: numeric(getVal('damage', 17)),
    healing: numeric(getVal('healing', 18)),
    damageReceived: numeric(getVal('damagereceived', 19)),
    headshots: numeric(getVal('headshots', 20)),
    assists: numeric(getVal('assists', 21)),
    knockouts: numeric(getVal('knockouts', 22)),
    longestElim: numeric(getVal('longestelim', 23)),
    vehicleElims: numeric(getVal('vehicleelims', 24)),
    grenadeElims: numeric(getVal('grenadeelims', 25)),
    smokesUsed: numeric(getVal('smokesused', 26)),
    grenadesUsed: numeric(getVal('grenadesused', 27)),
    molotovsUsed: numeric(getVal('molotovsused', 28)),
    flashUsed: numeric(getVal('flashused', 29)),
    airdrops: numeric(getVal('airdrops', 30)),
    rescues: numeric(getVal('rescues', 31)),
    distDrove: numeric(getVal('distdrove', 32)),
    distWalk: numeric(getVal('distwalk', 33)),
  };
}

/**
 * A schedule-only row: the fixture's slot and when/where, and nothing scored.
 *
 * There is deliberately no `team` field. A booked match exists before any squad
 * is attached to it, and the write path must not read an absent team as a
 * missing-column error the way the scorecard importers do.
 */
function buildScheduleRow(getVal: GetVal): Record<string, unknown> {
  return {
    Tournament: getVal('tournament', 0) || '',
    Stage: getVal('stage', 1) || 'Grand Finals',
    Date: getVal('date', 2) || undefined,
    TimeFormat: getVal('timeformat', 3) || 'IST',
    Time: getVal('time', 4) || undefined,
    OverallMatch: numeric(getVal('overallmatch', 5)),
    StageMatch: numeric(getVal('stagematch', 6)),
    Map: getVal('map', 7) || 'Erangel',
    Group: getVal('group', 8) || undefined,
    Type: getVal('type') || getVal('matchtype'),
  };
}

/** True when the parsed row actually carried a value for this key. */
export function rowHasValue(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

export interface PasteColumnPreview {
  /** Columns at least one row carried — the ones that will be stored. */
  present: PasteColumn[];
  /** Detail columns no row carried — stored blank (NULL), never a 0. */
  missingDetails: PasteColumn[];
}

/** Describe, per column, what a paste will actually write. */
export function summarisePasteColumns(
  rows: readonly Record<string, unknown>[],
  target: PasteTarget,
): PasteColumnPreview {
  const present: PasteColumn[] = [];
  const missingDetails: PasteColumn[] = [];

  for (const column of pasteColumnsFor(target)) {
    if (rows.some((row) => rowHasValue(row, column.key))) {
      present.push(column);
    } else if (column.detail) {
      missingDetails.push(column);
    }
  }

  return { present, missingDetails };
}

/**
 * A scoring column the paste may omit, and what the write path does without it.
 *
 * Unlike a detail column, an absent scoring column is never NULL — the mapper
 * derives it (placement from rank, total from the parts) or falls back to 0 — so
 * it cannot be spotted in the parsed rows. It has to be named up front.
 */
export interface ScoringFallback {
  /** Canonical row key. */
  key: string;
  /** Human label, reusing the column label from the paste-column tables. */
  label: string;
  /** What gets written instead, phrased for the preview. */
  consequence: string;
}

const TEAM_SCORING_FALLBACKS: readonly ScoringFallback[] = [
  {
    key: 'rank',
    label: 'Rank',
    consequence: 'rank not provided — every row is stored as rank 1, and WWCD is inferred from it',
  },
  {
    key: 'wwcd',
    label: 'WWCD',
    consequence: 'WWCD not provided — inferred from rank (rank 1 = WWCD)',
  },
  {
    key: 'placePoints',
    label: 'Place points',
    consequence: 'place points not provided — will be derived from rank',
  },
  {
    key: 'elims',
    label: 'Elims (scoring)',
    consequence: 'elims not provided — will be stored as 0',
  },
  {
    key: 'bonusPoints',
    label: 'Bonus points (scoring)',
    consequence: 'bonus points not provided — will be stored as 0',
  },
  {
    key: 'totalPoints',
    label: 'Total points',
    consequence: 'total not provided — will be computed from place + elims + bonus',
  },
];

/**
 * The scoring columns a player paste omits, and what the cascade does without
 * them. A column supplied by even one row makes that row a team-level row, so
 * the team result is written from it; a row that supplies none of them leaves an
 * existing team result alone (`lib/team-result-write.ts`).
 */
const PLAYER_SCORING_FALLBACKS: readonly ScoringFallback[] = [
  {
    key: 'elims',
    label: 'Elims (scoring)',
    consequence: 'elims not provided — will be stored as 0',
  },
  {
    key: 'team_rank',
    label: 'Team rank (scoring)',
    consequence: 'team rank not provided — an existing team result keeps its rank, otherwise 1',
  },
  {
    key: 'team_wwcd',
    label: 'Team WWCD (scoring)',
    consequence:
      'team WWCD not provided — an existing team result keeps its WWCD, otherwise inferred from team rank (rank 1 = WWCD)',
  },
  {
    key: 'team_place',
    label: 'Team place pts (scoring)',
    consequence:
      'team place pts not provided — an existing team result keeps its place points, otherwise derived from team rank',
  },
  {
    key: 'team_elims',
    label: 'Team elim pts (scoring)',
    consequence:
      "team elim pts not provided — an existing team result keeps its elim pts, otherwise summed from that team's player rows",
  },
  {
    key: 'bonusPoints',
    label: 'Team bonus pts (scoring)',
    consequence:
      'team bonus pts not provided — an existing team result keeps its bonus points, otherwise 0',
  },
  {
    key: 'team_total',
    label: 'Team total pts (scoring)',
    consequence:
      'team total pts not provided — an existing team result keeps its total, otherwise computed from place + elims + bonus',
  },
];

/** The scoring columns a target writes with a fallback, in paste-column order. */
export function scoringFallbacksFor(target: PasteTarget): readonly ScoringFallback[] {
  if (target === 'players') return PLAYER_SCORING_FALLBACKS;
  // A schedule carries no scoring column at all, so there is nothing that can
  // silently read back as a derived value or a zero.
  if (target === 'schedule') return [];
  return TEAM_SCORING_FALLBACKS;
}

/**
 * Scoring columns this paste does not supply, with the consequence of each.
 *
 * In header mode the header row is the source of truth: a scoring column the
 * header never resolved was not supplied, even though the mapper still emits a
 * `0` or a derived value for it. That is the only way to catch a mistyped
 * `Bonus Pts` header before it lands as a wrong total.
 *
 * `json` and `positional` reads have no column names, so presence falls back to
 * "some row carried a value" — the weaker test, which is why positional mode
 * keeps its own, louder warning: there, a wrong column is indistinguishable from
 * a supplied one, so at most the genuinely empty slots are reported.
 */
export function describeScoringFallbacks(
  parsed: Pick<ParsedPaste, 'mode' | 'rows' | 'resolvedKeys'>,
  target: PasteTarget,
): ScoringFallback[] {
  // `resolvedKeys` speaks the all-lowercase alias form from `colMap`
  // (`placepoints`), while a paste-column key is the row property the mapper
  // builds (`placePoints`) — compare both in normalised form.
  const isResolved = (key: string): boolean =>
    parsed.resolvedKeys.some((resolved) => normaliseHeaderToken(resolved) === normaliseHeaderToken(key));

  const supplied = (key: string): boolean =>
    parsed.mode === 'header'
      ? isResolved(key)
      : parsed.rows.some((row) => rowHasValue(row, key));

  return scoringFallbacksFor(target).filter((column) => !supplied(column.key));
}

