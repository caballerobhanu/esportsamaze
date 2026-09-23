import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { EstaticOverviewPanel } from '@/components/tournaments/estatic/estatic-overview-panel';
import { resolveSlugRedirect } from '@/lib/slug-history';
import { PageViews } from '@/components/ui/page-views';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, breadcrumbJsonLd, sportsEventJsonLd } from '@/lib/seo';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
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
  params: Promise<{ game: string; slug: string }>;
}): Promise<Metadata> {
  const { game, slug } = await params;
  return tournamentMetadata(slug, 'overview', game);
}

export default async function TournamentOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) {
    const target = await resolveSlugRedirect('tournament', slug);
    if (target) permanentRedirect(gameHref(target.gameSlug, `tournaments/${target.slug}`));
    notFound();
  }

  // Hidden-tab guard: if Overview is disabled, land on the first visible tab.
  if (!ctx.visibleTabs.includes('overview')) {
    redirect(firstVisibleTabPath(ctx));
  }

  const data = buildOverviewData(ctx);

  // This route renders its own layout rather than TournamentTabShell, so it
  // emits both the event and the breadcrumb trail itself.
  const eventJsonLd = sportsEventJsonLd({
    name: ctx.tournament.name,
    slug: ctx.slug,
    description: `Official standings, match results, schedule and prize pool for ${ctx.tournament.name}.`,
    startDate: ctx.tournament.startDate,
    endDate: ctx.tournament.endDate,
    status: ctx.tournament.status,
    eventType: ctx.tournament.eventType,
    venues: ctx.tournament.venues.map((link) => ({
      name: link.venue.name,
      city: link.venue.city,
      country: link.venue.country,
    })),
    organizers: ctx.tournament.organizers.map((link) => ({
      name: link.organizer.name,
      url: link.organizer.website,
    })),
    imageUrl: ctx.tournament.imageUrl || ctx.tournament.bannerUrl,
    gameName: ctx.tournament.game?.name ?? null,
    competitors: ctx.tournament.teams.flatMap((entry) =>
      entry.team
        ? [
            {
              name: entry.team.name,
              url: entry.team.slug ? absoluteUrl(`/teams/${entry.team.slug}`) : null,
            },
          ]
        : []
    ),
  });
  const crumbGame = ctx.tournament.game?.slug || DEFAULT_GAME_SLUG;
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: gameHref(crumbGame, 'tournaments') },
    {
      name: ctx.tournament.shortName || ctx.tournament.name,
      path: gameHref(crumbGame, `tournaments/${ctx.slug}`),
    },
  ]);

  return (
    <>
      <JsonLd data={[eventJsonLd, breadcrumbs]} />

      <PageViews
        type="TOURNAMENT"
        id={ctx.tournament.id}
        override={ctx.tournament.showViewCount}
        windowOverride={ctx.tournament.viewCountWindow}
        className="pt-4"
      />

      <main className="flex-1 pt-6 sm:pt-8 pb-24 md:pb-16">
        <EstaticOverviewPanel
          logoMode={ctx.standingsConfig.logoModeBySurface.overview}
          tournament={ctx.tournament}
          featuredStageName={data.featuredStageName}
          featuredStandings={data.featuredStandings}
          overallFraggers={data.overallFraggers}
          matches={data.overviewMatches}
          teamsCount={ctx.namedTeamsCount}
          teamsToShow={ctx.tournament.teamsToShow}
          resolvedWinner={ctx.resolvedWinner}
          resolvedRunnerUp={ctx.resolvedRunnerUp}
          teamsMeta={data.teamsMeta}
          playerSlugById={data.playerSlugById}
        />
      </main>
    </>
  );
}
