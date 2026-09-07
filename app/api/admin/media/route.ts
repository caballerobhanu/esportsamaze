import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** List registered media assets for the admin picker/library. */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({
    assets: assets.map((a) => ({ ...a, url: `/api/media/${a.filename}` })),
  });
}
