import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamStatsPanel } from '@/components/teams/team-stats-panel';
import { TeamTabShell } from '@/components/teams/team-tab-shell';
import {
  loadRelatedTeams,
  loadTeamContext,
  loadTeamHeadToHead,
  loadTeamMapStats,
  loadTeamMatchSummary,
  loadTeamTournamentStats,
  teamMetadata,
} from '@/lib/team-data';

export const dynamic = 'force-dynamic';

interface TeamStatsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TeamStatsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return teamMetadata(slug, 'Stats');
}

export default async function TeamStatsPage({ params }: TeamStatsPageProps) {
  const { slug } = await params;

  const team = await loadTeamContext(slug);
  if (!team) notFound();

  const [matchSummary, tournaments, tournamentsGF, maps, headToHead, related] = await Promise.all([
    loadTeamMatchSummary(team.id),
    loadTeamTournamentStats(team.id, false),
    loadTeamTournamentStats(team.id, true),
    loadTeamMapStats(team.id),
    loadTeamHeadToHead(team.id),
    loadRelatedTeams(team.id, team.gameId, team.region),
  ]);

  return (
    <TeamTabShell team={team} activeTab="stats">
      <TeamStatsPanel
        team={team}
        matchSummary={matchSummary}
        tournaments={tournaments}
        tournamentsGF={tournamentsGF}
        maps={maps}
        headToHead={headToHead}
        related={related}
      />
    </TeamTabShell>
  );
}
