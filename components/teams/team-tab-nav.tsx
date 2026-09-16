'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Swords, Crosshair, Trophy } from 'lucide-react';

import { SearchableSelect } from '@/components/ui/searchable-select';
import { activeTabFromPathname } from '@/lib/nav';

export const TEAM_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'stats', label: 'Stats', icon: Crosshair },
  { id: 'titles', label: 'Honours & Winnings', icon: Trophy },
] as const;

/** Tabs are route segments; overview lives on the base team route. */
export function teamTabHref(slug: string, tab: string): string {
  return tab === 'overview' ? `/teams/${slug}` : `/teams/${slug}/${tab}`;
}

/**
 * Tab dock for the team profile. Mirrors `EstaticTabNav` so the two profile
 * families behave identically: floating pill dock on desktop, dropdown on
 * mobile, active tab resolved from the route segment.
 */
export function TeamTabNav({ slug }: { slug: string }) {
  const router = useRouter();
  /* Rendered by the [slug] layout, so the active tab comes from the route. */
  const activeTab = activeTabFromPathname(usePathname());

  const tabOptions = TEAM_TABS.map((tab) => ({
    value: tab.id,
    label: tab.label,
    icon: tab.icon,
  }));

  return (
    <div className="sticky top-[calc(4.25rem+var(--ed-safe-top))] z-30 pointer-events-none py-2">
      <div className="mx-auto max-w-7xl">
        {/* Mobile */}
        <div className="sm:hidden pointer-events-auto max-w-md mx-auto shadow-md rounded-xl bg-white/95 dark:bg-[#0b1220]/95 backdrop-blur-md">
          <SearchableSelect
            options={tabOptions}
            value={activeTab}
            onChange={(nextTab) => router.push(teamTabHref(slug, nextTab))}
            searchPlaceholder="Search tabs (e.g. Roster, Matches)..."
            showSearch={true}
            size="md"
          />
        </div>

        {/* Desktop */}
        <nav className="hidden sm:flex items-center justify-center pointer-events-auto">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-slate-200/90 bg-white/95 p-1.5 dark:border-white/15 dark:bg-[#0b1220]/95 backdrop-blur-xl shadow-lg shadow-slate-900/8">
            {TEAM_TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.id}
                  href={teamTabHref(slug, tab.id)}
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
