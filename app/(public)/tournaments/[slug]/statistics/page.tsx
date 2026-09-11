import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticStatisticsPanel } from '@/components/tournaments/estatic/estatic-statistics-panel';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildStatisticsData,
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
  return tournamentMetadata(slug, 'Statistics');
}

export default async function TournamentStatisticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  // Metric visibility is decided purely by the tournament's statistics
  // config — admins see exactly what visitors see (edit in the admin panel).
  const data = buildStatisticsData(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="statistics">
      <EstaticStatisticsPanel
        playerRows={data.playerRowsList}
        teamRows={data.teamPerformanceRows}
        stages={data.stagesOrder}
        mapsList={data.uniqueMapsList}
        daysList={data.uniqueDaysList}
        stageGroups={data.stageGroupsMap}
        logoMode={ctx.standingsConfig.logoMode}
        defaultView={ctx.standingsConfig.statisticsConfig?.defaultView}
        defaultTeamPointsMode={ctx.standingsConfig.statisticsConfig?.defaultTeamPointsMode}
        adminPlayerColumns={ctx.standingsConfig.statisticsConfig?.playerColumns}
        customPlayerColumns={ctx.standingsConfig.statisticsConfig?.customPlayerColumns}
      />
    </TournamentTabShell>
  );
}
