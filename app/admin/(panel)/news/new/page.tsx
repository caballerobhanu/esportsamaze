import { redirect } from 'next/navigation';
import { Newspaper } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { NewsEditor } from '@/components/admin/news-editor';

export const dynamic = 'force-dynamic';

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { error } = await searchParams;

  const [tournaments, teams] = await Promise.all([
    prisma.tournament.findMany({ select: { id: true, name: true }, orderBy: { startDate: 'desc' }, take: 50 }),
    prisma.team.findMany({ select: { id: true, name: true, tag: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          <Newspaper className="h-6 w-6 text-(--ed-blue)" />
          New Article
        </h1>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          Write, format, and optimise a story — then publish it straight to the news hub.
        </p>
      </div>

      <NewsEditor
        article={null}
        error={error}
        tournamentOptions={tournaments.map((t) => ({ value: t.id, label: t.name }))}
        teamOptions={teams.map((t) => ({ value: t.id, label: `${t.name}${t.tag ? ` (${t.tag})` : ''}` }))}
      />
    </div>
  );
}
