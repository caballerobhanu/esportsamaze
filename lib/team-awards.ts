/**
 * Award extraction for the team trophy cabinet.
 *
 * Awards live in `Tournament.prizeDistribution` — the same JSON tree the
 * prizepool tab renders. Each rank entry can be a placement on the prize ladder
 * (`{ rank: '5th Place', prize: 350000, recipientType: 'TEAM', teamId }`) or a
 * standalone honour (`{ rank: 'Best IGL', prize: 250000, recipientType:
 * 'PLAYER', playerId }`, or `{ rank: 'The Eliminator', prize: 0, rewardType:
 * 'TITLE' }`). Only the latter are awards; the ladder is already represented by
 * the team's titles, runner-up finishes and prize money, so it is filtered out.
 *
 * The flattening is `flattenPrizeRanks()` — deliberately not reimplemented here,
 * so the prizepool tab and this cabinet can never disagree about which rows
 * exist.
 *
 * Ownership is resolved in this order:
 *   1. the row's own `teamId` (authoritative — the prize editor stamps it);
 *   2. this team's roster for that event (`TournamentTeam.rosterJson`), matched
 *      by player id, then IGN, then slug;
 *   3. this team's transfer ledger — a player who has since left is no longer in
 *      the current roster, but the move that took them out is on record.
 * Anything still unattributed is reported as unresolved rather than guessed at.
 *
 * Pure module: no Prisma, no React, no IO.
 */

import { flattenPrizeRanks } from '@/lib/standings-config';
import { classifyPrizeRow } from '@/lib/prize-rows';
import { parseRoster } from '@/lib/team-roster';

export type AwardRecipientKind = 'TEAM' | 'PLAYER';
export type AwardRewardType = 'MONEY' | 'ITEM' | 'TITLE';
export type AwardResolution = 'award-team' | 'roster' | 'ledger';

export interface AwardTournamentInput {
  tournamentId: string;
  name: string;
  /** Admin-entered short label, or null so the display can derive a fallback. */
  shortName: string | null;
  slug: string;
  currency: string;
  /** `null` when the event has no start date. Used only for ordering. */
  startedAtMs: number | null;
  prizeDistribution: unknown;
  /** This team's `TournamentTeam.rosterJson` for the event. */
  rosterJson?: unknown;
}

export interface AwardPlayerRef {
  id: string;
  ign: string;
  slug: string | null;
}

export interface TeamAward {
  /** Stable across renders: `<tournamentId>:<row index>`. */
  key: string;
  tournamentId: string;
  tournamentName: string;
  /** Admin-entered short label, shown in place of `tournamentName` on mobile. */
  tournamentShortName: string | null;
  tournamentSlug: string;
  currency: string;
  /** The row's `rank` field — for awards this is the honour's name. */
  label: string;
  recipientKind: AwardRecipientKind;
  rewardType: AwardRewardType;
  customReward: string | null;
  /** Cash value on the row; 0 for item / title honours. */
  amount: number;
  playerId: string | null;
  playerName: string | null;
  playerSlug: string | null;
  resolvedBy: AwardResolution;
}

export interface UnresolvedAward {
  tournamentId: string;
  tournamentName: string;
  label: string;
  playerId: string | null;
  playerName: string | null;
  reason: string;
}

export interface TeamAwards {
  awards: TeamAward[];
  unresolved: UnresolvedAward[];
}

export interface CollectTeamAwardsInput {
  teamId: string;
  tournaments: readonly AwardTournamentInput[];
  /** The active roster — supplies display names and slugs. */
  roster: readonly AwardPlayerRef[];
  /** The transfer ledger — the fallback for players who have since left. */
  transfers: readonly AwardPlayerRef[];
  playerIdToSlug?: Record<string, string>;
}

/**
 * An award with no cash value shows what it actually was (`TVS Raider Bike`, or
 * the honour's own name for a TITLE) instead of a currency amount.
 */
export type AwardReward =
  | { kind: 'MONEY'; amount: number; currency: string }
  | { kind: 'REWARD'; text: string; rewardType: AwardRewardType }
  | { kind: 'NONE' };

export function describeAwardReward(award: TeamAward): AwardReward {
  if (award.amount > 0) {
    return { kind: 'MONEY', amount: award.amount, currency: award.currency };
  }
  if (award.rewardType === 'ITEM' || award.rewardType === 'TITLE') {
    return {
      kind: 'REWARD',
      text: award.customReward || award.label,
      rewardType: award.rewardType,
    };
  }
  return { kind: 'NONE' };
}

export function collectTeamAwards({
  teamId,
  tournaments,
  roster,
  transfers,
  playerIdToSlug = {},
}: CollectTeamAwardsInput): TeamAwards {
  const awards: TeamAward[] = [];
  const unresolved: UnresolvedAward[] = [];

  // Display names for players referenced only by id on the award row. Keyed by id
  // only — a name-keyed lookup would draw look-alike IGNs together.
  const byId = new Map<string, AwardPlayerRef>();
  for (const player of [...roster, ...transfers]) {
    byId.set(player.id, player);
  }

  for (const tournament of tournaments) {
    const rows = flattenPrizeRanks(tournament.prizeDistribution);
    if (rows.length === 0) continue;

    // The event roster carries the players who were actually on this team then,
    // including anyone who has since left. Matched by player id only: an entry
    // with no id is not evidence that this name belongs to any given player.
    const rosterEntries = parseRoster(tournament.rosterJson);
    const eventPlayerIds = new Set<string>();
    const eventSlugs = new Set<string>();
    for (const entry of rosterEntries) {
      if (entry.playerId) eventPlayerIds.add(entry.playerId);
      if (entry.slug) eventSlugs.add(entry.slug.toLowerCase());
    }

    const ledgerIds = new Set(transfers.map((player) => player.id));

    rows.forEach((row, rowIndex) => {
      const label = String(row.rank ?? '').trim();
      // The prize ladder is not an award.
      if (classifyPrizeRow(row) === 'PLACEMENT') return;

      const rowTeamId = typeof row.teamId === 'string' && row.teamId ? row.teamId : null;
      const playerId = typeof row.playerId === 'string' && row.playerId ? row.playerId : null;
      const playerName =
        typeof row.playerName === 'string' && row.playerName.trim() ? row.playerName.trim() : null;
      const recipientKind: AwardRecipientKind =
        row.recipientType === 'PLAYER' || (row.recipientType !== 'TEAM' && (playerId || playerName))
          ? 'PLAYER'
          : 'TEAM';

      // A row stamped with another team is that team's honour — resolved, just
      // not ours, so it is neither shown here nor reported as unresolved.
      if (rowTeamId && rowTeamId !== teamId) return;

      // The only way a slug can match is award.playerId → known slug → a roster
      // entry that recorded a slug but no player id.
      const awardSlug = (
        (playerId ? playerIdToSlug[playerId] : '') ||
        (playerId ? byId.get(playerId)?.slug : '') ||
        ''
      ).toLowerCase();

      let resolvedBy: AwardResolution | null = null;
      if (rowTeamId) resolvedBy = 'award-team';
      else if (playerId && eventPlayerIds.has(playerId)) resolvedBy = 'roster';
      else if (awardSlug && eventSlugs.has(awardSlug)) resolvedBy = 'roster';
      else if (playerId && ledgerIds.has(playerId)) resolvedBy = 'ledger';

      if (!resolvedBy) {
        // Report it instead of guessing: a team-level honour with no team on the
        // row, or a player honour whose player is attached to nobody we can see.
        unresolved.push({
          tournamentId: tournament.tournamentId,
          tournamentName: tournament.name,
          label,
          playerId,
          playerName,
          reason:
            recipientKind === 'TEAM'
              ? 'team award with no team recorded'
              : 'player not in this event roster or the transfer ledger',
        });
        return;
      }

      const known = playerId ? byId.get(playerId) ?? null : null;
      const slugFromMap = playerId ? playerIdToSlug[playerId] : undefined;
      const slug =
        (slugFromMap && slugFromMap.length > 0 ? slugFromMap : null) ?? known?.slug ?? null;

      awards.push({
        key: `${tournament.tournamentId}:${rowIndex}`,
        tournamentId: tournament.tournamentId,
        tournamentName: tournament.name,
        tournamentShortName: tournament.shortName,
        tournamentSlug: tournament.slug,
        currency: tournament.currency,
        label,
        recipientKind,
        rewardType:
          row.rewardType === 'ITEM' || row.rewardType === 'TITLE'
            ? (row.rewardType as AwardRewardType)
            : 'MONEY',
        customReward:
          typeof row.customReward === 'string' && row.customReward.trim()
            ? row.customReward.trim()
            : null,
        amount: Number.isFinite(Number(row.prize)) ? Number(row.prize) : 0,
        playerId: recipientKind === 'PLAYER' ? playerId : null,
        playerName: recipientKind === 'PLAYER' ? (known?.ign ?? playerName) : null,
        playerSlug: recipientKind === 'PLAYER' ? slug : null,
        resolvedBy,
      });
    });
  }

  // Newest event first; a stable sort keeps the input order for equal dates.
  const startedAtByTournament = new Map(
    tournaments.map((tournament) => [tournament.tournamentId, tournament.startedAtMs ?? 0]),
  );
  awards.sort(
    (a, b) =>
      (startedAtByTournament.get(b.tournamentId) ?? 0) -
      (startedAtByTournament.get(a.tournamentId) ?? 0),
  );

  return { awards, unresolved };
}
