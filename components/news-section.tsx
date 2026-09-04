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

// Session cache + fetch timeout: the WordPress API is slow/hang-prone, and
// refetching on every mount made the homepage news flash skeletons repeatedly.
const CACHE_KEY = 'ea-news-cache-v1';
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

interface CachedNews {
  at: number;
  posts: NewsItem[];
}

function readCache(): NewsItem[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedNews;
    if (Date.now() - parsed.at > CACHE_TTL_MS || !Array.isArray(parsed.posts)) return null;
    return parsed.posts;
  } catch {
    return null;
  }
}

function writeCache(posts: NewsItem[]): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), posts } satisfies CachedNews));
  } catch {
    // Ignore quota errors
  }
}

export function NewsSection() {
  // Hydrate straight from the session cache so repeat visits never flash skeletons
  const [posts, setPosts] = React.useState<NewsItem[] | null>(() => readCache());
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (readCache()) return; // cache is fresh — no refetch
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch(`${WP_API}?per_page=6&_embed`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: WpPost[]) => {
        clearTimeout(timeout);
        if (cancelled || !Array.isArray(json)) return;
        const items = json.map((p) => ({
          id: p.id,
          title: cleanHtml(p.title.rendered),
          excerpt: cleanHtml(p.excerpt.rendered),
          link: p.link,
          date: p.date,
          image: extractImage(p),
        }));
        setPosts(items);
        writeCache(items);
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <section id="news" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <Newspaper className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
            Latest Headlines
          </h2>
        </div>
        <a
          href="https://esportsamaze.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-[#0A5FC4] hover:underline dark:text-blue-400 flex items-center gap-1.5"
        >
          <span>More on esportsamaze.com</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {failed ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-white/10">
          News is unavailable right now. Check back soon.
        </div>
      ) : posts === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220] animate-pulse"
            >
              <div className="aspect-video bg-slate-100 dark:bg-white/5" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-1/3 rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="h-4 w-5/6 rounded-full bg-slate-200 dark:bg-white/10" />
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-white/10">
          No news articles found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-[#0b1220] transition-all flex flex-col"
            >
              <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 relative">
                {post.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.image}
                    alt=""
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Newspaper className="w-8 h-8 text-slate-300 dark:text-white/20" />
                  </div>
                )}
              </div>

              <div className="p-5 space-y-2.5 flex flex-col flex-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">
                  {formatDate(post.date)}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#0A5FC4] dark:group-hover:text-blue-300 transition-colors">
                  {post.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
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
