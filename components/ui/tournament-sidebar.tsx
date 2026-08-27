'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Swords,
  Crosshair,
  DollarSign,
  Layers,
  Users,
  Flame,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  Trophy,
  Swords,
  Crosshair,
  DollarSign,
  Layers,
  Users,
  Flame,
};

interface Tab {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

interface Meta {
  eventType?: string | null;
  gameMode?: string | null;
  device?: string | null;
  teamsCount: number;
  matchesCount: number;
}

interface TournamentSidebarProps {
  slug: string;
  activeTab: string;
  tabs: Tab[];
  meta: Meta;
}

export function TournamentSidebar({ slug, activeTab, tabs, meta }: TournamentSidebarProps) {
  const [expanded, setExpanded] = React.useState(false);

  // Expand on hover, collapse on mouse leave
  const handleMouseEnter = () => setExpanded(true);
  const handleMouseLeave = () => setExpanded(false);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r transition-all duration-200 ease-in-out overflow-hidden z-20',
        // Light mode
        'bg-white border-slate-200',
        // Dark mode
        'dark:bg-[#0b101c] dark:border-slate-800/80',
        expanded ? 'w-56' : 'w-14'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Expand/collapse toggle button */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="absolute top-3 right-2 w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {expanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Nav items */}
      <nav className="flex-1 pt-10 px-2 space-y-0.5 overflow-y-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = ICON_MAP[tab.icon] ?? Trophy;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/tournaments/${slug}?tab=${tab.id}`}
              title={!expanded ? tab.label : undefined}
              className={cn(
                'flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all group relative',
                isActive
                  ? [
                      'bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/15',
                      'text-[#0A5FC4] dark:text-blue-400',
                      'border-l-2 border-[#0A5FC4]',
                      // Light active
                      'font-black',
                    ]
                  : [
                      'text-slate-500 dark:text-slate-400',
                      'hover:bg-slate-100 dark:hover:bg-slate-800/60',
                      'hover:text-slate-800 dark:hover:text-slate-200',
                      'border-l-2 border-transparent',
                    ]
              )}
            >
              {/* Icon */}
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#0A5FC4] dark:text-blue-400' : '')} />

              {/* Label + count (only visible when expanded) */}
              <span
                className={cn(
                  'text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-200',
                  expanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0'
                )}
              >
                {tab.label}
              </span>
              {tab.count != null && expanded && (
                <span className={cn(
                  'ml-auto text-[10px] font-black px-1.5 py-px rounded-full shrink-0',
                  isActive
                    ? 'bg-[#0A5FC4]/20 text-[#0A5FC4] dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                )}>
                  {tab.count}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {!expanded && (
                <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                  {tab.label}
                  {tab.count != null && (
                    <span className="ml-1.5 opacity-60">({tab.count})</span>
                  )}
                  {/* Arrow */}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-slate-900 dark:border-r-slate-700" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Meta info block — only when expanded */}
      <div className={cn(
        'px-3 py-4 border-t transition-all duration-200 overflow-hidden',
        'border-slate-100 dark:border-slate-800',
        expanded ? 'opacity-100 max-h-48' : 'opacity-0 max-h-0 py-0 border-transparent'
      )}>
        <div className="space-y-2 text-[10px] font-medium">
          {meta.eventType && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Trophy className="w-3 h-3 shrink-0" />
              <span>{meta.eventType}</span>
            </div>
          )}
          {meta.gameMode && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Gamepad2 className="w-3 h-3 shrink-0" />
              <span>{meta.gameMode}</span>
            </div>
          )}
          {meta.device && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Monitor className="w-3 h-3 shrink-0" />
              <span>{meta.device}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Users className="w-3 h-3 shrink-0" />
            <span>{meta.teamsCount} teams · {meta.matchesCount} matches</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
