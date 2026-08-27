'use client';

import * as React from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const WP_API = 'https://esportsamaze.com/wp-json/wp/v2/posts';

interface WpPost {
  id: number;
  date: string;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string;
      media_details?: {
        sizes?: Record<string, { source_url: string } | undefined>;
      };
    }>;
  };
}

interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  link: string;
  date: string;
  image: string | null;
}

function decodeEntities(html: string): string {
  if (typeof document === 'undefined') return html;
  const el = document.createElement('textarea');
  el.innerHTML = html;
  return el.value;
}

function cleanHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImage(post: WpPost): string | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;
  return (
    media.media_details?.sizes?.medium?.source_url ??
    media.source_url ??
    null
  );
}

export function NewsSection() {
  const [posts, setPosts] = React.useState<NewsItem[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`${WP_API}?per_page=6&_embed`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: WpPost[]) => {
        if (cancelled || !Array.isArray(json)) return;
        setPosts(
          json.map((p) => ({
            id: p.id,
            title: cleanHtml(p.title.rendered),
            excerpt: cleanHtml(p.excerpt.rendered),
            link: p.link,
            date: p.date,
            image: extractImage(p),
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="news" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[#0A5FC4] dark:text-amber-400" />
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Latest News
          </h2>
        </div>
        <a
          href="https://esportsamaze.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-[#0A5FC4] dark:text-amber-400 hover:underline flex items-center gap-1"
        >
          Visit esportsamaze.com <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {failed ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
          News is unavailable right now. Check back soon.
        </div>
      ) : posts === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-slate-200 dark:bg-[#111726]" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-[#111726]" />
                <div className="h-3 w-full rounded bg-slate-100 dark:bg-[#0e1524]" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-[#0e1524]" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
          No news articles found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              {post.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image}
                  alt=""
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-video w-full bg-gradient-to-br from-[#0A5FC4]/20 via-indigo-500/10 to-transparent flex items-center justify-center">
                  <Newspaper className="w-8 h-8 text-[#0A5FC4]/40 dark:text-amber-400/30" />
                </div>
              )}

              <div className="p-4 space-y-2 flex flex-col flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {formatDate(post.date)}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#0A5FC4] dark:group-hover:text-amber-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
