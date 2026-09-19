import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  buildMatchesData,
  loadTournamentContext,
} from '@/app/(public)/tournaments/[slug]/tournament-data';
import { MobileCardSection } from '@/components/preview/mobile/mobile-data-card';
import { ScorecardPreviewTable } from '@/components/preview/mobile/mobile-tables';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tournament mobile preview — do not index | eSportsAmaze',
  robots: { index: false, follow: false },
};

export default async function TournamentMobilePreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadTournamentContext(slug);
  if (!ctx) notFound();

  const stageGroups = buildMatchesData(ctx);

  // The last played match of the last stage — the same one the live matches tab
  // opens on for a finished event.
  const lastStage = stageGroups[stageGroups.length - 1] ?? null;
  const activeMatch = lastStage?.matches[lastStage.matches.length - 1] ?? null;

  const scorecard = (activeMatch?.teamResults ?? [])
    .map((row) => ({
      key: row.id,
      rank: row.rank,
      teamTag: row.team.tag?.trim() || row.team.name,
      teamName: row.team.name,
      teamHref: `/teams/${row.team.slug || encodeURIComponent(row.team.name)}`,
      logoUrl: row.team.logoUrl ?? null,
      logoDarkUrl: row.team.imageDarkUrl ?? null,
      countryCode: row.team.countryCode ?? null,
      wwcd: row.wwcd,
      placePoints: row.placePoints,
      elimsPoints: row.elimsPoints,
      totalPoints: row.totalPoints,
    }))
    .sort((a, b) => {
      const byTotal = (b.totalPoints || 0) - (a.totalPoints || 0);
      if (byTotal !== 0) return byTotal;
      const aWwcd = a.wwcd || a.rank === 1 ? 1 : 0;
      const bWwcd = b.wwcd || b.rank === 1 ? 1 : 0;
      if (bWwcd !== aWwcd) return bWwcd - aWwcd;
      const byPlace = (b.placePoints || 0) - (a.placePoints || 0);
      if (byPlace !== 0) return byPlace;
      const byElims = (b.elimsPoints || 0) - (a.elimsPoints || 0);
      if (byElims !== 0) return byElims;
      return (a.rank || 99) - (b.rank || 99);
    });

  return (
    <main className="mx-auto w-full max-w-[var(--page-max-width)] flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/preview/mobile"
        className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-[#0A5FC4] dark:text-slate-400 dark:hover:text-blue-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All previews
      </Link>

      <h1 className="mt-3 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-3xl">
        {ctx.tournament.name}
      </h1>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
        {lastStage
          ? `Match scorecard for ${lastStage.stageName}, match ${activeMatch?.overallMatchNumber ?? activeMatch?.matchNumber ?? ''} · ${activeMatch?.mapName ?? 'map unknown'}.`
          : 'No matches recorded for this event.'}{' '}
        Kept as a table, with the short team name and the standings tab&rsquo;s single-letter headers.
      </p>

      <MobileCardSection
        title="Match scorecard"
        note="Same row anatomy as the standings tab: rank badge, crest box, short team tag and W (WWCD) · E (elims pts) · P (place pts) · T (total)."
      >
        <ScorecardPreviewTable
          rows={scorecard}
          logoMode={ctx.standingsConfig.logoModeBySurface.standings}
        />
      </MobileCardSection>
    </main>
  );
}
