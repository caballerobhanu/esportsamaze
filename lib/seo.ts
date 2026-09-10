/* Site-wide SEO helpers: base URL, metadata defaults and JSON-LD builders. */

export const SITE_NAME = 'eSportsAmaze';

export function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  return process.env.NODE_ENV === 'production' ? 'https://esportsamaze.com' : 'http://localhost:3000';
}

export function absoluteUrl(path: string): string {
  return `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Serialize a JSON-LD payload for a <script type="application/ld+json"> tag.
 * JSON.stringify leaves `<` unescaped, so any string containing `</script>`
 * (e.g. in an article title) would break out of the tag — escape it.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

const LOGO_PATH = '/logo.svg';

/* ── JSON-LD builders ───────────────────────────────────────────────────── */

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: baseUrl(),
    logo: absoluteUrl(LOGO_PATH),
    sameAs: ['https://x.com/esportsamaze', 'https://www.instagram.com/esportsamaze'],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: baseUrl(),
    publisher: { '@type': 'Organization', name: SITE_NAME },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/** ItemList of headlines for listing pages (homepage, /news hub). */
export function itemListJsonLd(articles: Array<{ slug: string; title: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: articles.map((article, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/news/${article.slug}`),
      name: article.title,
    })),
  };
}

export function faqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function newsArticleJsonLd(article: {
  slug: string;
  title: string;
  subHeadline?: string | null;
  excerpt: string | null;
  metaDescription?: string | null;
  coverImage: string | null;
  coverImageAlt?: string | null;
  ogImage?: string | null;
  category: string;
  tags: string[];
  secondaryKeywords?: string[];
  authorName: string;
  authorRole: string | null;
  publishedAt: Date;
  updatedAt: Date;
  readTimeMinutes: number;
  wordCount?: number;
}) {
  const image = article.ogImage || article.coverImage;
  const allKeywords = Array.from(
    new Set([...article.tags, ...(article.secondaryKeywords || [])].filter(Boolean))
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    ...(article.subHeadline ? { alternativeHeadline: article.subHeadline } : {}),
    description: article.metaDescription || article.excerpt || undefined,
    ...(image
      ? {
          image: {
            '@type': 'ImageObject',
            url: image,
            ...(article.coverImageAlt ? { description: article.coverImageAlt } : {}),
          },
        }
      : {}),
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: [
      {
        '@type': 'Person',
        name: article.authorName,
        ...(article.authorRole ? { jobTitle: article.authorRole } : {}),
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl(LOGO_PATH) },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/news/${article.slug}`) },
    articleSection: article.category,
    ...(allKeywords.length > 0 ? { keywords: allKeywords.join(', ') } : {}),
    ...(article.wordCount ? { wordCount: article.wordCount } : {}),
    inLanguage: 'en',
    isAccessibleForFree: true,
  };
}
