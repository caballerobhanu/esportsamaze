'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';
import { computeReadTimeMinutes, computeWordCount, ARTICLE_STATUSES } from '@/lib/news';
import { sanitizeArticleHtml } from '@/lib/article-content';
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
      subHeadline: current.subHeadline,
      excerpt: current.excerpt,
      keyTakeaways: current.keyTakeaways,
      content: current.content,
      coverImage: current.coverImage,
      coverImageAlt: current.coverImageAlt,
      coverImageCaption: current.coverImageCaption,
      coverImageCredit: current.coverImageCredit,
      tags: current.tags,
      authorName: current.authorName,
      authorRole: current.authorRole,
      metaTitle: current.metaTitle,
      metaDescription: current.metaDescription,
      ogImage: current.ogImage,
      focusKeyword: current.focusKeyword,
      secondaryKeywords: current.secondaryKeywords,
      categories: current.categories,
      faqs: current.faqs ?? undefined,
      playerId: current.playerId,
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
  const title = fStr(formData, 'title').slice(0, 200);
  const subHeadline = fOpt(formData, 'subHeadline')?.slice(0, 300) || null;
  const category = fStr(formData, 'category') || 'GENERAL';
  const categoriesRaw = fStr(formData, 'categories');
  const categories = categoriesRaw
    ? categoriesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  if (category && !categories.includes(category)) {
    categories.unshift(category);
  }
  const rawContent = fStr(formData, 'content');
  const content = sanitizeArticleHtml(rawContent);
  const rawExcerpt = fStr(formData, 'excerpt') || null;
  const excerpt = rawExcerpt ? DOMPurify.sanitize(rawExcerpt, { ALLOWED_TAGS: [] }).trim().slice(0, 500) : null;
  const rawKeyTakeaways = fStr(formData, 'keyTakeaways');
  const keyTakeaways = rawKeyTakeaways
    ? rawKeyTakeaways
        .split('\n')
        .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const authorName = (fStr(formData, 'authorName') || 'eSportsAmaze Staff').slice(0, 80);
  const authorRole = (fStr(formData, 'authorRole') || 'Editor').slice(0, 80);
  const statusRaw = fStr(formData, 'status');
  const status = ARTICLE_STATUSES.find((s) => s === statusRaw) ? statusRaw : 'DRAFT';
  const featured = formData.get('featured') === 'on';
  const publishedAt = fDate(formData, 'publishedAt') || new Date();
  const allowComments = formData.get('allowComments') !== 'off' && formData.get('allowComments') !== 'false';

  const tournamentId = fOpt(formData, 'tournamentId');
  const teamId = fOpt(formData, 'teamId');
  const playerId = fOpt(formData, 'playerId');

  const metaTitle = fOpt(formData, 'metaTitle')?.slice(0, 100) || null;
  const metaDescription = fOpt(formData, 'metaDescription')?.slice(0, 300) || null;
  const focusKeyword = fOpt(formData, 'focusKeyword')?.slice(0, 100) || null;
  const secondaryKeywordsRaw = fStr(formData, 'secondaryKeywords');
  const secondaryKeywords = secondaryKeywordsRaw
    ? secondaryKeywordsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const faqsRaw = fStr(formData, 'faqsJson');
  let faqs: Array<{ question: string; answer: string }> | null = null;
  if (faqsRaw) {
    try {
      const parsed = JSON.parse(faqsRaw) as unknown;
      if (Array.isArray(parsed)) {
        faqs = parsed
          .filter((item): item is { question?: unknown; answer?: unknown } => typeof item === 'object' && item !== null)
          .map((item) => ({
            question: String(item.question ?? '').trim(),
            answer: String(item.answer ?? '').trim(),
          }))
          .filter((item) => item.question && item.answer);
      }
    } catch {
      faqs = null;
    }
  }

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
  const coverImageAlt = fOpt(formData, 'coverImageAlt')?.slice(0, 200) || null;
  const coverImageCaption = fOpt(formData, 'coverImageCaption')?.slice(0, 300) || null;
  const coverImageCredit = fOpt(formData, 'coverImageCredit')?.slice(0, 200) || null;
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
    subHeadline,
    slug,
    category,
    categories,
    content,
    excerpt,
    keyTakeaways,
    coverImage,
    coverImageAlt,
    coverImageCaption,
    coverImageCredit,
    ogImage,
    tags,
    authorName,
    authorRole,
    status,
    featured,
    allowComments,
    faqs: faqs ? (faqs as any) : undefined,
    readTimeMinutes: computeReadTimeMinutes(content),
    publishedAt,
    tournamentId,
    teamId,
    playerId,
    metaTitle,
    metaDescription,
    focusKeyword,
    secondaryKeywords,
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

/** Duplicate an article by ID into a fresh DRAFT copy with all fields preserved. */
export async function duplicateArticleById(id: string) {
  if (!(await isAdmin())) redirect('/admin/login');
  if (!id) redirect('/admin/news');

  const source = await prisma.article.findUnique({ where: { id } });
  if (!source) redirect('/admin/news');

  const slug = await uniqueSlug(`${source.slug}-copy`, async (s) => {
    const clash = await prisma.article.findFirst({ where: { slug: s }, select: { id: true } });
    return !!clash;
  });

  const created = await prisma.article.create({
    data: {
      title: `${source.title} (Copy)`,
      subHeadline: source.subHeadline,
      slug,
      category: source.category,
      categories: source.categories,
      content: source.content,
      excerpt: source.excerpt,
      keyTakeaways: source.keyTakeaways,
      coverImage: source.coverImage,
      coverImageAlt: source.coverImageAlt,
      coverImageCaption: source.coverImageCaption,
      coverImageCredit: source.coverImageCredit,
      ogImage: source.ogImage,
      tags: source.tags,
      authorName: source.authorName,
      authorRole: source.authorRole,
      status: 'DRAFT',
      featured: false,
      allowComments: source.allowComments,
      faqs: source.faqs ?? undefined,
      readTimeMinutes: source.readTimeMinutes,
      publishedAt: new Date(),
      tournamentId: source.tournamentId,
      teamId: source.teamId,
      playerId: source.playerId,
      metaTitle: source.metaTitle,
      metaDescription: source.metaDescription,
      focusKeyword: source.focusKeyword,
      secondaryKeywords: source.secondaryKeywords,
    },
  });

  revalidateNews();
  redirect(`/admin/news/${created.id}?duplicated=1`);
}

/** Duplicate an article into a fresh DRAFT copy from formData. */
export async function duplicateArticle(formData: FormData) {
  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/news');
  await duplicateArticleById(id);
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
      subHeadline: revision.subHeadline,
      excerpt: revision.excerpt,
      keyTakeaways: revision.keyTakeaways,
      content: revision.content,
      coverImage: revision.coverImage,
      coverImageAlt: revision.coverImageAlt,
      coverImageCaption: revision.coverImageCaption,
      coverImageCredit: revision.coverImageCredit,
      tags: revision.tags,
      authorName: revision.authorName,
      authorRole: revision.authorRole,
      metaTitle: revision.metaTitle,
      metaDescription: revision.metaDescription,
      ogImage: revision.ogImage,
      focusKeyword: revision.focusKeyword,
      secondaryKeywords: revision.secondaryKeywords,
      faqs: revision.faqs ?? undefined,
      playerId: revision.playerId,
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
    case 'PENDING_REVIEW':
      await prisma.article.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { status: 'PENDING_REVIEW' },
      });
      break;
    case 'PRIVATE':
      await prisma.article.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { status: 'PRIVATE' },
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
