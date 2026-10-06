import { NextRequest, NextResponse } from 'next/server';

import { clientIp } from '@/lib/admin-auth';
import { hitRateLimit } from '@/lib/rate-limit';
import { recordComparePicks, type ComparePickType } from '@/lib/compare-stats';

export const dynamic = 'force-dynamic';

const MAX_PER_WINDOW = 60;
const WINDOW_MS = 60 * 1000;

function parseType(raw: unknown): ComparePickType | null {
  return raw === 'TEAM' || raw === 'PLAYER' ? raw : null;
}

/**
 * Beacon for the "most compared" lists.
 *
 * This used to run during the compare page's render, which meant every GET —
 * including a crawler hit — performed a ComparePick upsert. It is a client
 * beacon now (components/compare/compare-picks-pinger.tsx) so only a
 * JS-running visitor counts. Unknown ids are harmless: the popular-option
 * readers only surface entities that still exist.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  }

  let body: { type?: unknown; ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = parseType(body.type);
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];

  // An explicit comparison is always exactly two distinct sides.
  if (!type || ids.length !== 2 || ids[0] === ids[1]) {
    return NextResponse.json({ error: 'A comparison needs two distinct ids' }, { status: 400 });
  }

  // Per-IP limiter so the lists can't be inflated by scripted POSTs.
  const ip = await clientIp();
  if (hitRateLimit(`compare:${ip}`, MAX_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  await recordComparePicks(type, ids);
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
