'use client';

import Link from 'next/link';
import React from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Layers,
  ShieldCheck,
  Coins,
  Gift,
} from 'lucide-react';
import { ThemeLogo } from './theme-logo';
import type { PrizeResultRow } from '@/lib/tournament-prizes';
import { classifyPrizeRow, prizeRowRange } from '@/lib/prize-rows';
import {
  describeRulePosition,
  qualificationTargetsForRank,
  type QualificationRule,
} from '@/lib/qualification-rules';

export interface TournamentPrizeRank {
  rank: string;
  percentage?: number;
  prize: number;
  rewardType?: string;
  customReward?: string;
  recipientType?: string;
  teamId?: string;
  teamName?: string;
  playerId?: string;
  playerName?: string;
  qualifications?: string[];
}

export interface EstaticPrizePanelProps {
  totalPrizePool?: number | null;
  prizeStages: Array<{
    stageName: string;
    allocatedPrize?: number;
    ranks: TournamentPrizeRank[];
  }>;
  currency?: string | null;
  qualificationRules?: QualificationRule[];
  /** Players named on an award, so a player's honour can lead with their face. */
  awardPlayers?: Array<{ id: string; ign: string; slug: string | null; avatarUrl: string | null }>;
  teams?: any[];
  /** Per-team finishes; takes over the table when an event has been ranked. */
  results?: PrizeResultRow[];
}

function getOrdinal(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

export function normalizeRankLabel(rank: string): string {
  if (!rank) return '';
  // Normalizes patterns like "1th Place", "2th", "3th Place", "21th Place" to "1st Place", "2nd Place", etc.
  return rank.replace(/\b(\d+)(?:th|st|nd|rd)?(\s+Place)?\b/gi, (_, numStr, placeStr) => {
    const n = parseInt(numStr, 10);
    if (isNaN(n)) return _;
    const suffix = getOrdinal(n);
    return placeStr ? `${n}${suffix}${placeStr}` : `${n}${suffix}`;
  });
}

function formatPrizeAmount(amount: number, curr = 'INR') {
  if (amount == null || isNaN(amount)) return '—';
  if (curr === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  if (curr === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  }
  return `${amount.toLocaleString()} ${curr}`;
}

export function EstaticPrizePanel({
  totalPrizePool,
  prizeStages = [],
  currency = 'INR',
  qualificationRules = [],
  awardPlayers = [],
  teams = [],
  results = [],
}: EstaticPrizePanelProps) {
  // `-1` is the combined Total across stages, which is what a ranked event
  // opens on; an unranked one opens on its first stage's ladder.
  const [selectedStageIdx, setSelectedStageIdx] = React.useState(() => (results.length > 0 ? -1 : 0));
  const awardPlayerById = React.useMemo(
    () => new Map(awardPlayers.map((player) => [player.id, player])),
    [awardPlayers]
  );
  const [showAllResults, setShowAllResults] = React.useState(false);

  // Build team lookup for logos and tags
  const teamLookup = React.useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        displayName?: string | null;
        tag?: string | null;
        slug?: string | null;
        logoUrl?: string | null;
        imageDarkUrl?: string | null;
      }
    >();

    if (teams && Array.isArray(teams)) {
      for (const item of teams) {
        const t = item.team || item;
        if (!t) continue;
        const logoUrl = item.logoUrl || t.logoUrl || null;
        const imageDarkUrl = item.logoDarkUrl || t.imageDarkUrl || null;
        const data = {
          id: t.id,
          name: t.name,
          displayName: t.displayName || t.name,
          tag: t.tag,
          slug: t.slug,
          logoUrl,
          imageDarkUrl,
        };
        if (t.id) map.set(t.id, data);
        if (item.teamId) map.set(item.teamId, data);
        if (t.name) map.set(t.name.toLowerCase().trim(), data);
        if (t.displayName) map.set(t.displayName.toLowerCase().trim(), data);
        if (t.tag) map.set(t.tag.toLowerCase().trim(), data);
      }
    }
    return map;
  }, [teams]);

  const getTeamMeta = React.useCallback(
    (row: TournamentPrizeRank) => {
      if (row.teamId && teamLookup.has(row.teamId)) {
        return teamLookup.get(row.teamId);
      }
      if (row.teamName && teamLookup.has(row.teamName.toLowerCase().trim())) {
        return teamLookup.get(row.teamName.toLowerCase().trim());
      }
      return null;
    },
    [teamLookup]
  );

  // Compute total prize sum across all stages or from totalPrizePool
  const calculatedSum = React.useMemo(() => {
    return prizeStages.reduce((sum, s) => {
      if (s.allocatedPrize && s.allocatedPrize > 0) return sum + s.allocatedPrize;
      const rankSum = s.ranks.reduce((rSum, r) => rSum + (Number(r.prize) || 0), 0);
      return sum + rankSum;
    }, 0);
  }, [prizeStages]);

  const effectiveTotalPrize =
    totalPrizePool && totalPrizePool > 0 ? totalPrizePool : calculatedSum;

  const activeStage =
    (selectedStageIdx >= 0 ? prizeStages[selectedStageIdx] : prizeStages[0]) ||
    prizeStages[0] || {
      stageName: 'Prize Pool',
      ranks: [],
    };
  const ranks = activeStage.ranks || [];

  // The ladder and the honours share one list but are two different things: only
  // placements carry rank-wise prize money, only honours are awards. Same split
  // the trophy cabinet uses, so the two surfaces cannot disagree.
  const placements = ranks.filter((row) => classifyPrizeRow(row) === 'PLACEMENT');
  const awards = React.useMemo(
    () =>
      prizeStages.flatMap((stage) =>
        (stage.ranks || [])
          .filter((row) => classifyPrizeRow(row) === 'AWARD')
          .map((row) => ({ row, stageName: stage.stageName }))
      ),
    [prizeStages]
  );

  // A single stage's payout, per team, so the toggle can show how one stage was
  // paid rather than only the combined total. Null means "show the Total".
  const stageResults = React.useMemo(() => {
    if (selectedStageIdx < 0) return null;
    const stage = prizeStages[selectedStageIdx];
    if (!stage) return null;

    const byTeam = new Map<string, PrizeResultRow>();
    for (const row of stage.ranks || []) {
      if (classifyPrizeRow(row) === 'AWARD') continue;
      const key = row.teamId || row.teamName;
      if (!key) continue;

      const amount = Number(row.prize) || 0;
      const existing = byTeam.get(key);
      if (existing) {
        existing.prizeWon = (existing.prizeWon ?? 0) + amount;
        continue;
      }

      const meta = getTeamMeta(row);
      const range = prizeRowRange(row);
      byTeam.set(key, {
        teamId: row.teamId || key,
        rank: range ? range.from : null,
        name: meta?.displayName || meta?.name || row.teamName || key,
        tag: meta?.tag || null,
        slug: meta?.slug || null,
        logoUrl: meta?.logoUrl || null,
        logoDarkUrl: meta?.imageDarkUrl || null,
        prizeWon: amount,
        berths: [],
      });
    }

    return [...byTeam.values()].sort(
      (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name)
    );
  }, [selectedStageIdx, prizeStages, getTeamMeta]);

  const shownResults = stageResults ?? results;
  const shownAwards =
    selectedStageIdx >= 0
      ? awards.filter((entry) => entry.stageName === prizeStages[selectedStageIdx]?.stageName)
      : awards;

  // Once an event is ranked, the podium has to come from the same per-team
  // results the table shows — otherwise the two can contradict each other.
  const podiumRanks: TournamentPrizeRank[] =
    shownResults.length > 0
      ? shownResults.slice(0, 3).map((row) => ({
          rank: row.rank != null ? String(row.rank) : '',
          prize: row.prizeWon ?? 0,
          teamId: row.teamId,
          teamName: row.name,
        }))
      : ranks;

  // Identify podium ranks
  const first =
    podiumRanks.find((r) => {
      const norm = normalizeRankLabel(r.rank);
      return /\b(1st|winner|champion)\b/i.test(norm) || norm.trim() === '1';
    }) || podiumRanks[0];

  const second =
    podiumRanks.find((r) => {
      const norm = normalizeRankLabel(r.rank);
      return (
        (/\b(2nd|runner|runners-up|runner-up)\b/i.test(norm) || norm.trim() === '2') &&
        r !== first
      );
    }) || (podiumRanks[1] !== first ? podiumRanks[1] : undefined);

  const third =
    podiumRanks.find((r) => {
      const norm = normalizeRankLabel(r.rank);
      return (/\b3rd\b/i.test(norm) || norm.trim() === '3') && r !== first && r !== second;
    }) || (podiumRanks[2] !== first && podiumRanks[2] !== second ? podiumRanks[2] : undefined);

  const hasDistribution = placements.length > 0;

  // A minimum of 16 rows so a five-prize event does not read as a stub; the rest
  // is however many teams actually took money.
  const paidResults = shownResults.filter((row) => (row.prizeWon ?? 0) > 0).length;
  const resultRowCount = Math.min(shownResults.length, Math.max(16, paidResults));
  const visibleResults = showAllResults
    ? shownResults.slice(0, resultRowCount)
    : shownResults.slice(0, 10);

  // A column that would be empty for every row is dead weight, so each is only
  // rendered when at least one row has something to put in it.
  const showRecipientColumn = placements.some(
    (row) => row.teamId || row.teamName || row.playerId || row.playerName
  );
  // A column that would be empty for every row is dead weight, so it is only
  // rendered when at least one row has something to put in it. Qualification is
  // derived from the rules for that row's position — never from the retired
  // per-row string field.
  const showRewardColumn = placements.some(
    (row) =>
      row.customReward ||
      qualificationTargetsForRank(qualificationRules, prizeRowRange(row)?.from ?? null).length > 0
  );

  /**
   * The berth block leads when the ladder is still empty — for an announced
   * event with slots but no prize breakdown, it is the only thing there is to
   * say. Once a distribution exists it follows the ladder and the awards. It
   * stands down entirely once berths are carried per team, because then it is
   * the same information in a weaker form.
   */
  const berthBlock =
    qualificationRules.length > 0 && !results.some((row) => row.berths.length > 0) ? (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Advancement Path
          </p>
          <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
            Official Qualification Berths
          </h3>
        </div>

        {/* One card per rule. The content is type, not chips: the finishing
            position is what a reader scans for, so it leads, and the event it
            feeds sits under it as plain text — a link when one is recorded. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {qualificationRules.map((rule, ruleIdx) => (
            <div
              key={ruleIdx}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0b1220]"
            >
              <p className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                {describeRulePosition(rule)}
              </p>

              <div className="mt-1.5 space-y-0.5">
                {rule.targets.length > 0 ? (
                  rule.targets.map((target, targetIdx) =>
                    target.tournamentSlug ? (
                      <Link
                        key={targetIdx}
                        href={`/tournaments/${target.tournamentSlug}`}
                        className="block text-sm font-bold text-[#0A5FC4] hover:underline dark:text-blue-300"
                      >
                        {target.name}
                      </Link>
                    ) : (
                      <p
                        key={targetIdx}
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        {target.name}
                      </p>
                    )
                  )
                ) : (
                  // The position is entered but its destination is not recorded yet.
                  // Showing the rule is the honest option; hiding it is how an
                  // admin's entry used to vanish without explanation.
                  <p className="text-sm font-semibold text-slate-400">
                    Destination to be confirmed
                  </p>
                )}
              </div>

              {rule.note && (
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {rule.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    ) : null;

  const berthBlockFirst = results.length === 0 && !hasDistribution;

  return (
    <div className="space-y-8">
      {/* ============ GRAND PRIZE CALLOUT CARD ============ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A5FC4] via-blue-700 to-indigo-950 p-8 text-white shadow-xl shadow-blue-900/25">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,.15),transparent_60%)]" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Official Prize Pool Allocation
            </span>
            <h3 className="mt-3 text-4xl sm:text-5xl font-black uppercase tracking-tight">
              {effectiveTotalPrize > 0
                ? formatPrizeAmount(effectiveTotalPrize, currency || 'INR')
                : 'TBD'}{' '}
              <span className="text-xl font-bold text-blue-200">{currency || 'INR'}</span>
            </h3>
            <p className="mt-2 text-sm text-blue-100 font-medium max-w-xl">
              Official reward pool distributed across tournament podium finishes, special honours, and qualification berths.
            </p>
          </div>

          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md text-amber-300 shadow-inner border border-white/10">
            <Trophy className="h-10 w-10 drop-shadow-md" />
          </div>
        </div>
      </div>

      {berthBlockFirst && berthBlock}

      {/* Stage Selector — shown whenever the distribution spans more than one
          stage. "Total" combines them; each stage shows how that stage paid. */}
      {prizeStages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {shownResults.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedStageIdx(-1)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedStageIdx < 0
                  ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-[#0b1220] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Total</span>
            </button>
          )}
          {prizeStages.map((stage, idx) => (
            <button
              key={stage.stageName}
              type="button"
              onClick={() => setSelectedStageIdx(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedStageIdx === idx
                  ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-[#0b1220] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{stage.stageName}</span>
              {stage.allocatedPrize ? (
                <span className="text-[11px] opacity-80 font-normal">
                  ({formatPrizeAmount(stage.allocatedPrize, currency || 'INR')})
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* ============ PODIUM SPOTLIGHT (1st, 2nd, 3rd) ============ */}
      {hasDistribution && first && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 1st Place (Gold) */}
          {(() => {
            const firstNormRank = normalizeRankLabel(first.rank);
            const firstTeamMeta = getTeamMeta(first);
            const firstIsPlayer = first.recipientType === 'PLAYER' || Boolean(first.playerName);
            const firstLightLogo = firstTeamMeta?.logoUrl;
            const firstDarkLogo = firstTeamMeta?.imageDarkUrl;
            const firstTeamName = firstTeamMeta?.displayName || firstTeamMeta?.name || first.teamName;
            const firstInitial = (firstTeamName || first.playerName || '1').slice(0, 2).toUpperCase();

            return (
              <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-white p-6 shadow-md shadow-amber-400/10 dark:bg-[#0b1220] sm:order-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {firstNormRank}
                  </span>
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>

                <div className="mt-4">
                  <h4 className="text-3xl font-black text-slate-900 dark:text-white">
                    {first.prize > 0
                      ? formatPrizeAmount(first.prize, currency || 'INR')
                      : first.customReward || '1st Place'}
                  </h4>

                  {/* Team Logo & Recipient Identity */}
                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-400/30 bg-amber-50/50 p-1 dark:bg-white/5">
                      {firstLightLogo || firstDarkLogo ? (
                        <ThemeLogo
                          lightSrc={firstLightLogo}
                          darkSrc={firstDarkLogo}
                          alt={firstTeamName || first.playerName || ''}
                          className="object-contain p-0.5"
                        />
                      ) : (
                        <span className="text-[10px] font-black text-amber-800 dark:text-amber-300">
                          {firstInitial}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">
                        {firstIsPlayer ? (first.playerName || firstTeamName) : (firstTeamName || 'Champion Recipient')}
                      </p>
                      {firstIsPlayer && firstTeamName && (
                        <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {firstTeamName}
                        </p>
                      )}
                    </div>
                  </div>

                  {first.percentage != null && (
                    <p className="mt-2 text-[11px] font-bold text-slate-400">
                      {first.percentage}% of Stage Prize
                    </p>
                  )}
                </div>

                {(first.customReward ||
                  (first.qualifications && first.qualifications.length > 0)) && (
                  <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-400/10 p-2.5 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-400/20">
                    🏆 {first.customReward || (first.qualifications && first.qualifications.join(' · '))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2nd Place (Silver) */}
          {second &&
            (() => {
              const secondNormRank = normalizeRankLabel(second.rank);
              const secondTeamMeta = getTeamMeta(second);
              const secondIsPlayer = second.recipientType === 'PLAYER' || Boolean(second.playerName);
              const secondLightLogo = secondTeamMeta?.logoUrl;
              const secondDarkLogo = secondTeamMeta?.imageDarkUrl;
              const secondTeamName = secondTeamMeta?.displayName || secondTeamMeta?.name || second.teamName;
              const secondInitial = (secondTeamName || second.playerName || '2').slice(0, 2).toUpperCase();

              return (
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:order-1">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {secondNormRank}
                    </span>
                    <Medal className="h-6 w-6 text-slate-400" />
                  </div>

                  <div className="mt-4">
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white">
                      {second.prize > 0
                        ? formatPrizeAmount(second.prize, currency || 'INR')
                        : second.customReward || 'Runner-Up'}
                    </h4>

                    {/* Team Logo & Recipient Identity */}
                    <div className="mt-3 flex items-center gap-2.5">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
                        {secondLightLogo || secondDarkLogo ? (
                          <ThemeLogo
                            lightSrc={secondLightLogo}
                            darkSrc={secondDarkLogo}
                            alt={secondTeamName || second.playerName || ''}
                            className="object-contain p-0.5"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">
                            {secondInitial}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">
                          {secondIsPlayer ? (second.playerName || secondTeamName) : (secondTeamName || 'Runner-Up Recipient')}
                        </p>
                        {secondIsPlayer && secondTeamName && (
                          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {secondTeamName}
                          </p>
                        )}
                      </div>
                    </div>

                    {second.percentage != null && (
                      <p className="mt-2 text-[11px] font-bold text-slate-400">
                        {second.percentage}% of Stage Prize
                      </p>
                    )}
                  </div>

                  {(second.customReward ||
                    (second.qualifications && second.qualifications.length > 0)) && (
                    <div className="mt-4 rounded-xl bg-slate-100 dark:bg-white/5 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      🥈 {second.customReward || (second.qualifications && second.qualifications.join(' · '))}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* 3rd Place (Bronze) */}
          {third &&
            (() => {
              const thirdNormRank = normalizeRankLabel(third.rank);
              const thirdTeamMeta = getTeamMeta(third);
              const thirdIsPlayer = third.recipientType === 'PLAYER' || Boolean(third.playerName);
              const thirdLightLogo = thirdTeamMeta?.logoUrl;
              const thirdDarkLogo = thirdTeamMeta?.imageDarkUrl;
              const thirdTeamName = thirdTeamMeta?.displayName || thirdTeamMeta?.name || third.teamName;
              const thirdInitial = (thirdTeamName || third.playerName || '3').slice(0, 2).toUpperCase();

              return (
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:order-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-700/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {thirdNormRank}
                    </span>
                    <Award className="h-6 w-6 text-amber-700 dark:text-amber-500" />
                  </div>

                  <div className="mt-4">
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white">
                      {third.prize > 0
                        ? formatPrizeAmount(third.prize, currency || 'INR')
                        : third.customReward || '3rd Place'}
                    </h4>

                    {/* Team Logo & Recipient Identity */}
                    <div className="mt-3 flex items-center gap-2.5">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-700/20 bg-amber-50/30 p-1 dark:border-white/10 dark:bg-white/5">
                        {thirdLightLogo || thirdDarkLogo ? (
                          <ThemeLogo
                            lightSrc={thirdLightLogo}
                            darkSrc={thirdDarkLogo}
                            alt={thirdTeamName || third.playerName || ''}
                            className="object-contain p-0.5"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-400">
                            {thirdInitial}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">
                          {thirdIsPlayer ? (third.playerName || thirdTeamName) : (thirdTeamName || '3rd Place Recipient')}
                        </p>
                        {thirdIsPlayer && thirdTeamName && (
                          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {thirdTeamName}
                          </p>
                        )}
                      </div>
                    </div>

                    {third.percentage != null && (
                      <p className="mt-2 text-[11px] font-bold text-slate-400">
                        {third.percentage}% of Stage Prize
                      </p>
                    )}
                  </div>

                  {(third.customReward ||
                    (third.qualifications && third.qualifications.length > 0)) && (
                    <div className="mt-4 rounded-xl bg-slate-100 dark:bg-white/5 p-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      🥉 {third.customReward || (third.qualifications && third.qualifications.join(' · '))}
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      )}

      {/* ============ COMPLETE BREAKDOWN TABLE ============ */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Rank by Rank
            </p>
            <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
              Complete Prize Breakdown
              {results.length === 0 && activeStage.stageName ? ` · ${activeStage.stageName}` : ''}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Coins className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
            <span>
              {shownResults.length > 0
                ? `${resultRowCount} Team${resultRowCount === 1 ? '' : 's'} Placed`
                : `${placements.length} Allocation${placements.length === 1 ? '' : 's'} Recorded`}
            </span>
          </div>
        </div>

        {shownResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <th className="pb-3 pl-4">Rank</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3 pr-4 text-right">Amount Won</th>
                  <th className="pb-3 pl-4">Qualified Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {visibleResults.map((row) => {
                  const fallbackInitial = (row.name || 'T').slice(0, 2).toUpperCase();
                  const hasLogo = Boolean(row.logoUrl || row.logoDarkUrl);
                  // Placement reads as a bare number here; the ordinal wording
                  // ("1st Place", "Top 4") belongs to the distribution table.
                  const rankCls =
                    row.rank === 1
                      ? 'bg-amber-400 text-slate-950'
                      : row.rank === 2
                        ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                        : row.rank === 3
                          ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';

                  return (
                    <tr
                      key={row.teamId}
                      className="text-sm hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 pl-4">
                        <span
                          className={`inline-flex min-w-8 justify-center rounded-xl px-2.5 py-1 text-xs font-black ${rankCls}`}
                        >
                          {row.rank ?? '—'}
                        </span>
                      </td>

                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 p-1 shadow-xs dark:border-white/10 dark:bg-black/30">
                            {hasLogo ? (
                              <ThemeLogo
                                lightSrc={row.logoUrl ?? undefined}
                                darkSrc={row.logoDarkUrl ?? undefined}
                                alt={row.name}
                                className="object-contain p-0.5"
                              />
                            ) : (
                              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                                {fallbackInitial}
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/teams/${row.slug || encodeURIComponent(row.name)}`}
                            className="min-w-0 font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300"
                          >
                            <span className="hidden sm:inline">{row.name}</span>
                            <span className="sm:hidden uppercase tracking-wide">{row.tag || row.name}</span>
                          </Link>
                        </div>
                      </td>

                      <td className="py-4 pr-4 text-right font-black text-base text-[#0A5FC4] dark:text-blue-300">
                        {row.prizeWon && row.prizeWon > 0
                          ? formatPrizeAmount(row.prizeWon, currency || 'INR')
                          : '—'}
                      </td>

                      <td className="py-4 pl-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {row.berths.length === 0 ? (
                          '—'
                        ) : (
                          <span className="flex flex-wrap gap-1.5">
                            {row.berths.map((berth, berthIdx) =>
                              berth.tournamentSlug ? (
                                <Link
                                  key={berthIdx}
                                  href={`/tournaments/${berth.tournamentSlug}`}
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-[#0A5FC4] hover:underline dark:text-blue-300"
                                >
                                  <ShieldCheck className="h-3 w-3 shrink-0" />
                                  {berth.name}
                                </Link>
                              ) : (
                                <span
                                  key={berthIdx}
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300"
                                >
                                  {berth.name}
                                </span>
                              )
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {resultRowCount > 10 && (
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowAllResults((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] transition-colors hover:bg-[#0A5FC4]/5 dark:border-white/10 dark:text-blue-300"
            >
              {showAllResults ? 'Show top 10' : `Show all ${resultRowCount} teams`}
            </button>
          </div>
        )}

        {shownResults.length === 0 && (hasDistribution ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <th className="pb-3 pl-4">Rank</th>
                  {showRecipientColumn && <th className="pb-3">Recipient Team / Player</th>}
                  <th className="pb-3 text-center">Share</th>
                  {showRewardColumn && <th className="pb-3">Reward / Qualification</th>}
                  <th className="pb-3 pr-4 text-right">Prize Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {placements.map((row, idx) => {
                  const normalizedRank = normalizeRankLabel(row.rank);
                  // Where this position sends a team, from the rules — the row's
                  // own retired `qualifications` strings are no longer read.
                  const rowTargets = qualificationTargetsForRank(
                    qualificationRules,
                    prizeRowRange(row)?.from ?? null
                  );
                  const isGold =
                    /\b(1st|winner|champion)\b/i.test(normalizedRank) ||
                    normalizedRank.trim() === '1';
                  const isSilver =
                    /\b(2nd|runner|runners-up|runner-up)\b/i.test(normalizedRank) ||
                    normalizedRank.trim() === '2';
                  const isBronze =
                    /\b3rd\b/i.test(normalizedRank) ||
                    normalizedRank.trim() === '3';
                  const isMvp =
                    /\b(mvp|wicked)\b/i.test(normalizedRank) ||
                    row.rewardType === 'TITLE';

                  const badgeCls = isGold
                    ? 'bg-amber-400 text-slate-950'
                    : isSilver
                    ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                    : isBronze
                    ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400'
                    : isMvp
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';

                  const isPlayer = row.recipientType === 'PLAYER' || Boolean(row.playerName);
                  const teamMeta = getTeamMeta(row);
                  const lightLogo = teamMeta?.logoUrl;
                  const darkLogo = teamMeta?.imageDarkUrl;
                  const teamDisplayName = teamMeta?.displayName || teamMeta?.name || row.teamName;
                  const hasLogo = Boolean(lightLogo || darkLogo);
                  const fallbackInitial = (teamDisplayName || row.playerName || 'T').slice(0, 2).toUpperCase();

                  return (
                    <tr
                      key={idx}
                      className="text-sm hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Rank Label */}
                      <td className="py-4 pl-4 font-black">
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-black ${badgeCls}`}
                          >
                            {normalizedRank}
                          </span>
                        </span>
                      </td>

                      {/* Recipient: Team Logo + Player Name (if player) or Team Name (if team) */}
                      {showRecipientColumn && (
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          {/* Logo */}
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 p-1 shadow-xs dark:border-white/10 dark:bg-black/30">
                            {hasLogo ? (
                              <ThemeLogo
                                lightSrc={lightLogo}
                                darkSrc={darkLogo}
                                alt={teamDisplayName || row.playerName || 'Team'}
                                className="object-contain p-0.5"
                              />
                            ) : (
                              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                                {fallbackInitial}
                              </span>
                            )}
                          </div>

                          {/* Recipient Name details */}
                          <div className="min-w-0">
                            {isPlayer ? (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {row.playerName || teamDisplayName || '—'}
                                  </span>
                                  <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                    Player
                                  </span>
                                </div>
                                {teamDisplayName && (
                                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    {teamDisplayName}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-slate-900 dark:text-white">
                                {teamDisplayName || '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      )}

                      {/* Share */}
                      <td className="py-4 text-center font-bold text-slate-500 dark:text-slate-400">
                        {row.percentage != null
                          ? `${row.percentage}%`
                          : effectiveTotalPrize > 0 && row.prize > 0
                          ? `${((row.prize / effectiveTotalPrize) * 100).toFixed(1)}%`
                          : '—'}
                      </td>

                      {/* Reward / Qualifications */}
                      {showRewardColumn && (
                      <td className="py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {row.customReward ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Gift className="h-3.5 w-3.5" />
                            {row.customReward}
                          </span>
                        ) : rowTargets.length > 0 ? (
                          <span className="flex flex-wrap items-center gap-1.5">
                            {rowTargets.map((target, targetIdx) =>
                              target.tournamentSlug ? (
                                <Link
                                  key={targetIdx}
                                  href={`/tournaments/${target.tournamentSlug}`}
                                  className="inline-flex items-center gap-1 text-[#0A5FC4] hover:underline dark:text-blue-300"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                                  {target.name}
                                </Link>
                              ) : (
                                <span
                                  key={targetIdx}
                                  className="inline-flex items-center gap-1 text-[#0A5FC4] dark:text-blue-300"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                                  {target.name}
                                </span>
                              )
                            )}
                          </span>
                        ) : row.rewardType === 'TITLE' ? (
                          <span className="italic text-slate-400">Honorary Title</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      )}

                      {/* Prize Amount */}
                      <td className="py-4 pr-4 text-right font-black text-base text-[#0A5FC4] dark:text-blue-300">
                        {row.prize > 0
                          ? formatPrizeAmount(row.prize, currency || 'INR')
                          : row.rewardType === 'TITLE'
                          ? 'Title Only'
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Trophy className="mx-auto h-8 w-8 opacity-40" />
            <p className="text-sm font-semibold">
              Prize distribution has not been configured for this tournament yet.
            </p>
          </div>
        ))}
      </section>

      {/* ============ AWARDS & HONOURS ============ */}
      {/* Deliberately after the ladder and outside the row collapse: an honour must
          never be hidden behind "show all teams". */}
      {shownAwards.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600 dark:text-amber-400">
                Not part of the ladder
              </p>
              <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                Awards &amp; Honours
              </h3>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {shownAwards.length} honour{shownAwards.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shownAwards.map(({ row, stageName }, awardIdx) => {
              const isPlayerAward = row.recipientType === 'PLAYER' || Boolean(row.playerName);
              const meta = isPlayerAward ? null : getTeamMeta(row);
              const player = row.playerId ? (awardPlayerById.get(row.playerId) ?? null) : null;

              const recipient = isPlayerAward
                ? row.playerName || player?.ign || '—'
                : meta?.displayName || meta?.name || row.teamName || '—';
              const recipientHref = isPlayerAward
                ? player?.slug
                  ? `/players/${player.slug}`
                  : null
                : meta?.slug
                  ? `/teams/${meta.slug}`
                  : null;

              // One variant only, so a player's single photo shows in both themes.
              const lightImage = isPlayerAward
                ? player?.avatarUrl ?? null
                : meta?.logoUrl ?? meta?.imageDarkUrl ?? null;
              const darkImage = isPlayerAward ? null : meta?.imageDarkUrl ?? null;
              const image = lightImage || darkImage;
              const monogram = isPlayerAward
                ? (recipient.match(/[A-Za-z0-9]/)?.[0] ?? '?').toUpperCase()
                : (recipient.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '??').toUpperCase();
              const amount = Number(row.prize) || 0;

              return (
                <article
                  key={awardIdx}
                  className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 transition-shadow hover:shadow-xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-[#0b1220] dark:shadow-black/40"
                >
                  {/* The room above the square is proportional to the card, and the
                      figure's overhang is sized against it, so the card's own
                      rounded clipping can never crop the head. */}
                  <div className="relative px-[10%] pt-[16%]">
                    {/* The square the recipient rises out of. */}
                    <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-3xl bg-slate-100 shadow-inner dark:bg-white/[0.05]">
                      {/* Site-blue texture, woven a little differently per card so a
                          row of honours is not the same tile repeated. Quiet on
                          purpose: it sits behind a face, not in front of one. */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `radial-gradient(circle at 32% 20%, rgba(10,95,196,0.28), transparent 64%), repeating-linear-gradient(${125 + awardIdx * 25}deg, rgba(10,95,196,0.14) 0 9px, transparent 9px 20px)`,
                        }}
                      />
                      {!image && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span
                            aria-hidden="true"
                            className="select-none text-6xl font-black tracking-tight text-slate-500/80 dark:text-white/35"
                          >
                            {monogram}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* The recipient, breaking past the top edge of the square.
                        `cover` from the top is what makes it a head rising out rather
                        than a photo shrunk to fit inside. */}
                    {image && (
                      <div
                        className={
                          isPlayerAward
                            ? 'pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[114%] w-[80%] drop-shadow-[0_18px_24px_rgba(2,10,30,0.5)]'
                            : 'pointer-events-none absolute inset-0 flex items-center justify-center p-6 drop-shadow-[0_14px_20px_rgba(2,10,30,0.45)]'
                        }
                      >
                        <ThemeLogo
                          lightSrc={lightImage}
                          darkSrc={darkImage}
                          alt={recipient}
                          className={isPlayerAward ? 'object-cover object-top' : 'object-contain'}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5 pt-6">
                    <h4 className="text-lg font-black leading-tight tracking-tight text-amber-600 dark:text-amber-400">
                      {row.rank}
                    </h4>

                    {recipientHref ? (
                      <Link
                        href={recipientHref}
                        className="mt-1 w-fit text-sm font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300"
                      >
                        {recipient}
                      </Link>
                    ) : (
                      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{recipient}</p>
                    )}

                    {prizeStages.length > 1 && stageName && (
                      <p className="mt-0.5 text-[10px] font-bold text-slate-400">{stageName}</p>
                    )}

                    {/* Money and a physical prize are different things, so they do not
                        get the same treatment. */}
                    {amount > 0 ? (
                      <p className="mt-auto pt-3 text-base font-black text-[#0A5FC4] dark:text-blue-300">
                        {formatPrizeAmount(amount, currency || 'INR')}
                      </p>
                    ) : row.customReward ? (
                      <p className="mt-auto pt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                        {row.customReward}
                      </p>
                    ) : (
                      <p className="mt-auto pt-3 text-xs font-semibold text-slate-400">
                        {row.rewardType === 'TITLE' ? 'Honorary title' : '—'}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!berthBlockFirst && berthBlock}
    </div>
  );
}
