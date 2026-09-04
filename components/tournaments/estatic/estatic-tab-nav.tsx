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
  ChevronDown,
} from 'lucide-react';

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

export function EstaticTabNav({ slug, activeTab }: { slug: string; activeTab: string }) {
  const router = useRouter();
  const normalizedActiveTab = activeTab === 'fraggers' ? 'statistics' : activeTab;
  const currentTabObj = PREVIEW_TABS.find((t) => t.id === normalizedActiveTab) || PREVIEW_TABS[0];
  const CurrentIcon = currentTabObj.icon;

  return (
    <div className="sticky top-10 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#070b14]/95 sm:top-12">
      <div className="mx-auto max-w-[1200px] px-4 py-3 sm:px-6">
        {/* Mobile: Interactive Dropdown */}
        <div className="sm:hidden w-full">
          <div className="relative">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0A5FC4] dark:text-blue-300">
              <CurrentIcon className="h-4 w-4" />
            </div>
            <select
              value={normalizedActiveTab}
              onChange={(e) => {
                router.push(`/tournaments/${slug}?tab=${e.target.value}`);
              }}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-100/90 py-3 pl-10 pr-10 text-xs font-black uppercase tracking-wider text-slate-900 shadow-sm focus:border-[#0A5FC4] focus:outline-none dark:border-white/10 dark:bg-[#0b1220] dark:text-white cursor-pointer"
            >
              {PREVIEW_TABS.map((t) => (
                <option key={t.id} value={t.id} className="bg-white text-slate-900 dark:bg-[#0b1220] dark:text-white">
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Desktop: Sleek Capsule Tab Dock */}
        <nav className="hidden sm:flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/70 p-1.5 dark:border-white/10 dark:bg-white/5 backdrop-blur-md shadow-xs">
            {PREVIEW_TABS.map((t) => {
              const active = normalizedActiveTab === t.id;
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${slug}?tab=${t.id}`}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                    active
                      ? 'bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-white/90 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10'
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
