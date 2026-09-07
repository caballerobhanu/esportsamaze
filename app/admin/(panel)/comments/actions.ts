'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr } from '@/lib/admin-forms';

const COMMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

function revalidateComment(articleSlug: string | null) {
  revalidatePath('/admin/comments');
  if (articleSlug) {
    revalidatePath(`/news/${articleSlug}`);
  }
}

export async function setCommentStatus(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const status = fStr(formData, 'status');
  if (!id || !COMMENT_STATUSES.includes(status as (typeof COMMENT_STATUSES)[number])) {
    redirect('/admin/comments');
  }

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { article: { select: { slug: true } } },
  });
  if (!comment) redirect('/admin/comments');

  await prisma.comment.update({ where: { id }, data: { status } });
  revalidateComment(comment.article.slug);
  redirect(`/admin/comments?${fStr(formData, 'returnStatus') ? `status=${fStr(formData, 'returnStatus')}&` : ''}updated=1`);
}

export async function deleteComment(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/comments');

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { article: { select: { slug: true } } },
  });
  await prisma.comment.delete({ where: { id } });

  revalidateComment(comment?.article.slug ?? null);
  redirect(`/admin/comments?${fStr(formData, 'returnStatus') ? `status=${fStr(formData, 'returnStatus')}&` : ''}deleted=1`);
}
