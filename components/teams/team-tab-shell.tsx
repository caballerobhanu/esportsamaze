import { TeamHero } from './team-hero';
import { TeamTabNav } from './team-tab-nav';
import type { TeamContext } from '@/lib/team-data';

/**
 * Shared layout for the team tab routes: the identity masthead, the tab dock
 * and the panel slot. Each route only supplies its active tab and panel.
 *
 * Mirrors `components/tournaments/estatic/tournament-tab-shell.tsx`.
 */
export function TeamTabShell({
  team,
  activeTab,
  kraftonRank,
  children,
}: {
  team: TeamContext;
  activeTab: string;
  kraftonRank?: number | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <TeamHero team={team} kraftonRank={kraftonRank} />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <TeamTabNav slug={team.slug || team.id} activeTab={activeTab} />
        <main className="pb-24 pt-4 lg:pb-14">{children}</main>
      </section>
    </div>
  );
}
