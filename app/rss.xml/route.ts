import prisma from '@/lib/prisma';
import { publishedVisibility } from '@/lib/news-queries';
import { baseUrl } from '@/lib/seo';

export const revalidate = 600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RSS 2.0 feed of the latest published stories. */
export async function GET() {
  const base = baseUrl();

  const articles = await prisma.article.findMany({
    where: publishedVisibility(),
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      authorName: true,
      category: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  const items = articles
    .map((a) => {
      const url = `${base}/news/${a.slug}`;
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(a.excerpt ?? a.title)}</description>
      <author>${escapeXml(a.authorName)}</author>
      <category>${escapeXml(a.category)}</category>
      <pubDate>${a.publishedAt.toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>eSportsAmaze — Esports News &amp; Editorial</title>
    <link>${base}/news</link>
    <description>Breaking esports news, roster transfers, tactical analysis, interviews, and tournament recaps.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=1800',
    },
  });
}
