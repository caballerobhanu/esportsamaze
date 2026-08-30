'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Shield,
  Swords,
  Layers,
  Users,
  ChevronRight,
  Flame,
  Clock,
  Tv,
} from 'lucide-react';
import { TournamentStageStandings, StageMatchData } from './tournament-stage-standings';
import { TournamentLatestMatchBanner } from './tournament-latest-match-banner';
import { TournamentSidebarInfo } from './tournament-sidebar-info';
import { AggregatedTeamStanding } from '@/lib/tournament-math';

interface TournamentOverviewHubProps {
  tournament: any;
  stagesData: StageMatchData[];
  overallStandings: AggregatedTeamStanding[];
  overallTopFragger?: any;
  overallFraggers: any[];
  pointsMatrix?: Record<string, number>;
  killMultiplier?: number;
}

export function TournamentOverviewHub({
  tournament,
  stagesData,
  overallStandings,
  overallTopFragger,
  overallFraggers,
  pointsMatrix,
  killMultiplier = 1,
}: TournamentOverviewHubProps) {
  // Find the most recently completed match
  const completedMatches = tournament.matches.filter((m: any) => m.status === 'COMPLETED');
  const latestCompletedMatch = completedMatches[completedMatches.length - 1] || null;

  // Find upcoming scheduled matches
  const upcomingMatches = tournament.matches.filter((m: any) => m.status !== 'COMPLETED');

  // Top 3 Prize ranks for sidebar
  const rawPrizeDist = tournament.prizeDistribution as any;
  const prizeRanks = Array.isArray(rawPrizeDist)
    ? rawPrizeDist
    : Array.isArray(rawPrizeDist?.stages)
    ? rawPrizeDist.stages[0]?.ranks || []
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ═══════════════════════════════════════════════════════════
          MAIN CENTER COLUMN (70% - Col span 8)
      ═══════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-8 space-y-6">
        {/* 1. Latest Match WWCD Banner */}
        {latestCompletedMatch && (
          <TournamentLatestMatchBanner
            match={latestCompletedMatch}
            tournamentSlug={tournament.slug}
          />
        )}

        {/* 2. Interactive Stage Standings Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#0A5FC4]" />
              <span>Championship Standings</span>
            </h2>
            <Link
              href={`/tournaments/${tournament.slug}?tab=standings`}
              className="text-xs font-bold text-[#0A5FC4] hover:underline flex items-center gap-0.5"
            >
              <span>Full Standings View</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <TournamentStageStandings
            stagesData={stagesData}
            overallStandings={overallStandings}
            overallTopFragger={overallTopFragger}
            tournamentName={tournament.name}
            pointsMatrix={pointsMatrix}
            killMultiplier={killMultiplier}
            qualifyCount={16}
          />
        </div>

        {/* 3. Quick Matches Strip */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-[#0A5FC4]" />
              <span>Recent Match Results &amp; Schedule</span>
            </h3>
            <Link
              href={`/tournaments/${tournament.slug}?tab=matches`}
              className="text-xs font-bold text-[#0A5FC4] hover:underline flex items-center"
            >
              Browse All ({tournament.matches.length}) →
            </Link>
          </div>

          <div className="space-y-2">
            {tournament.matches.slice(0, 4).map((m: any) => {
              const mg = m.games?.[0];
              const winner = mg?.teamResults?.find((tr: any) => tr.rank === 1 || tr.wwcd);
              const isDone = m.status === 'COMPLETED';

              return (
                <div
                  key={m.id}
                  className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080d17] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-black text-[#0A5FC4] w-8 shrink-0">
                      #{m.matchNumber ?? 1}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                      {m.mapName}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {m.format}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDone && winner ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                        <span>WWCD: {winner.team?.name}</span>
                        <span className="font-mono">({winner.totalPoints} pts)</span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                        {m.matchTime || 'Scheduled'}
                      </span>
                    )}

                    <Link
                      href={`/tournaments/${tournament.slug}?tab=matches`}
                      className="px-2 py-0.8 rounded text-[11px] font-bold border border-slate-200 dark:border-slate-700 hover:border-[#0A5FC4] text-slate-700 dark:text-slate-300"
                    >
                      Scorecard
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Stage Progression Roadmap Preview */}
        {tournament.stages && tournament.stages.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0A5FC4]" />
                <span>Tournament Stages Progression</span>
              </h3>
              <Link
                href={`/tournaments/${tournament.slug}?tab=format`}
                className="text-xs font-bold text-[#0A5FC4] hover:underline"
              >
                Format &amp; Rules →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tournament.stages.map((stg: any, idx: number) => (
                <div
                  key={stg.id || idx}
                  className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-[#0A5FC4]">
                      PHASE 0{idx + 1}
                    </span>
                    {idx === tournament.stages.length - 1 && (
                      <span className="text-[9px] font-bold uppercase px-1.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        Finals
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{stg.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {stg.description || 'Contenders compete across match days for qualification.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          RIGHT SIDEBAR COLUMN (30% - Col span 4)
      ═══════════════════════════════════════════════════════════ */}
      <div className="lg:col-span-4">
        <TournamentSidebarInfo
          tournament={tournament}
          topFraggers={overallFraggers}
          upcomingMatches={upcomingMatches}
          prizeTopRanks={prizeRanks}
        />
      </div>
    </div>
  );
}
