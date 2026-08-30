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
import { TournamentBentoHero } from './tournament-bento-hero';
import { TournamentBentoMatches } from './tournament-bento-matches';
import { TournamentStageStandings, StageMatchData } from './tournament-stage-standings';
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
  const latestCompletedMatch = completedMatches[completedMatches.length - 1] || tournament.matches[0] || null;

  // Find upcoming scheduled matches
  const upcomingMatches = tournament.matches.filter((m: any) => m.status !== 'COMPLETED');

  // Top Prize ranks for sidebar
  const rawPrizeDist = tournament.prizeDistribution as any;
  const prizeRanks = Array.isArray(rawPrizeDist)
    ? rawPrizeDist
    : Array.isArray(rawPrizeDist?.stages)
    ? rawPrizeDist.stages[0]?.ranks || []
    : [];

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════
          1. TOP BENTO HERO SHOWCASE ROW
      ═══════════════════════════════════════════════════════════ */}
      <TournamentBentoHero
        tournament={tournament}
        latestMatch={latestCompletedMatch}
        topFragger={overallTopFragger}
      />

      {/* ═══════════════════════════════════════════════════════════
          2. MIDDLE MODULAR BENTO MATCH CARDS ROW
      ═══════════════════════════════════════════════════════════ */}
      {tournament.matches.length > 0 && (
        <TournamentBentoMatches
          matches={tournament.matches}
          tournamentSlug={tournament.slug}
          limit={6}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          3. BOTTOM BENTO ROW (STANDINGS SCOREBOARD + SIDEBAR STATS)
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Interactive Stage Standings Bento Card */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#0A5FC4]" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                Championship Stage Standings
              </h3>
            </div>
            <Link
              href={`/tournaments/${tournament.slug}?tab=standings`}
              className="text-xs font-bold text-[#0A5FC4] hover:underline flex items-center gap-0.5"
            >
              <span>Full Standings View</span>
              <ChevronRight className="w-3.5 h-3.5" />
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

        {/* Right 4 Cols: Event Facts, MVP Race, Venue & Community Sidebar */}
        <div className="lg:col-span-4">
          <TournamentSidebarInfo
            tournament={tournament}
            topFraggers={overallFraggers}
            upcomingMatches={upcomingMatches}
            prizeTopRanks={prizeRanks.slice(0, 3)}
          />
        </div>
      </div>
    </div>
  );
}
