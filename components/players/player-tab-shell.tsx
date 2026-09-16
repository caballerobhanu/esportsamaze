import { notFound } from 'next/navigation';
import { PLAYER_TAB_LABELS, type PlayerTabId } from '@/lib/seo-titles';
import { breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import { loadPlayerContext } from '@/app/(public)/players/[slug]/player-data';

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
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Players', path: '/players' },
    { name: context.player.ign, path: `/players/${slug}` },
    ...(activeTab !== 'overview' && tabLabel
      ? [{ name: tabLabel, path: `/players/${slug}/${activeTab}` }]
      : []),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      {children}
    </>
  );
}
