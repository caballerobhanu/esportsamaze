import { LayoutDashboard } from 'lucide-react';

import prisma from '@/lib/prisma';
import { articleCardInclude, publishedVisibility, type ArticleCardData } from '@/lib/news-queries';
import { EDITOR_PICKS_SLOTS, FRONT_PAGE_SLOTS, getHomeCuration } from '@/lib/home-curation';
import { HomeCurationBoard, type CurationCandidate } from '@/components/admin/home-curation-board';

export const dynamic = 'force-dynamic';

function toCandidate(article: ArticleCardData): CurationCandidate {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    coverImage: article.coverImage,
    featured: article.featured,
    publishedAt: article.publishedAt.toISOString(),
  };
}

export default async function AdminHomePage() {
  const curation = await getHomeCuration();
  const curatedIds = [...curation.frontPage, ...curation.editorPicks];

  const curatedPromise: Promise<ArticleCardData[]> =
    curatedIds.length > 0
      ? prisma.article.findMany({
          where: { id: { in: curatedIds }, ...publishedVisibility() },
          include: articleCardInclude,
        })
      : Promise.resolve([]);

  const [curated, pool] = await Promise.all([
    curatedPromise,
    prisma.article.findMany({
      where: { ...publishedVisibility(), coverImage: { not: null } },
      orderBy: { publishedAt: 'desc' },
      take: 60,
      include: articleCardInclude,
    }),
  ]);

  const curatedById = new Map(curated.map((article) => [article.id, article]));

  // A curated slot only renders with a cover image, so drop anything that has
  // lost one — the same rule the public home page applies.
  const resolve = (ids: string[]): CurationCandidate[] => {
    const out: CurationCandidate[] = [];
    for (const id of ids) {
      const article = curatedById.get(id);
      if (article?.coverImage) out.push(toCandidate(article));
    }
    return out;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Home Page</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Choose what fills the Front Page and Editor's Picks, and in what order. Left empty, each
            section falls back to the automatic featured/newest wire.
          </p>
        </div>
      </div>

      <HomeCurationBoard
        pool={pool.map(toCandidate)}
        initialFrontPage={resolve(curation.frontPage)}
        initialEditorPicks={resolve(curation.editorPicks)}
        frontPageSlots={FRONT_PAGE_SLOTS}
        editorPicksSlots={EDITOR_PICKS_SLOTS}
      />
    </div>
  );
}
