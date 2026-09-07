import Link from 'next/link';
import {
  AlertCircle,
  CalendarClock,
  Eye,
  FileEdit,
  Flame,
  Images,
  MessagesSquare,
  Newspaper,
  Plus,
  Send,
  Shield,
  Tags,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { syncScheduledArticles } from '@/lib/news-queries';
import { ARTICLE_CATEGORIES } from '@/lib/news';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Flip scheduled articles whose publish time has passed before showing stats.
  await syncScheduledArticles();

  const [
    playerCount,
    teamCount,
    tournamentCount,
    articleStats,
    totalViews,
    topArticles,
    scheduledQueue,
    recentDrafts,
    pendingComments,
    trashCount,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.team.count(),
    prisma.tournament.count(),
    prisma.article.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { id: true } }),
    prisma.article.aggregate({ where: { deletedAt: null }, _sum: { views: true } }),
    prisma.article.findMany({
      where: { deletedAt: null, views: { gt: 0 } },
      orderBy: { views: 'desc' },
      take: 5,
      select: { id: true, slug: true, title: true, views: true, category: true },
    }),
    prisma.article.findMany({
      where: { status: 'SCHEDULED', deletedAt: null, publishedAt: { gt: new Date() } },
      orderBy: { publishedAt: 'asc' },
      take: 6,
      select: { id: true, slug: true, title: true, publishedAt: true },
    }),
    prisma.article.findMany({
      where: { status: 'DRAFT', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.comment.count({ where: { status: 'PENDING' } }),
    prisma.article.count({ where: { deletedAt: { not: null } } }),
  ]);

  const stat = (s: string) => articleStats.find((r) => r.status === s)?._count.id ?? 0;
  const views = totalViews._sum.views ?? 0;

  // Group the upcoming scheduled queue by day for a mini publishing calendar.
  const byDay = new Map<string, typeof scheduledQueue>();
  for (const a of scheduledQueue) {
    const key = new Date(a.publishedAt).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const list = byDay.get(key) ?? [];
    list.push(a);
    byDay.set(key, list);
  }

  const contentCards = [
    { href: '/admin/news?status=PUBLISHED', label: 'Published', value: stat('PUBLISHED'), icon: Send, cls: 'text-emerald-600 dark:text-emerald-400' },
    { href: '/admin/news?status=SCHEDULED', label: 'Scheduled', value: stat('SCHEDULED'), icon: CalendarClock, cls: 'text-amber-600 dark:text-amber-400' },
    { href: '/admin/news?status=DRAFT', label: 'Drafts', value: stat('DRAFT'), icon: FileEdit, cls: 'text-slate-500' },
    { href: '/admin/news', label: 'Total Views', value: views.toLocaleString('en-IN'), icon: Eye, cls: 'text-(--ed-blue)' },
  ];

  const rosterCards = [
    { href: '/admin/players', label: 'Players', count: playerCount, icon: Users },
    { href: '/admin/teams', label: 'Teams', count: teamCount, icon: Shield },
    { href: '/admin/tournaments', label: 'Tournaments', count: tournamentCount, icon: Trophy },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black uppercase tracking-tight">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/news/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:opacity-95"
          >
            <Plus className="h-3.5 w-3.5" /> New Article
          </Link>
          <Link
            href="/admin/comments"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <MessagesSquare className="h-3.5 w-3.5" /> Moderation
            {pendingComments > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white">{pendingComments}</span>
            )}
          </Link>
          <Link
            href="/admin/media"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Images className="h-3.5 w-3.5" /> Media
          </Link>
          <Link
            href="/admin/tags"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <Tags className="h-3.5 w-3.5" /> Tags
          </Link>
        </div>
      </div>

      {/* Editorial stats */}
      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Content</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {contentCards.map(({ href, label, value, icon: Icon, cls }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-(--ed-blue)/40 dark:border-white/10 dark:bg-[#0b101c]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
                <Icon className={`h-4 w-4 ${cls}`} />
              </div>
              <div>
                <div className="text-lg font-black leading-tight tabular-nums text-slate-900 dark:text-white">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
              </div>
            </Link>
          ))}
        </div>
        {trashCount > 0 && (
          <Link
            href="/admin/news?status=TRASHED"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> {trashCount} article{trashCount === 1 ? '' : 's'} in trash
          </Link>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Publishing calendar */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-slate-500">
            <CalendarClock className="h-4 w-4" /> Publishing calendar
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b101c]">
            {byDay.size === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">
                Nothing scheduled — schedule stories from the article editor.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {[...byDay.entries()].map(([day, items]) => (
                  <div key={day} className="px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{day}</div>
                    <ul className="mt-1.5 space-y-1.5">
                      {items.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3">
                          <Link
                            href={`/admin/news/${a.id}`}
                            className="truncate text-xs font-bold text-slate-700 hover:text-(--ed-blue) dark:text-slate-200"
                          >
                            {a.title}
                          </Link>
                          <span className="shrink-0 text-[10px] font-black tabular-nums text-amber-600 dark:text-amber-400">
                            {new Date(a.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Top articles */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-slate-500">
            <Flame className="h-4 w-4" /> Most read stories
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b101c]">
            {topArticles.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No view data yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {topArticles.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="font-mono text-[11px] font-black text-slate-300 dark:text-slate-600">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Link
                      href={`/admin/news/${a.id}`}
                      className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 hover:text-(--ed-blue) dark:text-slate-200"
                    >
                      {a.title}
                    </Link>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black tabular-nums text-slate-400">
                      <Eye className="h-3 w-3" /> {a.views.toLocaleString('en-IN')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Recent drafts */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-slate-500">
            <Newspaper className="h-4 w-4" /> Recent drafts
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b101c]">
            {recentDrafts.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">No drafts in progress.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentDrafts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <Link
                      href={`/admin/news/${a.id}`}
                      className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 hover:text-(--ed-blue) dark:text-slate-200"
                    >
                      {a.title}
                    </Link>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                      {new Date(a.updatedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Roster quick stats */}
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">Database</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {rosterCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#0b101c]"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <card.icon className="h-4 w-4" /> {card.label}
                  </span>
                  <span className="font-mono text-2xl font-black">{card.count}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {pendingComments > 0 && (
        <Link
          href="/admin/comments?status=PENDING"
          className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
        >
          <AlertCircle className="h-4 w-4" />
          {pendingComments} comment{pendingComments === 1 ? '' : 's'} awaiting moderation — review now
        </Link>
      )}
    </div>
  );
}
