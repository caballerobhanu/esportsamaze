import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticProgressionPanel } from '@/components/tournaments/estatic/estatic-progression-panel';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildProgressionData,
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
  return tournamentMetadata(slug, 'progression', game);
}

export default async function TournamentProgressionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  const data = buildProgressionData(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="progression">
      <EstaticProgressionPanel
        tournament={{
          id: ctx.tournament.id,
          name: ctx.tournament.name,
          slug: ctx.tournament.slug,
          formatDetails: ctx.tournament.formatDetails,
          qualifications: ctx.tournament.qualifications,
        }}
        stages={ctx.tournament.stages}
        teams={data.enrichedTeams}
        matches={data.progressionMatches}
        teamPerformanceRows={data.teamPerformanceRows}
        standingsConfig={ctx.standingsConfig}
      />
    </TournamentTabShell>
  );
}
