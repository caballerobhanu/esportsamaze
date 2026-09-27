'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { hasCapability } from '@/lib/admin-auth';
import { prismaUnfiltered } from '@/lib/prisma';

type TrashType = 'tournament' | 'team' | 'player' | 'match';

function readType(value: FormDataEntryValue | null): TrashType | null {
  const type = String(value || '');
  return type === 'tournament' || type === 'team' || type === 'player' || type === 'match'
    ? type
    : null;
}

/** The trashed rows are hidden by the soft-delete extension, so nothing to purge there. */
function revalidateAll(): void {
  for (const path of [
    '/',
    '/admin/trash',
    '/admin/tournaments',
    '/admin/matches',
    '/admin/teams',
    '/admin/players',
  ]) {
    revalidatePath(path);
  }
}

export async function restoreFromTrash(formData: FormData): Promise<void> {
  if (!(await hasCapability('destructive'))) redirect('/admin/login');

  const type = readType(formData.get('type'));
  const id = String(formData.get('id') || '');
  if (!type || !id) redirect('/admin/trash');

  if (type === 'tournament') {
    // Restore the event and the matches trashed with it — matched on the batch
    // timestamp, so matches trashed separately are left alone.
    const row = await prismaUnfiltered.tournament.findUnique({
      where: { id },
      select: { deletedAt: true },
    });
    if (row?.deletedAt) {
      await prismaUnfiltered.$transaction([
        prismaUnfiltered.tournament.update({ where: { id }, data: { deletedAt: null } }),
        prismaUnfiltered.match.updateMany({
          where: { tournamentId: id, deletedAt: row.deletedAt },
          data: { deletedAt: null },
        }),
      ]);
    }
  } else if (type === 'match') {
    await prismaUnfiltered.match.update({ where: { id }, data: { deletedAt: null } });
  } else if (type === 'team') {
    await prismaUnfiltered.team.update({ where: { id }, data: { deletedAt: null } });
  } else {
    await prismaUnfiltered.player.update({ where: { id }, data: { deletedAt: null } });
  }

  revalidateAll();
  redirect('/admin/trash?restored=1');
}

export async function purgeFromTrash(formData: FormData): Promise<void> {
  if (!(await hasCapability('destructive'))) redirect('/admin/login');

  const type = readType(formData.get('type'));
  const id = String(formData.get('id') || '');
  if (!type || !id) redirect('/admin/trash');

  try {
    if (type === 'tournament') await prismaUnfiltered.tournament.delete({ where: { id } });
    else if (type === 'match') await prismaUnfiltered.match.delete({ where: { id } });
    else if (type === 'team') await prismaUnfiltered.team.delete({ where: { id } });
    else await prismaUnfiltered.player.delete({ where: { id } });
  } catch {
    redirect('/admin/trash?error=purge-failed');
  }

  revalidateAll();
  redirect('/admin/trash?purged=1');
}
