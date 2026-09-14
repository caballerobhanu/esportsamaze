import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamRosterPanel } from '@/components/teams/team-roster-panel';
import { TeamTabShell } from '@/components/teams/team-tab-shell';
import { buildPlayerSlugMaps, collectLineupPlayerIds } from '@/lib/team-roster';
import {
  loadLineupPlayers,
  loadTeamContext,
  loadTeamRosterMetrics,
  teamMetadata,
} from '@/lib/team-data';

export const dynamic = 'force-dynamic';

interface TeamRosterPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TeamRosterPageProps): Promise<Metadata> {
  const { slug } = await params;
  return teamMetadata(slug, 'Roster');
}

export default async function TeamRosterPage({ params }: TeamRosterPageProps) {
  const { slug } = await params;

  const team = await loadTeamContext(slug);
  if (!team) notFound();

  const lineupPlayerIds = collectLineupPlayerIds(team.tournaments.map((event) => event.rosterJson));

  const [metrics, lineupPlayers] = await Promise.all([
    loadTeamRosterMetrics(team.id),
    loadLineupPlayers(lineupPlayerIds),
  ]);

  const { playerIdToSlug, ignToSlug } = buildPlayerSlugMaps(
    team.players,
    team.transfers.map((transfer) => transfer.player),
    lineupPlayers,
  );

  return (
    <TeamTabShell team={team} activeTab="roster">
      <TeamRosterPanel
        team={team}
        metrics={metrics}
        playerIdToSlug={playerIdToSlug}
        ignToSlug={ignToSlug}
      />
    </TeamTabShell>
  );
}
