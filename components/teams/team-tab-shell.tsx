import { TEAM_TAB_LABELS, type TeamTabId } from '@/lib/seo-titles';
import { breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import type { TeamContext } from '@/lib/team-data';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

/**
 * The per-route half of the team chrome.
 *
 * The masthead and the tab dock live in the [slug] layout so they survive a tab
 * switch; what stays here is the tab-level breadcrumb, whose last crumb is the
 * tab itself and which a layout cannot know.
 */
export function TeamTabShell({
  team,
  activeTab,
  children,
}: {
  team: TeamContext;
  activeTab: string;
  children: React.ReactNode;
}) {
  const teamSlug = team.slug || team.id;
  const tabLabel = TEAM_TAB_LABELS[activeTab as TeamTabId];
  const game = team.game?.slug || DEFAULT_GAME_SLUG;
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Teams', path: gameHref(game, 'teams') },
    { name: team.name, path: gameHref(game, `teams/${teamSlug}`) },
    ...(activeTab !== 'overview' && tabLabel
      ? [{ name: tabLabel, path: gameHref(game, `teams/${teamSlug}/${activeTab}`) }]
      : []),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      {children}
    </>
  );
}
