import { ZONE_COLOR_OPTIONS, type ZoneColor } from '@/lib/standings-config';

/**
 * Standings-zones paste: a stage → group → rule sheet.
 *
 * A zone lives at one of four places, and which one it belongs in is decided by the two
 * context columns at the front of each row:
 *
 *   blank stage, blank group  →  `config.zones`            (the Overall default list)
 *   stage only                →  that stage tab's `zones`  (or the flat per-stage config)
 *   stage + group             →  `item.groupZones[group]`  (group sub-tabs)
 *
 * Two conventions make the sheet usable rather than a wall of repetition:
 *
 *   1. A blank Stage or Group cell CARRIES FORWARD from the row above. Grouped data in a
 *      spreadsheet works this way, and without it every row would repeat its stage.
 *   2. The range can be given as explicit From/To columns, or as a single `Rank` cell like
 *      `5th - 8th`, which is what a sheet usually already has.
 *
 * Pure module — no Prisma, no React — so it is unit-testable and safe to import client-side.
 * Nothing here writes; it produces a plan the editor applies to its own state.
 */

export interface ParsedZoneRow {
  /** Empty means "the config's default list". */
  stage: string;
  /** Empty means the stage's own zones rather than a group's. */
  group: string;
  from: number;
  to: number;
  label: string;
  color: string;
  targetStageName?: string;
  targetGroupName?: string;
}

export interface SheetPasteResult<T> {
  rows: T[];
  error: string | null;
  unrecognisedHeaders: string[];
}

const ZONE_ALIASES: Record<string, readonly string[]> = {
  stage: ['stage', 'stage name', 'stagename', 'tab', 'tab name', 'tabname'],
  group: ['group', 'group name', 'groupname', 'lobby'],
  from: ['from', 'from rank', 'fromrank', 'min'],
  to: ['to', 'to rank', 'torank', 'max'],
  rank: ['rank', 'place', 'placement', 'position', 'ranks', 'positions'],
  label: ['label', 'zone', 'name', 'rule', 'description', 'text'],
  color: ['colour', 'color', 'zone colour', 'zone color', 'tone'],
  targetStageName: ['target stage', 'targetstage', 'target stage name', 'qualifies to', 'destination'],
  targetGroupName: ['target group', 'targetgroup', 'target group name'],
};

/** Colour keys and their display labels, so a sheet can say "Green" or "green". */
const COLOR_BY_KEY = new Map<string, ZoneColor>();
for (const option of ZONE_COLOR_OPTIONS) {
  COLOR_BY_KEY.set(option.key, option.key);
  COLOR_BY_KEY.set(option.label.trim().toLowerCase(), option.key);
}

function normaliseToken(token: string): string {
  return token.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/[^a-z0-9_]/g, '');
}

function detectDelimiter(firstLine: string): string | RegExp {
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(',')) return ',';
  return /\s{2,}/;
}

function splitCells(line: string, delimiter: string | RegExp): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
}

function resolveColumns(headers: readonly string[]): { map: Record<string, number>; unrecognised: string[] } {
  const lookup = new Map<string, string>();
  for (const [key, spellings] of Object.entries(ZONE_ALIASES)) {
    for (const spelling of spellings) lookup.set(normaliseToken(spelling), key);
  }

  const map: Record<string, number> = {};
  const unrecognised: string[] = [];

  headers.forEach((header, index) => {
    const raw = header.trim().replace(/^["']|["']$/g, '');
    if (raw === '') return;
    const key = lookup.get(normaliseToken(header));
    if (!key) {
      if (!unrecognised.includes(raw)) unrecognised.push(raw);
      return;
    }
    if (map[key] === undefined) map[key] = index;
  });

  return { map, unrecognised };
}

function cellOf(row: readonly string[], map: Record<string, number>, key: string): string {
  const index = map[key];
  return index == null ? '' : (row[index] ?? '').trim();
}

function intOf(value: string): number | undefined {
  if (value === '') return undefined;
  const n = Number(value.replace(/,/g, '').replace(/%$/, ''));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** "1", "1-4", "5th - 8th" → a from/to pair. */
export function parseZoneRange(raw: string): { from?: number; to?: number } {
  const digits = raw.match(/\d+/g);
  if (!digits) return {};
  const from = Number(digits[0]);
  const to = digits.length > 1 ? Number(digits[1]) : undefined;
  return { from, to };
}

export function parseStandingsZoneSheet(text: string): SheetPasteResult<ParsedZoneRow> {
  // The line's own whitespace is preserved. A row whose leading Stage/Group cell is blank
  // begins with a tab, and trimming the line would strip it and shift every column left by
  // one — which is exactly the carry-forward case this format depends on. Only the emptiness
  // test trims; splitCells trims each cell.
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { rows: [], error: 'Nothing to read.', unrecognisedHeaders: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCells(lines[0], delimiter);
  const { map, unrecognised } = resolveColumns(headers);
  if (Object.keys(map).length === 0) {
    return {
      rows: [],
      error: 'No zone columns found. Include a header row with a range ("From"/"To" or "Rank") and a "Label".',
      unrecognisedHeaders: unrecognised,
    };
  }

  const rows: ParsedZoneRow[] = [];
  let lastStage = '';
  let lastGroup = '';

  for (const line of lines.slice(1)) {
    const cells = splitCells(line, delimiter);

    // Carry-forward: a blank context cell means "the same as the row above".
    const stageCell = cellOf(cells, map, 'stage');
    const groupCell = cellOf(cells, map, 'group');
    const stage = stageCell || lastStage;
    // A new stage RESETS the group carry. A group belongs to one stage, so a blank group on
    // the first row of a stage means "this stage's own zones" — not the previous stage's
    // group, which is what a naive carry-forward would hand it.
    const group = groupCell || (stageCell ? '' : lastGroup);
    lastStage = stage;
    lastGroup = group;

    const rankCell = cellOf(cells, map, 'rank');
    const explicitFrom = intOf(cellOf(cells, map, 'from'));
    const explicitTo = intOf(cellOf(cells, map, 'to'));
    const parsedRange = parseZoneRange(rankCell);

    const from = explicitFrom ?? parsedRange.from;
    const to = explicitTo ?? parsedRange.to ?? from;
    // A row with no range and no label says nothing about a zone.
    if (from === undefined && !cellOf(cells, map, 'label')) continue;

    const rawColor = cellOf(cells, map, 'color');
    const color = rawColor ? COLOR_BY_KEY.get(rawColor.trim().toLowerCase()) ?? rawColor : 'blue';

    rows.push({
      stage,
      group,
      from: from ?? 1,
      to: to ?? from ?? 1,
      label: cellOf(cells, map, 'label'),
      color,
      targetStageName: cellOf(cells, map, 'targetStageName') || undefined,
      targetGroupName: cellOf(cells, map, 'targetGroupName') || undefined,
    });
  }

  return {
    rows,
    error: rows.length === 0 ? 'No zone rows found — each row needs a rank range or a label.' : null,
    unrecognisedHeaders: unrecognised,
  };
}

export interface ZoneFilingPlan {
  /** Rows with no stage: the config's default list. */
  defaultRows: ParsedZoneRow[];
  /** Rows filed against a stage that has a tab in the hierarchical config. */
  tabTargets: Array<{
    stageName: string;
    rows: ParsedZoneRow[];
    groups: Array<{ groupName: string; rows: ParsedZoneRow[] }>;
  }>;
  /** Rows filed against the flat per-stage config, for stages with no tab of their own. */
  stageConfigTargets: Array<{ stageName: string; rows: ParsedZoneRow[] }>;
  /** Rows naming a stage or group the config does not have — reported, never invented. */
  unmatched: ParsedZoneRow[];
}

/**
 * Decide where each row belongs. A stage with a tab in `tabStageNames` wins over the flat
 * per-stage config, because the tab is the hierarchical home the group columns are for.
 * Group names are matched against the tab's own `groupNames`, which is why that is passed in.
 */
export function planZoneFiling(
  rows: readonly ParsedZoneRow[],
  targets: {
    tabStageNames: readonly string[];
    tabGroupNames: Record<string, readonly string[]>;
    configStageNames: readonly string[];
  },
): ZoneFilingPlan {
  const tabStages = new Map(targets.tabStageNames.map((name) => [name.trim().toLowerCase(), name]));
  const configStages = new Map(targets.configStageNames.map((name) => [name.trim().toLowerCase(), name]));

  const plan: ZoneFilingPlan = {
    defaultRows: [],
    tabTargets: [],
    stageConfigTargets: [],
    unmatched: [],
  };

  const tabByStage = new Map<string, ZoneFilingPlan['tabTargets'][number]>();
  const stageConfigByStage = new Map<string, ZoneFilingPlan['stageConfigTargets'][number]>();

  for (const row of rows) {
    const stageKey = row.stage.trim().toLowerCase();

    if (stageKey === '') {
      plan.defaultRows.push(row);
      continue;
    }

    const tabStageName = tabStages.get(stageKey);
    if (tabStageName) {
      let target = tabByStage.get(tabStageName);
      if (!target) {
        target = { stageName: tabStageName, rows: [], groups: [] };
        tabByStage.set(tabStageName, target);
        plan.tabTargets.push(target);
      }

      if (row.group.trim() === '') {
        target.rows.push(row);
        continue;
      }

      const knownGroups = targets.tabGroupNames[tabStageName] ?? [];
      const matchedGroup = knownGroups.find((name) => name.trim().toLowerCase() === row.group.trim().toLowerCase());
      if (!matchedGroup) {
        plan.unmatched.push(row);
        continue;
      }

      let group = target.groups.find((entry) => entry.groupName === matchedGroup);
      if (!group) {
        group = { groupName: matchedGroup, rows: [] };
        target.groups.push(group);
      }
      group.rows.push(row);
      continue;
    }

    const configStageName = configStages.get(stageKey);
    if (configStageName && row.group.trim() === '') {
      let target = stageConfigByStage.get(configStageName);
      if (!target) {
        target = { stageName: configStageName, rows: [] };
        stageConfigByStage.set(configStageName, target);
        plan.stageConfigTargets.push(target);
      }
      target.rows.push(row);
      continue;
    }

    plan.unmatched.push(row);
  }

  return plan;
}
