import { notFound } from 'next/navigation';

import { PlayerTabShell } from '@/components/players/player-tab-shell';
import { PlayerEventStats, type PlayerEventStatLine } from '@/components/players/player-event-stats';
import { TabIntro } from '@/components/seo/tab-intro';
import { playerStatsIntro } from '@/lib/entity-intros';
import { EventMetrics } from '@/components/ui/event-metrics';
import { gameSlugOf } from '@/lib/games';
import { eliminations } from '@/lib/player-stats';
import { PLAYER_METRIC_COLUMNS } from '@/lib/event-metrics';
import {
  buildPlayerEventMetrics,
  loadPlayerCareer,
  loadPlayerContext,
  loadPlayerMatches,
  playerMetadata,
} from '../player-data';

export const revalidate = 180;

export async function generateMetadata({ params }: { params: Promise<{ game: string; slug: string }> }) {
  const { game, slug } = await params;
  return playerMetadata(slug, 'stats', game);
}

export default async function PlayerStatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await loadPlayerContext(slug);
  if (!context) notFound();

  const [matches, career] = await Promise.all([
    loadPlayerMatches(context.player.id),
    loadPlayerCareer(context.player.id),
  ]);

  // ── Match-wise performance: one line per game the player has a scorecard for.
  // The panel groups, filters and totals these in the browser, so every toggle
  // reads the same rows and no figure can drift between views.
  const matchStatLines: PlayerEventStatLine[] = [];
  for (const row of matches) {
    const match = row.matchGame.match;
    const tournament = match.tournament;
    if (!tournament) continue;
    matchStatLines.push({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentShortName: tournament.shortName,
      tournamentSeries: tournament.series,
      tournamentSeason: tournament.season,
      tournamentSlug: tournament.slug,
      tournamentStartMs: tournament.startDate ? tournament.startDate.getTime() : null,
      tier: tournament.tier,
      teamName: row.team?.name ?? null,
      teamSlug: row.team?.slug ?? null,
      mapName: row.matchGame.mapName ?? match.mapName ?? null,
      matchType: match.matchType,
      stageName: match.stage?.name ?? null,
      stageType: match.stageType,
      elims: eliminations(row),
      startedAtMs: match.scheduledAt ? match.scheduledAt.getTime() : null,
    });
  }

  // ── Detailed metrics: scorecard values where they exist, reported slices
  // for the metrics an event only captured day / stage / event-wise ──
  const eventMetrics = buildPlayerEventMetrics(matches, career);

  const intro = playerStatsIntro({
    ign: context.player.ign,
    matches: matches.length,
    elims: matches.reduce((sum, row) => sum + eliminations(row), 0),
    events: career.squadParticipations.length,
  });

  return (
    <PlayerTabShell slug={slug} activeTab="stats">
      <TabIntro text={intro} />
      <div className="space-y-8">
        <PlayerEventStats lines={matchStatLines} gameSlug={gameSlugOf(context.player)} />

        <EventMetrics
          rows={eventMetrics}
          columns={PLAYER_METRIC_COLUMNS}
          showTeam
          gameSlug={gameSlugOf(context.player)}
        />
      </div>
    </PlayerTabShell>
  );
}
