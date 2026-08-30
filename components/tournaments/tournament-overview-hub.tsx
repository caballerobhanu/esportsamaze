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
  // Determine the featured stage (explicit admin setting in formatDetails, or auto-detected most recent stage by match timestamp)
  const mostRecentStage = React.useMemo(() => {
    const explicitStage = tournament.formatDetails?.featuredStage?.trim();
    if (explicitStage && stagesData.some((s) => s.stageName.toLowerCase() === explicitStage.toLowerCase())) {
      const match = stagesData.find((s) => s.stageName.toLowerCase() === explicitStage.toLowerCase());
      if (match) return match.stageName;
    }

    // Find the stage containing the most recent match by date and time
    let latestMatchTime = -1;
    let latestStageName = '';

    for (const stg of stagesData) {
      for (const m of stg.matches) {
        let t = 0;
        if (m.scheduledAt) {
          const d = new Date(m.scheduledAt);
          if (!isNaN(d.getTime())) t = d.getTime();
        }
        if (m.matchTime && typeof m.matchTime === 'string' && m.matchTime.includes(':')) {
          const parts = m.matchTime.split(':');
          const d = new Date(t);
          d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
          t = d.getTime();
        }
        if (t > latestMatchTime) {
          latestMatchTime = t;
          latestStageName = stg.stageName;
        }
      }
    }

    if (latestStageName) return latestStageName;

    const grandFinals = stagesData.find((s) => s.stageName.toLowerCase().includes('final'));
    if (grandFinals) return grandFinals.stageName;
    return stagesData[stagesData.length - 1]?.stageName || stagesData[0]?.stageName || 'Grand Finals';
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
        activeStageName={mostRecentStage}
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
          4. BOTTOM BENTO ROW (SINGLE MOST RECENT STAGE STANDINGS + SIDEBAR)
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Single Most Recent Stage Standings Bento Card */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#0A5FC4]" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                {mostRecentStage} Standings
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
            initialStageName={mostRecentStage}
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
