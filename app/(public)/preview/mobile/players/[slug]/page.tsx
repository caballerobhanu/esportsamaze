import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { loadPlayerContext, loadPlayerMatches } from '@/app/(public)/players/[slug]/player-data';
import { eliminations } from '@/lib/player-stats';
import { MobileCardSection } from '@/components/preview/mobile/mobile-data-card';
import { PlayerEventCard } from '@/components/preview/mobile/player-event-card';
import { groupPlayerEvents, type PlayerPreviewLine } from '@/components/preview/mobile/adapters';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Player mobile preview — do not index | eSportsAmaze',
  robots: { index: false, follow: false },
};

export default async function PlayerMobilePreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await loadPlayerContext(slug);
  if (!context) notFound();

  const matches = await loadPlayerMatches(context.player.id);

  // Same mapping the stats page uses to build its table lines.
  const lines: PlayerPreviewLine[] = matches.map((row) => ({
    tournamentId: row.matchGame.match.tournament?.id ?? 'unknown-event',
    tournamentName: row.matchGame.match.tournament?.name ?? 'Unknown event',
    tournamentShortName: row.matchGame.match.tournament?.shortName ?? null,
    teamName: row.team?.name ?? null,
    elims: eliminations(row),
    startedAtMs: row.matchGame.match.scheduledAt?.getTime() ?? null,
  }));

  const events = groupPlayerEvents(lines);

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
        {context.player.ign}
      </h1>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
        {lines.length} games across {events.length} events, grouped the same way as the table&rsquo;s
        &ldquo;by event&rdquo; view and newest first. Elims and average lead; the counts sit underneath.
      </p>

      <MobileCardSection title="Event performance" note="Desktop table is 680px wide with 8 columns.">
        {events.map((event) => (
          <PlayerEventCard key={event.key} data={event} />
        ))}
      </MobileCardSection>
    </main>
  );
}
