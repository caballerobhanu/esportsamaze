import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticPrizePanel } from '@/components/tournaments/estatic/estatic-prize-panel';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildPrizeData,
  generateTournamentStaticParams,
} from '../tournament-data';

export const revalidate = 180;

export async function generateStaticParams() {
  return generateTournamentStaticParams();
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; slug: string }>;
}) {
  const { game, slug } = await params;
  return tournamentMetadata(slug, 'prizepool', game);
}

export default async function TournamentPrizePoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  const data = await buildPrizeData(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="prizepool">
      <EstaticPrizePanel
        logoMode={ctx.standingsConfig.logoModeBySurface.prizepool}
        totalPrizePool={ctx.tournament.prizePool}
        prizeStages={data.prizeStages}
        currency={ctx.tournament.currency}
        qualificationRules={data.qualificationRules}
        awardPlayers={data.awardPlayers}
        teams={ctx.tournament.teams}
        results={data.results}
        gameSlug={ctx.tournament.game?.slug}
      />
    </TournamentTabShell>
  );
}
