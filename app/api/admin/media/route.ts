import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { publicUrlForFilename } from '@/lib/media-url';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 60;

/** List registered media assets for the admin picker/library. */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const where: Prisma.MediaAssetWhereInput = q
    ? {
        OR: [
          { filename: { contains: q, mode: 'insensitive' } },
          { alt: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return NextResponse.json({
    assets: assets.map((a) => ({ ...a, url: publicUrlForFilename(a.filename) })),
    page,
    pageSize: PAGE_SIZE,
    total,
    hasMore: page * PAGE_SIZE < total,
  });
}

/**
 * Updates an asset's alt text. The picker writes an editor's alt text back to the
 * shared asset, so the next editor to use that image inherits it.
 */
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { id?: string; alt?: string } | null;
  const id = body?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const asset = await prisma.mediaAsset
    .update({
      where: { id },
      data: { alt: body?.alt?.trim() || null },
      select: { id: true, alt: true },
    })
    .catch(() => null);

  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ asset });
}
