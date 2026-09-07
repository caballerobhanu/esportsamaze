/**
 * Liquipedia Tournament Overview & Setup Parser
 * Parses tournament metadata, tier, organizers, prize pool distribution,
 * and participating teams/rosters from Liquipedia overview pages.
 */

export interface ParsedSquadPlayer {
  ign: string;
  role?: string | null;
  captain?: boolean;
  isStaff?: boolean;
}

export interface ParsedSquad {
  teamName: string;
  tag?: string | null;
  seedLabel?: string | null;
  roster: ParsedSquadPlayer[];
  matchedTeamId?: string | null;
  isMatched?: boolean;
}

export interface ParsedPrizeSlot {
  place: number;
  placeLabel?: string;
  prizeUsd: number;
  recipientTeam?: string;
}

export interface ParsedLiquipediaTournament {
  name: string;
  slug: string;
  series?: string;
  season?: string;
  tier: 'S-Tier' | 'A-Tier' | 'B-Tier' | 'C-Tier' | 'D-Tier' | 'Qualifier';
  eventType: 'LAN' | 'ONLINE' | 'HYBRID';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  gameSlug?: string;
  location?: string;
  country?: string;
  city?: string;
  venue?: string;
  organizers: string[];
  prizePool: number;
  currency: string;
  prizeDistribution: Record<string, number>;
  squads: ParsedSquad[];
}

export interface TournamentFetchResult {
  success: boolean;
  message: string;
  tournament?: ParsedLiquipediaTournament;
  rawWikitext?: string;
}

/**
 * Parses raw wikitext of a Liquipedia tournament page.
 */
export function parseLiquipediaTournamentWikitext(wikitext: string): ParsedLiquipediaTournament {
  const clean = wikitext || '';

  // 1. Extract Infobox League
  const infoboxMatch = clean.match(/\{\{Infobox league[\s\S]*?\n\}\}/i);
  const infobox = infoboxMatch ? infoboxMatch[0] : clean;

  const getParam = (regex: RegExp): string => {
    const m = infobox.match(regex);
    return m ? m[1].trim().replace(/^\[\[|\]\]$/g, '').replace(/'''/g, '') : '';
  };

  const name =
    getParam(/\|name=\s*([^\n|]+)/i) ||
    clean.match(/\{\{DISPLAYTITLE:\s*([^}]+)\}\}/i)?.[1]?.trim() ||
    'Untitled Tournament';

  const slug = generateSlug(name);
  const series = getParam(/\|series=\s*([^\n|]+)/i);
  const season = getParam(/\|tickername=\s*([^\n|]+)/i) || getParam(/\|shortname=\s*([^\n|]+)/i);

  // Liquipedia Tier mapping (1 = S-Tier, 2 = A-Tier, 3 = B-Tier, 4 = C-Tier, etc.)
  const tierRaw = getParam(/\|liquipediatier=\s*([^\n|]+)/i);
  let tier: 'S-Tier' | 'A-Tier' | 'B-Tier' | 'C-Tier' | 'D-Tier' | 'Qualifier' = 'S-Tier';
  if (tierRaw === '1') tier = 'S-Tier';
  else if (tierRaw === '2') tier = 'A-Tier';
  else if (tierRaw === '3') tier = 'B-Tier';
  else if (tierRaw === '4') tier = 'C-Tier';
  else if (tierRaw.toLowerCase().includes('qual')) tier = 'Qualifier';

  // Event type
  const typeRaw = getParam(/\|type=\s*([^\n|]+)/i).toLowerCase();
  let eventType: 'LAN' | 'ONLINE' | 'HYBRID' = 'LAN';
  if (typeRaw.includes('online') && typeRaw.includes('offline')) eventType = 'HYBRID';
  else if (typeRaw.includes('online')) eventType = 'ONLINE';
  else eventType = 'LAN';

  // Dates
  const startDate = getParam(/\|sdate=\s*([^\n|]+)/i) || undefined;
  const endDate = getParam(/\|edate=\s*([^\n|]+)/i) || startDate;

  // Game
  const gameRaw = getParam(/\|game=\s*([^\n|]+)/i).toLowerCase();
  let gameSlug = 'bgmi';
  if (gameRaw.includes('pubg') || gameRaw.includes('pubgmobile')) gameSlug = 'pubg-mobile';
  else if (gameRaw) gameSlug = gameRaw;

  // Location
  const country = getParam(/\|country=\s*([^\n|]+)/i);
  const city = getParam(/\|city=\s*([^\n|]+)/i);
  const venue = getParam(/\|venue=\s*([^\n|]+)/i);
  const location = [city, country].filter(Boolean).join(', ') || undefined;

  // Organizers
  const organizers: string[] = [];
  const primaryOrg = getParam(/\|organizer=\s*([^\n|]+)/i);
  if (primaryOrg) organizers.push(primaryOrg);
  for (let i = 2; i <= 6; i++) {
    const org = getParam(new RegExp(`\\|organizer${i}=\\s*([^\\n|]+)`, 'i'));
    if (org && !organizers.includes(org)) organizers.push(org);
  }

  // Prize Pool
  const prizeStr =
    getParam(/\|prizepoolusd=\s*([^\n|]+)/i) ||
    getParam(/\|prizepool=\s*([^\n|]+)/i);
  const cleanPrize = prizeStr.replace(/[^0-9.]/g, '');
  const prizePool = cleanPrize ? parseFloat(cleanPrize) : 0;

  // Prize Distribution Table: {{TeamPrizePool ... |{{Slot|usdprize=555,000|...|{{Opponent|S2G Esports}} }}
  const prizeDistribution: Record<string, number> = {};
  const slotMatches = clean.matchAll(/\{\{Slot\|(?:[^}]*?)usdprize=([0-9,]+)/gi);
  let placeCounter = 1;
  for (const sm of slotMatches) {
    const rawVal = sm[1].replace(/,/g, '');
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) {
      prizeDistribution[String(placeCounter)] = num;
      placeCounter++;
    }
  }

  // If no slot matches, fallback to generic breakdown
  if (Object.keys(prizeDistribution).length === 0 && prizePool > 0) {
    prizeDistribution['1'] = Math.round(prizePool * 0.4);
    prizeDistribution['2'] = Math.round(prizePool * 0.2);
    prizeDistribution['3'] = Math.round(prizePool * 0.12);
  }

  // 2. Extract Participating Teams: {{TeamParticipants ... |{{Opponent|<team>|players=...|qualification=...}}
  const squads: ParsedSquad[] = [];
  const seenTeams = new Set<string>();

  // Extract participants text section if present to avoid matching prize pool opponents
  let participantsBlock = clean;
  const partHeaderIdx = clean.search(/==\s*Participants\s*==/i);
  if (partHeaderIdx !== -1) {
    const afterPart = clean.slice(partHeaderIdx);
    const nextSectionIdx = afterPart.slice(20).search(/\n==[^=]/);
    participantsBlock = nextSectionIdx !== -1 ? afterPart.slice(0, nextSectionIdx + 20) : afterPart;
  } else {
    const teamPartMatch = clean.match(/\{\{TeamParticipants[\s\S]*?(?=\n==|\}\}\s*\n\s*\}\}|$)/i);
    if (teamPartMatch) {
      participantsBlock = teamPartMatch[0];
    }
  }

  // Pattern A: Modern {{Opponent|<teamName> ...}} inside participantsBlock
  const opponentBlocks = participantsBlock.matchAll(
    /\{\{Opponent\|([^|\n}]+)([\s\S]*?)(?=\|\s*\{\{Opponent|\{\{Opponent|\n==|$)/gi
  );

  for (const ob of opponentBlocks) {
    const rawTeamName = ob[1].trim().replace(/^\[\[|\]\]$/g, '').replace(/'''/g, '');
    if (!rawTeamName || rawTeamName.startsWith('{{') || rawTeamName.length < 2) continue;

    const blockBody = ob[2] || '';
    const cleanTeamName = normalizeTeamName(rawTeamName);
    if (seenTeams.has(cleanTeamName.toLowerCase())) continue;
    seenTeams.add(cleanTeamName.toLowerCase());

    // Extract Qualification / Seed note
    const qualMatch =
      blockBody.match(/\|text=([^|}]+)/i) ||
      blockBody.match(/\{\{Qualification\|(?:text=)?([^|}]+)/i) ||
      blockBody.match(/\|qualification=([^\n|}]+)/i);
    const seedLabel = qualMatch ? qualMatch[1].trim() : undefined;

    // Extract Players from {{Person|<ign>|role=...|type=staff...}}
    const roster: ParsedSquadPlayer[] = [];
    const personMatches = blockBody.matchAll(/\{\{Person\|([^|}]+)([^}]*)\}\}/gi);
    for (const pm of personMatches) {
      const ign = pm[1].trim();
      if (!ign) continue;
      const personParams = pm[2] || '';
      const roleMatch = personParams.match(/\|role=([^|}]+)/i);
      const typeMatch = personParams.match(/\|type=([^|}]+)/i);
      const isStaff = typeMatch?.[1]?.toLowerCase() === 'staff' || roleMatch?.[1]?.toLowerCase().includes('coach');
      const isCaptain = roleMatch?.[1]?.toLowerCase().includes('captain');

      roster.push({
        ign,
        role: roleMatch ? roleMatch[1].trim() : undefined,
        captain: isCaptain,
        isStaff,
      });
    }

    squads.push({
      teamName: cleanTeamName,
      tag: generateTag(cleanTeamName),
      seedLabel,
      roster,
    });
  }

  // Pattern B: Fallback for older {{TeamCard|team=<name>}} or {{teamCard ...}}
  if (squads.length === 0) {
    const teamCardMatches = clean.matchAll(/\{\{TeamCard[\s\S]*?\|team=([^|\n}]+)/gi);
    for (const tc of teamCardMatches) {
      const tName = normalizeTeamName(tc[1].trim().replace(/^\[\[|\]\]$/g, ''));
      if (!tName || seenTeams.has(tName.toLowerCase())) continue;
      seenTeams.add(tName.toLowerCase());

      squads.push({
        teamName: tName,
        tag: generateTag(tName),
        roster: [],
      });
    }
  }

  return {
    name,
    slug,
    series: series || undefined,
    season: season || undefined,
    tier,
    eventType,
    startDate,
    endDate,
    gameSlug,
    location,
    country: country || undefined,
    city: city || undefined,
    venue: venue || undefined,
    organizers,
    prizePool,
    currency: 'USD',
    prizeDistribution,
    squads,
  };
}

/**
 * Fetches and parses a Liquipedia tournament page from a URL.
 */
export async function fetchLiquipediaTournament(urlStr: string): Promise<TournamentFetchResult> {
  try {
    const cleanUrl = urlStr.trim();
    const url = new URL(cleanUrl);

    const isLiquipedia =
      (url.hostname === 'liquipedia.net' || url.hostname.endsWith('.liquipedia.net')) &&
      (url.protocol === 'https:' || url.protocol === 'http:');

    if (!isLiquipedia) {
      return {
        success: false,
        message: 'Invalid URL. Expected a valid https://liquipedia.net/<game>/<Tournament_Page> URL.',
      };
    }

    // Extract wiki slug and page path
    // Example: https://liquipedia.net/pubgmobile/PUBG_Mobile_World_Cup/2026
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return {
        success: false,
        message: 'Invalid Liquipedia URL format. Expected: https://liquipedia.net/<game>/<Tournament_Page>',
      };
    }

    const wiki = pathParts[0]; // e.g. "pubgmobile"
    if (!/^[a-zA-Z0-9_-]+$/.test(wiki)) {
      return {
        success: false,
        message: 'Invalid Liquipedia game/wiki name in URL.',
      };
    }
    const pageTitle = pathParts.slice(1).join('/'); // e.g. "PUBG_Mobile_World_Cup/2026"

    const apiUrl = `https://liquipedia.net/${wiki}/api.php?action=parse&page=${encodeURIComponent(
      pageTitle
    )}&prop=wikitext&format=json`;

    const res = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'EsportsAmazeBot/1.0 (contact@esportsamaze.com; Liquipedia Tournament Importer)',
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Liquipedia API request returned HTTP status ${res.status}. Cloudflare or rate-limit active.`,
      };
    }

    const data = await res.json();
    const wikitext = data?.parse?.wikitext?.['*'];

    if (!wikitext) {
      if (data?.error?.info) {
        return {
          success: false,
          message: `Liquipedia API Error: ${data.error.info}`,
        };
      }
      return {
        success: false,
        message: 'No wikitext returned by Liquipedia API for this tournament page.',
      };
    }

    const tournament = parseLiquipediaTournamentWikitext(wikitext);
    return {
      success: true,
      message: `Successfully parsed ${tournament.name} with ${tournament.squads.length} teams!`,
      tournament,
      rawWikitext: wikitext,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to fetch from Liquipedia: ${err.message || String(err)}`,
    };
  }
}

/**
 * Normalizes team names (strips casing variations, common wiki prefixes).
 */
function normalizeTeamName(raw: string): string {
  let cleaned = raw.trim();
  // Capitalize nicely if lowercase e.g. "team flash" -> "Team Flash"
  if (/^[a-z0-9\s]+$/.test(cleaned)) {
    cleaned = cleaned
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return cleaned;
}

/**
 * Generates an abbreviation/tag from a team name.
 */
function generateTag(teamName: string): string {
  const parts = teamName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return teamName.slice(0, 4).toUpperCase();
  }
  return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 5);
}

/**
 * Generates a clean URL slug from tournament name.
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}
