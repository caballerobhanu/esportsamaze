/*
 * Title and description builders for every entity tab route.
 *
 * These are pure and live outside the route folders for one reason: the titles
 * are the part of SEO most likely to be re-tuned, and keeping them in one
 * testable place means a change can be checked (length, keyword coverage,
 * query-family separation) without a database or a running server.
 *
 * The rule throughout: a tab's title names the query that tab answers, not the
 * entity as a whole. A points table, a match schedule and a prize pool are
 * different searches, so each tab is its own entry point into the event.
 */
import { SITE_NAME } from './seo';
import type { TournamentTabId } from './standings-config';

/* ── Tournaments ────────────────────────────────────────────────────────── */

/** Path segment per tab. The overview tab lives at the entity base. */
export const TOURNAMENT_TAB_SEGMENT: Record<TournamentTabId, string | null> = {
  overview: null,
  standings: 'standings',
  matches: 'matches',
  progression: 'progression',
  format: 'format',
  teams: 'teams',
  prizepool: 'prizepool',
  statistics: 'statistics',
};

/**
 * Status flips the wording between live and final, which is what separates a
 * "live standings" search from a "final standings" one.
 */
export function tournamentTabTitle(
  tab: TournamentTabId,
  name: string,
  status: string
): string {
  const live = status === 'ONGOING';

  switch (tab) {
    case 'standings':
      return live
        ? `${name} Live Standings & Points Table | ${SITE_NAME}`
        : `${name} Points Table & Final Standings | ${SITE_NAME}`;
    case 'matches':
      return live
        ? `${name} Schedule & Live Match Results | ${SITE_NAME}`
        : `${name} Match Results & Scorecards | ${SITE_NAME}`;
    case 'statistics':
      return `${name} Statistics — Top Fraggers & Player Stats | ${SITE_NAME}`;
    case 'teams':
      return `${name} Teams & Rosters | ${SITE_NAME}`;
    case 'format':
      return `${name} Format, Stages & Schedule | ${SITE_NAME}`;
    case 'prizepool':
      return `${name} Prize Pool & Distribution | ${SITE_NAME}`;
    case 'progression':
      return `${name} Points Progression | ${SITE_NAME}`;
    case 'overview':
    default:
      if (live) return `${name} — Live Schedule, Results & Teams | ${SITE_NAME}`;
      if (status === 'UPCOMING' || status === 'CANCELED') {
        return `${name} — Schedule, Teams & Format | ${SITE_NAME}`;
      }
      return `${name} — Winner, Results & Schedule | ${SITE_NAME}`;
  }
}

export function tournamentTabDescription(
  tab: TournamentTabId,
  fullName: string,
  game: string | null
): string {
  // The official name is spelled out here rather than in the title, where the
  // short label wins on character budget.
  const subject = game ? `${fullName} ${game}` : fullName;

  switch (tab) {
    case 'standings':
      return `Full points table for ${subject} — stage-wise rankings, placement and elimination points, WWCDs and qualification lines.`;
    case 'matches':
      return `Every ${subject} match result — map-by-map scorecards, team placements, eliminations and the day-wise schedule.`;
    case 'statistics':
      return `Player and team statistics for ${subject} — top fraggers, eliminations, damage and performance ratings.`;
    case 'teams':
      return `All participating teams in ${subject} — rosters, seedings, country flags and squad line-ups.`;
    case 'format':
      return `Official format and schedule for ${subject} — stages, scoring matrix, advancement rules and match calendar.`;
    case 'prizepool':
      return `Prize pool and distribution for ${subject} — payout by placement, stage rewards and special awards.`;
    case 'progression':
      return `Stage progression and qualification pathway for ${subject} — who advanced from each stage and how.`;
    case 'overview':
    default:
      return `Full coverage of ${subject} — standings, match results, schedule, prize pool, participating teams and top fraggers.`;
  }
}

/* ── Teams ──────────────────────────────────────────────────────────────── */

export type TeamTabId = 'overview' | 'matches' | 'roster' | 'stats' | 'titles';

export const TEAM_TAB_SEGMENT: Record<TeamTabId, string | null> = {
  overview: null,
  matches: 'matches',
  roster: 'roster',
  stats: 'stats',
  titles: 'titles',
};

/** Every non-overview tab route, in presentation order. */
export const TEAM_TAB_ROUTES = ['matches', 'roster', 'stats', 'titles'] as const;

export const TEAM_TAB_LABELS: Record<TeamTabId, string> = {
  overview: 'Overview',
  matches: 'Matches',
  roster: 'Roster',
  stats: 'Stats',
  titles: 'Honours & Winnings',
};

/**
 * Tail lengths are kept short deliberately: entity names run up to 33
 * characters in this database, and Google truncates near 65, so a long tail
 * would push the brand out of the visible title on the longest names.
 */
export function teamTabTitle(tab: TeamTabId, label: string): string {
  switch (tab) {
    case 'matches':
      return `${label} Match History & Results | ${SITE_NAME}`;
    case 'roster':
      return `${label} Roster & Players | ${SITE_NAME}`;
    case 'stats':
      return `${label} Stats & Performance | ${SITE_NAME}`;
    case 'titles':
      return `${label} Honours & Winnings | ${SITE_NAME}`;
    case 'overview':
    default:
      return `${label} — Roster, Stats & Matches | ${SITE_NAME}`;
  }
}

export function teamTabDescription(
  tab: TeamTabId,
  label: string,
  game: string | null
): string {
  const gamePart = game ? `${game} ` : '';

  switch (tab) {
    case 'matches':
      return `Every recorded match for ${label} — opponents, maps, placements and head-to-head results.`;
    case 'roster':
      return `Current and past roster of ${label} — players, in-game roles and support staff.`;
    case 'stats':
      return `${label} performance statistics — placements, eliminations, WWCDs and per-tournament breakdowns.`;
    case 'titles':
      return `Titles and prize winnings for ${label} — tournament wins, runner-up finishes and earnings.`;
    case 'overview':
    default:
      return `${label} profile — roster, ${gamePart}tournament history, KRAFTON ranking, match results and player statistics.`;
  }
}

/* ── Players ────────────────────────────────────────────────────────────── */

export type PlayerTabId = 'overview' | 'stats' | 'results' | 'honours';

export const PLAYER_TAB_SEGMENT: Record<PlayerTabId, string | null> = {
  overview: null,
  stats: 'stats',
  results: 'results',
  honours: 'honours',
};

/** Every non-overview tab route, in presentation order. */
export const PLAYER_TAB_ROUTES = ['stats', 'results', 'honours'] as const;

export const PLAYER_TAB_LABELS: Record<PlayerTabId, string> = {
  overview: 'Overview',
  stats: 'Stats',
  results: 'Results',
  honours: 'Honours',
};

export function playerTabTitle(tab: PlayerTabId, ign: string, game: string | null): string {
  switch (tab) {
    case 'stats':
      return `${ign} Stats & Performance | ${SITE_NAME}`;
    case 'results':
      return `${ign} Tournament Results | ${SITE_NAME}`;
    case 'honours':
      return `${ign} Honours & Achievements | ${SITE_NAME}`;
    case 'overview':
    default: {
      const prefix = game ? `${game} ` : '';
      return `${ign} — ${prefix}Player Stats, Team & Career | ${SITE_NAME}`;
    }
  }
}

export function playerTabDescription(
  tab: PlayerTabId,
  ign: string,
  game: string | null,
  team: string | null
): string {
  const teamPart = team ? ` of ${team}` : '';
  const gamePart = game ? `${game} ` : '';

  switch (tab) {
    case 'stats':
      return `Match-by-match and per-tournament performance for ${ign}${teamPart} — eliminations, damage, survival and placement statistics.`;
    case 'results':
      return `Every tournament ${ign}${teamPart} has played in — event-by-event placements and team results.`;
    case 'honours':
      return `Individual honours and awards won by ${ign}${teamPart} — MVP and finals MVP titles, prize earnings and tournament achievements.`;
    case 'overview':
    default:
      return `${ign}${teamPart} — ${gamePart}player profile with career statistics, tournament results, team history and individual honours.`;
  }
}
