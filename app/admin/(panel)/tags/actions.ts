'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr } from '@/lib/admin-forms';

function revalidateTags(affectedSlugs: string[]) {
  revalidatePath('/admin/tags');
  revalidatePath('/admin/news');
  revalidatePath('/news');
  revalidatePath('/');
  for (const slug of affectedSlugs) revalidatePath(`/news/${slug}`);
}

/** Every non-trashed article with `tag`, replaced per-article (arrays can't be transformed in updateMany). */
async function rewriteTag(from: string, transform: (tags: string[]) => string[] | null): Promise<string[]> {
  const articles = await prisma.article.findMany({
    where: { tags: { has: from }, deletedAt: null },
    select: { id: true, slug: true, tags: true },
  });
  // One transaction: a rename/merge either touches all matching articles or none.
  return prisma.$transaction(async (tx) => {
    const slugs: string[] = [];
    for (const a of articles) {
      const next = transform(a.tags);
      if (!next) continue;
      await tx.article.update({ where: { id: a.id }, data: { tags: next } });
      slugs.push(a.slug);
    }
    return slugs;
  });
}

function normalizeTag(t: string): string {
  return t.trim().replace(/^#/, '').replace(/\s+/g, ' ').slice(0, 40);
}

export async function renameTag(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const from = normalizeTag(fStr(formData, 'from'));
  const to = normalizeTag(fStr(formData, 'to'));
  if (!from || !to || from === to) redirect('/admin/tags?error=invalid');

  const clash = await prisma.article.count({ where: { tags: { has: to }, deletedAt: null } });
  if (clash > 0) redirect('/admin/tags?error=exists');

  const slugs = await rewriteTag(from, (tags) => tags.map((t) => (t === from ? to : t)));
  revalidateTags(slugs);
  redirect('/admin/tags?renamed=1');
}

export async function mergeTag(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const from = normalizeTag(fStr(formData, 'from'));
  const to = normalizeTag(fStr(formData, 'to'));
  if (!from || !to || from === to) redirect('/admin/tags?error=invalid');

  const slugs = await rewriteTag(from, (tags) =>
    tags.includes(to) ? tags.filter((t) => t !== from) : tags.map((t) => (t === from ? to : t))
  );
  revalidateTags(slugs);
  redirect('/admin/tags?merged=1');
}

export async function deleteTag(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const from = normalizeTag(fStr(formData, 'from'));
  if (!from) redirect('/admin/tags?error=invalid');

  const slugs = await rewriteTag(from, (tags) => tags.filter((t) => t !== from));
  revalidateTags(slugs);
  redirect('/admin/tags?deleted=1');
}
