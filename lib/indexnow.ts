/*
 * IndexNow — tells Bing and Yandex that a URL changed so they recrawl it sooner.
 * Google is not a participant; it picks changes up from the sitemap instead.
 *
 * The key is public by design: it must be served at /<key>.txt (see
 * app/<key>.txt/route.ts) so the endpoint can verify we own the host.
 */
import { baseUrl } from '@/lib/seo';

const INDEXNOW_KEY = 'b7e2f9a4c1d83e6057fa9b2c4d81e3f6';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

export function indexNowKey(): string {
  return INDEXNOW_KEY;
}

/**
 * Submit changed paths. Best-effort: a failed submission must never fail a
 * publish, and the crawlers re-read the sitemap on their own anyway.
 * Set INDEXNOW_DISABLED=1 to turn it off.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (process.env.INDEXNOW_DISABLED === '1') return;

  const base = baseUrl();
  const urlList = [...new Set(paths.filter(Boolean))].map((path) =>
    path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  );
  if (urlList.length === 0) return;

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(base).host,
        key: INDEXNOW_KEY,
        keyLocation: `${base}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* best effort — ignore */
  }
}

/** Article URLs for a set of slugs. */
export function articleUrls(slugs: string[]): string[] {
  return slugs.map((slug) => `/news/${slug}`);
}
