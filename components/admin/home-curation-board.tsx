'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Search, Star, X } from 'lucide-react';

import { saveHomeCuration } from '@/app/admin/(panel)/home/actions';

export interface CurationCandidate {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  featured: boolean;
  publishedAt: string;
}

interface HomeCurationBoardProps {
  /** Published, illustrated articles eligible to be added (newest first). */
  pool: CurationCandidate[];
  initialFrontPage: CurationCandidate[];
  initialEditorPicks: CurationCandidate[];
  frontPageSlots: number;
  editorPicksSlots: number;
}

type Status = 'idle' | 'saving' | 'saved' | 'error';

/** Swap one entry with its neighbour; a no-op past either end. */
function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function HomeCurationBoard({
  pool,
  initialFrontPage,
  initialEditorPicks,
  frontPageSlots,
  editorPicksSlots,
}: HomeCurationBoardProps) {
  const [frontPage, setFrontPage] = React.useState(initialFrontPage);
  const [editorPicks, setEditorPicks] = React.useState(initialEditorPicks);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');

  const usedIds = React.useMemo(
    () => new Set([...frontPage, ...editorPicks].map((article) => article.id)),
    [frontPage, editorPicks],
  );

  const needle = query.trim().toLowerCase();
  const matches = React.useMemo(
    () =>
      pool
        .filter((article) => !usedIds.has(article.id))
        .filter((article) => !needle || article.title.toLowerCase().includes(needle))
        .slice(0, 12),
    [pool, usedIds, needle],
  );

  const add = (setter: React.Dispatch<React.SetStateAction<CurationCandidate[]>>, limit: number) =>
    (article: CurationCandidate) => {
      setStatus('idle');
      setter((list) =>
        list.length >= limit || list.some((entry) => entry.id === article.id) ? list : [...list, article],
      );
    };

  const addToFrontPage = add(setFrontPage, frontPageSlots);
  const addToPicks = add(setEditorPicks, editorPicksSlots);

  async function onSave() {
    setStatus('saving');
    try {
      await saveHomeCuration({
        frontPage: frontPage.map((article) => article.id),
        editorPicks: editorPicks.map((article) => article.id),
      });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-slate-500 dark:text-slate-400">
          Front Page slot 1 is the lead story. Anything not placed here fills from the featured/newest
          wire, so an empty list keeps the automatic layout. A story shown or removed here drops out of
          “Latest News &amp; Analysis” too.
        </p>
        <div className="flex items-center gap-3">
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {status === 'error' && (
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Save failed
            </span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={status === 'saving'}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0A5FC4] px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save curation
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionColumn
          title="Front Page"
          hint="Lead story first, then the four-up grid."
          slots={frontPageSlots}
          list={frontPage}
          onMove={(index, delta) => {
            setStatus('idle');
            setFrontPage((items) => move(items, index, delta));
          }}
          onRemove={(id) => {
            setStatus('idle');
            setFrontPage((items) => items.filter((item) => item.id !== id));
          }}
        />

        <SectionColumn
          title="Editor's Picks"
          hint="The hand-picked photographic cards."
          slots={editorPicksSlots}
          list={editorPicks}
          onMove={(index, delta) => {
            setStatus('idle');
            setEditorPicks((items) => move(items, index, delta));
          }}
          onRemove={(id) => {
            setStatus('idle');
            setEditorPicks((items) => items.filter((item) => item.id !== id));
          }}
        />
      </div>

      {/* Shared add-pool: both columns draw from the same search. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
        <h2 className="text-sm font-black uppercase tracking-tight">Add a story</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Published articles with a cover image, newest first. Use the buttons to place one on either section.
        </p>

        <label className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#070b14]">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stories by title…"
            className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-slate-400"
          />
        </label>

        <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/5">
          {matches.length === 0 ? (
            <li className="py-6 text-center text-xs text-slate-400">
              {pool.length === 0 ? 'No eligible stories yet.' : 'No more matching stories.'}
            </li>
          ) : (
            matches.map((article) => (
              <li key={article.id} className="flex items-center gap-3 py-2.5">
                <div className="h-9 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                  {article.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {article.featured && <Star className="h-3 w-3 shrink-0 fill-current text-amber-500" aria-label="Featured" />}
                    <span className="truncate text-xs font-bold">{article.title}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => addToFrontPage(article)}
                  disabled={frontPage.length >= frontPageSlots}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                >
                  <Plus className="h-3 w-3" /> Front page
                </button>
                <button
                  type="button"
                  onClick={() => addToPicks(article)}
                  disabled={editorPicks.length >= editorPicksSlots}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
                >
                  <Plus className="h-3 w-3" /> Pick
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function SectionColumn({
  title,
  hint,
  slots,
  list,
  onMove,
  onRemove,
}: {
  title: string;
  hint: string;
  slots: number;
  list: CurationCandidate[];
  onMove: (index: number, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-tight">{title}</h2>
        <span className="text-[11px] font-bold text-slate-400">
          {list.length} / {slots}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>

      {list.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400 dark:border-white/10">
          Empty — this section fills automatically.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {list.map((article, index) => (
            <li
              key={article.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-white/10"
            >
              <span className="w-5 shrink-0 text-center font-mono text-[11px] font-black text-slate-400">
                {index + 1}
              </span>
              <div className="h-9 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                {article.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.coverImage} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  {article.featured && <Star className="h-3 w-3 shrink-0 fill-current text-amber-500" aria-label="Featured" />}
                  <span className="truncate text-xs font-bold">{article.title}</span>
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Move down" disabled={index === list.length - 1} onClick={() => onMove(index, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton label="Remove" onClick={() => onRemove(article.id)}>
                  <X className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="cursor-pointer rounded-md border border-slate-200 p-1 text-slate-500 transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/10 dark:text-slate-400"
    >
      {children}
    </button>
  );
}
