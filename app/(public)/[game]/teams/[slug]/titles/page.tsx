import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamTabShell } from '@/components/teams/team-tab-shell';
import { TeamTitlesPanel } from '@/components/teams/team-titles-panel';
import { TabIntro } from '@/components/seo/tab-intro';
import { teamTitlesIntro } from '@/lib/entity-intros';
import { collectTeamAwards } from '@/lib/team-awards';
import { buildPlayerSlugMaps, collectLineupPlayerIds } from '@/lib/team-roster';
import { loadLineupPlayers, loadTeamContext, teamMetadata } from '@/lib/team-data';

export const dynamic = 'force-dynamic';

interface TeamTitlesPageProps {
  params: Promise<{ game: string; slug: string }>;
}

export async function generateMetadata({ params }: TeamTitlesPageProps): Promise<Metadata> {
  const { game, slug } = await params;
  return teamMetadata(slug, 'titles', game);
}

export default async function TeamTitlesPage({ params }: TeamTitlesPageProps) {
  const { slug } = await params;

  const team = await loadTeamContext(slug);
  if (!team) notFound();

  // Awards (individual MVPs, Best IGL, item prizes…) live in each event's
  // prizeDistribution JSON. Resolving a player award needs the event roster and,
  // for players who have since left, the transfer ledger.
  const lineupPlayerIds = collectLineupPlayerIds(team.tournaments.map((event) => event.rosterJson));
  const lineupPlayers = await loadLineupPlayers(lineupPlayerIds);
  const { playerIdToSlug } = buildPlayerSlugMaps(
    team.players,
    team.transfers.map((transfer) => transfer.player),
    lineupPlayers,
  );

  const { awards } = collectTeamAwards({
    teamId: team.id,
    tournaments: team.tournaments.map((event) => ({
      tournamentId: event.tournamentId,
      name: event.name,
      shortName: event.shortName,
      slug: event.slug,
      currency: event.currency,
      startedAtMs: event.startedAtMs,
      prizeDistribution: event.prizeDistribution,
      rosterJson: event.rosterJson,
    })),
    roster: team.players,
    transfers: team.transfers.map((transfer) => transfer.player),
    playerIdToSlug,
  });

  const intro = teamTitlesIntro({
    name: team.name,
    titles: team.won.length,
    runnerUps: team.runnerUp.length,
    awards: awards.length,
  });

  return (
    <TeamTabShell team={team} activeTab="titles">
      <TabIntro text={intro} />
      <TeamTitlesPanel team={team} awards={awards} />
    </TeamTabShell>
  );
}
