import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticStandingsPanel } from '@/components/tournaments/estatic/estatic-standings-panel';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildStandingsData,
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
  return tournamentMetadata(slug, 'Standings');
}

export default async function TournamentStandingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  const data = buildStandingsData(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="standings">
      <EstaticStandingsPanel
        stages={data.stageSummaries}
        matches={data.standingsMatches}
        teams={data.teamsMeta}
        config={ctx.standingsConfig}
      />
    </TournamentTabShell>
  );
}
