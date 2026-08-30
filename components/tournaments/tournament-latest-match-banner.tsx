'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Swords,
  Clock,
  Shield,
  ChevronRight,
  Tv,
  Target,
  Sparkles,
} from 'lucide-react';

interface LatestMatchProps {
  match?: {
    id: string;
    matchNumber: number | null;
    overallMatchNumber: number | null;
    format: string;
    mapName: string;
    stageType?: string | null;
    stage?: { name: string } | null;
    matchTime?: string | null;
    streamUrl?: string | null;
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
  tournamentSlug: string;
}

export function TournamentLatestMatchBanner({ match, tournamentSlug }: LatestMatchProps) {
  if (!match) return null;

  const game = match.games?.[0];
  if (!game) return null;

  const winner = game.teamResults?.find((tr) => tr.rank === 1 || tr.wwcd);
  const mvp = game.playerStats?.find((ps) => ps.isMvp) || game.playerStats?.[0];

  if (!winner) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-transparent dark:to-transparent bg-white dark:bg-[#0c101d] p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Latest Match Meta & Winner Team */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                Latest Match Winner (WWCD)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Match #{match.matchNumber ?? 1} · {match.mapName} · {match.stage?.name || match.stageType || 'Finals'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 mt-1.5 min-w-0">
              {winner.team?.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={winner.team.logoUrl}
                  alt={winner.team.name}
                  className="w-6 h-6 object-contain rounded shrink-0"
                />
              )}
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {winner.team.name}
              </span>
              {winner.team.tag && (
                <span className="text-xs font-mono text-slate-400 shrink-0">
                  [{winner.team.tag}]
                </span>
              )}
              <div className="flex items-center gap-2 text-xs font-mono shrink-0 ml-1">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                  {winner.totalPoints} PTS
                </span>
                <span className="text-slate-500 hidden sm:inline">
                  ({winner.placePoints} Place + {winner.elimsPoints} Elims)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Match MVP & Action Button */}
        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-amber-500/20">
          {mvp && (
            <div className="flex items-center gap-2.5 pr-2">
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                  <Flame className="w-3 h-3" /> Match MVP
                </span>
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {mvp.player.ign}
                </div>
              </div>
              <div className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-right">
                <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-400">
                  {mvp.playerElims}K
                </span>
                <span className="text-[9px] text-slate-400 block -mt-1">{mvp.damage} dmg</span>
              </div>
            </div>
          )}

          <Link
            href={`/tournaments/${tournamentSlug}?tab=matches`}
            className="px-3.5 py-1.5 rounded-lg bg-[#0A5FC4] hover:bg-[#084c9e] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>All Matches</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
