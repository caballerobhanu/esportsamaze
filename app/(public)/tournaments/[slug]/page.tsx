import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { EstaticTabNav } from '@/components/tournaments/estatic/estatic-tab-nav';
import { TournamentHero } from '@/components/tournaments/estatic/tournament-hero';
import { EstaticOverviewPanel } from '@/components/tournaments/estatic/estatic-overview-panel';
import {
  loadTournamentContext,
  firstVisibleTabPath,
  tournamentMetadata,
  buildOverviewData,
  generateTournamentStaticParams,
} from './tournament-data';

export const revalidate = 180;

export async function generateStaticParams() {
  return generateTournamentStaticParams();
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return tournamentMetadata(slug);
}

export default async function TournamentOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  // Hidden-tab guard: if Overview is disabled, land on the first visible tab.
  if (!ctx.visibleTabs.includes('overview')) {
    redirect(firstVisibleTabPath(ctx));
  }

  const data = buildOverviewData(ctx);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <TournamentHero ctx={ctx} activeTab="overview" />

      {/* ============ ESTATIC BODY & TABS ============ */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 sm:px-6 py-6 sm:py-8">
        <EstaticTabNav slug={ctx.slug} activeTab="overview" visibleTabs={ctx.visibleTabs as string[]} />

        <main className="flex-1 pt-6 sm:pt-8 pb-24 md:pb-16">
          <EstaticOverviewPanel
            tournament={ctx.tournament}
            featuredStageName={data.featuredStageName}
            featuredStandings={data.featuredStandings}
            overallFraggers={data.overallFraggers}
            matches={data.overviewMatches}
            teamsCount={ctx.totalTeamsCount}
            resolvedWinner={ctx.resolvedWinner}
            resolvedRunnerUp={ctx.resolvedRunnerUp}
            teamsMeta={data.teamsMeta}
            playerSlugById={data.playerSlugById}
          />
        </main>
      </div>
    </div>
  );
}
