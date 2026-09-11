'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  Swords,
  Route,
  ScrollText,
  Users,
  Banknote,
  Crosshair,
} from 'lucide-react';

import { SearchableSelect } from '@/components/ui/searchable-select';

const PREVIEW_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'standings', label: 'Standings', icon: Trophy },
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'progression', label: 'Progression', icon: Route },
  { id: 'format', label: 'Format', icon: ScrollText },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'prizepool', label: 'Prize Pool', icon: Banknote },
  { id: 'statistics', label: 'Statistics', icon: Crosshair },
] as const;

/** Tabs are route segments now; overview lives on the base route. */
export function tabHref(slug: string, tab: string): string {
  return tab === 'overview' ? `/tournaments/${slug}` : `/tournaments/${slug}/${tab}`;
}

export function EstaticTabNav({
  slug,
  activeTab,
  visibleTabs,
}: {
  slug: string;
  activeTab: string;
  visibleTabs?: string[];
}) {
  const router = useRouter();
  const normalizedActiveTab = activeTab === 'fraggers' ? 'statistics' : activeTab;

  const availableTabs = React.useMemo(() => {
    if (!visibleTabs || visibleTabs.length === 0) return PREVIEW_TABS;
    const filtered = PREVIEW_TABS.filter((t) => visibleTabs.includes(t.id));
    return filtered.length > 0 ? filtered : PREVIEW_TABS;
  }, [visibleTabs]);

  const tabOptions = availableTabs.map((t) => ({
    value: t.id,
    label: t.label,
    icon: t.icon,
  }));

  const handleMobileSelect = (nextTab: string) => {
    router.push(tabHref(slug, nextTab));
  };

  return (
    <div className="sticky top-[4.25rem] z-30 pointer-events-none py-2 transition-all">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        {/* Mobile: Clean Searchable Dropdown */}
        <div className="sm:hidden pointer-events-auto max-w-md mx-auto shadow-md rounded-xl bg-white/95 dark:bg-[#0b1220]/95 backdrop-blur-md">
          <SearchableSelect
            options={tabOptions}
            value={normalizedActiveTab}
            onChange={handleMobileSelect}
            searchPlaceholder="Search tabs (e.g. Standings, Matches)..."
            showSearch={true}
            size="md"
          />
        </div>

        {/* Desktop: Sleek Floating Capsule Tab Dock */}
        <nav className="hidden sm:flex items-center justify-center pointer-events-auto">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-slate-200/90 bg-white/95 p-1.5 dark:border-white/15 dark:bg-[#0b1220]/95 backdrop-blur-xl shadow-lg shadow-slate-900/8 transition-all">
            {availableTabs.map((t) => {
              const active = normalizedActiveTab === t.id;
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  href={tabHref(slug, t.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
