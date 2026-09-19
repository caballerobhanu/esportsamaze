import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  loadTeamContext,
  loadTeamHeadToHead,
  loadTeamMapStats,
  loadTeamMatchPage,
  loadTeamTournamentStats,
} from '@/lib/team-data';
import { MobileCardSection } from '@/components/preview/mobile/mobile-data-card';
import { MapCardsPanel, TournamentCardsPanel } from '@/components/preview/mobile/panels';
import {
  HeadToHeadPreviewTable,
  MatchHistoryPreviewTable,
} from '@/components/preview/mobile/mobile-tables';
import {
  headToHeadRows,
  matchHistoryRows,
  teamMapCards,
  teamTournamentCards,
} from '@/components/preview/mobile/adapters';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Team mobile preview — do not index | eSportsAmaze',
  robots: { index: false, follow: false },
};

export default async function TeamMobilePreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = await loadTeamContext(slug);
  if (!team) notFound();

  const [maps, tournaments, tournamentsGF, headToHead, matchPage] = await Promise.all([
    loadTeamMapStats(team.id),
    loadTeamTournamentStats(team.id, false),
    loadTeamTournamentStats(team.id, true),
    loadTeamHeadToHead(team.id),
    loadTeamMatchPage(team.id, { page: 1 }),
  ]);

  const mapCards = teamMapCards(maps);
  const tournamentCards = teamTournamentCards(tournaments);
  const tournamentGfCards = teamTournamentCards(tournamentsGF);
  const h2hRows = headToHeadRows(headToHead);
  const matchRows = matchHistoryRows(matchPage.rows);

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
        {team.name}
      </h1>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
        Per-map and per-tournament as cards; head-to-head and match history stay as tables with the
        mobile column set.
      </p>

      <MobileCardSection
        title="Per-map record"
        note="Desktop table is 880px wide with 8 columns. Five fields by default; damage and survival are their own group."
        initialCount={10}
      >
        <MapCardsPanel cards={mapCards} />
      </MobileCardSection>

      <MobileCardSection
        title="Per-tournament record"
        note="Desktop table is 820px wide with 7 columns. Six fields, three by two, in the table's column order."
        initialCount={10}
      >
        <TournamentCardsPanel all={tournamentCards} gf={tournamentGfCards} />
      </MobileCardSection>

      <MobileCardSection
        title="Head to head"
        note="Desktop table is 900px wide with 7 columns. Short names, no opponent average column, eight rows by default."
      >
        <HeadToHeadPreviewTable rows={h2hRows} initial={8} />
      </MobileCardSection>

      <MobileCardSection
        title="Match history"
        note={`Desktop table is 860px wide with 9 columns. First ${matchPage.rows.length} of ${matchPage.total} games.`}
      >
        <MatchHistoryPreviewTable rows={matchRows} />
      </MobileCardSection>
    </main>
  );
}
