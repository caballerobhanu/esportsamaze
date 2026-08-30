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
import {
  TournamentCompletedMatchesBento,
  TournamentUpcomingMatchesBento,
} from './tournament-bento-matches';
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
  // Determine admin-picked stage (venue stage identifier or latest finals stage)
  const adminPickedStage = React.useMemo(() => {
    const venueStage = tournament.venues?.[0]?.stageName?.trim();
    if (venueStage) return venueStage;
    const grandFinals = stagesData.find((s) => s.stageName.toLowerCase().includes('final'));
    if (grandFinals) return grandFinals.stageName;
    return stagesData[0]?.stageName || 'Grand Finals';
  }, [tournament, stagesData]);

  // Upcoming scheduled matches
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
          1. TOP BENTO HERO OVERVIEW (NO LAST MATCH RESULT)
      ═══════════════════════════════════════════════════════════ */}
      <TournamentBentoHero
        tournament={tournament}
        activeStageName={adminPickedStage}
      />

      {/* ═══════════════════════════════════════════════════════════
          2. UPCOMING MATCHES DEDICATED BENTO SECTION (IF ANY)
      ═══════════════════════════════════════════════════════════ */}
      <TournamentUpcomingMatchesBento
        matches={tournament.matches}
        tournamentSlug={tournament.slug}
        limit={3}
      />

      {/* ═══════════════════════════════════════════════════════════
          3. RECENT COMPLETED MATCHES (IN REVERSE CHRONOLOGICAL ORDER)
      ═══════════════════════════════════════════════════════════ */}
      <TournamentCompletedMatchesBento
        matches={tournament.matches}
        tournamentSlug={tournament.slug}
        limit={6}
      />

      {/* ═══════════════════════════════════════════════════════════
          4. BOTTOM BENTO ROW (SINGLE ADMIN-PICKED STAGE STANDINGS + SIDEBAR)
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Single Admin-Picked Stage Standings Bento Card */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#0A5FC4]" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                {adminPickedStage} Standings
              </h3>
            </div>
            <Link
              href={`/tournaments/${tournament.slug}?tab=standings`}
              className="text-xs font-bold text-[#0A5FC4] hover:underline flex items-center gap-0.5"
            >
              <span>Explore All Stages</span>
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
            singleStageOnly={true}
            initialStageName={adminPickedStage}
          />
        </div>

        {/* Right 4 Cols: MVP Fragger Race, Venue & Community Sidebar */}
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
