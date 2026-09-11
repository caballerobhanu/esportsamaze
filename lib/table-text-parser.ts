/**
 * Generic table-text parser.
 * Parses copied tabular text (tab/whitespace/comma separated) or HTML <table>
 * rows into structured scorecard rows. Used by the batch importer's text
 * fallbacks and the screenshot OCR reader.
 */

export interface ParsedTableRow {
  rank: number;
  rawTeam: string;
  elims: number;
  placePoints?: number;
  totalPoints?: number;
  wwcd: boolean;
  damage?: number;
}

export interface ParsedTableMatch {
  matchNumber?: number;
  matchName?: string;
  mapName?: string;
  rows: ParsedTableRow[];
}

/**
 * Parses raw copied table text into match rows.
 * HTML <table> syntax is preferred; falls back to line-by-line tabular copy.
 */
export function parseTableText(text: string): ParsedTableMatch[] {
  if (!text || !text.trim()) return [];

  const clean = text.trim();

  // 1. HTML <table> syntax
  if (clean.includes('<table') || clean.includes('<tr')) {
    const htmlMatch = parseHtmlTable(clean);
    if (htmlMatch.rows.length > 0) {
      return [htmlMatch];
    }
  }

  // 2. Fallback: Parse line-by-line tabular copy
  const tabularMatch = parseTabularLines(clean);
  if (tabularMatch.rows.length > 0) {
    return [tabularMatch];
  }

  return [];
}

/**
 * Parses HTML <table> rows if pasted directly as HTML.
 */
function parseHtmlTable(html: string): ParsedTableMatch {
  const rows: ParsedTableRow[] = [];
  const trMatches = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

  let currentRank = 1;
  for (const tr of trMatches) {
    const cells = Array.from(tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((m) =>
      m[1].replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
    );

    if (cells.length < 2) continue;

    // Filter out header rows
    const firstCell = cells[0].toLowerCase();
    if (firstCell.includes('#') || firstCell.includes('pos') || firstCell.includes('rank') || firstCell.includes('team')) {
      continue;
    }

    let rank = currentRank;
    let rawTeam = '';
    let elims = 0;
    let placePts: number | undefined;
    let totalPts: number | undefined;

    // Parse columns: typically [Rank, Team, PlacePts, Elims, TotalPts] or [Rank, Team, Elims, TotalPts]
    const parsedFirst = parseInt(cells[0], 10);
    if (!isNaN(parsedFirst)) {
      rank = parsedFirst;
      rawTeam = cells[1];
      if (cells.length >= 5) {
        placePts = parseInt(cells[2], 10) || 0;
        elims = parseInt(cells[3], 10) || 0;
        totalPts = parseInt(cells[4], 10) || undefined;
      } else if (cells.length >= 4) {
        elims = parseInt(cells[2], 10) || 0;
        totalPts = parseInt(cells[3], 10) || undefined;
      }
    } else {
      rawTeam = cells[0];
      if (cells.length >= 3) {
        elims = parseInt(cells[1], 10) || 0;
        totalPts = parseInt(cells[2], 10) || undefined;
      }
    }

    if (rawTeam) {
      rows.push({
        rank,
        rawTeam,
        elims,
        placePoints: placePts,
        totalPoints: totalPts,
        wwcd: rank === 1,
      });
      currentRank = rank + 1;
    }
  }

  return { matchName: 'Tournament Standings', rows };
}

/**
 * Parses plain tabular text copied from an esports website.
 */
function parseTabularLines(text: string): ParsedTableMatch {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows: ParsedTableRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tokens = line.split(/\t|\s{2,}|,\s*/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length < 2) continue;

    // Skip headers
    const headerTest = tokens.join(' ').toLowerCase();
    if (headerTest.includes('team') && (headerTest.includes('pts') || headerTest.includes('kill') || headerTest.includes('rank'))) {
      continue;
    }

    let rank = i + 1;
    let rawTeam = '';
    let elims = 0;
    let placePts: number | undefined;
    let totalPts: number | undefined;

    const firstNum = parseInt(tokens[0], 10);
    if (!isNaN(firstNum) && firstNum <= 32) {
      rank = firstNum;
      rawTeam = tokens[1] || '';
      if (tokens.length >= 5 && !isNaN(Number(tokens[2])) && !isNaN(Number(tokens[3]))) {
        placePts = Number(tokens[2]);
        elims = Number(tokens[3]);
        totalPts = Number(tokens[4]);
      } else if (tokens.length >= 4 && !isNaN(Number(tokens[2]))) {
        elims = Number(tokens[2]);
        totalPts = Number(tokens[3]);
      } else if (tokens.length >= 3 && !isNaN(Number(tokens[2]))) {
        totalPts = Number(tokens[2]);
      }
    } else {
      rawTeam = tokens[0] || '';
      if (tokens.length >= 4 && !isNaN(Number(tokens[1])) && !isNaN(Number(tokens[2]))) {
        placePts = Number(tokens[1]);
        elims = Number(tokens[2]);
        totalPts = Number(tokens[3]);
      } else if (tokens.length >= 3 && !isNaN(Number(tokens[1]))) {
        elims = Number(tokens[1]);
        totalPts = Number(tokens[2]);
      }
    }

    if (rawTeam) {
      rows.push({
        rank,
        rawTeam,
        elims,
        placePoints: placePts,
        totalPoints: totalPts,
        wwcd: rank === 1,
      });
    }
  }

  return { matchName: 'Extracted Standings', rows };
}
