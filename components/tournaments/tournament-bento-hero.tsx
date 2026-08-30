'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Swords,
  Clock,
  Tv,
  Shield,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  Zap,
} from 'lucide-react';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';

interface BentoHeroProps {
  tournament: {
    id: string;
    name: string;
    slug: string;
    tier: string;
    prizePool?: number | null;
    currency: string;
    usdRate?: number | null;
    game: { name: string };
    venues?: Array<{ venue: { name: string; city?: string | null; country?: string | null } }>;
    device?: string | null;
  };
  latestMatch?: {
    id: string;
    matchNumber: number | null;
    format: string;
    mapName: string;
    scheduledAt: Date | string;
    matchTime?: string | null;
    streamUrl?: string | null;
    stage?: { name: string } | null;
    stageType?: string | null;
    games: Array<{
      teamResults: Array<{
        rank: number;
        wwcd: boolean;
        placePoints: number;
        elimsPoints: number;
        totalPoints: number;
        damage: number;
        team: {
          id: string;
          name: string;
          tag?: string | null;
          logoUrl?: string | null;
        };
      }>;
      playerStats: Array<{
        playerElims: number;
        damage: number;
        isMvp: boolean;
        player: { ign: string; avatarUrl?: string | null };
        team: { name: string; tag?: string | null };
      }>;
    }>;
  } | null;
  topFragger?: {
    playerId: string;
    ign: string;
    teamName: string;
    tag?: string | null;
    avatarUrl?: string | null;
    kills: number;
    damage: number;
  } | null;
}

export function TournamentBentoHero({
  tournament,
  latestMatch,
  topFragger,
}: BentoHeroProps) {
  const game = latestMatch?.games?.[0];
  const winner = game?.teamResults?.find((tr) => tr.rank === 1 || tr.wwcd);
  const runnerUp = game?.teamResults?.find((tr) => tr.rank === 2);
  const mvp = game?.playerStats?.find((ps) => ps.isMvp) || game?.playerStats?.[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ═══ 1. LARGE FEATURED MATCH SPOTLIGHT BENTO CARD (8 COLS) ═══ */}
      <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/15 rounded-full blur-3xl pointer-events-none" />

        <div>
          {/* Top meta strip */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>
                  {latestMatch?.stage?.name || latestMatch?.stageType || 'Championship Series'}
                </span>
              </span>
              <span className="px-2 py-0.8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                {latestMatch?.mapName || 'Erangel'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Match #{latestMatch?.matchNumber ?? 1}
              </span>
            </div>

            <div className="text-right">
              <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                {latestMatch?.matchTime || '23:30'}
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                {latestMatch?.scheduledAt
                  ? typeof latestMatch.scheduledAt === 'string'
                    ? latestMatch.scheduledAt.slice(0, 10)
                    : latestMatch.scheduledAt.toISOString().slice(0, 10)
                  : 'Grand Final Stage'}
              </span>
            </div>
          </div>

          {/* Main Contestant Clash Area */}
          <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Match Showcase · Winner Spotlight
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {winner ? winner.team.name : tournament.name}
              </h3>
              {runnerUp && (
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Runner Up: <span className="text-slate-800 dark:text-slate-200">{runnerUp.team.name}</span>
                </p>
              )}

              {/* Performance tags */}
              {winner && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs">
                    WWCD #{winner.rank}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs">
                    {winner.totalPoints} Total PTS
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono font-bold text-xs">
                    {winner.elimsPoints} Elims
                  </span>
                </div>
              )}
            </div>

            {/* Right MVP Spotlight Feature Box */}
            {mvp && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 shrink-0 min-w-[200px] space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> Match MVP
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white">
                    TOP
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0">
                    {mvp.player.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mvp.player.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Flame className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {mvp.player.ign}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{mvp.team?.name}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <span className="font-black text-rose-600 dark:text-rose-400">
                    {mvp.playerElims} Elims
                  </span>
                  <span className="text-slate-500">{mvp.damage} dmg</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 font-medium hidden sm:inline">
            Official 10-Point BR Placement Scoring · Krafton Protocol
          </span>
          <Link
            href={`/tournaments/${tournament.slug}?tab=matches`}
            className="px-4 py-2 rounded-xl bg-[#0A5FC4] hover:bg-[#084c9e] text-white font-bold transition-colors flex items-center gap-2 shadow-xs ml-auto sm:ml-0"
          >
            <span>View Full Scorecard</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ═══ 2. TOURNAMENT OVERVIEW STATS BENTO CARD (4 COLS) ═══ */}
      <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-6 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Event Overview
            </span>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {tournament.tier} Tier
            </span>
          </div>

          <div className="mt-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Prize Pool
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              <PrizePoolBadge
                amount={tournament.prizePool}
                currency={tournament.currency}
                usdRate={tournament.usdRate}
              />
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Game Title</span>
              <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                {tournament.game.name}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block">Tournament Device</span>
              <span className="font-extrabold text-[#0A5FC4] dark:text-blue-400 truncate block">
                {tournament.device || 'Official Flagship'}
              </span>
            </div>
          </div>
        </div>

        {/* Location info footer */}
        {tournament.venues && tournament.venues.length > 0 && tournament.venues[0]?.venue && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block">Venue / Location</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">
                {tournament.venues[0].venue.name}
              </span>
            </div>
            <MapPin className="w-4 h-4 text-[#0A5FC4] shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}
