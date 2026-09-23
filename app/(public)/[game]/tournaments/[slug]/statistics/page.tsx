import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticStatisticsPanel } from '@/components/tournaments/estatic/estatic-statistics-panel';
import { EstaticReportedTotals } from '@/components/tournaments/estatic/estatic-reported-totals';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildStatisticsData,
  buildReportedTotals,
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
  return tournamentMetadata(slug, 'statistics', game);
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
  // Additive only: computed statistics above are never replaced or merged with.
  const reported = buildReportedTotals(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="statistics">
      <div className="space-y-10">
        <EstaticStatisticsPanel
          playerRows={data.playerRowsList}
          teamRows={data.teamPerformanceRows}
          stages={data.stagesOrder}
          mapsList={data.uniqueMapsList}
          daysList={data.uniqueDaysList}
          stageGroups={data.stageGroupsMap}
          logoMode={ctx.standingsConfig.logoModeBySurface.statistics}
          defaultView={ctx.standingsConfig.statisticsConfig?.defaultView}
          defaultTeamPointsMode={ctx.standingsConfig.statisticsConfig?.defaultTeamPointsMode}
          adminPlayerColumns={ctx.standingsConfig.statisticsConfig?.playerColumns}
          customPlayerColumns={ctx.standingsConfig.statisticsConfig?.customPlayerColumns}
          showPlayerRole={ctx.standingsConfig.statisticsConfig?.showPlayerRole}
        />

        <EstaticReportedTotals teams={reported.teams} players={reported.players} />
      </div>
    </TournamentTabShell>
  );
}
