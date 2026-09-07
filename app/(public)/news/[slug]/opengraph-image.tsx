import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { getCategoryMeta } from '@/lib/news';

export const alt = 'Article — eSportsAmaze';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Auto-generated social card: brand-styled title/category/author when no explicit OG image exists. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      title: true,
      category: true,
      authorName: true,
      publishedAt: true,
      status: true,
      deletedAt: true,
    },
  });

  const visible =
    article &&
    !article.deletedAt &&
    (article.status === 'PUBLISHED' ||
      (article.status === 'SCHEDULED' && article.publishedAt.getTime() <= Date.now()));

  const title = visible ? article!.title : 'eSportsAmaze';
  const category = visible ? getCategoryMeta(article!.category).label.toUpperCase() : 'ESPORTS NEWS';
  const author = visible ? article!.authorName : 'esportsamaze.com';
  const date = visible
    ? new Date(article!.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  // Clamp long headlines to two visual lines.
  const displayTitle = title.length > 110 ? `${title.slice(0, 108).trimEnd()}…` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0b1220 0%, #101b33 55%, #0b1220 100%)',
          padding: '64px 72px',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top row: brand + category */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              EA
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>eSportsAmaze</div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '8px 18px',
              borderRadius: 999,
              background: 'rgba(37, 99, 235, 0.18)',
              border: '1px solid rgba(37, 99, 235, 0.5)',
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: 2,
              color: '#93c5fd',
            }}
          >
            {category}
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            fontSize: displayTitle.length > 70 ? 52 : 62,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 1020,
          }}
        >
          {displayTitle}
        </div>

        {/* Bottom row: author + date */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid rgba(255,255,255,0.14)',
            paddingTop: 26,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 999,
                background: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 900,
                color: '#93c5fd',
              }}
            >
              {author.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{author}</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#94a3b8' }}>{date}</div>
        </div>
      </div>
    ),
    size
  );
}
