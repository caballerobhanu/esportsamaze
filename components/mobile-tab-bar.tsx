'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Menu, Newspaper, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

/** App-style bottom navigation, visible below tablet width only. */
export function MobileTabBar() {
  const pathname = usePathname();

  const openDrawer = () => {
    window.dispatchEvent(new CustomEvent('esamaze:open-drawer'));
  };

  const tabs = [
    { label: 'Home', href: '/', icon: Home, active: pathname === '/' },
    { label: 'Tournaments', href: '/tournaments', icon: Trophy, active: pathname.startsWith('/tournaments') },
    { label: 'News', href: '/news', icon: Newspaper, active: pathname.startsWith('/news') },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ed-hair)] bg-[var(--ed-surface)]/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-4">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
              tab.active ? 'text-[var(--ed-blue)]' : 'text-[var(--ed-stone)] hover:text-[var(--ed-ink)]'
            )}
            aria-current={tab.active ? 'page' : undefined}
          >
            <tab.icon className="h-5 w-5" strokeWidth={tab.active ? 2.4 : 2} />
            {tab.label}
          </Link>
        ))}
        <button
          onClick={openDrawer}
          className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ed-stone)] transition-colors hover:text-[var(--ed-ink)]"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  );
}
