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

// Matches and standings are the two tabs that change during a live event (a new
// match adds a row here and reshuffles standings), so both use a short edge
// window. Admin saves already call revalidatePath; this only bounds how long the
// edge may serve a copy cached just before an edit. Other tabs stay at 180s.
export const revalidate = 30;

export async function generateStaticParams() {
  return generateTournamentStaticParams();
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string; slug: string }>;
}) {
  const { game, slug } = await params;
  return tournamentMetadata(slug, 'matches', game);
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
        <EstaticMatchesPanel
          stageGroups={stageGroups}
          logoMode={ctx.standingsConfig.logoModeBySurface.matches}
        />
      </Suspense>
    </TournamentTabShell>
  );
}
