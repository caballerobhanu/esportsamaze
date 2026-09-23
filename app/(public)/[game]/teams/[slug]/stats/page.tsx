import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamStatsPanel } from '@/components/teams/team-stats-panel';
import { TeamTabShell } from '@/components/teams/team-tab-shell';
import { TabIntro } from '@/components/seo/tab-intro';
import { teamStatsIntro } from '@/lib/entity-intros';
import {
  loadRelatedTeams,
  loadTeamContext,
  loadTeamEventMetrics,
  loadTeamHeadToHead,
  loadTeamMapStats,
  loadTeamMatchSummary,
  loadTeamTournamentStats,
  teamMetadata,
} from '@/lib/team-data';

export const dynamic = 'force-dynamic';

interface TeamStatsPageProps {
  params: Promise<{ game: string; slug: string }>;
}

export async function generateMetadata({ params }: TeamStatsPageProps): Promise<Metadata> {
  const { game, slug } = await params;
  return teamMetadata(slug, 'stats', game);
}

export default async function TeamStatsPage({ params }: TeamStatsPageProps) {
  const { slug } = await params;

  const team = await loadTeamContext(slug);
  if (!team) notFound();

  const [matchSummary, tournaments, tournamentsGF, maps, headToHead, related, eventMetrics] = await Promise.all([
    loadTeamMatchSummary(team.id),
    loadTeamTournamentStats(team.id, false),
    loadTeamTournamentStats(team.id, true),
    loadTeamMapStats(team.id),
    loadTeamHeadToHead(team.id),
    loadRelatedTeams(team.id, team.gameId, team.region),
    loadTeamEventMetrics(team.id),
  ]);

  const summary = matchSummary.summary;
  const intro = teamStatsIntro({
    name: team.name,
    matches: summary.matches,
    wins: summary.wins,
    topFive: Math.round((summary.topFiveRate ?? 0) * summary.matches),
    events: team.tournaments.length,
  });

  return (
    <TeamTabShell team={team} activeTab="stats">
      <TabIntro text={intro} />
      <TeamStatsPanel
        team={team}
        matchSummary={matchSummary}
        tournaments={tournaments}
        tournamentsGF={tournamentsGF}
        maps={maps}
        headToHead={headToHead}
        related={related}
        eventMetrics={eventMetrics}
      />
    </TeamTabShell>
  );
}
