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
    <section id="news" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[var(--ed-blue)]" />
          <h2 className="font-display text-xl font-medium tracking-tight text-[var(--ed-ink)]">
            Latest News
          </h2>
        </div>
        <a
          href="https://esportsamaze.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[var(--ed-blue)] hover:underline flex items-center gap-1"
        >
          Visit esportsamaze.com <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {failed ? (
        <div className="rounded-xl border border-dashed border-[var(--ed-hair)] p-8 text-center text-xs text-[var(--ed-stone)]">
          News is unavailable right now. Check back soon.
        </div>
      ) : posts === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="ed-card overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-[var(--ed-sand)]/50" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-3/4 rounded bg-[var(--ed-sand)]/60" />
                <div className="h-3 w-full rounded bg-[var(--ed-sand)]/40" />
                <div className="h-3 w-1/2 rounded bg-[var(--ed-sand)]/40" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--ed-hair)] p-8 text-center text-xs text-[var(--ed-stone)]">
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
              className="group ed-card hover:border-[var(--ed-blue)] transition-colors flex flex-col"
            >
              {post.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image}
                  alt=""
                  className="aspect-video w-full object-cover border-b border-[var(--ed-hair)]"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-video w-full bg-[var(--ed-sand)]/40 border-b border-[var(--ed-hair)] flex items-center justify-center">
                  <Newspaper className="w-8 h-8 text-[var(--ed-stone)]/40" />
                </div>
              )}

              <div className="p-4 space-y-2 flex flex-col flex-1">
                <span className="text-[11px] font-semibold text-[var(--ed-stone)]">
                  {formatDate(post.date)}
                </span>
                <h3 className="text-sm font-semibold text-[var(--ed-ink)] leading-snug line-clamp-2 group-hover:text-[var(--ed-blue)] transition-colors">
                  {post.title}
                </h3>
                <p className="text-xs text-[var(--ed-stone)] leading-relaxed line-clamp-3">
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
