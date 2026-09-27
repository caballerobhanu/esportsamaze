'use server';

import { redirect } from 'next/navigation';

import { isAdmin } from '@/lib/admin-auth';
import { updateHomeCuration } from '@/lib/home-curation';

/**
 * Replaces the home-page news curation with what the board submits.
 *
 * Ids arrive in display order; `updateHomeCuration` drops duplicates and caps
 * each list, so a tampered or over-long payload cannot corrupt the config.
 */
export async function saveHomeCuration(input: {
  frontPage: string[];
  editorPicks: string[];
}): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');

  await updateHomeCuration({
    frontPage: input.frontPage ?? [],
    editorPicks: input.editorPicks ?? [],
  });
}
