import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { clientIp } from '@/lib/admin-auth';
import { hitRateLimit } from '@/lib/rate-limit';
import { publishedVisibility } from '@/lib/news-queries';

export const dynamic = 'force-dynamic';

const MAX_PER_WINDOW = 30;
const WINDOW_MS = 60 * 1000;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate-limit per IP so the counter can't be inflated by scripted POSTs,
  // and only count views of publicly visible articles (not drafts/scheduled).
  const ip = await clientIp();
  if (hitRateLimit(`view:${ip}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const article = await prisma.article.findFirst({
      where: { slug, ...publishedVisibility() },
      select: { id: true },
    });
    if (!article) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const updated = await prisma.article.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
    return NextResponse.json({ views: updated.views });
  } catch {
    // Unknown slug or not visible — don't error the client.
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
