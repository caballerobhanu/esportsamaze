'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr } from '@/lib/admin-forms';
import { countReferences } from '@/lib/media-usage';
import { deleteMediaObject } from '@/lib/media-storage';

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

  // Lets the duplicates report hand the user back to itself after a delete. Pinned to
  // /admin/media so the field cannot be used as an open redirect.
  const requested = fStr(formData, 'returnTo');
  const returnTo = requested.startsWith('/admin/media') ? requested : '/admin/media';

  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) redirect(returnTo);

  const totalUses = await countReferences(asset.filename);
  if (totalUses > 0) {
    redirect(`${returnTo}?inuse=${totalUses}`);
  }

  // Removes the local copy and the R2 object, so deleting a row does not leave the
  // file behind in the bucket.
  await deleteMediaObject(asset.filename);
  await prisma.mediaAsset.delete({ where: { id } });

  revalidatePath('/admin/media');
  redirect(`${returnTo}?deleted=1`);
}
