'use client';

import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

export interface FormTabDef {
  id: string;
  label: string;
}

const ActiveTabContext = createContext<string>('');

/**
 * Tab bar for one long form, so twenty fields are not a single scroll.
 *
 * Panels are grouped by tab id rather than listed, because the tabs do not follow the
 * document order of the sections — the Basics tab holds sections 1, 2 and 9, which are
 * spread through the page. Wrapping each section in place means no JSX moves.
 */
export function FormTabs({
  tabs,
  initialTab,
  children,
}: {
  tabs: FormTabDef[];
  /** Opened tab, e.g. the one owning a field that failed to parse. Falls back to the first. */
  initialTab?: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(() =>
    initialTab && tabs.some((tab) => tab.id === initialTab) ? initialTab : tabs[0]?.id ?? ''
  );

  return (
    <ActiveTabContext.Provider value={active}>
      <div
        role="tablist"
        className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/50"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={cn(
                'cursor-pointer rounded-lg px-3.5 py-2 text-[11px] font-black uppercase tracking-wider transition-colors',
                isActive
                  ? 'bg-(--ed-blue) text-white shadow-sm'
                  : 'text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-6 pt-5">{children}</div>
    </ActiveTabContext.Provider>
  );
}

/**
 * One section of the form, shown only while its tab is active.
 *
 * The inactive panel is hidden with `display: none` and stays **mounted** — that is
 * load-bearing, not a detail. This form's save replaces each JSON field wholesale, so a
 * panel that unmounted would drop the hidden inputs it owns and delete that section's data
 * rather than merely leaving it unchanged. Never render these conditionally.
 */
export function FormPanel({ tab, children }: { tab: string; children: React.ReactNode }) {
  const active = useContext(ActiveTabContext);
  return (
    <div role="tabpanel" className={tab === active ? undefined : 'hidden'}>
      {children}
    </div>
  );
}
