'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, Crosshair, LayoutDashboard, Swords } from 'lucide-react';

import { SearchableSelect } from '@/components/ui/searchable-select';

export const PLAYER_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'stats', label: 'Stats', icon: Crosshair },
  { id: 'results', label: 'Results', icon: Swords },
  { id: 'honours', label: 'Honours', icon: Award },
] as const;

/** Tabs are route segments; overview lives on the base player route. */
export function playerTabHref(slug: string, tab: string): string {
  return tab === 'overview' ? `/players/${slug}` : `/players/${slug}/${tab}`;
}

/**
 * Tab dock for the player profile. Mirrors `TeamTabNav` so the two profile
 * families behave identically: floating pill dock on desktop, dropdown on
 * mobile, active tab resolved from the route segment.
 */
export function PlayerTabNav({ slug, activeTab }: { slug: string; activeTab: string }) {
  const router = useRouter();

  const tabOptions = PLAYER_TABS.map((tab) => ({
    value: tab.id,
    label: tab.label,
    icon: tab.icon,
  }));

  return (
    <div className="sticky top-[4.25rem] z-30 pointer-events-none py-2">
      <div className="mx-auto max-w-7xl">
        {/* Mobile */}
        <div className="sm:hidden pointer-events-auto max-w-md mx-auto shadow-md rounded-xl bg-white/95 dark:bg-[#0b1220]/95 backdrop-blur-md">
          <SearchableSelect
            options={tabOptions}
            value={activeTab}
            onChange={(nextTab) => router.push(playerTabHref(slug, nextTab))}
            searchPlaceholder="Search tabs (e.g. Stats, Honours)..."
            showSearch={true}
            size="md"
          />
        </div>

        {/* Desktop */}
        <nav className="hidden sm:flex items-center justify-center pointer-events-auto">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-slate-200/90 bg-white/95 p-1.5 dark:border-white/15 dark:bg-[#0b1220]/95 backdrop-blur-xl shadow-lg shadow-slate-900/8">
            {PLAYER_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={playerTabHref(slug, tab.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
