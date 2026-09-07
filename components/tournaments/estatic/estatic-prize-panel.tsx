'use client';

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
  qualifications?: Array<{
    place: string;
    events: Array<string | { name: string }>;
    description?: string;
  }>;
  teams?: any[];
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
  qualifications = [],
  teams = [],
}: EstaticPrizePanelProps) {
  const [selectedStageIdx, setSelectedStageIdx] = React.useState(0);

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

  const activeStage = prizeStages[selectedStageIdx] || prizeStages[0] || {
    stageName: 'Prize Pool',
    ranks: [],
  };
  const ranks = activeStage.ranks || [];

  // Identify podium ranks
  const first =
    ranks.find((r) => {
      const norm = normalizeRankLabel(r.rank).toLowerCase();
      return norm.includes('1st') || norm.includes('winner') || norm === '1';
    }) || ranks[0];

  const second =
    ranks.find((r) => {
      const norm = normalizeRankLabel(r.rank).toLowerCase();
      return (
        (norm.includes('2nd') || norm.includes('runner') || norm === '2') &&
        r !== first
      );
    }) || (ranks[1] !== first ? ranks[1] : undefined);

  const third =
    ranks.find((r) => {
      const norm = normalizeRankLabel(r.rank).toLowerCase();
      return (norm.includes('3rd') || norm === '3') && r !== first && r !== second;
    }) || (ranks[2] !== first && ranks[2] !== second ? ranks[2] : undefined);

  const hasDistribution = ranks.length > 0;

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

      {/* Stage Selector (if multi-stage prize pool) */}
      {prizeStages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
              Complete Prize Breakdown {activeStage.stageName ? `· ${activeStage.stageName}` : ''}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Coins className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
            <span>
              {ranks.length} Allocation{ranks.length === 1 ? '' : 's'} Recorded
            </span>
          </div>
        </div>

        {hasDistribution ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <th className="pb-3 pl-4">Rank / Title</th>
                  <th className="pb-3">Recipient Team / Player</th>
                  <th className="pb-3 text-center">Share</th>
                  <th className="pb-3">Reward / Qualifications</th>
                  <th className="pb-3 pr-4 text-right">Prize Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {ranks.map((row, idx) => {
                  const normalizedRank = normalizeRankLabel(row.rank);
                  const lowerRank = normalizedRank.toLowerCase();
                  const isGold =
                    lowerRank.includes('1st') ||
                    lowerRank.includes('winner') ||
                    lowerRank === '1';
                  const isSilver =
                    lowerRank.includes('2nd') ||
                    lowerRank.includes('runner') ||
                    lowerRank === '2';
                  const isBronze =
                    lowerRank.includes('3rd') || lowerRank === '3';
                  const isMvp =
                    lowerRank.includes('mvp') ||
                    lowerRank.includes('wicked') ||
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

                      {/* Share */}
                      <td className="py-4 text-center font-bold text-slate-500 dark:text-slate-400">
                        {row.percentage != null
                          ? `${row.percentage}%`
                          : effectiveTotalPrize > 0 && row.prize > 0
                          ? `${((row.prize / effectiveTotalPrize) * 100).toFixed(1)}%`
                          : '—'}
                      </td>

                      {/* Reward / Qualifications */}
                      <td className="py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {row.customReward ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Gift className="h-3.5 w-3.5" />
                            {row.customReward}
                          </span>
                        ) : row.qualifications && row.qualifications.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#0A5FC4] dark:text-blue-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {row.qualifications.join(', ')}
                          </span>
                        ) : row.rewardType === 'TITLE' ? (
                          <span className="italic text-slate-400">Honorary Title</span>
                        ) : (
                          '—'
                        )}
                      </td>

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
        )}
      </section>

      {/* ============ QUALIFICATION SLOTS ============ */}
      {qualifications.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Advancement Path
            </p>
            <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
              Official Qualification Berths
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {qualifications.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 space-y-1"
              >
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                  {normalizeRankLabel(q.place)}
                </span>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  {Array.isArray(q.events)
                    ? q.events
                        .map((e) => (typeof e === 'string' ? e : e?.name))
                        .join(', ')
                    : 'Target Event'}
                </p>
                {q.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {q.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
