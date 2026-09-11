import { notFound } from 'next/navigation';
import { EstaticTabNav } from './estatic-tab-nav';
import { TournamentHero } from './tournament-hero';
import type { TournamentContext } from '@/app/(public)/tournaments/[slug]/tournament-data';

/**
 * Shared layout for tournament tab routes: hidden-tab guard (404), the
 * estatic masthead, the tab dock, and the panel slot. Each route only
 * supplies its active tab and panel.
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

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <TournamentHero ctx={ctx} activeTab={activeTab} />

      {/* ============ ESTATIC BODY & TABS ============ */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 sm:px-6 py-6 sm:py-8">
        <EstaticTabNav slug={ctx.slug} activeTab={activeTab} visibleTabs={ctx.visibleTabs as string[]} />

        <main className="flex-1 pt-6 sm:pt-8 pb-24 md:pb-16">{children}</main>
      </div>
    </div>
  );
}
