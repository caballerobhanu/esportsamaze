import { TeamHero } from './team-hero';
import { TeamTabNav } from './team-tab-nav';
import { fetchEntityStanding } from '@/lib/krafton-data';
import type { TeamContext } from '@/lib/team-data';
import { TEAM_TAB_LABELS, type TeamTabId } from '@/lib/seo-titles';
import { breadcrumbJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';

/**
 * Shared layout for the team tab routes: the identity masthead, the tab dock
 * and the panel slot. Each route only supplies its active tab and panel.
 *
 * Mirrors `components/tournaments/estatic/tournament-tab-shell.tsx`.
 */
export async function TeamTabShell({
  team,
  activeTab,
  kraftonRank,
  children,
}: {
  team: TeamContext;
  activeTab: string;
  /**
   * The panel's already-resolved rank, when it has one. Tabs that do not load the
   * KRAFTON board leave this undefined and the shell resolves it itself —
   * otherwise the masthead pill disappeared the moment you left the overview tab.
   */
  kraftonRank?: number | null;
  children: React.ReactNode;
}) {
  const rank =
    kraftonRank !== undefined
      ? kraftonRank
      : await fetchEntityStanding('TEAM', team.id)
          .then((standing) => standing?.rank ?? null)
          .catch(() => null);

  const teamSlug = team.slug || team.id;
  const tabLabel = TEAM_TAB_LABELS[activeTab as TeamTabId];
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Teams', path: '/teams' },
    { name: team.name, path: `/teams/${teamSlug}` },
    ...(activeTab !== 'overview' && tabLabel
      ? [{ name: tabLabel, path: `/teams/${teamSlug}/${activeTab}` }]
      : []),
  ]);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <JsonLd data={breadcrumbs} />
      <TeamHero team={team} kraftonRank={rank} />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <TeamTabNav slug={teamSlug} activeTab={activeTab} />
        <main className="pb-24 pt-4 lg:pb-14">{children}</main>
      </section>
    </div>
  );
}
