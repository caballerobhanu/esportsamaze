import { notFound } from 'next/navigation';
import { TOURNAMENT_AVAILABLE_TABS } from '@/lib/standings-config';
import { breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';
import type { TournamentContext } from '@/app/(public)/[game]/tournaments/[slug]/tournament-data';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

/**
 * The per-route half of the tournament chrome.
 *
 * The masthead and the tab dock live in the [slug] layout so they survive a tab
 * switch; what stays here is everything that depends on *which* tab is active —
 * the hidden-tab guard and the breadcrumb trail, whose last crumb is the tab.
 * A layout cannot know the active tab, so these cannot move up with the hero.
 */
export function TournamentTabShell({
  ctx,
  activeTab,
  children,
}: {
  ctx: TournamentContext;
  activeTab: string;
  children: React.ReactNode;
}) {
  if (!ctx.visibleTabs.includes(activeTab as never)) {
    notFound();
  }

  // Breadcrumbs always carry the short event name, at every width.
  const eventLabel = ctx.tournament.shortName || ctx.tournament.name;
  const tabLabel = TOURNAMENT_AVAILABLE_TABS.find((tab) => tab.id === activeTab)?.label;
  const game = ctx.tournament.game?.slug || DEFAULT_GAME_SLUG;
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Tournaments', path: gameHref(game, 'tournaments') },
    { name: eventLabel, path: gameHref(game, `tournaments/${ctx.slug}`) },
    ...(tabLabel
      ? [{ name: tabLabel, path: gameHref(game, `tournaments/${ctx.slug}/${activeTab}`) }]
      : []),
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <main className="flex-1 pt-6 sm:pt-8 pb-24 md:pb-16">{children}</main>
    </>
  );
}
