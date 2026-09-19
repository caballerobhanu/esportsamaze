/**
 * Tab-wise sheet parsing for the tournament scaffold — stages, the prize ladder, and
 * qualification rules.
 *
 * Sibling of `lib/paste-table-parse.ts` (which does the match scorecards). Kept separate
 * because the column semantics are entirely different, but it follows the same contract:
 * columns are resolved by HEADER NAME, a column the paste does not carry is reported
 * rather than invented, and unrecognised headers are named back to the admin instead of
 * being silently dropped.
 *
 * Pure module — no Prisma, no React — so it can be unit-tested and imported by the client
 * editors, which is where these pastes are applied. Nothing here writes: each parser
 * returns rows for the editor's own state, and the existing tournament save persists them.
 */

export interface SheetPasteResult<T> {
  rows: T[];
  error: string | null;
  /** First-row tokens no column alias answers to, in paste order, de-duplicated. */
  unrecognisedHeaders: string[];
}

/** Lowercase, strip quotes and punctuation — the form the column aliases use. */
export function normaliseToken(token: string): string {
  return token.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/[^a-z0-9_]/g, '');
}

/** A pasted line winning over commas and multi-space, the way a spreadsheet copy behaves. */
function splitCells(line: string, delimiter: string | RegExp): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
}

function detectDelimiter(firstLine: string): string | RegExp {
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(',')) return ',';
  return /\s{2,}/;
}

function nonEmptyLines(text: string): string[] {
  // Whitespace is preserved: a row whose leading cell is blank starts with a delimiter, and
  // trimming the line would shift every column left by one. splitCells trims each cell.
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

/**
 * Resolve a header row to column indexes.
 *
 * `aliases` maps a canonical key to every spelling a sheet might use for it. A token that
 * answers to no alias is returned in `unrecognised` so the caller can name it back.
 */
export function resolveColumns(
  headers: readonly string[],
  aliases: Record<string, readonly string[]>,
): { map: Record<string, number>; unrecognised: string[] } {
  const lookup = new Map<string, string[]>();
  for (const [key, spellings] of Object.entries(aliases)) {
    for (const spelling of spellings) {
      const token = normaliseToken(spelling);
      lookup.set(token, [...(lookup.get(token) ?? []), key]);
    }
  }

  const map: Record<string, number> = {};
  const unrecognised: string[] = [];

  headers.forEach((header, index) => {
    const raw = header.trim().replace(/^["']|["']$/g, '');
    if (raw === '') return;

    const keys = lookup.get(normaliseToken(header));
    if (!keys) {
      if (!unrecognised.includes(raw)) unrecognised.push(raw);
      return;
    }
    for (const key of keys) map[key] = index;
  });

  return { map, unrecognised };
}

export interface SheetTable {
  map: Record<string, number>;
  unrecognised: string[];
  dataRows: string[][];
}

/**
 * Split a paste into a header row plus data rows.
 *
 * A paste with no recognisable header is refused outright rather than read positionally:
 * unlike a scorecard, these rows carry fifteen or more columns, so a positional read would
 * put values in the wrong fields while looking plausible.
 */
export function readSheet(text: string, aliases: Record<string, readonly string[]>): SheetTable | null {
  const lines = nonEmptyLines(text);
  if (lines.length === 0) return null;

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCells(lines[0], delimiter);
  const { map, unrecognised } = resolveColumns(headers, aliases);
  if (unrecognised.length === headers.filter((h) => h.trim() !== '').length) return null;

  return {
    map,
    unrecognised,
    dataRows: lines.slice(1).map((line) => splitCells(line, delimiter)),
  };
}

export function cell(row: readonly string[], map: Record<string, number>, key: string): string {
  const index = map[key];
  if (index == null) return '';
  return (row[index] ?? '').trim();
}

export function cellInt(row: readonly string[], map: Record<string, number>, key: string): number | undefined {
  const raw = cell(row, map, key);
  if (raw === '') return undefined;
  const value = Number(raw.replace(/,/g, '').replace(/%$/, ''));
  return Number.isFinite(value) ? Math.round(value) : undefined;
}

/** Accepts YYYY-MM-DD, or anything `Date` can read, normalised to YYYY-MM-DD. */
export function cellDate(row: readonly string[], map: Record<string, number>, key: string): string | undefined {
  const raw = cell(row, map, key);
  if (raw === '') return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

/* ────────────────────────────── stages ────────────────────────────── */

export interface ParsedStageRow {
  name: string;
  stageType?: string;
  formatType?: string;
  startDate?: string;
  endDate?: string;
  matchesPerDay?: number;
  matchTime?: string;
  totalMatches?: number;
  matchesPerGroup?: number;
  matchesPerTeam?: number;
  matchdaysCount?: string;
  teamsCount?: number;
  groupsDivision?: string;
  stageDescription?: string;
}

const STAGE_ALIASES: Record<string, readonly string[]> = {
  name: ['stage', 'stage name', 'stagename', 'name', 'phase'],
  stageType: ['structure', 'structure type', 'stagetype', 'stage type', 'type'],
  formatType: ['format', 'format type', 'formattype'],
  startDate: ['start', 'start date', 'startdate', 'from', 'begins'],
  endDate: ['end', 'end date', 'enddate', 'to', 'ends'],
  matchesPerDay: ['matches per day', 'matchesperday', 'mpd', 'per day', 'daily matches'],
  matchTime: ['time', 'match time', 'matchtime', 'kickoff', 'start time'],
  totalMatches: ['total matches', 'totalmatches', 'matches', 'total'],
  matchesPerGroup: ['matches per group', 'matchespergroup', 'per group'],
  matchesPerTeam: ['matches per team', 'matchesperteam', 'per team'],
  matchdaysCount: ['matchdays', 'matchdays count', 'matchdayscount', 'days'],
  teamsCount: ['teams', 'teams count', 'teamscount', 'slots'],
  groupsDivision: ['groups', 'groups division', 'groupsdivision', 'division', 'group count'],
  stageDescription: ['description', 'stage description', 'stagedescription', 'notes', 'note'],
};

export function parseStageSheet(text: string): SheetPasteResult<ParsedStageRow> {
  const table = readSheet(text, STAGE_ALIASES);
  if (!table) {
    return {
      rows: [],
      error: 'No stage columns found in the paste. Include a header row with at least a "Stage" column.',
      unrecognisedHeaders: [],
    };
  }

  const rows = table.dataRows
    .map((row): ParsedStageRow | null => {
      const name = cell(row, table.map, 'name');
      if (!name) return null;

      return {
        name,
        stageType: cell(row, table.map, 'stageType') || undefined,
        formatType: cell(row, table.map, 'formatType') || undefined,
        startDate: cellDate(row, table.map, 'startDate'),
        endDate: cellDate(row, table.map, 'endDate'),
        matchesPerDay: cellInt(row, table.map, 'matchesPerDay'),
        matchTime: cell(row, table.map, 'matchTime') || undefined,
        totalMatches: cellInt(row, table.map, 'totalMatches'),
        matchesPerGroup: cellInt(row, table.map, 'matchesPerGroup'),
        matchesPerTeam: cellInt(row, table.map, 'matchesPerTeam'),
        matchdaysCount: cell(row, table.map, 'matchdaysCount') || undefined,
        teamsCount: cellInt(row, table.map, 'teamsCount'),
        groupsDivision: cell(row, table.map, 'groupsDivision') || undefined,
        stageDescription: cell(row, table.map, 'stageDescription') || undefined,
      };
    })
    .filter((row): row is ParsedStageRow => row !== null);

  return {
    rows,
    error: rows.length === 0 ? 'No stage rows found — each row needs a stage name.' : null,
    unrecognisedHeaders: table.unrecognised,
  };
}

/* ────────────────────────────── prize ladder ────────────────────────────── */

export interface ParsedPrizeRow {
  stageName: string;
  from?: number;
  to?: number;
  rank: string;
  prize: number;
  percentage?: number;
  rewardType?: string;
  customReward?: string;
  recipientType?: string;
  teamName?: string;
  playerName?: string;
  qualifications?: string[];
}

const PRIZE_ALIASES: Record<string, readonly string[]> = {
  stageName: ['stage', 'stage name', 'stagename', 'phase'],
  from: ['from', 'from rank', 'fromrank', 'min'],
  to: ['to', 'to rank', 'torank', 'max'],
  rank: ['rank', 'place', 'placement', 'position'],
  prize: ['amount', 'prize', 'prize amount', 'prizeamount', 'money', 'cash', 'reward amount'],
  percentage: ['percent', 'percentage', 'pct', '%'],
  rewardType: ['reward', 'reward type', 'rewardtype'],
  customReward: ['custom reward', 'customreward', 'item', 'gift', 'device'],
  recipientType: ['recipient', 'recipient type', 'recipienttype', 'for'],
  teamName: ['team', 'team name', 'teamname'],
  playerName: ['player', 'player name', 'playername', 'ign'],
  qualifications: ['qualification', 'qualifications', 'berth', 'berths', 'qualifies for'],
};

/** "1", "1-4", "5th - 8th" → a from/to pair plus the label the editor shows. */
export function parseRankSlot(raw: string): { from?: number; to?: number } {
  const digits = raw.match(/\d+/g);
  if (!digits) return {};
  const from = Number(digits[0]);
  const to = digits.length > 1 ? Number(digits[1]) : undefined;
  return Number.isFinite(from) ? { from, to: to != null && Number.isFinite(to) ? to : undefined } : {};
}

function rankLabelFor(from: number | undefined, to: number | undefined, fallback: string): string {
  if (from == null) return fallback;
  if (to == null || to === from) return String(from);
  return `${from} - ${to}`;
}

export function parsePrizeSheet(text: string): SheetPasteResult<ParsedPrizeRow> {
  const table = readSheet(text, PRIZE_ALIASES);
  if (!table) {
    return {
      rows: [],
      error: 'No prize columns found in the paste. Include a header row with at least a "Rank" or "Place" column.',
      unrecognisedHeaders: [],
    };
  }

  const rows = table.dataRows
    .map((row) => {
      const stageName = cell(row, table.map, 'stageName') || 'Grand Finals';

      const fromRaw = cellInt(row, table.map, 'from');
      const toRaw = cellInt(row, table.map, 'to');
      const rankRaw = cell(row, table.map, 'rank');
      const slot = parseRankSlot(rankRaw || `${fromRaw ?? ''}-${toRaw ?? ''}`);

      const from = fromRaw ?? slot.from;
      const to = toRaw ?? slot.to;

      const qualifications = cell(row, table.map, 'qualifications')
        .split(/[;,|]/)
        .map((entry) => entry.trim())
        .filter(Boolean);

      const parsed: ParsedPrizeRow = {
        stageName,
        from,
        to,
        rank: rankLabelFor(from, to, rankRaw),
        prize: cellInt(row, table.map, 'prize') ?? 0,
        percentage: cellInt(row, table.map, 'percentage'),
        rewardType: cell(row, table.map, 'rewardType').toUpperCase() || undefined,
        customReward: cell(row, table.map, 'customReward') || undefined,
        recipientType: cell(row, table.map, 'recipientType').toUpperCase() || undefined,
        teamName: cell(row, table.map, 'teamName') || undefined,
        playerName: cell(row, table.map, 'playerName') || undefined,
        qualifications: qualifications.length > 0 ? qualifications : undefined,
      };

      // A row with neither a rank nor an amount is a spacer line, not a prize slot.
      if (!parsed.rank && parsed.prize === 0) return null;
      return parsed;
    })
    .filter((row): row is ParsedPrizeRow => row !== null);

  return {
    rows,
    error: rows.length === 0 ? 'No prize rows found — each row needs a rank or an amount.' : null,
    unrecognisedHeaders: table.unrecognised,
  };
}

/** Group flat prize rows into the editor's per-stage shape, preserving first-seen order. */
export function groupPrizeRowsByStage(
  rows: readonly ParsedPrizeRow[],
): Array<{ stageName: string; ranks: ParsedPrizeRow[] }> {
  const byStage = new Map<string, ParsedPrizeRow[]>();
  for (const row of rows) {
    byStage.set(row.stageName, [...(byStage.get(row.stageName) ?? []), row]);
  }
  return [...byStage.entries()].map(([stageName, ranks]) => ({ stageName, ranks }));
}

/* ────────────────────────────── qualification rules ────────────────────────────── */

export interface ParsedQualificationRow {
  from: number | null;
  to: number | null;
  label: string | null;
  targets: Array<{ name: string }>;
  note: string | null;
}

const QUALIFICATION_ALIASES: Record<string, readonly string[]> = {
  from: ['from', 'from rank', 'fromrank', 'min', 'position from'],
  to: ['to', 'to rank', 'torank', 'max', 'position to'],
  label: ['label', 'name', 'title', 'range'],
  targets: ['target', 'targets', 'qualifies to', 'qualifiesto', 'destination', 'events', 'to event'],
  note: ['note', 'notes', 'description', 'remark'],
};

export function parseQualificationSheet(text: string): SheetPasteResult<ParsedQualificationRow> {
  const table = readSheet(text, QUALIFICATION_ALIASES);
  if (!table) {
    return {
      rows: [],
      error: 'No qualification columns found in the paste. Include a header row with a "From"/"To" or "Targets" column.',
      unrecognisedHeaders: [],
    };
  }

  const rows = table.dataRows
    .map((row) => {
      const fromRaw = cell(row, table.map, 'from');
      const toRaw = cell(row, table.map, 'to');
      const labelRaw = cell(row, table.map, 'label');
      const slot = parseRankSlot(labelRaw || `${fromRaw}-${toRaw}`);

      const from = fromRaw !== '' ? cellInt(row, table.map, 'from') ?? null : slot.from ?? null;
      const to = toRaw !== '' ? cellInt(row, table.map, 'to') ?? null : slot.to ?? null;

      const targets = cell(row, table.map, 'targets')
        .split(/[;,|]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

      const parsed: ParsedQualificationRow = {
        from,
        to,
        label: labelRaw || null,
        targets,
        note: cell(row, table.map, 'note') || null,
      };

      // A rule needs a position range or a destination — otherwise it says nothing.
      if (parsed.from == null && parsed.to == null && parsed.targets.length === 0) return null;
      return parsed;
    })
    .filter((row): row is ParsedQualificationRow => row !== null);

  return {
    rows,
    error: rows.length === 0 ? 'No qualification rows found — each row needs a rank range or a target.' : null,
    unrecognisedHeaders: table.unrecognised,
  };
}
