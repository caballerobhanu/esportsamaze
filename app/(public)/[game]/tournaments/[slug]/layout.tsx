import { notFound, permanentRedirect } from 'next/navigation';
import { EstaticTabNav } from '@/components/tournaments/estatic/estatic-tab-nav';
import { TournamentHero } from '@/components/tournaments/estatic/tournament-hero';
import { resolveSlugRedirect } from '@/lib/slug-history';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import { loadTournamentContext } from './tournament-data';

/**
 * Event chrome for every tournament tab route.
 *
 * Rendering the masthead and the tab dock here — rather than in each page —
 * means a tab switch only replaces the panel below them. When they were part of
 * the page, the loading fallback sat above them and tore the whole masthead and
 * tab bar down on every navigation.
 *
 * The page still owns the hidden-tab guard and the tab-level breadcrumb, since
 * a layout cannot know which tab is active.
 */
export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ game: string; slug: string }>;
}) {
  const { game, slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) {
    // A slug the live table no longer holds may be a previous one; send it to the
    // current address rather than 404ing, but only while the event still exists.
    const target = await resolveSlugRedirect('tournament', slug);
    if (target) permanentRedirect(gameHref(target.gameSlug, `tournaments/${target.slug}`));
    notFound();
  }
  // One canonical URL per event: an event reached under the wrong game is a 404.
  if ((ctx.tournament.game?.slug || DEFAULT_GAME_SLUG) !== game) notFound();

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <TournamentHero ctx={ctx} />

      {/* ============ ESTATIC BODY & TABS ============ */}
      <div className="mx-auto flex w-full max-w-[var(--page-max-width)] flex-1 flex-col px-4 sm:px-6 py-6 sm:py-8 lg:px-8">
        <EstaticTabNav game={game} slug={ctx.slug} visibleTabs={ctx.visibleTabs as string[]} />

        {children}
      </div>
    </div>
  );
}
