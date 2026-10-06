import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticStandingsPanel } from '@/components/tournaments/estatic/estatic-standings-panel';
import { EstaticReportedStandings } from '@/components/tournaments/estatic/estatic-reported-totals';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildStandingsData,
  buildReportedTotals,
  generateTournamentStaticParams,
} from '../tournament-data';

// Standings are the tab people refresh during a live event. A short window here
// keeps the edge copy close to live; every other tab stays at 180s. Admin saves
// already call revalidatePath, so this only bounds how long the *edge* may serve
// a copy that was cached just before an edit.
export const revalidate = 30;

export async function generateStaticParams() {
  return generateTournamentStaticParams();
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; slug: string }>;
}) {
  const { game, slug } = await params;
  return tournamentMetadata(slug, 'standings', game);
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
  const reported = buildReportedTotals(ctx);

  // Computed standings always win. Reported totals appear ONLY when there is no
  // computed result to show — an event with both keeps its standings untouched,
  // and reported data is shown additively on the statistics tab instead.
  const hasComputedResults = data.standingsMatches.some((match) => match.results.length > 0);

  return (
    <TournamentTabShell ctx={ctx} activeTab="standings">
      {hasComputedResults || reported.teams.length === 0 ? (
        <EstaticStandingsPanel
          stages={data.stageSummaries}
          matches={data.standingsMatches}
          teams={data.teamsMeta}
          config={ctx.standingsConfig}
        />
      ) : (
        <EstaticReportedStandings
          teams={reported.teams}
          logoMode={ctx.standingsConfig.logoModeBySurface.standings}
          columns={ctx.standingsConfig.columns}
        />
      )}
    </TournamentTabShell>
  );
}
