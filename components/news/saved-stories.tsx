'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookmarkX, Clock, Loader2 } from 'lucide-react';
import { getSavedSlugs, toggleSaved } from '@/lib/bookmarks';
import { getCategoryMeta, timeAgo } from '@/lib/news';

interface SavedArticle {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string;
  readTimeMinutes: number;
  publishedAt: string;
}

/** Reader's saved stories (localStorage bookmarks resolved against published articles). */
export function SavedStories() {
  const [articles, setArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    const slugs = getSavedSlugs();
    if (slugs.length === 0) {
      setArticles([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/news/by-slugs?slugs=${encodeURIComponent(slugs.join(','))}`);
      if (res.ok) {
        const json = (await res.json()) as { articles: SavedArticle[] };
        setArticles(json.articles ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot post-mount load from localStorage + API
    void load();
  }, [load]);

  const remove = (slug: string) => {
    toggleSaved(slug);
    setArticles((list) => list.filter((a) => a.slug !== slug));
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-[var(--ed-stone)]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="ed-card mt-2 p-12 text-center">
        <Bookmark className="mx-auto h-12 w-12 text-[var(--ed-hair)]" aria-hidden />
        <h2 className="mt-4 text-xl font-extrabold tracking-tight">No saved stories yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--ed-stone)]">
          Tap the bookmark icon on any article to keep it here for later — it stays on this device.
        </p>
        <Link href="/news" className="ed-btn mt-5 inline-block px-4 py-2 text-xs">
          Browse the latest stories
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((a) => {
        const cat = getCategoryMeta(a.category);
        return (
          <div key={a.slug} className="ed-card group relative flex flex-col justify-between p-4">
            <div>
              {a.coverImage && (
                <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-[#0f1216]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.coverImage}
                    alt={a.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <span className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${cat.color}`}>
                {cat.label.split(' ')[0]}
              </span>
              <Link href={`/news/${a.slug}`}>
                <h3 className="font-display mt-2 line-clamp-2 text-sm font-extrabold leading-snug transition-colors group-hover:text-[var(--ed-blue)]">
                  {a.title}
                </h3>
              </Link>
              {a.excerpt && (
                <p className="mt-1.5 line-clamp-2 text-xs font-medium text-[var(--ed-stone)]">{a.excerpt}</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--ed-hair)] pt-3 text-[11px] font-bold text-[var(--ed-stone)]">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {a.readTimeMinutes}m · {timeAgo(new Date(a.publishedAt))}
              </span>
              <button
                type="button"
                onClick={() => remove(a.slug)}
                title="Remove from saved"
                className="inline-flex cursor-pointer items-center gap-1 text-[var(--ed-stone)] hover:text-rose-500"
              >
                <BookmarkX className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
