const WIKI_BASE = 'https://esportsamaze.in';

export const WIKI_PAGES = {
  about: 'ESportsAmaze:About',
  privacy: 'ESportsAmaze:Privacy_policy',
  disclaimer: 'ESportsAmaze:General_disclaimer',
} as const;

function cleanWikiHtml(html: string): string {
  return html
    // remove inline edit-section buttons
    .replace(/<span class="mw-editsection">[\s\S]*?<\/span>/g, '')
    // make relative wiki links absolute
    .replace(/href="\/index\.php\?title=/g, `href="${WIKI_BASE}/index.php?title=`)
    .replace(/href="\/wiki\//g, `href="${WIKI_BASE}/wiki/`)
    .replace(/src="\//g, `src="${WIKI_BASE}/`);
}

/**
 * Fetches the rendered HTML of a MediaWiki page via the parse API.
 * Cached for a day. Returns null when unavailable.
 */
export async function fetchWikiHtml(pageTitle: string): Promise<string | null> {
  try {
    const url = `${WIKI_BASE}/api.php?action=parse&page=${encodeURIComponent(
      pageTitle
    )}&format=json&prop=text&disabletoc=1`;
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      parse?: { text?: { '*': string } };
    };
    const html = json.parse?.text?.['*'];
    if (!html) return null;
    return cleanWikiHtml(html);
  } catch {
    return null;
  }
}
