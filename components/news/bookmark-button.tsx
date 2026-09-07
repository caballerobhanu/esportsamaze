'use client';

import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { isSaved, toggleSaved } from '@/lib/bookmarks';

/** Save-for-later toggle stored in localStorage (no account required). */
export function BookmarkButton({ slug, title }: { slug: string; title: string }) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage is a one-shot, post-mount sync (SSR renders the unsaved state)
    setSaved(isSaved(slug));
    setMounted(true);
  }, [slug]);

  return (
    <button
      type="button"
      onClick={() => setSaved(toggleSaved(slug))}
      title={saved ? 'Remove from saved stories' : 'Save for later'}
      aria-pressed={saved}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
        saved
          ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white'
          : 'border-[var(--ed-hair)] text-[var(--ed-stone)] hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)]'
      }`}
    >
      {mounted && saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      <span className="sr-only">{`${saved ? 'Remove' : 'Save'} “${title}” ${saved ? 'from' : 'to'} saved stories`}</span>
    </button>
  );
}
