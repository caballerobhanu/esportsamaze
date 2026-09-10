'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Menu, Newspaper, Trophy, Medal, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

function MobileTabBarInner() {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();

  const openDrawer = () => {
    window.dispatchEvent(new CustomEvent('esamaze:open-drawer'));
  };

  const segments = pathname.split('/').filter(Boolean);
  const isTournamentDetail = segments[0] === 'tournaments' && segments.length >= 2;
  const tournamentSlug = isTournamentDetail ? segments[1] : null;

  if (isTournamentDetail && tournamentSlug) {
    const activeTab = searchParams.get('tab') || 'overview';
    const isStandingsActive = activeTab === 'standings';
    const isMatchesActive = activeTab === 'matches';
    const isTournamentsActive = !isStandingsActive && !isMatchesActive;

    const tournamentTabs = [
      {
        label: 'Home',
        href: '/',
        icon: Home,
        active: false,
      },
      {
        label: 'Tournaments',
        href: '/tournaments',
        icon: Trophy,
        active: isTournamentsActive,
      },
      {
        label: 'News',
        href: '/news',
        icon: Newspaper,
        active: false,
      },
      {
        label: 'Standings',
        href: `/tournaments/${encodeURIComponent(tournamentSlug)}?tab=standings`,
        icon: Medal,
        active: isStandingsActive,
      },
      {
        label: 'Matches',
        href: `/tournaments/${encodeURIComponent(tournamentSlug)}?tab=matches`,
        icon: Swords,
        active: isMatchesActive,
      },
    ];

    return (
      <div className="grid grid-cols-5">
        {tournamentTabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors min-w-0 text-center',
              tab.active
                ? 'text-[#0A5FC4] dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
            aria-current={tab.active ? 'page' : undefined}
          >
            <tab.icon className="h-4.5 w-4.5 shrink-0" strokeWidth={tab.active ? 2.5 : 2} />
            <span className="truncate w-full px-0.5">{tab.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  // Regular default bottom navigation
  const defaultTabs = [
    { label: 'Home', href: '/', icon: Home, active: pathname === '/' },
    { label: 'Tournaments', href: '/tournaments', icon: Trophy, active: pathname.startsWith('/tournaments') },
    { label: 'News', href: '/news', icon: Newspaper, active: pathname.startsWith('/news') },
  ];

  return (
    <div className="grid grid-cols-4">
      {defaultTabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
            tab.active
              ? 'text-[#0A5FC4] dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          )}
          aria-current={tab.active ? 'page' : undefined}
        >
          <tab.icon className="h-5 w-5 shrink-0" strokeWidth={tab.active ? 2.4 : 2} />
          {tab.label}
        </Link>
      ))}
      <button
        onClick={openDrawer}
        className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
      >
        <Menu className="h-5 w-5 shrink-0" />
        More
      </button>
    </div>
  );
}

/** App-style bottom navigation, visible below tablet width only. */
export function MobileTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#070b14]/95 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <React.Suspense fallback={<div className="h-14" />}>
        <MobileTabBarInner />
      </React.Suspense>
    </nav>
  );
}

