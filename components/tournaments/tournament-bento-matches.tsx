'use client';

import React from 'react';
import Link from 'next/link';
import {
  Swords,
  Clock,
  ChevronRight,
  Tv,
  Trophy,
  Shield,
  Flame,
} from 'lucide-react';

interface BentoMatchItem {
  id: string;
  matchNumber: number | null;
  format: string;
  mapName?: string | null;
  stageType?: string | null;
  stage?: { name: string } | null;
  scheduledAt: Date | string;
  matchTime?: string | null;
  streamUrl?: string | null;
  status: string;
  games: Array<{
    teamResults: Array<{
      rank: number;
      wwcd: boolean;
      placePoints: number;
      elimsPoints: number;
      totalPoints: number;
      team: {
        id: string;
        name: string;
        tag?: string | null;
        logoUrl?: string | null;
      };
    }>;
  }>;
}

interface TournamentBentoMatchesProps {
  matches: BentoMatchItem[];
  tournamentSlug: string;
  limit?: number;
}

export function TournamentBentoMatches({
  matches,
  tournamentSlug,
  limit = 6,
}: TournamentBentoMatchesProps) {
  const displayMatches = matches.slice(0, limit);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-[#0A5FC4]" />
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            Matches &amp; Schedule
          </h3>
        </div>
        <Link
          href={`/tournaments/${tournamentSlug}?tab=matches`}
          className="text-xs font-bold text-[#0A5FC4] hover:underline flex items-center gap-0.5"
        >
          <span>All Matches ({matches.length})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayMatches.map((m) => {
          const game = m.games?.[0];
          const winner = game?.teamResults?.find((tr) => tr.rank === 1 || tr.wwcd);
          const second = game?.teamResults?.find((tr) => tr.rank === 2);
          const isCompleted = m.status === 'COMPLETED';
          const isLive = m.status === 'LIVE';

          return (
            <div
              key={m.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              {/* Top Bar: Match #, Map & Time */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 font-mono font-bold text-xs">
                    #{m.matchNumber ?? 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {m.mapName || 'Erangel'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {m.matchTime || '14:30'}
                  </span>
                  <span className="text-[10px] text-slate-400 block -mt-0.5">
                    {m.stage?.name || m.stageType || 'Stage'}
                  </span>
                </div>
              </div>

              {/* Middle: Contenders & Scorecards */}
              <div className="space-y-2.5">
                {winner ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 min-w-0">
                      {winner.team?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={winner.team.logoUrl}
                          alt=""
                          className="w-5 h-5 object-contain rounded shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center font-bold text-[9px] text-amber-700 dark:text-amber-300">
                          #1
                        </div>
                      )}
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {winner.team?.name}
                      </span>
                    </div>
                    <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                      {winner.totalPoints} PTS
                    </span>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 font-medium">
                    {m.format}
                  </div>
                )}

                {second && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      {second.team?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={second.team.logoUrl}
                          alt=""
                          className="w-5 h-5 object-contain rounded shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-500">
                          #2
                        </div>
                      )}
                      <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 truncate">
                        {second.team?.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-500">
                      {second.totalPoints} PTS
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom: Match Status & Scorecard Link */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {isCompleted ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase">
                    Concluded
                  </span>
                ) : isLive ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold text-[10px] uppercase animate-pulse">
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">Scheduled</span>
                )}

                <Link
                  href={`/tournaments/${tournamentSlug}?tab=matches`}
                  className="font-bold text-[#0A5FC4] hover:underline flex items-center gap-0.5"
                >
                  <span>Scorecard</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
