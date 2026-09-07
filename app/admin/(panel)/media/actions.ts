'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { unlink } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr } from '@/lib/admin-forms';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function updateMediaAlt(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const alt = fStr(formData, 'alt') || null;
  if (!id) redirect('/admin/media');

  await prisma.mediaAsset.update({ where: { id }, data: { alt } });
  revalidatePath('/admin/media');
  redirect('/admin/media?altUpdated=1');
}

/** Delete a media asset: refuses while any model still references the file. */
export async function deleteMedia(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/media');

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) redirect('/admin/media');

  const [articles, covers, games, teams, players, organizers, sponsors] = await Promise.all([
    prisma.article.count({ where: { content: { contains: asset.filename } } }),
    prisma.article.count({ where: { coverImage: { contains: asset.filename } } }),
    prisma.game.count({ where: { OR: [{ logoUrl: { contains: asset.filename } }, { bannerUrl: { contains: asset.filename } }] } }),
    prisma.team.count({ where: { OR: [{ logoUrl: { contains: asset.filename } }, { imageDarkUrl: { contains: asset.filename } }] } }),
    prisma.player.count({ where: { avatarUrl: { contains: asset.filename } } }),
    prisma.organizer.count({ where: { logoUrl: { contains: asset.filename } } }),
    prisma.sponsor.count({ where: { logoUrl: { contains: asset.filename } } }),
  ]);
  const totalUses = articles + covers + games + teams + players + organizers + sponsors;
  if (totalUses > 0) {
    redirect(`/admin/media?inuse=${totalUses}`);
  }

  try {
    const safeFilename = path.basename(asset.filename);
    const resolvedDir = path.resolve(UPLOAD_DIR);
    const targetPath = path.resolve(resolvedDir, safeFilename);
    if (targetPath.startsWith(resolvedDir + path.sep)) {
      await unlink(targetPath);
    }
  } catch {
    /* file already gone from disk — still drop the row */
  }
  await prisma.mediaAsset.delete({ where: { id } });

  revalidatePath('/admin/media');
  redirect('/admin/media?deleted=1');
}
