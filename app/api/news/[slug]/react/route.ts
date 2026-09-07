import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hitRateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/admin-auth';
import { publishedVisibility } from '@/lib/news-queries';

export const dynamic = 'force-dynamic';

const REACTION_KINDS = ['LIKE', 'HYPE', 'INSIGHT'] as const;
type ReactionKind = (typeof REACTION_KINDS)[number];

function isReactionKind(v: unknown): v is ReactionKind {
  return typeof v === 'string' && (REACTION_KINDS as readonly string[]).includes(v);
}

async function countsFor(articleId: string, sessionId: string) {
  const rows = await prisma.articleReaction.groupBy({
    by: ['kind'],
    where: { articleId },
    _count: { id: true },
  });
  const counts: Record<string, number> = { LIKE: 0, HYPE: 0, INSIGHT: 0 };
  for (const r of rows) counts[r.kind] = r._count.id;

  const mine = sessionId
    ? (
        await prisma.articleReaction.findMany({
          where: { articleId, sessionId },
          select: { kind: true },
        })
      ).map((r) => r.kind)
    : [];

  return { counts, mine, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sessionId = (new URL(req.url).searchParams.get('sessionId') ?? '').trim().slice(0, 64);

  const article = await prisma.article.findFirst({
    where: { slug, ...publishedVisibility() },
    select: { id: true },
  });
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  return NextResponse.json(await countsFor(article.id, sessionId));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Simple CSRF narrowing: a cross-site form POST arrives as text/plain
  // (form-encoded), never as application/json — reject those before parsing.
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  }

  let payload: { kind?: string; sessionId?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { kind, sessionId } = payload;
  if (!isReactionKind(kind) || !sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
    return NextResponse.json({ error: 'Invalid reaction payload' }, { status: 400 });
  }

  const ip = await clientIp();
  if (hitRateLimit(`react:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many reactions — slow down.' }, { status: 429 });
  }

  const article = await prisma.article.findFirst({
    where: { slug, ...publishedVisibility() },
    select: { id: true },
  });
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const existing = await prisma.articleReaction.findUnique({
    where: { articleId_sessionId_kind: { articleId: article.id, sessionId, kind } },
    select: { id: true },
  });

  if (existing) {
    await prisma.articleReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.articleReaction.create({
      data: { articleId: article.id, sessionId, kind },
    });
  }

  return NextResponse.json(await countsFor(article.id, sessionId));
}
