import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticTeamsPanel } from '@/components/tournaments/estatic/estatic-teams-panel';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildTeamsData,
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
  return tournamentMetadata(slug, 'teams');
}

export default async function TournamentTeamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  const data = buildTeamsData(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="teams">
      <EstaticTeamsPanel
        teams={data.enrichedTeams}
        seats={data.seats}
        logoMode={ctx.standingsConfig.logoMode}
        showCountryFlag={
          ctx.standingsConfig.teamsConfig?.showCountryFlag ??
          (ctx.standingsConfig.logoMode === 'BOTH' || ctx.standingsConfig.logoMode === 'COUNTRY')
        }
      />
    </TournamentTabShell>
  );
}
