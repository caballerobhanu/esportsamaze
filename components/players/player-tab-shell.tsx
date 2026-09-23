import { notFound } from 'next/navigation';
import { PLAYER_TAB_LABELS, type PlayerTabId } from '@/lib/seo-titles';
import { breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import { loadPlayerContext } from '@/app/(public)/[game]/players/[slug]/player-data';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

/**
 * The per-route half of the player chrome.
 *
 * The masthead and the tab dock live in the [slug] layout so they survive a tab
 * switch; what stays here is the tab-level breadcrumb, whose last crumb is the
 * tab itself and which a layout cannot know. The player's name for the trail
 * comes from the same request-memoised context the layout already loaded, so it
 * costs nothing extra.
 */
export async function PlayerTabShell({
  slug,
  activeTab,
  children,
}: {
  slug: string;
  activeTab: string;
  children: React.ReactNode;
}) {
  const context = await loadPlayerContext(slug);
  if (!context) notFound();

  const tabLabel = PLAYER_TAB_LABELS[activeTab as PlayerTabId];
  const game = context.player.game?.slug || DEFAULT_GAME_SLUG;
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Players', path: gameHref(game, 'players') },
    { name: context.player.ign, path: gameHref(game, `players/${slug}`) },
    ...(activeTab !== 'overview' && tabLabel
      ? [{ name: tabLabel, path: gameHref(game, `players/${slug}/${activeTab}`) }]
      : []),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      {children}
    </>
  );
}
