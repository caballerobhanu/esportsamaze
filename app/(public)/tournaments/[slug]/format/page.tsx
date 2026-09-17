import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticFormatPanel } from '@/components/tournaments/estatic/estatic-format-panel';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildFormatData,
  generateTournamentStaticParams,
} from '../tournament-data';

export const revalidate = 180;

export async function generateStaticParams() {
  return generateTournamentStaticParams();
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return tournamentMetadata(slug, 'format');
}

export default async function TournamentFormatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  const data = buildFormatData(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="format">
      <EstaticFormatPanel
        tournament={{
          id: ctx.tournament.id,
          name: ctx.tournament.name,
          slug: ctx.tournament.slug,
          startDate: ctx.tournament.startDate,
          endDate: ctx.tournament.endDate,
          formatDetails: ctx.tournament.formatDetails,
        }}
        stages={ctx.tournament.stages}
        matches={data.slimMatches}
        teams={data.enrichedTeams}
        standingsConfig={ctx.standingsConfig}
        groupRankings={data.groupRankings}
        pointsMatrix={data.pointsMatrix}
        killPoints={data.killPoints}
        gameMode={ctx.tournament.gameMode}
        eventType={ctx.tournament.eventType}
        device={ctx.tournament.device}
        formatDetails={ctx.tournament.formatDetails}
      />
    </TournamentTabShell>
  );
}
