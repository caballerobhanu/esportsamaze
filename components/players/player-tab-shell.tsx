import { PlayerHero } from './player-hero';
import { PlayerTabNav } from './player-tab-nav';
import type { PlayerHeroProps } from '@/app/(public)/players/[slug]/player-data';
import { PLAYER_TAB_LABELS, type PlayerTabId } from '@/lib/seo-titles';
import { breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';

/**
 * Shared chrome for the player tab routes: the masthead, the tab dock and the
 * panel slot. Each route supplies its active tab, the shared hero props and its
 * own panel.
 *
 * Mirrors `components/teams/team-tab-shell.tsx` so the two profile families
 * behave identically.
 */
export function PlayerTabShell({
  slug,
  activeTab,
  hero,
  children,
}: {
  slug: string;
  activeTab: string;
  hero: PlayerHeroProps;
  children: React.ReactNode;
}) {
  const tabLabel = PLAYER_TAB_LABELS[activeTab as PlayerTabId];
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Players', path: '/players' },
    { name: hero.player.ign, path: `/players/${slug}` },
    ...(activeTab !== 'overview' && tabLabel
      ? [{ name: tabLabel, path: `/players/${slug}/${activeTab}` }]
      : []),
  ]);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white overflow-x-clip">
      <JsonLd data={breadcrumbs} />
      <main>
        <PlayerHero {...hero} />

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PlayerTabNav slug={slug} activeTab={activeTab} />
          <div className="pb-24 pt-4 lg:pb-14">{children}</div>
        </section>
      </main>
    </div>
  );
}
