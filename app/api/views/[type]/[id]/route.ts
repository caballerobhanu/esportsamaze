import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { clientIp } from '@/lib/admin-auth';
import { hitRateLimit } from '@/lib/rate-limit';
import { PAGE_VIEW_TYPES, recordPageView, type PageViewType } from '@/lib/page-views';

export const dynamic = 'force-dynamic';

const MAX_PER_WINDOW = 60;
const WINDOW_MS = 60 * 1000;

function parseType(raw: string): PageViewType | null {
  const upper = raw.toUpperCase();
  return (PAGE_VIEW_TYPES as string[]).includes(upper) ? (upper as PageViewType) : null;
}

/** Confirms the page being counted actually exists, so counts can't be invented. */
async function entityExists(entityType: PageViewType, entityId: string): Promise<boolean> {
  if (entityType === 'TOURNAMENT') {
    return Boolean(await prisma.tournament.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
  if (entityType === 'TEAM') {
    return Boolean(await prisma.team.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
  return Boolean(await prisma.player.findUnique({ where: { id: entityId }, select: { id: true } }));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  }

  const { type, id } = await params;
  const entityType = parseType(type);
  if (!entityType) {
    return NextResponse.json({ error: 'Unknown page type' }, { status: 400 });
  }

  // Per-IP limiter so the counter can't be inflated by scripted POSTs.
  const ip = await clientIp();
  if (hitRateLimit(`pageview:${ip}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    if (!(await entityExists(entityType, id))) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    const count = await recordPageView(entityType, id);
    return NextResponse.json({ count });
  } catch {
    // Never break a reader's page over analytics.
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
