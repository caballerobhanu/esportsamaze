import {
  MIN_AVERAGE_SAMPLES,
  formatAverage,
  formatDuration,
  formatRate,
  scorecardLabel,
} from '@/lib/team-stats';
import { formatDate } from '@/lib/utils';
import type { HeadToHeadRow, TeamMapRow, TeamMatchRow, TeamTournamentRow } from '@/lib/team-data';
import type { MobileCardMetric } from './mobile-data-card';

export interface PreviewCard {
  key: string;
  title: string;
  subtitle?: string;
  metrics: MobileCardMetric[];
  /** Revealed by a click, never shown alongside the primary metrics. */
  telemetry?: MobileCardMetric[];
  footer?: string;
}

/**
 * Preview-only adapters: one pure function per surface, mapping the loader's rows
 * to what the preview renders. Every figure goes through the same formatter the
 * live table uses, and the metric order follows the desktop table's columns.
 */

/** Cards read as the mobile view, so events use the short name when one exists. */
function shortEventName(name: string, shortName?: string | null): string {
  return shortName?.trim() || name;
}

/**
 * Per-map record. Desktop columns: Map · Matches · Wins · Top-5 % · Avg place pts ·
 * Total points · Avg damage · Avg survival. Damage and survival are split into
 * `telemetry` because they are the two the desktop table annotates with a sample
 * count, and they are the ones worth hiding on a phone.
 */
export function teamMapCards(rows: TeamMapRow[]): PreviewCard[] {
  return rows.map((row) => ({
    key: row.mapName,
    title: row.mapName,
    metrics: [
      { label: 'Matches', value: row.matches },
      { label: 'Wins', value: row.wins },
      { label: 'Top-5 %', value: formatRate(row.topFiveRate, row.matches) },
      { label: 'Avg place pts', value: formatAverage(row.avgPlacePoints, row.matches, 1) },
      {
        label: 'Avg points',
        value: formatAverage(row.matches > 0 ? row.points / row.matches : null, row.matches, 1),
      },
    ],
    telemetry: [
      {
        label: 'Avg damage',
        value: `${formatAverage(row.avgDamage, row.damageSamples, 0)}${
          row.damageSamples > 0 ? ` · ${scorecardLabel(row.damageSamples)}` : ''
        }`,
      },
      {
        label: 'Avg survival',
        value: `${formatDuration(row.avgSurvival, row.survivalSamples)}${
          row.survivalSamples > 0 ? ` · ${scorecardLabel(row.survivalSamples)}` : ''
        }`,
      },
    ],
  }));
}

/**
 * Per-tournament record. Six fields, three columns by two rows, in the desktop
 * table's column order: Matches · Wins · Top-5 % · Avg total pts · Avg elim pts ·
 * Final rank. The desktop table has no totals column, so neither does the card.
 */
export function teamTournamentCards(rows: TeamTournamentRow[]): PreviewCard[] {
  return rows.map((row) => ({
    key: row.tournamentId,
    title: shortEventName(row.name, row.shortName),
    subtitle: row.name === shortEventName(row.name, row.shortName) ? undefined : row.name,
    metrics: [
      { label: 'Matches', value: row.matches },
      { label: 'Wins', value: row.wins },
      { label: 'Top-5 %', value: formatRate(row.topFiveRate, row.matches) },
      { label: 'Avg total pts', value: formatAverage(row.avgTotalPoints, row.matches, 1) },
      { label: 'Avg elim pts', value: formatAverage(row.avgElimsPoints, row.matches, 1) },
      { label: 'Final rank', value: row.finalRank ? `#${row.finalRank}` : '—' },
    ],
  }));
}

export interface PlayerPreviewLine {
  tournamentId: string;
  tournamentName: string;
  tournamentShortName: string | null;
  teamName: string | null;
  elims: number;
  startedAtMs: number | null;
}

export interface PlayerEventCardData {
  key: string;
  eventName: string;
  fullName: string;
  teamName?: string;
  games: number;
  elims: number;
  avgPerGame: string;
  bestGame: number;
  zeroElimGames: number;
  fivePlusGames: number;
  lastGameMs: number | null;
}

/**
 * Player event stats. Mirrors groupLines() in
 * components/players/player-event-stats.tsx:68 for the "by event" view: one card
 * per event, best single game, zero-elim and five-plus-elim counts, newest event
 * first, and the team the player lined up for most often.
 */
export function groupPlayerEvents(lines: PlayerPreviewLine[]): PlayerEventCardData[] {
  const groups = new Map<
    string,
    {
      matches: number;
      elims: number;
      maxElims: number;
      zeroElims: number;
      fivePlusElims: number;
      latestMs: number;
      name: string;
      shortName: string | null;
      teamCounts: Map<string, number>;
    }
  >();

  for (const line of lines) {
    let group = groups.get(line.tournamentId);
    if (!group) {
      group = {
        matches: 0,
        elims: 0,
        maxElims: 0,
        zeroElims: 0,
        fivePlusElims: 0,
        latestMs: 0,
        name: line.tournamentName,
        shortName: line.tournamentShortName,
        teamCounts: new Map(),
      };
      groups.set(line.tournamentId, group);
    }

    group.matches += 1;
    group.elims += line.elims;
    group.maxElims = Math.max(group.maxElims, line.elims);
    if (line.elims === 0) group.zeroElims += 1;
    if (line.elims >= 5) group.fivePlusElims += 1;
    if (line.startedAtMs && line.startedAtMs > group.latestMs) group.latestMs = line.startedAtMs;
    if (line.teamName) group.teamCounts.set(line.teamName, (group.teamCounts.get(line.teamName) ?? 0) + 1);
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].latestMs - a[1].latestMs)
    .map(([id, group]) => {
      const bestTeam = [...group.teamCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        key: id,
        eventName: shortEventName(group.name, group.shortName),
        fullName: group.name,
        teamName: bestTeam ? bestTeam[0] : undefined,
        games: group.matches,
        elims: group.elims,
        avgPerGame: group.matches > 0 ? (group.elims / group.matches).toFixed(2) : '—',
        bestGame: group.maxElims,
        zeroElimGames: group.zeroElims,
        fivePlusGames: group.fivePlusElims,
        lastGameMs: group.latestMs || null,
      };
    });
}

/** The head-to-head board keeps its table treatment; the preview renders it with
 *  a narrower column set and a shorter default list. */
export function headToHeadRows(rows: HeadToHeadRow[]) {
  return rows.map((row) => ({
    key: row.opponentId,
    name: row.tag?.trim() || row.name,
    fullName: row.name,
    faced: row.faced,
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    diff: (() => {
      if (row.faced < MIN_AVERAGE_SAMPLES) return '—';
      const value = row.myAvgPoints - row.oppAvgPoints;
      const rounded = Math.abs(value) < 0.05 ? 0 : value;
      return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(1)}`;
    })(),
    lastMeeting: row.lastMeetingMs ? formatDate(new Date(row.lastMeetingMs)) : '—'
  }));
}

/** Match history keeps its table treatment, with the mobile column set. */
export function matchHistoryRows(rows: TeamMatchRow[]) {
  return rows.map((row) => ({
    key: row.id,
    date: row.scheduledAtMs
      ? new Date(row.scheduledAtMs).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : '—',
    tournament: shortEventName(row.tournamentName, row.tournamentShortName),
    fullTournament: row.tournamentName,
    map: row.mapName ?? '—',
    rank: row.rank,
    wwcd: row.wwcd,
    elims: row.elimsPoints,
    total: row.totalPoints
  }));
}
