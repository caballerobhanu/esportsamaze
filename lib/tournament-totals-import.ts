/**
 * Parses a pasted sheet of REPORTED tournament totals.
 *
 * Deliberately separate from the scorecard paste parser: that one is built around
 * per-match scorecards (map, stage, match number, kill multipliers) and has no
 * `matches` or `finishes` column at all, so reusing it would import scorecard
 * assumptions onto a totals sheet and silently drop the columns this data needs.
 *
 * Blank cells stay null — "not reported" must never be read as a zero, because
 * these totals roll up the DAY → STAGE → EVENT ladder and a fabricated 0 would
 * poison every level above it.
 *
 * Pure module: no Prisma, no React (unit-tested in tests/tournament-totals-import.test.ts).
 */

export type TotalsKind = 'TEAM' | 'PLAYER';

export interface TotalsMetricColumn {
  /** Key the metric is stored under. */
  key: string;
  label: string;
  aliases: readonly string[];
  /** Counts and points are whole numbers; damage is not. */
  integer?: boolean;
}

export const TEAM_TOTAL_COLUMNS: readonly TotalsMetricColumn[] = [
  { key: 'placement', label: 'Placement', aliases: ['placement', 'rank', 'position', 'place'], integer: true },
  { key: 'matches', label: 'Matches', aliases: ['matches', 'matches played', 'mp', 'games'], integer: true },
  { key: 'wwcd', label: 'WWCD', aliases: ['wwcd', 'wwcds', 'wins', 'chicken dinners'], integer: true },
  { key: 'placePoints', label: 'Place points', aliases: ['place points', 'placement points', 'place pts'], integer: true },
  { key: 'elimsPoints', label: 'Elims points', aliases: ['elims points', 'elim points', 'elimination points', 'elims pts'], integer: true },
  { key: 'bonusPoints', label: 'Bonus points', aliases: ['bonus points', 'bonus', 'bonus pts'], integer: true },
  { key: 'totalPoints', label: 'Total points', aliases: ['total points', 'points', 'total pts'], integer: true },
  // A bare "Elims" on a totals sheet is the team's elimination COUNT. The scorecard
  // parser reads its own "Elims (scoring)" column as points, which is why the two
  // sheets are parsed separately.
  { key: 'finishes', label: 'Finishes (team eliminations)', aliases: ['finishes', 'elims', 'eliminations', 'kills'], integer: true },
];

export const PLAYER_TOTAL_COLUMNS: readonly TotalsMetricColumn[] = [
  { key: 'matches', label: 'Matches', aliases: ['matches', 'matches played', 'mp', 'games'], integer: true },
  { key: 'playerElims', label: 'Eliminations', aliases: ['elims', 'kills', 'eliminations', 'player elims'], integer: true },
  { key: 'damage', label: 'Damage', aliases: ['damage', 'dmg'] },
  { key: 'headshots', label: 'Headshots', aliases: ['headshots', 'hs'], integer: true },
  { key: 'assists', label: 'Assists', aliases: ['assists', 'assist'], integer: true },
  { key: 'knockouts', label: 'Knockouts', aliases: ['knockouts', 'knocks', 'knocked'], integer: true },
  { key: 'survivalTime', label: 'Survival time (total seconds)', aliases: ['survival time', 'survival', 'time survived'], integer: true },
  { key: 'healing', label: 'Healing', aliases: ['healing', 'heals'], integer: true },
  { key: 'airdrops', label: 'Airdrops', aliases: ['airdrops', 'air drops'], integer: true },
  { key: 'rescues', label: 'Rescues', aliases: ['rescues', 'revives'], integer: true },
];

const NAME_ALIASES = ['team', 'team name', 'teamname'];
const PLAYER_ALIASES = ['player', 'player name', 'ign'];

export interface TeamTotalsDraft {
  team: string;
  metrics: Record<string, number | null>;
}

export interface PlayerTotalsDraft {
  player: string;
  team: string | null;
  metrics: Record<string, number | null>;
}

export interface ParsedTotals<Row> {
  rows: Row[];
  /** Fatal problem — nothing could be read. */
  error: string | null;
  /** Header tokens that matched no column, so nothing silently disappears. */
  unrecognisedHeaders: string[];
  /** Data rows skipped because the name cell was blank. */
  skipped: number;
}

const clean = (token: string) => token.trim().toLowerCase().replace(/\s+/g, ' ');

function splitLines(raw: string): string[][] {
  // Filter blank lines by their trimmed form, but split the ORIGINAL line: trimming
  // first would eat a leading empty cell and shift every column left.
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  return lines.map((line) =>
    line
      .split(delimiter)
      .map((cell) => cell.trim().replace(/^"(.*)"$/, '$1').trim()),
  );
}

/** Blank means "not reported" — null, never 0. */
function parseMetric(cell: string | undefined, column: TotalsMetricColumn): number | null {
  const value = (cell ?? '').trim();
  if (!value || value === '-') return null;
  const numeric = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  return column.integer ? Math.round(numeric) : numeric;
}

function columnFor(token: string, columns: readonly TotalsMetricColumn[]): TotalsMetricColumn | null {
  const key = clean(token);
  return columns.find((column) => column.key === key || column.aliases.includes(key)) ?? null;
}

interface HeaderMap {
  nameIndex: number;
  teamIndex: number;
  metrics: { index: number; column: TotalsMetricColumn }[];
  unrecognised: string[];
}

function mapHeader(header: string[], nameAliases: string[], teamAliases: string[] | null, columns: readonly TotalsMetricColumn[]): HeaderMap {
  let nameIndex = -1;
  let teamIndex = -1;
  const metrics: { index: number; column: TotalsMetricColumn }[] = [];
  const unrecognised: string[] = [];

  header.forEach((token, index) => {
    const key = clean(token);
    if (key === '') return;
    if (nameIndex === -1 && nameAliases.includes(key)) {
      nameIndex = index;
      return;
    }
    if (teamAliases && teamIndex === -1 && teamAliases.includes(key)) {
      teamIndex = index;
      return;
    }
    const column = columnFor(key, columns);
    if (column) metrics.push({ index, column });
    else unrecognised.push(token);
  });

  return { nameIndex, teamIndex, metrics, unrecognised };
}

function rowsFor(grid: string[][]) {
  return grid.slice(1);
}

export function parseTeamTotalsPaste(raw: string): ParsedTotals<TeamTotalsDraft> {
  const grid = splitLines(raw);
  if (grid.length < 2) {
    return { rows: [], error: 'Paste a header row and at least one data row.', unrecognisedHeaders: [], skipped: 0 };
  }

  const header = mapHeader(grid[0], NAME_ALIASES, null, TEAM_TOTAL_COLUMNS);
  if (header.nameIndex === -1) {
    return { rows: [], error: 'No team column found — include a "Team" header.', unrecognisedHeaders: header.unrecognised, skipped: 0 };
  }

  const drafts: TeamTotalsDraft[] = [];
  let skipped = 0;

  for (const cells of rowsFor(grid)) {
    const team = (cells[header.nameIndex] ?? '').trim();
    if (!team) {
      skipped += 1;
      continue;
    }
    const metrics: Record<string, number | null> = {};
    for (const { index, column } of header.metrics) metrics[column.key] = parseMetric(cells[index], column);
    drafts.push({ team, metrics });
  }

  return { rows: drafts, error: null, unrecognisedHeaders: header.unrecognised, skipped };
}

export function parsePlayerTotalsPaste(raw: string): ParsedTotals<PlayerTotalsDraft> {
  const grid = splitLines(raw);
  if (grid.length < 2) {
    return { rows: [], error: 'Paste a header row and at least one data row.', unrecognisedHeaders: [], skipped: 0 };
  }

  const header = mapHeader(grid[0], PLAYER_ALIASES, NAME_ALIASES, PLAYER_TOTAL_COLUMNS);
  if (header.nameIndex === -1) {
    return { rows: [], error: 'No player column found — include a "Player" or "IGN" header.', unrecognisedHeaders: header.unrecognised, skipped: 0 };
  }

  const drafts: PlayerTotalsDraft[] = [];
  let skipped = 0;

  for (const cells of rowsFor(grid)) {
    const player = (cells[header.nameIndex] ?? '').trim();
    if (!player) {
      skipped += 1;
      continue;
    }
    const team = header.teamIndex === -1 ? null : (cells[header.teamIndex] ?? '').trim() || null;
    const metrics: Record<string, number | null> = {};
    for (const { index, column } of header.metrics) metrics[column.key] = parseMetric(cells[index], column);
    drafts.push({ player, team, metrics });
  }

  return { rows: drafts, error: null, unrecognisedHeaders: header.unrecognised, skipped };
}
