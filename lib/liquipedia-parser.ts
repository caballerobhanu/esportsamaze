/**
 * Liquipedia Tournament & Match Parser
 * Parses match scorecards, templates, and tournament tables from Liquipedia URLs or Wikitext.
 */

export interface ParsedLiquipediaRow {
  rank: number;
  rawTeam: string;
  elims: number;
  placePoints?: number;
  totalPoints?: number;
  wwcd: boolean;
  damage?: number;
}

export interface ParsedLiquipediaMatch {
  matchNumber?: number;
  matchName?: string;
  mapName?: string;
  rows: ParsedLiquipediaRow[];
}

export interface LiquipediaFetchResult {
  success: boolean;
  message: string;
  matches: ParsedLiquipediaMatch[];
  rawText?: string;
}

/**
 * Parses raw copied table text or wikitext from Liquipedia.
 */
export function parseLiquipediaText(text: string): ParsedLiquipediaMatch[] {
  if (!text || !text.trim()) return [];

  const clean = text.trim();
  const results: ParsedLiquipediaMatch[] = [];

  // 1. Check for MediaWiki Template Pattern: {{Matchlist / {{MatchMaps / {{Scoreboard
  const templateMatches = parseWikitextTemplates(clean);
  if (templateMatches.length > 0) {
    return templateMatches;
  }

  // 2. Check for HTML <table> syntax
  if (clean.includes('<table') || clean.includes('<tr')) {
    const htmlMatch = parseHtmlTable(clean);
    if (htmlMatch.rows.length > 0) {
      return [htmlMatch];
    }
  }

  // 3. Fallback: Parse line-by-line tabular copy
  const tabularMatch = parseTabularLines(clean);
  if (tabularMatch.rows.length > 0) {
    return [tabularMatch];
  }

  return [];
}

/**
 * Parses Liquipedia Wikitext templates such as {{MatchMaps}}, {{Scoreboard}}, or key-value structures.
 */
function parseWikitextTemplates(wikitext: string): ParsedLiquipediaMatch[] {
  const matches: ParsedLiquipediaMatch[] = [];

  // Match blocks like {{MatchMaps ...}} or {{Scoreboard ...}}
  const mapBlocks = wikitext.split(/(?=\{\{MatchMaps|\{\{Matchlist|\{\{Scoreboard)/i);

  for (const block of mapBlocks) {
    if (!block.trim()) continue;

    const rows: ParsedLiquipediaRow[] = [];
    let mapName: string | undefined;
    let matchNumber: number | undefined;

    // Detect map name (e.g. |map=Erangel, |map1=Miramar)
    const mapMatch = block.match(/\|map\d*=\s*([a-zA-Z0-9_\- ]+)/i);
    if (mapMatch) mapName = mapMatch[1].trim();

    // Detect match number
    const matchNumMatch = block.match(/\|match\d*=\s*(\d+)/i) || block.match(/Match\s*#?(\d+)/i);
    if (matchNumMatch) matchNumber = parseInt(matchNumMatch[1], 10);

    // Look for team-indexed parameters:
    // e.g. |team1=Soul |kills1=8 |place1=1 |score1=18
    // or |t1=GodLike |k1=12 |p1=10
    const teamIndexes = new Set<string>();
    const keyMatches = block.matchAll(/\|([a-zA-Z]+)(\d+)=/g);
    for (const km of keyMatches) {
      teamIndexes.add(km[2]);
    }

    if (teamIndexes.size > 0) {
      for (const idx of Array.from(teamIndexes).sort((a, b) => Number(a) - Number(b))) {
        const teamRegex = new RegExp(`\\|(?:team|t)${idx}=\\s*([^|}\\n]+)`, 'i');
        const placeRegex = new RegExp(`\\|(?:place|p|rank)${idx}=\\s*(\\d+)`, 'i');
        const killsRegex = new RegExp(`\\|(?:kills|k|elims|elim)${idx}=\\s*(\\d+)`, 'i');
        const pointsRegex = new RegExp(`\\|(?:score|pts|points|tot)${idx}=\\s*(\\d+)`, 'i');
        const damageRegex = new RegExp(`\\|(?:damage|dmg)${idx}=\\s*(\\d+)`, 'i');

        const teamVal = block.match(teamRegex)?.[1]?.trim();
        if (!teamVal) continue;

        const rankVal = parseInt(block.match(placeRegex)?.[1] || idx, 10);
        const killsVal = parseInt(block.match(killsRegex)?.[1] || '0', 10);
        const ptsVal = block.match(pointsRegex)?.[1] ? parseInt(block.match(pointsRegex)![1], 10) : undefined;
        const dmgVal = block.match(damageRegex)?.[1] ? parseInt(block.match(damageRegex)![1], 10) : undefined;

        rows.push({
          rank: isNaN(rankVal) ? rows.length + 1 : rankVal,
          rawTeam: teamVal.replace(/^\[\[|\]\]$/g, ''),
          elims: isNaN(killsVal) ? 0 : killsVal,
          totalPoints: ptsVal,
          wwcd: rankVal === 1,
          damage: dmgVal,
        });
      }
    }

    if (rows.length > 0) {
      rows.sort((a, b) => a.rank - b.rank);
      const matchName = mapName
        ? `Match ${matchNumber || matches.length + 1} (${mapName})`
        : `Match ${matchNumber || matches.length + 1}`;
      matches.push({ matchName, mapName, matchNumber, rows });
    }
  }

  return matches;
}

/**
 * Parses Liquipedia HTML <table> rows if pasted directly as HTML or extracted from parse API.
 */
function parseHtmlTable(html: string): ParsedLiquipediaMatch {
  const rows: ParsedLiquipediaRow[] = [];
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
 * Parses plain tabular text copied from Liquipedia or esports websites.
 */
function parseTabularLines(text: string): ParsedLiquipediaMatch {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows: ParsedLiquipediaRow[] = [];

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

/**
 * Fetches and parses match results directly from a Liquipedia page URL.
 */
export async function fetchLiquipediaMatchUrl(urlStr: string): Promise<LiquipediaFetchResult> {
  try {
    const url = new URL(urlStr.trim());
    const isLiquipedia =
      (url.hostname === 'liquipedia.net' || url.hostname.endsWith('.liquipedia.net')) &&
      (url.protocol === 'https:' || url.protocol === 'http:');

    if (!isLiquipedia) {
      return {
        success: false,
        message: 'Invalid URL. Please enter a valid liquipedia.net tournament URL.',
        matches: [],
      };
    }

    // Path e.g. /pubgmobile/Battlegrounds_Mobile_India_Series/2026/Grand_Finals
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return {
        success: false,
        message: 'Please provide a full Liquipedia tournament page URL.',
        matches: [],
      };
    }

    const game = segments[0]; // e.g. 'pubgmobile', 'counterstrike', 'valorant'
    if (!/^[a-zA-Z0-9_-]+$/.test(game)) {
      return {
        success: false,
        message: 'Invalid Liquipedia game/wiki path.',
        matches: [],
      };
    }
    const pageTitle = decodeURIComponent(segments.slice(1).join('/'));

    // Call Liquipedia MediaWiki Parse API
    const apiUrl = `https://liquipedia.net/${game}/api.php?action=parse&page=${encodeURIComponent(
      pageTitle
    )}&prop=wikitext|text&format=json`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'EsportsAmaze/1.0 (contact@esportsamaze.com; Liquipedia Match Importer)',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Liquipedia API request returned HTTP ${res.status}. You can alternatively copy the page text or table and paste it below.`,
        matches: [],
      };
    }

    const data = await res.json();
    if (data.error) {
      return {
        success: false,
        message: `Liquipedia API: ${data.error.info || 'Could not find page'}`,
        matches: [],
      };
    }

    const wikitext = data.parse?.wikitext?.['*'] || '';
    const htmlText = data.parse?.text?.['*'] || '';

    let parsed = parseLiquipediaText(wikitext);
    if (parsed.length === 0 || parsed.every((m) => m.rows.length === 0)) {
      parsed = parseLiquipediaText(htmlText);
    }

    if (parsed.length === 0 || parsed.every((m) => m.rows.length === 0)) {
      return {
        success: false,
        message: 'Fetched page successfully, but could not detect standard match tables. Please paste the table directly into the text box.',
        matches: [],
        rawText: wikitext.slice(0, 5000),
      };
    }

    return {
      success: true,
      message: `Found ${parsed.length} match scorecard(s) from Liquipedia!`,
      matches: parsed,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to fetch from Liquipedia: ${err instanceof Error ? err.message : String(err)}`,
      matches: [],
    };
  }
}
