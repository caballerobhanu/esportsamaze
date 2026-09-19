/**
 * Basics-tab paste: `Field<TAB>Value` lines mapped onto the tournament form's inputs.
 *
 * The Basics tab is not tabular — it is one row of scalars — so a header/row sheet does not
 * fit it. The workable format is a two-column list of field and value, which is also what a
 * sheet of two columns produces naturally:
 *
 *     Tournament Name    Battlegrounds Mobile India Series 2026
 *     Short Name         BGIS 2026
 *     Tier               S-Tier
 *     Website            https://example.com
 *
 * A field is resolved by the input's own `name` OR by any of the labels the form shows for
 * it, so a sheet built from either reads correctly. Anything unrecognised is named back
 * rather than dropped.
 *
 * Pure module — no Prisma, no DOM — so it is unit-testable. The writing to inputs happens in
 * the client component that consumes this.
 */

export interface BasicsFieldDefinition {
  /** The form input's `name` attribute — also the canonical key a sheet may use. */
  field: string;
  /** Labels the form shows for this field, matched loosely. */
  labels: readonly string[];
}

/**
 * Section 1 (Tournament Identity & Game) and section 9 (Official Event Website & Social
 * Channels). `region` is deliberately absent: it is rendered by a custom component with no
 * named input of its own, so there is nothing for this to write to.
 */
export const BASICS_FIELDS: readonly BasicsFieldDefinition[] = [
  { field: 'name', labels: ['tournament name', 'name', 'tournament'] },
  { field: 'shortName', labels: ['custom short name', 'short name', 'shortname', 'short'] },
  { field: 'slug', labels: ['slug', 'url key', 'slug (url key)'] },
  { field: 'gameId', labels: ['game', 'game name'] },
  { field: 'series', labels: ['series', 'blanket series'] },
  { field: 'season', labels: ['season', 'season label', 'season / series label', 'series label'] },
  { field: 'seriesValue', labels: ['series value', 'series weight', 'weight', 'series weight / value'] },
  { field: 'tier', labels: ['tier', 'event tier'] },
  { field: 'eventType', labels: ['event type', 'eventtype'] },
  { field: 'gameMode', labels: ['game mode', 'gamemode', 'mode'] },
  { field: 'platform', labels: ['platform'] },
  { field: 'device', labels: ['device', 'official device', 'official / sponsored device', 'sponsored device'] },
  { field: 'featuredStage', labels: ['featured stage', 'featured stage on overview', 'featured'] },
  { field: 'backdropText', labels: ['backdrop', 'backdrop watermark', 'watermark'] },
  { field: 'status', labels: ['status'] },

  { field: 'website', labels: ['website', 'official event website', 'event website'] },
  { field: 'instagram', labels: ['instagram', 'ig'] },
  { field: 'facebook', labels: ['facebook', 'fb'] },
  { field: 'twitter', labels: ['twitter', 'x', 'x / twitter', 'x/twitter'] },
  { field: 'youtube', labels: ['youtube', 'youtube broadcast'] },
  { field: 'kick', labels: ['kick', 'kick stream'] },
  { field: 'twitch', labels: ['twitch', 'twitch stream'] },
  { field: 'discord', labels: ['discord', 'discord community'] },
];

/**
 * A short worked example, offered by "Copy column names".
 *
 * The format matters more than the list: every field's own on-screen label is accepted, so a
 * sheet written from the form's own wording reads correctly without learning these keys.
 */
export const BASICS_SAMPLE = [
  'Tournament Name\tBattlegrounds Mobile India Series 2026',
  'Short Name\tBGIS 2026',
  'Slug\tbgis-2026',
  'Game\tBGMI',
  'Series\tBGIS',
  'Season\t2026 Edition',
  'Tier\tS-Tier',
  'Event Type\tLAN',
  'Game Mode\tSquads TPP',
  'Platform\tMobile',
  'Website\thttps://example.com/bgis',
  'Instagram\thttps://instagram.com/example',
  'YouTube\thttps://youtube.com/@example',
].join('\n');

function lookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const FIELD_BY_KEY = new Map<string, string>();
for (const definition of BASICS_FIELDS) {
  FIELD_BY_KEY.set(lookupKey(definition.field), definition.field);
  for (const label of definition.labels) FIELD_BY_KEY.set(lookupKey(label), definition.field);
}

export interface ParsedBasicsRow {
  /** The form input's `name`. */
  field: string;
  value: string;
  /** The label the sheet actually used, echoed back when it is not applied. */
  asTyped: string;
}

export interface BasicsParseResult {
  rows: ParsedBasicsRow[];
  /** First-column values that named no known field. */
  unrecognised: string[];
  error: string | null;
}

/** Split one line into its field and value: a tab wins, otherwise the first `:` or `=`. */
function splitPair(line: string): [string, string] | null {
  const tab = line.indexOf('\t');
  if (tab > 0) {
    const value = line.slice(tab + 1).trim();
    return value ? [line.slice(0, tab).trim(), value] : null;
  }

  const match = line.match(/^([^:=]+)[:=]\s*(.+)$/);
  if (!match) return null;
  const value = match[2].trim();
  return value ? [match[1].trim(), value] : null;
}

export function parseBasicsSheet(text: string): BasicsParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], unrecognised: [], error: 'Nothing to read — paste at least one field and value.' };
  }

  const rows: ParsedBasicsRow[] = [];
  const unrecognised: string[] = [];

  for (const line of lines) {
    const pair = splitPair(line);
    if (!pair) {
      if (!unrecognised.includes(line)) unrecognised.push(line);
      continue;
    }

    const [rawField, value] = pair;
    const field = FIELD_BY_KEY.get(lookupKey(rawField));
    if (!field) {
      if (!unrecognised.includes(rawField)) unrecognised.push(rawField);
      continue;
    }

    rows.push({ field, value, asTyped: rawField });
  }

  return {
    rows,
    unrecognised,
    error:
      rows.length === 0
        ? 'No known fields found — the first column should name a field, e.g. "Tournament Name" or "name".'
        : null,
  };
}
