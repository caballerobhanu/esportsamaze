'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Trophy,
  Swords,
  Layers,
  Users,
  DollarSign,
  Flame,
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

interface TournamentSubnavProps {
  slug: string;
  activeTab: string;
  matchesCount: number;
  teamsCount: number;
}

export function TournamentSubnav({
  slug,
  activeTab,
  matchesCount,
  teamsCount,
}: TournamentSubnavProps) {
  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'standings', label: 'Standings', icon: Trophy },
    { id: 'matches', label: 'Matches', icon: Swords, count: matchesCount },
    { id: 'format', label: 'Format & Rules', icon: Layers },
    { id: 'teams', label: 'Teams & Rosters', icon: Users, count: teamsCount },
    { id: 'prizepool', label: 'Prize & Awards', icon: DollarSign },
    { id: 'fraggers', label: 'Top Fraggers', icon: Flame },
  ];

  return (
    <div className="sticky top-16 z-30 w-full bg-white/95 dark:bg-[#06080f]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={`/tournaments/${slug}?tab=${tab.id}`}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#0A5FC4] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
