import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { clientIp } from '@/lib/admin-auth';
import { hitRateLimit } from '@/lib/rate-limit';
import { publishedVisibility } from '@/lib/news-queries';

export const dynamic = 'force-dynamic';

const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug, ...publishedVisibility() },
    select: { id: true },
  });
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }
  const comments = await prisma.comment.findMany({
    where: { articleId: article.id, status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, authorName: true, body: true, createdAt: true },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Simple CSRF narrowing: a cross-site form POST arrives as text/plain
  // (form-encoded), never as application/json — reject those before parsing.
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  }

  const article = await prisma.article.findFirst({
    where: { slug, ...publishedVisibility() },
    select: { id: true },
  });
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const ip = await clientIp();
  if (hitRateLimit(`comment:${ip}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many comments posted. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  let payload: { name?: string; body?: string; website?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Honeypot: bots fill every field — silently accept and drop.
  if (payload.website) {
    return NextResponse.json({ ok: true, message: 'Thanks! Your comment is awaiting moderation.' });
  }

  const name = (payload.name ?? '').trim().slice(0, 40) || 'Guest';
  const body = (payload.body ?? '').trim();
  if (body.length < 3 || body.length > 1500) {
    return NextResponse.json(
      { error: 'Comment must be between 3 and 1500 characters.' },
      { status: 400 }
    );
  }

  await prisma.comment.create({
    data: { articleId: article.id, authorName: name, body, status: 'PENDING' },
  });

  return NextResponse.json({ ok: true, message: 'Thanks! Your comment is awaiting moderation.' });
}
