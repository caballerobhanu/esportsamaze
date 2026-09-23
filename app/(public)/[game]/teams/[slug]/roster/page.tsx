import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamRosterPanel } from '@/components/teams/team-roster-panel';
import { TeamTabShell } from '@/components/teams/team-tab-shell';
import { TabIntro } from '@/components/seo/tab-intro';
import { teamRosterIntro } from '@/lib/entity-intros';
import { buildPlayerSlugMaps, collectLineupPlayerIds } from '@/lib/team-roster';
import {
  loadLineupPlayers,
  loadTeamContext,
  loadTeamRosterMetrics,
  teamMetadata,
} from '@/lib/team-data';

export const dynamic = 'force-dynamic';

interface TeamRosterPageProps {
  params: Promise<{ game: string; slug: string }>;
}

export async function generateMetadata({ params }: TeamRosterPageProps): Promise<Metadata> {
  const { game, slug } = await params;
  return teamMetadata(slug, 'roster', game);
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

  const { playerIdToSlug } = buildPlayerSlugMaps(
    team.players,
    team.transfers.map((transfer) => transfer.player),
    lineupPlayers,
  );

  const intro = teamRosterIntro({
    name: team.name,
    players: team.players.filter((player) => player.isPlayer).length,
    staff: team.players.filter((player) => player.staffRole && player.isPlayer).length,
    events: team.tournaments.length,
  });

  return (
    <TeamTabShell team={team} activeTab="roster">
      <TabIntro text={intro} />
      <TeamRosterPanel team={team} metrics={metrics} playerIdToSlug={playerIdToSlug} />
    </TeamTabShell>
  );
}
