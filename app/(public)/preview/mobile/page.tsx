import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Smartphone } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mobile preview — do not index | eSportsAmaze',
  robots: { index: false, follow: false },
};

const SURFACES = [
  {
    href: '/preview/mobile/teams/nebula-esports',
    label: 'Team',
    detail: 'Per-map (880px), per-tournament (820px), head-to-head (900px) and match history (860px)',
  },
  {
    href: '/preview/mobile/players/scarryjod-1214',
    label: 'Player',
    detail: 'Event stats (680px)',
  },
];

export default function MobilePreviewIndex() {
  return (
    <main className="mx-auto w-full max-w-[var(--page-max-width)] flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
        <Smartphone className="h-3.5 w-3.5" />
        <span>Preview · not linked, not indexed</span>
      </div>

      <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-4xl">
        Mobile table cards
      </h1>
      <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
        The wide tables in their narrow-screen form, driven by the same loaders so the figures
        cannot drift from the pages they mirror. This route is the prototype — deleting it reverts
        everything. The tournament scorecard is no longer here: its short names and W/E/P/T headers
        ship on the live matches tab.
      </p>

      <div className="mt-8 space-y-3">
        {SURFACES.map((surface) => (
          <Link
            key={surface.href}
            href={surface.href}
            className="group flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0A5FC4] hover:shadow-lg dark:border-white/10 dark:bg-[#0b1220]"
          >
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white">
                {surface.label}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {surface.detail}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#0A5FC4] transition-transform group-hover:translate-x-0.5 dark:text-blue-300" />
          </Link>
        ))}
      </div>
    </main>
  );
}
