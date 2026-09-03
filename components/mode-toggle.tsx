'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    subscribe => subscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="w-9 h-9 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-all" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-all" />
      )}
    </button>
  );
}
