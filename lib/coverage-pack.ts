/**
 * Coverage Pack — turns a slice of live tournament data into the single block of
 * "source material" the editorial prompt writes an article from.
 *
 * Pure by construction: no Prisma, no React. The page gathers and slices rows, then
 * hands them here; this module only formats. That keeps it unit-testable and keeps
 * the fact-traceability rule honest — everything printed below came from the input,
 * and anything absent is named as missing rather than filled in.
 *
 * A slice is one match day, one stage, or the whole event to date. Fixtures carry
 * every match in the slice; results carry only the completed ones. Day labels are
 * decided by the caller using the site's own `matchRelativeDayKey`, so a pack says
 * "Day 3" exactly the way the tournament pages do.
 */

import type { AggregatedPlayerStat, AggregatedTeamStanding } from './tournament-math';
import { formatKickoffDate, formatKickoffTime } from './match-time';
import { gameHref } from './games';

/** The event timezone every kick-off in a pack is printed in — the editorial default. */
const PACK_TIMEZONE = 'Asia/Kolkata';

export type CoverageSlice =
  | { kind: 'DAY'; dateKey: string }
  | { kind: 'STAGE'; stageId: string }
  | { kind: 'EVENT' };

export interface CoverageFixture {
  matchNumber: number | null;
  overallMatchNumber: number | null;
  stageName: string | null;
  groupName: string | null;
  mapName: string | null;
  scheduledAt: Date;
  matchTime: string | null;
  status: string;
  streamUrl: string | null;
  /** Number of games recorded under the match. */
  games: number;
}

export interface CoveragePodiumRow {
  rank: number;
  teamName: string;
  wwcd: boolean;
  placePoints: number | null;
  elimsPoints: number | null;
  bonusPoints: number | null;
  totalPoints: number | null;
}

export interface CoverageTopPlayer {
  ign: string;
  teamName: string | null;
  elims: number;
}

export interface CoverageCompletedMatch {
  matchNumber: number | null;
  overallMatchNumber: number | null;
  stageName: string | null;
  mapName: string | null;
  date: Date;
  /** Every team result for the game, ranked; the pack prints the top five. */
  podium: CoveragePodiumRow[];
  /** Every player stat for the game, best elims first; the pack prints the top three. */
  topPlayers: CoverageTopPlayer[];
}

/** A player's eliminations across one slice: total, best in a single match, and per-match average. */
export interface CoveragePlayerElims {
  playerId: string;
  /** Distinct matches the player recorded stats in. */
  matches: number;
  /** Game rows recorded for the player — a match can hold several games. */
  games: number;
  elims: number;
  highestInMatch: number;
  averagePerMatch: number;
}

export interface CoverageTeamEntity {
  name: string;
  slug: string | null;
}

export interface CoveragePlayerEntity {
  ign: string;
  slug: string | null;
  teamName: string | null;
}

export interface CoveragePackInput {
  generatedAt: Date;
  tournament: {
    name: string;
    slug: string;
    gameName: string | null;
    gameSlug: string;
    region: string | null;
    tier: string | null;
    startDate: Date;
    endDate: Date;
    prizePool: number | null;
    currency: string | null;
    location: string | null;
    pointsMatrix: Record<string, number> | null;
    killPointsPerElim: number | null;
  };
  slice: CoverageSlice;
  sliceLabel: string;
  fixtures: CoverageFixture[];
  completedMatches: CoverageCompletedMatch[];
  standings: AggregatedTeamStanding[];
  fraggers: AggregatedPlayerStat[];
  /** Per-player eliminations for the slice, keyed by playerId — drives the fraggers detail. */
  playerElims: CoveragePlayerElims[];
  teams: CoverageTeamEntity[];
  players: CoveragePlayerEntity[];
  existingCategories: string[];
  existingTags: string[];
  missing: string[];
}

/** A dash, never a zero, for a figure that was never recorded. */
function num(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : '—';
}

function text(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed || '—';
}

function matchTag(match: { matchNumber: number | null; overallMatchNumber: number | null }): string {
  const overall = match.overallMatchNumber ?? match.matchNumber;
  if (overall == null) return 'Match —';
  if (match.matchNumber != null && match.overallMatchNumber != null && match.matchNumber !== match.overallMatchNumber) {
    return `Match ${match.matchNumber} (event match ${match.overallMatchNumber})`;
  }
  return `Match ${overall}`;
}

function kickoff(fixture: CoverageFixture): string {
  const date = formatKickoffDate(fixture.scheduledAt, { timeZone: PACK_TIMEZONE });
  // The stored matchTime already carries the organiser's own label (e.g. "17:30 IST"),
  // so it is preferred over re-deriving the time from the instant.
  const time = fixture.matchTime
    ? fixture.matchTime
    : formatKickoffTime(fixture.scheduledAt, { timeZone: PACK_TIMEZONE });
  return `${date}, ${time}`;
}

type MatchOrderKey = {
  overallMatchNumber: number | null;
  matchNumber: number | null;
  scheduledAt?: Date;
  date?: Date;
};

function byMatchOrder(a: MatchOrderKey, b: MatchOrderKey): number {
  const ao = a.overallMatchNumber ?? a.matchNumber ?? Number.MAX_SAFE_INTEGER;
  const bo = b.overallMatchNumber ?? b.matchNumber ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  const at = (a.scheduledAt ?? a.date)?.getTime() ?? 0;
  const bt = (b.scheduledAt ?? b.date)?.getTime() ?? 0;
  return at - bt;
}

function sliceDateRange(fixtures: CoverageFixture[]): string {
  if (fixtures.length === 0) return '—';
  const times = fixtures.map((f) => f.scheduledAt.getTime()).sort((a, b) => a - b);
  const first = new Date(times[0]);
  const last = new Date(times[times.length - 1]);
  const firstLabel = formatKickoffDate(first, { timeZone: PACK_TIMEZONE, withYear: true });
  const lastLabel = formatKickoffDate(last, { timeZone: PACK_TIMEZONE, withYear: true });
  return firstLabel === lastLabel ? firstLabel : `${firstLabel} – ${lastLabel}`;
}

function unique(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map((v) => (v ?? '').trim()).filter(Boolean)));
}

function pointsMatrixLine(matrix: Record<string, number> | null, killPoints: number | null): string | null {
  const parts: string[] = [];
  if (matrix && Object.keys(matrix).length > 0) {
    const entries = Object.entries(matrix)
      .map(([placement, points]) => [Number(placement), points] as const)
      .filter(([placement]) => Number.isFinite(placement))
      .sort((a, b) => a[0] - b[0])
      .map(([placement, points]) => `${placement}${ordinalSuffix(placement)} ${points}`);
    if (entries.length > 0) parts.push(`Placement: ${entries.join(', ')}`);
  }
  if (typeof killPoints === 'number') parts.push(`Elimination: ${killPoints} point${killPoints === 1 ? '' : 's'} each`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/* ── sections ── */

function eventFacts(input: CoveragePackInput): string[] {
  const t = input.tournament;
  const lines = [
    `Event: ${t.name}`,
    `Game: ${text(t.gameName)}`,
    `Region: ${text(t.region)}`,
    `Tier: ${text(t.tier)}`,
    `Location: ${text(t.location)}`,
    `Dates: ${formatKickoffDate(t.startDate, { timeZone: PACK_TIMEZONE, withYear: true })} – ${formatKickoffDate(t.endDate, { timeZone: PACK_TIMEZONE, withYear: true })}`,
  ];

  if (typeof t.prizePool === 'number' && t.prizePool > 0) {
    lines.push(`Prize pool: ${t.prizePool.toLocaleString('en-US')} ${t.currency ?? 'USD'}`);
  } else {
    lines.push('Prize pool: not recorded');
  }

  const matrix = pointsMatrixLine(t.pointsMatrix, t.killPointsPerElim);
  if (matrix) lines.push(`Points system: ${matrix}`);

  lines.push(`Event slug: ${t.slug}`);
  lines.push(`Public URL: ${gameHref(t.gameSlug, `tournaments/${t.slug}`)}`);

  return lines;
}

function sliceSummary(input: CoveragePackInput): string[] {
  const { fixtures } = input;
  const stages = unique(fixtures.map((f) => f.stageName));
  const groups = unique(fixtures.map((f) => f.groupName));
  const maps = unique(fixtures.map((f) => f.mapName));

  return [
    `Label: ${input.sliceLabel}`,
    `Dates covered: ${sliceDateRange(fixtures)}`,
    `Matches in slice: ${fixtures.length}`,
    `Stages: ${stages.length > 0 ? stages.join(', ') : '—'}`,
    `Groups: ${groups.length > 0 ? groups.join(', ') : '—'}`,
    `Maps played: ${maps.length > 0 ? maps.join(', ') : '—'}`,
  ];
}

function fixtureLines(fixtures: CoverageFixture[]): string[] {
  if (fixtures.length === 0) return ['No matches in this slice.'];

  return [...fixtures].sort(byMatchOrder).map((f) => {
    const bits = [
      matchTag(f),
      text(f.stageName),
      f.groupName ? (/^group\b/i.test(f.groupName) ? f.groupName : `Group ${f.groupName}`) : null,
      text(f.mapName),
      kickoff(f),
      f.status,
    ].filter((bit): bit is string => Boolean(bit));
    const stream = f.streamUrl ? ` · stream: ${f.streamUrl}` : '';
    return `${bits.join(' · ')}${stream}`;
  });
}

const PODIUM_SIZE = 5;
const TOP_PLAYERS_PER_MATCH = 3;

function resultLines(matches: CoverageCompletedMatch[]): string[] {
  if (matches.length === 0) return ['No completed matches in this slice yet.'];

  const lines: string[] = [];
  for (const match of [...matches].sort(byMatchOrder)) {
    const meta = [text(match.stageName), text(match.mapName)].join(' · ');
    lines.push(`${matchTag(match)} — ${meta}`);

    const podium = [...match.podium].sort((a, b) => a.rank - b.rank).slice(0, PODIUM_SIZE);
    for (const row of podium) {
      const wwcd = row.wwcd ? ' · WWCD' : '';
      lines.push(
        `  ${row.rank}. ${row.teamName} — place ${num(row.placePoints)} · elims ${num(row.elimsPoints)} · bonus ${num(
          row.bonusPoints
        )} · total ${num(row.totalPoints)}${wwcd}`
      );
    }

    const players = [...match.topPlayers]
      .sort((a, b) => b.elims - a.elims)
      .slice(0, TOP_PLAYERS_PER_MATCH)
      .map((p, index) => `${index + 1}. ${p.ign}${p.teamName ? ` (${p.teamName})` : ''} ${num(p.elims)} elims`);
    if (players.length > 0) lines.push(`  Top players: ${players.join(' · ')}`);

    lines.push('');
  }

  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function standingsLines(standings: AggregatedTeamStanding[]): string[] {
  if (standings.length === 0) return ['No completed matches — standings unavailable.'];

  const width = Math.max(2, String(standings.length).length);
  return standings.map((row) => {
    const rank = String(row.rank).padStart(width, ' ');
    const tiebreak = row.tiebreaker?.isTied && row.tiebreaker.shortBadge ? `  [tiebreak: ${row.tiebreaker.shortBadge}]` : '';
    return `${rank}. ${row.teamName} — ${row.matchesPlayed} mp · ${row.wwcd} WWCD · place ${num(
      row.placementPoints
    )} · elims ${num(row.eliminationPoints)} · ${num(row.totalPoints)} pts${tiebreak}`;
  });
}

function fraggerLines(fraggers: AggregatedPlayerStat[], playerElims: CoveragePlayerElims[]): string[] {
  if (fraggers.length === 0) return ['No player statistics recorded for this slice.'];
  const detail = new Map(playerElims.map((entry) => [entry.playerId, entry]));

  // damage and headshots are nullable in the DB but the fraggers aggregator coerces a
  // missing value to 0, so a slice that recorded none is indistinguishable from an
  // all-zero one. Print them only when the slice actually recorded something, rather
  // than telling the writer every player did 0 damage.
  const hasDamage = fraggers.some((row) => row.damage > 0);
  const hasHeadshots = fraggers.some((row) => row.headshots > 0);

  const top = fraggers.slice(0, 10);
  const lines = top.map((row) => {
    const team = row.teamName ? ` (${row.teamName})` : '';
    const entry = detail.get(row.playerId);
    const elimsPart = entry
      ? `${num(row.elims)} elims · high ${num(entry.highestInMatch)} · avg ${entry.averagePerMatch.toFixed(1)}/match`
      : `${num(row.elims)} elims`;
    const extras = [
      hasDamage ? `${num(row.damage)} damage` : null,
      hasHeadshots ? `${num(row.headshots)} headshots` : null,
    ].filter((part): part is string => part !== null);
    const tail = extras.length > 0 ? ` · ${extras.join(' · ')}` : '';
    return `${String(row.rank).padStart(2, ' ')}. ${row.ign}${team} — ${elimsPart}${tail}`;
  });
  if (fraggers.length > top.length) lines.push(`…and ${fraggers.length - top.length} more player(s).`);
  return lines;
}

function notableFacts(matches: CoverageCompletedMatch[], standings: AggregatedTeamStanding[]): string[] {
  const facts: string[] = [];

  const winners = standings.filter((row) => row.wwcd > 0).map((row) => `${row.teamName} (${row.wwcd})`);
  if (winners.length > 0) facts.push(`WWCD winners: ${winners.join(', ')}`);

  let bestTotal: { team: string; total: number; tag: string } | null = null;
  let bestElims: { ign: string; elims: number; tag: string } | null = null;
  for (const match of matches) {
    const tag = matchTag(match);
    for (const row of match.podium) {
      if (typeof row.totalPoints === 'number' && (!bestTotal || row.totalPoints > bestTotal.total)) {
        bestTotal = { team: row.teamName, total: row.totalPoints, tag };
      }
    }
    if (match.topPlayers.length > 0) {
      const bestInMatch = match.topPlayers.reduce((best, p) => (p.elims > best.elims ? p : best));
      if (!bestElims || bestInMatch.elims > bestElims.elims) {
        bestElims = { ign: bestInMatch.ign, elims: bestInMatch.elims, tag };
      }
    }
  }
  if (bestTotal) facts.push(`Highest single-match total: ${bestTotal.team} — ${num(bestTotal.total)} pts (${bestTotal.tag})`);
  if (bestElims) facts.push(`Most eliminations in a single match: ${bestElims.ign} — ${num(bestElims.elims)} (${bestElims.tag})`);

  return facts.length > 0 ? facts : ['Nothing to report yet.'];
}

function entityDictionary(input: CoveragePackInput): string[] {
  const lines = [`Tournament: ${input.tournament.name} → ${gameHref(input.tournament.gameSlug, `tournaments/${input.tournament.slug}`)}`];

  if (input.teams.length > 0) {
    lines.push('Teams:');
    for (const team of input.teams) {
      lines.push(`  ${team.name}${team.slug ? ` → ${gameHref(input.tournament.gameSlug, `teams/${team.slug}`)}` : ' (no slug — name in plain text only)'}`);
    }
  }

  if (input.players.length > 0) {
    lines.push('Players:');
    for (const player of input.players) {
      const team = player.teamName ? ` [${player.teamName}]` : '';
      lines.push(
        `  ${player.ign}${team}${player.slug ? ` → ${gameHref(input.tournament.gameSlug, `players/${player.slug}`)}` : ' (no slug — name in plain text only)'}`
      );
    }
  }

  return lines;
}

function shortcodeLines(input: CoveragePackInput): string[] {
  const lines: string[] = [`[standings tournament="${input.tournament.name}"]`, '[toc]'];

  for (const team of input.teams) {
    if (team.slug) lines.push(`[team-card team="${team.name}"]`);
  }
  for (const player of input.players) {
    if (player.slug) lines.push(`[player-card player="${player.ign}"]`);
  }
  for (const match of [...input.completedMatches].sort(byMatchOrder)) {
    const number = match.overallMatchNumber ?? match.matchNumber;
    if (number != null) lines.push(`[match-scorecard match="${number}"]`);
  }

  return lines;
}

function internalLinks(input: CoveragePackInput): string[] {
  const t = input.tournament;
  const lines = [
    `${gameHref(t.gameSlug, `tournaments/${t.slug}`)} (event overview)`,
    `${gameHref(t.gameSlug, `tournaments/${t.slug}/standings`)} (standings)`,
    `${gameHref(t.gameSlug, `tournaments/${t.slug}/matches`)} (matches)`,
    `${gameHref(t.gameSlug, `tournaments/${t.slug}/statistics`)} (statistics)`,
  ];
  for (const team of input.teams) {
    if (team.slug) lines.push(`${gameHref(t.gameSlug, `teams/${team.slug}/roster`)} (${team.name} roster)`);
  }
  for (const player of input.players) {
    if (player.slug) lines.push(`${gameHref(t.gameSlug, `players/${player.slug}/stats`)} (${player.ign} stats)`);
  }
  return lines;
}

/**
 * Builds the full pack. Sections are delimited with `=== NAME ===` rather than
 * Markdown headings on purpose: the pack is source material, not the article, and
 * this keeps a model from mistaking a delimiter for the article's own structure.
 */
export function buildCoveragePack(input: CoveragePackInput): string {
  const header = [
    `# Coverage Pack — ${input.tournament.name}`,
    `Generated: ${input.generatedAt.toISOString()} · Slice: ${input.sliceLabel}`,
    'This is the only source material. Do not invent any fact that is not present below; where a figure is missing, leave it out.',
  ];

  const sections: Array<[string, string[]]> = [
    ['EVENT FACTS', eventFacts(input)],
    ['SLICE', sliceSummary(input)],
    ['FIXTURES', fixtureLines(input.fixtures)],
    ['RESULTS (COMPLETED MATCHES)', resultLines(input.completedMatches)],
    ['STANDINGS (SLICE)', standingsLines(input.standings)],
    ['PLAYER ELIMS & FRAGGERS (SLICE)', fraggerLines(input.fraggers, input.playerElims)],
    ['NOTABLE FACTS', notableFacts(input.completedMatches, input.standings)],
    ['ENTITY DICTIONARY (EXACT STORED NAMES)', entityDictionary(input)],
    ['WIDGET SHORTCODES (COPY VERBATIM)', shortcodeLines(input)],
    [
      'CATEGORIES & TAGS ALREADY IN USE (REUSE EXACT SPELLING)',
      [
        `Categories: ${input.existingCategories.length > 0 ? input.existingCategories.join(', ') : '—'}`,
        `Tags: ${input.existingTags.length > 0 ? input.existingTags.join(', ') : '—'}`,
      ],
    ],
    ['SUGGESTED INTERNAL LINKS', internalLinks(input)],
    ['MISSING FROM SOURCE', input.missing.length > 0 ? input.missing : ['Nothing notable — all expected figures were present.']],
  ];

  const body = sections.map(([name, lines]) => [`=== ${name} ===`, ...lines].join('\n')).join('\n\n');

  return `${header.join('\n')}\n\n${body}\n`;
}
