'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Clock,
  Eye,
  FileQuestion,
  HelpCircle,
  MessageSquare,
  Shield,
  Sparkles,
  Tags,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import type { ArticleCardSelectData } from '@/lib/news-queries';
import {
  ArticleFaq,
  categoryCrumbs,
  categorySlug,
  formatArticleDate,
  formatArticleDateShort,
  getCategoryMeta,
  headingOrdinals,
  isHtmlContent,
  parseArticleFaqs,
} from '@/lib/news';
import { slugify, formatMoney } from '@/lib/utils';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import { NewsShareButtons } from '@/components/news/news-share-buttons';
import { ReadingProgress } from '@/components/news/reading-progress';
import { TableOfContents } from '@/components/news/table-of-contents';
import { ViewPinger } from '@/components/news/view-pinger';
import { CommentsSection, type PublicComment } from '@/components/news/comments-section';
import { ArticleReactions } from '@/components/news/article-reactions';
import { BookmarkButton } from '@/components/news/bookmark-button';
import { serializeJsonLd } from '@/lib/seo';
import { AdSlot } from '@/components/ads/ad-slot';
import { RailSlot } from '@/components/ads/rail-slot';
import { AD_PLACEMENTS } from '@/lib/ads';

/* Shape of the article with its tournament, team, and player relations attached. */
export interface ArticleViewData {
  id: string;
  slug: string;
  title: string;
  subHeadline?: string | null;
  excerpt: string | null;
  keyTakeaways?: string[] | null;
  content: string;
  coverImage: string | null;
  coverImageAlt?: string | null;
  coverImageCaption?: string | null;
  coverImageCredit?: string | null;
  category: string;
  categories?: string[];
  tags: string[];
  authorName: string;
  authorRole: string | null;
  allowComments?: boolean;
  faqs?: unknown;
  readTimeMinutes: number;
  publishedAt: Date;
  views: number;
  tournament: {
    name: string;
    slug: string;
    tier: string;
    series: string | null;
    prizePool: number | null;
    currency?: string | null;
    startDate: Date | null;
    endDate: Date | null;
    game?: { slug: string } | null;
  } | null;
  team: {
    name: string;
    tag: string | null;
    slug: string | null;
    logoUrl: string | null;
    region: string | null;
    players: Array<{ ign: string; role: string | null }>;
  } | null;
  player?: {
    id: string;
    ign: string;
    firstName?: string | null;
    lastName?: string | null;
    role: string | null;
    avatarUrl: string | null;
    currentTeam?: { name: string; tag: string | null; logoUrl: string | null } | null;
  } | null;
}

interface ArticleViewProps {
  article: ArticleViewData;
  relatedArticles: ArticleCardSelectData[];
  adjacent: { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null };
  /** Admin-only preview mode: skips view ping/JSON-LD and shows a banner. */
  isPreview?: boolean;
  mostRead?: ArticleCardSelectData[];
  jsonLd?: Record<string, unknown>;
  faqJsonLd?: Record<string, unknown> | null;
  breadcrumbs?: Record<string, unknown>;
  comments?: PublicComment[];
  commentCount?: number;
}

/**
 * Legacy fallback for pre-WYSIWYG articles (markdown subset). New articles store
 * HTML directly from the Tiptap editor and skip this path entirely.
 */
function renderLegacyMarkdown(content: string): string {
  let html = content
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
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');

  const blocks = html.split(/\n\n+/);
  return blocks
    .map((b) => {
      const trimmed = b.trim();
      if (!trimmed) return '';
      if (/^<(h2|h3|blockquote)/.test(trimmed)) return trimmed;
      if (/^<li/.test(trimmed)) return `<ul>${trimmed}</ul>`;
      return `<p>${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Transform dynamic shortcodes like [standings], [match-scorecard], [tournament-card],
 * [team-card] and [player-card] into beautifully styled HTML interactive widgets.
 */
function transformShortcodes(html: string, defaultTournamentSlug?: string): string {
  if (!html) return '';

  let transformed = html;

  // [standings tournament="..."] or [standings]
  transformed = transformed.replace(
    /(?:<p>)?(?:<code>)?\[standings(?:\s+tournament=["']?([^"'\]]+)["']?)?\](?:<\/code>)?(?:<\/p>)?/gi,
    (_match, tourName) => {
      const targetSlug = tourName ? slugify(tourName) : defaultTournamentSlug || 'bgms-2026';
      const displayName = tourName || 'Tournament';
      const standingsHref = gameHref(DEFAULT_GAME_SLUG, `tournaments/${targetSlug}/standings`);
      return `
<div class="my-6 rounded-2xl border border-[var(--ed-hair)] bg-gradient-to-r from-[var(--ed-surface)] to-[var(--ed-sand)]/40 p-5 shadow-sm">
  <div class="flex items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--ed-blue)/10 text-(--ed-blue)">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
      </div>
      <div>
        <div class="text-[10px] font-black uppercase tracking-wider text-(--ed-blue)">Live Leaderboard Standings</div>
        <div class="text-sm font-black text-[var(--ed-ink)]">${displayName} Points Table & Bracket</div>
      </div>
    </div>
    <a href="${standingsHref}" class="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white hover:opacity-90">
      View Table ➔
    </a>
  </div>
</div>`;
    }
  );

  // [match-scorecard match="..."]
  transformed = transformed.replace(
    /(?:<p>)?(?:<code>)?\[match-scorecard(?:\s+match=["']?([^"'\]]+)["']?)?\](?:<\/code>)?(?:<\/p>)?/gi,
    (_match, matchNum) => {
      const matchText = matchNum ? `Match #${matchNum}` : 'Match Highlight';
      return `
<div class="my-6 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-4 shadow-sm">
  <div class="flex items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
        WWCD
      </div>
      <div>
        <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Match Dossier</span>
        <div class="text-sm font-extrabold text-[var(--ed-ink)]">${matchText} Detailed Breakdown</div>
      </div>
    </div>
    <span class="rounded bg-slate-100 dark:bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-500">Official Result</span>
  </div>
</div>`;
    }
  );

  // [tournament-card tournament="..."]
  transformed = transformed.replace(
    /(?:<p>)?(?:<code>)?\[tournament-card(?:\s+tournament=["']?([^"'\]]+)["']?)?\](?:<\/code>)?(?:<\/p>)?/gi,
    (_match, tourName) => {
      const name = tourName || 'Tournament';
      const tourSlug = slugify(name);
      const tournamentCardHref = gameHref(DEFAULT_GAME_SLUG, `tournaments/${tourSlug}`);
      return `
<div class="my-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-4 shadow-sm">
  <div class="flex items-center gap-3">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--ed-blue)/10 text-(--ed-blue)">
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    </div>
    <div>
      <div class="text-[10px] font-black uppercase tracking-wider text-[var(--ed-stone)]">Esports Tournament</div>
      <div class="text-sm font-extrabold text-[var(--ed-ink)]">${name}</div>
    </div>
  </div>
  <a href="${tournamentCardHref}" class="inline-flex items-center gap-1 text-xs font-bold text-(--ed-blue) hover:underline">
    Standings &amp; Matches ➔
  </a>
</div>`;
    }
  );

  // [team-card team="..."]
  transformed = transformed.replace(
    /(?:<p>)?(?:<code>)?\[team-card(?:\s+team=["']?([^"'\]]+)["']?)?\](?:<\/code>)?(?:<\/p>)?/gi,
    (_match, teamName) => {
      const name = teamName || 'Featured Squad';
      const teamSlug = slugify(name);
      const teamCardHref = gameHref(DEFAULT_GAME_SLUG, `teams/${teamSlug}`);
      return `
<div class="my-6 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-4 shadow-sm flex items-center justify-between gap-4">
  <div class="flex items-center gap-3">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ed-sand)] text-xs font-black text-[var(--ed-ink)]">
      ${name.slice(0, 3).toUpperCase()}
    </div>
    <div>
      <div class="text-[10px] font-black uppercase tracking-wider text-[var(--ed-stone)]">Esports Organization</div>
      <div class="text-sm font-extrabold text-[var(--ed-ink)]">${name}</div>
    </div>
  </div>
  <a href="${teamCardHref}" class="inline-flex items-center gap-1 text-xs font-bold text-(--ed-blue) hover:underline">
    Squad Roster ➔
  </a>
</div>`;
    }
  );

  // [player-card player="..."]
  transformed = transformed.replace(
    /(?:<p>)?(?:<code>)?\[player-card(?:\s+player=["']?([^"'\]]+)["']?)?\](?:<\/code>)?(?:<\/p>)?/gi,
    (_match, playerIgn) => {
      const ign = playerIgn || 'Pro Athlete';
      return `
<div class="my-6 inline-flex items-center gap-3 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] px-4 py-2.5 shadow-sm">
  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--ed-blue)/10 text-xs font-black text-(--ed-blue)">
    ${ign.slice(0, 2).toUpperCase()}
  </div>
  <div>
    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pro Player</div>
    <div class="text-xs font-black text-[var(--ed-ink)]">${ign}</div>
  </div>
</div>`;
    }
  );

  // [toc] shortcode -> Inline Table of Contents block
  transformed = transformed.replace(
    /(?:<p>)?(?:<code>)?\[toc\](?:<\/code>)?(?:<\/p>)?/gi,
    () => {
      return `
<div class="my-8 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-5 shadow-xs" data-inline-toc>
  <div class="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-(--ed-blue)">
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    Table of Contents
  </div>
  <div class="inline-toc-links text-xs space-y-1.5 font-medium text-[var(--ed-stone)]">
    <!-- Populated dynamically by client or provides immediate structure -->
  </div>
</div>`;
    }
  );

  // Auto-detect Instagram posts (either wrapped in blockquote or standalone link) and render official Instagram Embed
  transformed = transformed.replace(
    /<blockquote([\s\S]*?https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)[\s\S]*?)<\/blockquote>(?:\s*<\/blockquote>)?/gi,
    (_match, fullInner, postId) => {
      const isCaptioned = fullInner.includes('data-instgrm-captioned');
      const embedUrl = isCaptioned
        ? `https://www.instagram.com/p/${postId}/embed/captioned/`
        : `https://www.instagram.com/p/${postId}/embed/`;
      const minH = isCaptioned ? '880px' : '580px';
      const defH = isCaptioned ? '1050px' : '720px';
      return `
<div class="my-8 flex justify-center w-full">
  <div class="w-full max-w-[540px] rounded-2xl border border-[var(--ed-hair)] bg-white shadow-sm dark:bg-[#0f172a] p-1">
    <iframe
      src="${embedUrl}"
      data-instagram-embed="true"
      class="w-full border-none rounded-xl"
      style="min-height: ${minH}; height: ${defH};"
      allowtransparency="true"
      allow="encrypted-media"
      scrolling="no"
    ></iframe>
  </div>
</div>`;
    }
  );

  // Standalone Instagram links in <p><a href="instagram.com/p/...">...</a></p>
  transformed = transformed.replace(
    /<p>\s*<a[^>]*href=["'](https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)[^"']*)["'][^>]*>(?:https?:\/\/[^<]+|View Post on Instagram)<\/a>\s*<\/p>/gi,
    (_match, fullUrl, postId) => {
      const isCaptioned = fullUrl.includes('captioned');
      const embedUrl = isCaptioned
        ? `https://www.instagram.com/p/${postId}/embed/captioned/`
        : `https://www.instagram.com/p/${postId}/embed/`;
      const minH = isCaptioned ? '880px' : '580px';
      const defH = isCaptioned ? '1050px' : '720px';
      return `
<div class="my-8 flex justify-center w-full">
  <div class="w-full max-w-[540px] rounded-2xl border border-[var(--ed-hair)] bg-white shadow-sm dark:bg-[#0f172a] p-1">
    <iframe
      src="${embedUrl}"
      data-instagram-embed="true"
      class="w-full border-none rounded-xl"
      style="min-height: ${minH}; height: ${defH};"
      allowtransparency="true"
      allow="encrypted-media"
      scrolling="no"
    ></iframe>
  </div>
</div>`;
    }
  );

  return transformed;
}

/**
 * Splits rendered article HTML after the Nth closing </p> so an in-article unit
 * can sit mid-copy. Returns the whole document as `head` when the article has
 * too few paragraphs to split.
 */
function splitArticleHtml(html: string, after: number): { head: string; tail: string } {
  const re = /<\/p>/gi;
  let seen = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    seen += 1;
    if (seen === after) {
      const cut = match.index + match[0].length;
      return { head: html.slice(0, cut), tail: html.slice(cut) };
    }
  }
  return { head: html, tail: '' };
}

/** The full reading view of an article, shared by the public page and the admin draft preview. */
export function ArticleView({
  article,
  relatedArticles,
  adjacent,
  isPreview = false,
  mostRead,
  jsonLd,
  faqJsonLd,
  breadcrumbs,
  comments,
  commentCount,
}: ArticleViewProps) {
  const categoryMeta = getCategoryMeta(article.category);
  const crumbs = categoryCrumbs(article.category);
  const isHtml = isHtmlContent(article.content);
  const parsedFaqs = parseArticleFaqs(article.faqs);

  const renderedContent = React.useMemo(() => {
    const raw = isHtml ? article.content : renderLegacyMarkdown(article.content);
    return transformShortcodes(raw, article.tournament?.slug);
  }, [article.content, isHtml, article.tournament?.slug]);

  // One split point, reused for the inline unit. Both halves stay inside a single
  // body wrapper so the table of contents still finds every heading.
  const { head: bodyHead, tail: bodyTail } = React.useMemo(
    () => splitArticleHtml(renderedContent, 2),
    [renderedContent]
  );

  // Hydrate in-content [toc] shortcode if present
  React.useEffect(() => {
    const inlineTocContainers = document.querySelectorAll('[data-inline-toc]');
    if (!inlineTocContainers.length) return;

    const bodyEl = document.querySelector(isHtml ? '.article-body' : '.article-legacy');
    if (!bodyEl) return;

    const headings = Array.from(bodyEl.querySelectorAll('h2, h3'));
    if (!headings.length) return;

    inlineTocContainers.forEach((container) => {
      const listEl = container.querySelector('.inline-toc-links');
      if (!listEl) return;
      listEl.innerHTML = '';

      const ordinals = headingOrdinals(headings.map((h) => (h.tagName === 'H2' ? 2 : 3)));
      headings.forEach((h, idx) => {
        if (!h.id) h.id = `section-${idx + 1}`;
        const isH3 = h.tagName === 'H3';
        const a = document.createElement('a');
        a.href = `#${h.id}`;
        a.className = `block truncate hover:text-(--ed-blue) hover:underline transition-colors ${
          isH3 ? 'pl-3.5 opacity-80' : 'font-bold text-[var(--ed-ink)]'
        }`;
        a.textContent = `${isH3 ? '· ' : `${ordinals[idx]}. `}${h.textContent || ''}`;
        a.onclick = (e) => {
          e.preventDefault();
          document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        listEl.appendChild(a);
      });
    });
  }, [renderedContent, isHtml]);

  // Wrap top-level data tables so a wide table scrolls inside the article
  // column rather than overflowing it on narrow screens. Tables saved from the
  // editor already carry a .tableWrapper (and nested tables are left alone),
  // so this only touches tables without one; the check makes it idempotent.
  React.useEffect(() => {
    document.querySelectorAll('.article-body, .article-legacy').forEach((body) => {
      body.querySelectorAll('table').forEach((table) => {
        const parent = table.parentElement;
        if (!parent) return;
        if (parent.classList.contains('article-table-wrap')) return;
        if (parent.classList.contains('tableWrapper')) return;
        if (parent.closest('table')) return;
        const wrap = document.createElement('div');
        wrap.className = 'article-table-wrap';
        parent.insertBefore(wrap, table);
        wrap.appendChild(table);
      });
    });
  }, [renderedContent]);

  // Load and trigger Twitter/X and Instagram embed widgets
  React.useEffect(() => {
    // Twitter/X widgets
    if (document.querySelector('blockquote.twitter-tweet')) {
      const win = window as any;
      if (win.twttr?.widgets) {
        win.twttr.widgets.load();
      } else {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.charset = 'utf-8';
        document.body.appendChild(script);
      }
    }

    // Instagram embeds & dynamic iframe height measuring
    const handleInstagramMessage = (e: MessageEvent) => {
      if (typeof e.origin === 'string' && e.origin.includes('instagram.com')) {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data?.type === 'MEASURE' && typeof data?.details?.height === 'number') {
            const iframes = document.querySelectorAll<HTMLIFrameElement>('iframe[data-instagram-embed]');
            iframes.forEach((iframe) => {
              if (iframe.contentWindow === e.source || !e.source) {
                iframe.style.height = `${Math.max(data.details.height, 800)}px`;
              }
            });
          }
        } catch {
          // ignore non-json messages
        }
      }
    };
    window.addEventListener('message', handleInstagramMessage);

    if (document.querySelector('blockquote.instagram-media')) {
      const win = window as any;
      if (win.instgrm?.Embeds) {
        win.instgrm.Embeds.process();
      } else {
        const script = document.createElement('script');
        script.src = 'https://www.instagram.com/embed.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      window.removeEventListener('message', handleInstagramMessage);
    };
  }, [renderedContent]);

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {!isPreview && jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      )}
      {!isPreview && faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
      )}
      {!isPreview && breadcrumbs && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} />
      )}
      {!isPreview && <ReadingProgress />}
      {!isPreview && <ViewPinger slug={article.slug} />}

      {isPreview && (
        <div className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2.5 text-center text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Draft Preview — this article is not publicly visible yet
        </div>
      )}

      {/* Breadcrumb bar */}
      <div className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)]">
        <div className="mx-auto flex w-full max-w-[var(--page-max-width)] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <nav className="ed-label flex min-w-0 flex-wrap items-center gap-2">
            <Link href="/" className="shrink-0 hover:text-[var(--ed-blue)]">
              Home
            </Link>
            <span>/</span>
            <Link href="/news" className="shrink-0 hover:text-[var(--ed-blue)]">
              News
            </Link>
            {crumbs.length > 1 ? (
              crumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.slug}>
                  <span>/</span>
                  <Link
                    href={`/news/category/${crumb.slug}`}
                    className={`truncate hover:underline ${
                      idx === crumbs.length - 1 ? 'text-[var(--ed-blue)]' : 'hover:text-[var(--ed-blue)]'
                    }`}
                  >
                    {crumb.name}
                  </Link>
                </React.Fragment>
              ))
            ) : (
              <>
                <span>/</span>
                <Link
                  href={`/news/category/${categorySlug(article.category)}`}
                  className="truncate text-[var(--ed-blue)] hover:underline"
                >
                  {categoryMeta.label}
                </Link>
              </>
            )}
          </nav>

          <Link href="/news" className="ed-label inline-flex shrink-0 items-center gap-1 hover:text-[var(--ed-blue)]">
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to News
          </Link>
        </div>
      </div>

      {/* Article layout: content + right rail (TOC) */}
      <div className="mx-auto grid w-full max-w-[var(--page-max-width)] grid-cols-1 gap-10 px-4 py-8 sm:px-6 sm:py-12 xl:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        <article className="mx-auto w-full max-w-4xl xl:mx-0">
          {/* Category & Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/news/category/${categorySlug(article.category)}`}
              className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${categoryMeta.color}`}
            >
              {categoryMeta.label}
            </Link>

            {/* Additional categories if assigned */}
            {article.categories &&
              article.categories
                .filter((c) => c.toLowerCase() !== article.category.toLowerCase())
                .map((secCat) => {
                  const secMeta = getCategoryMeta(secCat);
                  return (
                    <Link
                      key={secCat}
                      href={`/news/category/${categorySlug(secCat)}`}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${secMeta.color}`}
                    >
                      {secMeta.label}
                    </Link>
                  );
                })}
            <span className="ed-label flex items-center gap-1 text-[11px]">
              <Calendar className="h-3.5 w-3.5" />
              {formatArticleDate(article.publishedAt)}
            </span>
            <span className="ed-label flex items-center gap-1 text-[11px]">
              <Clock className="h-3.5 w-3.5" />
              {article.readTimeMinutes} min read
            </span>
            <span className="ed-label flex items-center gap-1 text-[11px]">
              <Eye className="h-3.5 w-3.5" />
              {article.views.toLocaleString('en-IN')} views
            </span>
            {(commentCount ?? 0) > 0 && (
              <span className="ed-label flex items-center gap-1 text-[11px]">
                <MessageSquare className="h-3.5 w-3.5" />
                {commentCount} comment{(commentCount ?? 0) === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {/* Primary Headline */}
          <h1 className="font-display mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl sm:leading-tight lg:text-[2.75rem]">
            {article.title}
          </h1>

          {/* Sub-Headline / Standfirst */}
          {article.subHeadline && (
            <h2 className="mt-3 text-base font-semibold leading-snug text-slate-600 dark:text-slate-300 sm:text-xl">
              {article.subHeadline}
            </h2>
          )}

          {/* Excerpt Hook */}
          {article.excerpt && (
            <p className="mt-4 border-l-2 border-[var(--ed-blue)] pl-4 text-base font-medium leading-relaxed text-[var(--ed-stone)] sm:text-lg">
              {article.excerpt}
            </p>
          )}

          {/* Key Takeaways (TL;DR Box) */}
          {article.keyTakeaways && article.keyTakeaways.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 p-5 shadow-xs dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--ed-ink)]">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Key Takeaways
              </div>
              <ul className="mt-3 space-y-2">
                {article.keyTakeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-[var(--ed-ink)]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--ed-blue)/10 text-[11px] font-black text-(--ed-blue)">
                      ✓
                    </span>
                    <span className="leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Author info + share buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-[var(--ed-hair)] py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ed-sand)] text-sm font-extrabold text-[var(--ed-ink)]">
                {article.authorName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <Link
                  href={`/news/author/${slugify(article.authorName)}`}
                  className="flex items-center gap-1.5 text-xs font-extrabold hover:text-[var(--ed-blue)]"
                  title={`All stories by ${article.authorName}`}
                >
                  <User className="h-3 w-3 text-[var(--ed-stone)]" />
                  {article.authorName}
                </Link>
                <div className="ed-label text-[11px]">{article.authorRole || 'Editorial Contributor'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NewsShareButtons title={article.title} slug={article.slug} />
              <BookmarkButton slug={article.slug} title={article.title} />
            </div>
          </div>

          {/* Ad: slim bar. Sits below the byline rather than under the breadcrumb
              so there is real content above it on mobile. */}
          {!isPreview && <AdSlot placement={AD_PLACEMENTS.articleTop} />}

          {/* Hero Cover Image + Alt, Caption, and Credit */}
          {article.coverImage && (
            <div className="mt-8">
              <div className="overflow-hidden rounded-2xl border border-[var(--ed-hair)] bg-[#0f1216]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.coverImage}
                  alt={article.coverImageAlt || article.title}
                  className="max-h-[520px] w-full object-cover"
                />
              </div>
              {(article.coverImageCaption || article.coverImageCredit) && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[var(--ed-stone)]">
                  {article.coverImageCaption && <span className="italic">{article.coverImageCaption}</span>}
                  {article.coverImageCredit && (
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Photo: {article.coverImageCredit}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Article Body. Split at one paragraph boundary so the inline unit can
              sit mid-copy; both halves repeat the body class so the paragraph
              spacing holds, and the wrapper carries it for the table of contents. */}
          <div className={`mt-8 sm:mt-10 ${isHtml ? 'article-body' : 'article-legacy'}`}>
            <div
              className={isHtml ? 'article-body' : 'article-legacy'}
              dangerouslySetInnerHTML={{ __html: bodyHead }}
            />
            {bodyTail !== '' && !isPreview && (
              <AdSlot placement={AD_PLACEMENTS.articleInline} className="xl:hidden" />
            )}
            {bodyTail !== '' && (
              <div
                className={isHtml ? 'article-body' : 'article-legacy'}
                dangerouslySetInnerHTML={{ __html: bodyTail }}
              />
            )}
          </div>

          {/* Ad: end of the article body */}
          {!isPreview && <AdSlot placement={AD_PLACEMENTS.articleEnd} />}

          {/* Interactive Frequently Asked Questions (FAQ) Accordion */}
          {parsedFaqs.length > 0 && (
            <div className="mt-12 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-6 shadow-xs">
              <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--ed-ink)]">
                <HelpCircle className="h-4 w-4 text-emerald-500" />
                Frequently Asked Questions
              </div>
              <p className="mt-1 text-xs text-[var(--ed-stone)]">
                Quick, verified answers to common questions regarding this story.
              </p>
              <div className="mt-4 divide-y divide-[var(--ed-hair)]">
                {parsedFaqs.map((faq, idx) => (
                  <details key={idx} className="group py-3.5 cursor-pointer">
                    <summary className="flex items-center justify-between gap-3 text-sm font-bold text-[var(--ed-ink)] transition-colors hover:text-(--ed-blue) list-none">
                      <span>{faq.question}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ed-stone)] transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="mt-2.5 pr-6 text-xs leading-relaxed text-[var(--ed-stone)]">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Reactions */}
          {!isPreview && <ArticleReactions slug={article.slug} />}

          {/* Contextual Dossier Widgets: Tournament, Team, and Player */}
          {(article.tournament || article.team || article.player) && (
            <div className="ed-card mt-12 space-y-4 p-6">
              <div className="ed-label flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--ed-blue)]" />
                Event & Competitor Dossier
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {article.tournament && (
                  <div className="flex flex-col justify-between rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="ed-chip px-2 py-0.5 text-[9px] font-extrabold uppercase">
                          {article.tournament.tier} Event
                        </span>
                        {article.tournament.prizePool && (
                          <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                            {formatMoney(article.tournament.prizePool, article.tournament.currency || 'USD')}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2 text-sm font-extrabold">{article.tournament.name}</h4>
                    </div>
                    <Link
                      href={gameHref(article.tournament.game?.slug || DEFAULT_GAME_SLUG, `tournaments/${article.tournament.slug}`)}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--ed-blue)] hover:underline"
                    >
                      Standings & Matches <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}

                {article.team && (
                  <div className="flex flex-col justify-between rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {article.team.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={article.team.logoUrl}
                            alt={article.team.name}
                            className="h-6 w-6 rounded object-contain"
                          />
                        ) : (
                          <Shield className="h-5 w-5 text-[var(--ed-stone)]" />
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold">{article.team.name}</h4>
                          {article.team.region && <span className="ed-label text-[10px]">{article.team.region}</span>}
                        </div>
                      </div>

                      {article.team.players.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {article.team.players.map((p) => (
                            <span key={p.ign} className="ed-chip px-1.5 py-0.5 text-[10px]">
                              {p.ign}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {article.team.slug && (
                      <Link
                        href={gameHref(DEFAULT_GAME_SLUG, `teams/${article.team.slug}`)}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        Squad Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )}

                {article.player && (
                  <div className="flex flex-col justify-between rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 p-4">
                    <div>
                      <div className="flex items-center gap-3">
                        {article.player.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={article.player.avatarUrl}
                            alt={article.player.ign}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--ed-blue)/10 text-xs font-black text-(--ed-blue)">
                            {article.player.ign.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-extrabold">{article.player.ign}</h4>
                          <span className="ed-label text-[10px]">
                            {article.player.firstName || article.player.lastName
                              ? `${article.player.firstName ?? ''} ${article.player.lastName ?? ''}`.trim()
                              : article.player.role || 'Pro Athlete'}
                          </span>
                        </div>
                      </div>

                      {article.player.currentTeam && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[var(--ed-stone)]">
                          <span>Team:</span>
                          <span className="font-bold text-[var(--ed-ink)]">{article.player.currentTeam.name}</span>
                        </div>
                      )}
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-(--ed-blue)">
                      Featured Pro Athlete
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-1.5 border-t border-[var(--ed-hair)] pt-6">
              <span className="ed-label mr-1 flex items-center gap-1.5">
                <Tags className="h-3.5 w-3.5" />
                Tags:
              </span>
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/news/tag/${encodeURIComponent(tag)}`}
                  className="ed-chip hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Prev / Next navigation */}
          {(adjacent.prev || adjacent.next) && (
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {adjacent.prev ? (
                <Link
                  href={`/news/${adjacent.prev.slug}`}
                  className="ed-card group p-4 transition-colors hover:border-[var(--ed-blue)]"
                >
                  <span className="ed-label flex items-center gap-1 text-[10px]">
                    <ArrowLeft className="h-3 w-3" /> Older story
                  </span>
                  <span className="mt-1.5 block text-sm font-bold group-hover:text-[var(--ed-blue)]">
                    {adjacent.prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {adjacent.next ? (
                <Link
                  href={`/news/${adjacent.next.slug}`}
                  className="ed-card group p-4 text-right transition-colors hover:border-[var(--ed-blue)]"
                >
                  <span className="ed-label flex items-center justify-end gap-1 text-[10px]">
                    Newer story <ArrowRight className="h-3 w-3" />
                  </span>
                  <span className="mt-1.5 block text-sm font-bold group-hover:text-[var(--ed-blue)]">
                    {adjacent.next.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}

          {/* Related stories */}
          {relatedArticles.length > 0 && (
            <div className="mt-14 border-t border-[var(--ed-hair)] pt-10">
              <h3 className="font-display mb-6 text-xl font-extrabold tracking-tight">More Stories You Might Like</h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {relatedArticles.map((rel) => {
                  const relCat = getCategoryMeta(rel.category);
                  return (
                    <Link
                      key={rel.id}
                      href={`/news/${rel.slug}`}
                      className="ed-card group flex flex-col justify-between p-4 transition-colors hover:border-[var(--ed-blue)]"
                    >
                      <div>
                        {rel.coverImage && (
                          <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-[#0f1216]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={rel.coverImage}
                              alt={rel.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${relCat.color}`}
                        >
                          {relCat.label.split(' ')[0]}
                        </span>
                        <h4 className="font-display mt-2 line-clamp-2 text-sm font-extrabold transition-colors group-hover:text-[var(--ed-blue)]">
                          {rel.title}
                        </h4>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-[var(--ed-hair)] pt-3 text-[11px] font-bold text-[var(--ed-stone)]">
                        <span>{formatArticleDateShort(rel.publishedAt)}</span>
                        <span>{rel.readTimeMinutes}m read</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments Discussion */}
          {article.allowComments !== false ? (
            <CommentsSection
              slug={article.slug}
              initialComments={comments ?? []}
              approvedCount={commentCount ?? comments?.length ?? 0}
            />
          ) : (
            <div className="mt-12 rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-5 text-center text-xs font-semibold text-[var(--ed-stone)]">
              Comments are disabled for this article.
            </div>
          )}
        </article>

        {/* Right rail: TOC + Most Read (xl+) */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <TableOfContents containerSelector={isHtml ? '.article-body' : '.article-legacy'} />
            {/* Ad: portrait unit. Mounted only once the rail is on screen, so no
                display:none ad unit ever sits in the page. */}
            {!isPreview && <RailSlot />}
            {mostRead && mostRead.length > 0 && (
              <div className="ed-card p-4">
                <div className="ed-label mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--ed-blue)]" />
                  Most read this month
                </div>
                <ol className="space-y-2.5">
                  {mostRead.map((a, i) => (
                    <li key={a.id}>
                      <Link href={`/news/${a.slug}`} className="group flex items-start gap-2.5">
                        <span className="font-display text-base font-black leading-none text-[var(--ed-hair)] transition-colors group-hover:text-[var(--ed-blue)]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="line-clamp-2 text-xs font-bold leading-snug transition-colors group-hover:text-[var(--ed-blue)]">
                          {a.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <Link href="/news" className="ed-chip w-full justify-center px-3 py-2 hover:border-[var(--ed-blue)]">
              <ChevronLeft className="h-3.5 w-3.5" />
              All news
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
