'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';
import { computeReadTimeMinutes, computeWordCount, ARTICLE_STATUSES } from '@/lib/news';
import DOMPurify from 'isomorphic-dompurify';

const MAX_REVISIONS = 20;

function revalidateNews(slug?: string | null) {
  revalidatePath('/admin/news');
  revalidatePath('/news');
  revalidatePath('/');
  if (slug) revalidatePath(`/news/${slug}`);
}

/** Snapshot the current article state as a restore point (newest first, pruned to MAX_REVISIONS). */
async function snapshotRevision(articleId: string) {
  const current = await prisma.article.findUnique({ where: { id: articleId } });
  if (!current) return;
  await prisma.articleRevision.create({
    data: {
      articleId,
      title: current.title,
      excerpt: current.excerpt,
      content: current.content,
      coverImage: current.coverImage,
      tags: current.tags,
      authorName: current.authorName,
      authorRole: current.authorRole,
      metaTitle: current.metaTitle,
      metaDescription: current.metaDescription,
      ogImage: current.ogImage,
      focusKeyword: current.focusKeyword,
      wordCount: computeWordCount(current.content),
    },
  });
  const stale = await prisma.articleRevision.findMany({
    where: { articleId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_REVISIONS,
    take: 100,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.articleRevision.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  }
}

export async function saveArticle(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const title = fStr(formData, 'title');
  const category = fStr(formData, 'category') || 'GENERAL';
  const rawContent = fStr(formData, 'content');
  const content = DOMPurify.sanitize(rawContent, {
    ADD_ATTR: ['target', 'rel'],
  });
  const rawExcerpt = fStr(formData, 'excerpt') || null;
  const excerpt = rawExcerpt ? DOMPurify.sanitize(rawExcerpt, { ALLOWED_TAGS: [] }).trim() : null;
  const authorName = fStr(formData, 'authorName') || 'eSportsAmaze Staff';
  const authorRole = fStr(formData, 'authorRole') || 'Editor';
  const statusRaw = fStr(formData, 'status');
  const status = ARTICLE_STATUSES.find((s) => s === statusRaw) ? statusRaw : 'DRAFT';
  const featured = formData.get('featured') === 'on';
  const publishedAt = fDate(formData, 'publishedAt') || new Date();
  const tournamentId = fOpt(formData, 'tournamentId');
  const teamId = fOpt(formData, 'teamId');

  const metaTitle = fOpt(formData, 'metaTitle');
  const metaDescription = fOpt(formData, 'metaDescription');
  const focusKeyword = fOpt(formData, 'focusKeyword');

  const tagsRaw = fStr(formData, 'tags');
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  if (!title || !content) {
    redirect(id ? `/admin/news/${id}?error=required` : '/admin/news/new?error=required');
  }

  // Cover image: uploaded file wins over the URL field
  let coverImage = fStr(formData, 'coverImageUrl') || null;
  const uploaded = await saveUploadedFile(formData.get('coverImageFile'), 'news');
  if (uploaded) coverImage = uploaded;
  const ogImage = fStr(formData, 'ogImage') || null;

  const slug = await uniqueSlug(fStr(formData, 'slug') || title, async (s) => {
    const clash = await prisma.article.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return !!clash;
  });

  const data = {
    title,
    slug,
    category,
    content,
    excerpt,
    coverImage,
    ogImage,
    tags,
    authorName,
    authorRole,
    status,
    featured,
    readTimeMinutes: computeReadTimeMinutes(content),
    publishedAt,
    tournamentId,
    teamId,
    metaTitle,
    metaDescription,
    focusKeyword,
  };

  let articleId = id;
  if (id) {
    await snapshotRevision(id);
    await prisma.article.update({ where: { id }, data });
  } else {
    const created = await prisma.article.create({ data });
    articleId = created.id;
  }

  revalidateNews(slug);
  redirect(`/admin/news/${articleId}?saved=1`);
}

/** Restore a saved revision into the article (snapshots the current state first). */
export async function restoreRevisionById(id: string, revisionId: string) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!id || !revisionId) redirect('/admin/news');

  const revision = await prisma.articleRevision.findUnique({ where: { id: revisionId } });
  if (!revision || revision.articleId !== id) redirect(`/admin/news/${id}?error=revision`);

  await snapshotRevision(id);
  await prisma.article.update({
    where: { id },
    data: {
      title: revision.title,
      excerpt: revision.excerpt,
      content: revision.content,
      coverImage: revision.coverImage,
      tags: revision.tags,
      authorName: revision.authorName,
      authorRole: revision.authorRole,
      metaTitle: revision.metaTitle,
      metaDescription: revision.metaDescription,
      ogImage: revision.ogImage,
      focusKeyword: revision.focusKeyword,
      readTimeMinutes: computeReadTimeMinutes(revision.content),
    },
  });

  revalidateNews();
  redirect(`/admin/news/${id}?restored=1`);
}

/** Move to trash (soft delete) — public pages stop serving it immediately. */
export async function deleteArticle(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/news');

  const article = await prisma.article.findUnique({ where: { id }, select: { slug: true } });
  await prisma.article.update({ where: { id }, data: { deletedAt: new Date() } });

  revalidateNews(article?.slug);
  redirect('/admin/news?trashed=1');
}

/* ── Direct-call variants (id passed as an argument). ── */

export async function toggleFeaturedById(id: string) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!id) redirect('/admin/news');

  const article = await prisma.article.findUnique({ where: { id }, select: { featured: true, slug: true } });
  if (!article) redirect('/admin/news');

  await prisma.article.update({ where: { id }, data: { featured: !article.featured } });
  revalidateNews(article.slug);
  redirect('/admin/news');
}

export async function trashArticleById(id: string) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!id) redirect('/admin/news');

  const article = await prisma.article.findUnique({ where: { id }, select: { slug: true } });
  await prisma.article.update({ where: { id }, data: { deletedAt: new Date() } });

  revalidateNews(article?.slug);
  redirect('/admin/news?trashed=1');
}

export async function restoreArticleById(id: string) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!id) redirect('/admin/news?status=TRASHED');

  await prisma.article.update({ where: { id }, data: { deletedAt: null } });
  revalidateNews();
  redirect('/admin/news?restoredArticle=1');
}

export async function purgeArticleById(id: string) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!id) redirect('/admin/news?status=TRASHED');

  await prisma.article.delete({ where: { id } });
  revalidateNews();
  redirect('/admin/news?status=TRASHED&purged=1');
}

/** Bulk actions from the admin list: ids[] + action. */
export async function bulkArticleAction(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const ids = formData.getAll('ids').map(String).filter(Boolean);
  const action = fStr(formData, 'bulkAction');
  if (ids.length === 0 || !action) redirect('/admin/news');

  switch (action) {
    case 'PUBLISH':
      await prisma.article.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { status: 'PUBLISHED' },
      });
      break;
    case 'UNPUBLISH':
      await prisma.article.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { status: 'DRAFT' },
      });
      break;
    case 'FEATURE':
      await prisma.article.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { featured: true },
      });
      break;
    case 'TRASH':
      await prisma.article.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      break;
    case 'DELETE':
      await prisma.article.deleteMany({ where: { id: { in: ids } } });
      break;
    default:
      break;
  }

  revalidateNews();
  redirect('/admin/news?bulk=1');
}
