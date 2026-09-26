import { notFound, permanentRedirect } from 'next/navigation';
import { PlayerHero } from '@/components/players/player-hero';
import { PlayerTabNav } from '@/components/players/player-tab-nav';
import { AdSlot } from '@/components/ads/ad-slot';
import { AD_PLACEMENTS } from '@/lib/ads';
import { resolveSlugRedirect } from '@/lib/slug-history';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import {
  buildHeroProps,
  loadPlayerContext,
  loadPlayerMatches,
  loadPlayerStanding,
} from './player-data';

/**
 * Player chrome for every profile tab route.
 *
 * The masthead and the tab dock are rendered here rather than by each page, so a
 * tab switch replaces only the panel below them instead of tearing the whole
 * masthead and tab bar down.
 *
 * Unlike the team hero, the player hero carries stats aggregated from match rows
 * — that is why each page used to build it and hand it to the shell. The loaders
 * are request-memoised, so this layout and the page below it share one load
 * rather than fetching the player twice.
 */
export default async function PlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ game: string; slug: string }>;
}) {
  const { game, slug } = await params;
  const context = await loadPlayerContext(slug);
  if (!context) {
    // A slug the live table no longer holds may be a previous one; send it to the
    // current address rather than 404ing, but only while the player still exists.
    const target = await resolveSlugRedirect('player', slug);
    if (target) permanentRedirect(gameHref(target.gameSlug, `players/${target.slug}`));
    notFound();
  }
  // One canonical URL per player: a player reached under the wrong game is a 404.
  if ((context.player.game?.slug || DEFAULT_GAME_SLUG) !== game) notFound();

  const [matches, standing] = await Promise.all([
    loadPlayerMatches(context.player.id),
    loadPlayerStanding(context.player.id),
  ]);
  const hero = buildHeroProps(context, matches, standing);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white overflow-x-clip">
      <main>
        <PlayerHero {...hero} />

        <section className="mx-auto max-w-[var(--page-max-width)] px-4 sm:px-6 lg:px-8">
          <PlayerTabNav game={game} slug={slug} />

          {/* One unit under the tab dock, shared by all four profile tabs. */}
          <AdSlot placement={AD_PLACEMENTS.pageTop} />

          <div className="pb-24 pt-4 lg:pb-14">{children}</div>

          {/* Closing unit for every profile tab. */}
          <AdSlot placement={AD_PLACEMENTS.pageEnd} />
        </section>
      </main>
    </div>
  );
}
