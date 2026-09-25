'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

import { activeTabFromPathname } from '@/lib/nav';
import { tournamentHref } from '@/lib/entity-links';

export interface EditionLink {
  slug: string;
  name: string;
  season: string | null;
  game?: { slug: string | null } | null;
}

/** Edition link that preserves the active tab (overview = base route). */
function editionHref(edition: EditionLink, activeTab: string): string {
  return tournamentHref(edition, activeTab);
}

/*
 * Both edition navigations live in the [slug] layout now, where the active tab
 * cannot arrive as a prop — it has to be read from the route, so that switching
 * edition keeps you on the tab you were reading.
 */

export function EditionPagerButtons({
  prevEdition,
  nextEdition,
}: {
  prevEdition: EditionLink | null;
  nextEdition: EditionLink | null;
}) {
  const activeTab = activeTabFromPathname(usePathname());

  return (
    <div className="flex shrink-0 gap-2">
      {prevEdition && (
        <Link
          href={editionHref(prevEdition, activeTab)}
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
          title={`Previous Edition: ${prevEdition.name}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
      {nextEdition && (
        <Link
          href={editionHref(nextEdition, activeTab)}
          className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
          title={`Next Edition: ${nextEdition.name}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function EditionSwitcher({
  prevEdition,
  nextEdition,
  currentLabel,
}: {
  prevEdition: EditionLink | null;
  nextEdition: EditionLink | null;
  currentLabel: string;
}) {
  const activeTab = activeTabFromPathname(usePathname());

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs">
      {prevEdition && (
        <Link
          href={editionHref(prevEdition, activeTab)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 font-bold text-slate-700 shadow-xs hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white transition-all group"
          title={prevEdition.name}
        >
          <ChevronLeft className="h-3.5 w-3.5 text-[#0A5FC4] transition-transform group-hover:-translate-x-0.5" />
          <span className="text-slate-400 font-medium">Previous:</span>
          <span>{prevEdition.season || prevEdition.name}</span>
        </Link>
      )}
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A5FC4] px-3.5 py-1.5 font-black uppercase tracking-wider text-white shadow-sm shadow-blue-500/25">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
        <span>Current: {currentLabel}</span>
      </span>
      {nextEdition && (
        <Link
          href={editionHref(nextEdition, activeTab)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 font-bold text-slate-700 shadow-xs hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white transition-all group"
          title={nextEdition.name}
        >
          <span className="text-slate-400 font-medium">Next:</span>
          <span>{nextEdition.season || nextEdition.name}</span>
          <ChevronRight className="h-3.5 w-3.5 text-[#0A5FC4] transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
