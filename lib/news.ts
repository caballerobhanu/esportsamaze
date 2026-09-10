/* Client-safe news constants and pure helpers — no database imports.
   DB-backed queries live in lib/news-queries.ts. */

/* ── Categories & statuses ──────────────────────────────────────────────── */

export const ARTICLE_CATEGORIES = [
  { value: 'TOURNAMENTS', label: 'Tournaments & Matches', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  { value: 'ROSTERS', label: 'Rosters & Transfers', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  { value: 'ANALYSIS', label: 'Analysis & Stats', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10' },
  { value: 'INTERVIEWS', label: 'Interviews & Features', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
  { value: 'COMMUNITY', label: 'Community & Culture', color: 'text-pink-600 dark:text-pink-400 bg-pink-500/10' },
  { value: 'GENERAL', label: 'General Esports', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10' },
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]['value'];

export interface CategoryMeta {
  value: string;
  label: string;
  color: string;
  parts: string[];
}

export function getCategoryMeta(cat: string): CategoryMeta {
  const normalized = cat.trim();
  const matched = ARTICLE_CATEGORIES.find((c) => c.value.toLowerCase() === normalized.toLowerCase());
  if (matched) {
    return {
      value: matched.value,
      label: matched.label,
      color: matched.color,
      parts: [matched.label],
    };
  }

  // For custom or nested categories (e.g. "BGMI > Rosters" or "Valorant")
  const parts = parseCategoryHierarchy(normalized);
  const primaryPart = parts[0] || normalized;
  const colors = [
    'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    'text-purple-600 dark:text-purple-400 bg-purple-500/10',
    'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    'text-rose-600 dark:text-rose-400 bg-rose-500/10',
    'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10',
  ];
  const charCode = primaryPart.charCodeAt(0) || 0;
  const color = colors[charCode % colors.length];

  return {
    value: normalized,
    label: formatCategoryDisplay(normalized),
    color,
    parts,
  };
}

/** Parses nested/hierarchical categories like "BGMI > Rosters" or "Tournaments / International" */
export function parseCategoryHierarchy(cat: string): string[] {
  if (!cat) return [];
  return cat
    .split(/[>/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Formats a category hierarchy cleanly for display, e.g. "BGMI › Rosters" */
export function formatCategoryDisplay(cat: string): string {
  const parts = parseCategoryHierarchy(cat);
  if (parts.length <= 1) return cat;
  return parts.join(' › ');
}

export const ARTICLE_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PRIVATE', 'SCHEDULED', 'PUBLISHED'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export interface ArticleFaq {
  question: string;
  answer: string;
}

export function parseArticleFaqs(raw: unknown): ArticleFaq[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is { question?: unknown; answer?: unknown } => typeof item === 'object' && item !== null)
      .map((item) => ({
        question: String(item.question ?? '').trim(),
        answer: String(item.answer ?? '').trim(),
      }))
      .filter((item) => item.question && item.answer);
  }
  return [];
}

/* ── Visibility ─────────────────────────────────────────────────────────── */

/**
 * A story is publicly visible when published, or when it was scheduled and
 * its publish time has passed (status stays SCHEDULED until an admin edits it).
 * Private, pending, draft, and trashed (soft-deleted) stories are hidden unless admin.
 */
export function isVisibleArticle(
  a: {
    status: string;
    publishedAt: Date;
    deletedAt?: Date | null;
  },
  isAdmin = false
): boolean {
  if (a.deletedAt) return false;
  if (isAdmin) return true;
  return a.status === 'PUBLISHED' || (a.status === 'SCHEDULED' && a.publishedAt.getTime() <= Date.now());
}

/* ── Content format ─────────────────────────────────────────────────────── */

/** New articles store Tiptap HTML; legacy seed content is the old markdown subset. */
export function isHtmlContent(content: string): boolean {
  return content.trimStart().startsWith('<');
}

export function computeReadTimeMinutes(content: string): number {
  const text = isHtmlContent(content) ? content.replace(/<[^>]*>/g, ' ') : content;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function computeWordCount(content: string): number {
  const text = isHtmlContent(content) ? content.replace(/<[^>]*>/g, ' ') : content;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Convert the legacy markdown subset (seed-era articles) into plain HTML so the
 * WYSIWYG editor can open old stories without showing raw `##` markers.
 */
export function legacyMarkdownToHtml(md: string): string {
  let html = md
    .replace(/\r\n/g, '\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  html = html.replace(/^&gt; /gm, '> ');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  return html
    .split(/\n\n+/)
    .map((block) => {
      const t = block.trim();
      if (!t) return '';
      if (/^<(h2|h3|blockquote)/.test(t)) return t;
      if (/^<li/.test(t)) return `<ul>${t}</ul>`;
      return `<p>${t}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

export function formatArticleDate(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatArticleDateShort(d: Date): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Newsroom-style relative age ("3 hrs ago"); falls back to a short date after a week. */
export function timeAgo(d: Date): string {
  const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatArticleDateShort(d);
}
