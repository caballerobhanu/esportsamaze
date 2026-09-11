import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { TournamentTabShell } from '@/components/tournaments/estatic/tournament-tab-shell';
import { EstaticMatchesPanel } from '@/components/tournaments/estatic/estatic-matches-panel';
import {
  loadTournamentContext,
  tournamentMetadata,
  buildMatchesData,
  generateTournamentStaticParams,
} from '../tournament-data';

export const revalidate = 180;

export async function generateStaticParams() {
  return generateTournamentStaticParams();
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return tournamentMetadata(slug, 'Matches');
}

export default async function TournamentMatchesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  const stageGroups = buildMatchesData(ctx);

  return (
    <TournamentTabShell ctx={ctx} activeTab="matches">
      {/* matchId/stage are read client-side via useSearchParams, so the route
          itself stays ISR-cacheable — Suspense is required for prerendering. */}
      <Suspense
        fallback={
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <p className="text-sm font-bold text-slate-400">Loading matches…</p>
          </div>
        }
      >
        <EstaticMatchesPanel stageGroups={stageGroups} />
      </Suspense>
    </TournamentTabShell>
  );
}
