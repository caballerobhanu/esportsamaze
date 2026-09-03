import * as React from 'react';
import Link from 'next/link';
import { 
  Trophy, 
  ArrowLeftRight, 
  Calendar, 
  MapPin, 
  ArrowRight
} from 'lucide-react';
import { EventsSection } from '@/components/events-section';
import { NewsSection } from '@/components/news-section';
import { KraftonRankings } from '@/components/krafton-rankings';
import { HomeMatchHighlight, type HighlightMatchData } from '@/components/home/home-match-highlight';
import { HomeStandingsSection } from '@/components/home/home-standings-section';
import prisma from '@/lib/prisma';
import { computeTournamentStandings, computeTournamentFraggers, type TeamStandingEntry, type PlayerFraggerEntry } from '@/lib/match-standings';
import { formatDate, formatPrizePool, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 1. Featured Tournament: ONLY live/ongoing tournaments (status = 'ONGOING') with completed matches
  const liveTournament = await prisma.tournament.findFirst({
    where: {
      status: 'ONGOING',
      matches: { some: { status: 'COMPLETED' } },
    },
    orderBy: { startDate: 'desc' },
    include: {
      stages: {
        where: { matches: { some: { status: 'COMPLETED' } } },
        orderBy: { sequence: 'asc' },
        select: { id: true, name: true, sequence: true },
      },
    },
  });

  // 2. Compute Standings and Top Fraggers for the LAST completed stage of the LIVE tournament
  const lastCompletedStage =
    liveTournament && liveTournament.stages.length > 0
      ? liveTournament.stages[liveTournament.stages.length - 1]
      : null;

  let stageName = 'Final Stage';
  let standings: TeamStandingEntry[] = [];
  let fraggers: PlayerFraggerEntry[] = [];

  if (liveTournament) {
    if (lastCompletedStage) {
      stageName = lastCompletedStage.name;
      [standings, fraggers] = await Promise.all([
        computeTournamentStandings(liveTournament.id, lastCompletedStage.id),
        computeTournamentFraggers(liveTournament.id, lastCompletedStage.id),
      ]);
    } else {
      [standings, fraggers] = await Promise.all([
        computeTournamentStandings(liveTournament.id),
        computeTournamentFraggers(liveTournament.id),
      ]);
    }
  }

  // 3. Latest Completed Match (or next scheduled match) for Highlight Card
  const latestCompletedMatch = await prisma.match.findFirst({
    where: {
      status: 'COMPLETED',
      games: { some: { teamResults: { some: {} } } },
    },
    orderBy: [{ scheduledAt: 'desc' }, { matchNumber: 'desc' }],
    include: {
      tournament: { select: { id: true, name: true, slug: true } },
      stage: { select: { id: true, name: true } },
      games: {
        include: {
          teamResults: {
            include: { team: { select: { id: true, name: true, slug: true, tag: true, logoUrl: true } } },
            orderBy: { rank: 'asc' },
          },
          playerStats: {
            include: { player: { select: { id: true, ign: true } }, team: { select: { name: true, tag: true } } },
            orderBy: [{ kills: 'desc' }, { damage: 'desc' }],
          },
        },
      },
    },
  });

  let highlightMatch: HighlightMatchData | null = null;

  if (latestCompletedMatch) {
    const game = latestCompletedMatch.games[0];
    const topTeam = game?.teamResults[0];
    const topPlayer = game?.playerStats[0];

    highlightMatch = {
      id: latestCompletedMatch.id,
      matchNumber: latestCompletedMatch.matchNumber,
      overallMatchNumber: latestCompletedMatch.overallMatchNumber,
      mapName: latestCompletedMatch.mapName || game?.mapName || 'Erangel',
      scheduledAt: latestCompletedMatch.scheduledAt,
      matchTime: latestCompletedMatch.matchTime,
      status: latestCompletedMatch.status,
      tournament: {
        name: latestCompletedMatch.tournament.name,
        slug: latestCompletedMatch.tournament.slug,
      },
      stage: latestCompletedMatch.stage ? { name: latestCompletedMatch.stage.name } : null,
      winner: topTeam
        ? {
            teamName: topTeam.team.name,
            teamSlug: topTeam.team.slug,
            teamTag: topTeam.team.tag,
            placementPts: Number(topTeam.placePoints || 0),
            finishes: Number(topTeam.elimsPoints || 0),
            totalPts: Number(topTeam.totalPoints || 0),
            mvpPlayer: topPlayer?.player?.ign ?? null,
            mvpKills: topPlayer ? Math.max(topPlayer.playerElims ?? 0, topPlayer.kills ?? 0) : 0,
          }
        : null,
      topSquads:
        game?.teamResults.slice(0, 5).map((tr) => ({
          rank: tr.rank,
          teamName: tr.team.name,
          teamTag: tr.team.tag,
          finishes: Number(tr.elimsPoints || 0),
          totalPts: Number(tr.totalPoints || 0),
        })) ?? [],
    };
  } else {
    // Fallback to next scheduled match
    const nextMatch = await prisma.match.findFirst({
      where: { status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
      include: {
        tournament: { select: { id: true, name: true, slug: true } },
        stage: { select: { id: true, name: true } },
      },
    });

    if (nextMatch) {
      highlightMatch = {
        id: nextMatch.id,
        matchNumber: nextMatch.matchNumber,
        overallMatchNumber: nextMatch.overallMatchNumber,
        mapName: nextMatch.mapName || 'Erangel',
        scheduledAt: nextMatch.scheduledAt,
        matchTime: nextMatch.matchTime,
        status: nextMatch.status,
        tournament: {
          name: nextMatch.tournament.name,
          slug: nextMatch.tournament.slug,
        },
        stage: nextMatch.stage ? { name: nextMatch.stage.name } : null,
      };
    }
  }

  // 4. Tournaments List (Ongoing, Upcoming, and Completed)
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    take: 4,
    include: {
      game: { select: { name: true } },
      venues: { include: { venue: true } },
      organizers: { include: { organizer: true } },
    },
  });

  // 5. Transfer Ledger
  const transfers = await prisma.transfer.findMany({
    orderBy: { date: 'desc' },
    take: 6,
    include: {
      player: { select: { ign: true, firstName: true, lastName: true, slug: true, role: true } },
      team: { select: { name: true, tag: true, slug: true } },
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors selection:bg-[var(--ed-blue)] selection:text-white">
      {/* 1. Primary Top Navigation Bar */}

      {/* 2. Live & Upcoming Events Strip */}
      <EventsSection />

      {/* 3. Main Dashboard Body (Editorial max-w-[1200px] layout) */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* News Section */}
        <NewsSection />

        {/* KRAFTON Rankings */}
        <KraftonRankings />

        {/* Match Highlight Card */}
        {highlightMatch && <HomeMatchHighlight match={highlightMatch} />}

        {/* Points Table & Fraggers Split (Live event only, last stage with tournament name header) */}
        {liveTournament && (
          <HomeStandingsSection
            tournamentTitle={liveTournament.name}
            tournamentSlug={liveTournament.slug}
            stageName={stageName}
            standings={standings}
            fraggers={fraggers}
          />
        )}

        {/* Tournaments & Transfer Ledger Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          {/* Active & Upcoming Tournaments (7 cols) */}
          <section id="tournaments" className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[var(--ed-blue)]" />
                <h2 className="font-display text-xl font-medium tracking-tight text-[var(--ed-ink)]">
                  Active &amp; Upcoming Tournaments
                </h2>
              </div>
              <Link
                href="/tournaments"
                className="text-xs font-semibold text-[var(--ed-blue)] hover:underline flex items-center gap-1"
              >
                All Tournaments <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {tournaments.map((tourney) => {
                const venueName =
                  tourney.venues[0]?.venue?.name ||
                  tourney.legacyVenue ||
                  tourney.legacyLocation ||
                  tourney.eventType ||
                  'Online';
                const organizerName =
                  tourney.organizers[0]?.organizer?.name ||
                  tourney.legacyOrganizer ||
                  'Official Circuit';

                const statusLabel =
                  tourney.status === 'ONGOING'
                    ? 'In Progress'
                    : tourney.status === 'UPCOMING'
                      ? 'Upcoming'
                      : 'Concluded';

                return (
                  <Link
                    key={tourney.id}
                    href={`/tournaments/${tourney.slug}`}
                    className="block p-4 sm:p-5 ed-card hover:border-[var(--ed-blue)] transition-colors space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="ed-chip text-[var(--ed-ink)] font-semibold text-[10px]">
                            {tourney.tier || 'Tier 1'}
                          </span>
                          <span
                            className={cn(
                              'ed-chip text-[10px] font-semibold',
                              tourney.status === 'ONGOING'
                                ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : tourney.status === 'UPCOMING'
                                  ? 'border-[var(--ed-blue)]/30 bg-[var(--ed-blue)]/10 text-[var(--ed-blue)]'
                                  : 'text-[var(--ed-stone)]'
                            )}
                          >
                            {statusLabel}
                          </span>
                          {tourney.game?.name && (
                            <span className="text-[10px] font-medium text-[var(--ed-stone)]">
                              {tourney.game.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-medium text-base text-[var(--ed-ink)] mt-1.5 hover:text-[var(--ed-blue)] transition-colors">
                          {tourney.name}
                        </h3>
                        <p className="text-xs text-[var(--ed-stone)]">
                          {organizerName}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-[var(--ed-stone)] font-medium">Prize Pool</div>
                        <div className="num text-base font-bold text-amber-600 dark:text-amber-400">
                          {formatPrizePool(tourney.prizePool || 0, tourney.currency, tourney.usdRate)}
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--ed-sand)]/40 border border-[var(--ed-hair)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ed-stone)]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--ed-blue)]" />
                        {formatDate(tourney.startDate)} – {formatDate(tourney.endDate)}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-[var(--ed-ink)]">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {venueName}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Roster Moves / Transfer Ledger (5 cols) */}
          <section id="teams" className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-[var(--ed-blue)]" />
                <h2 className="font-display text-xl font-medium tracking-tight text-[var(--ed-ink)]">
                  Transfer Ledger
                </h2>
              </div>
              <span className="ed-chip text-[var(--ed-stone)]">
                Verified Signings
              </span>
            </div>

            <div className="ed-card">
              <div className="ed-rows">
                {transfers.length > 0 ? (
                  transfers.map((move) => {
                    const realName = move.player.firstName
                      ? `${move.player.firstName} ${move.player.lastName || ''}`.trim()
                      : null;

                    return (
                      <div key={move.id} className="p-3.5 hover:bg-[var(--ed-sand)]/30 transition-colors space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/players/${encodeURIComponent(move.player.slug || move.player.ign.toLowerCase())}`}
                              className="font-semibold text-sm text-[var(--ed-ink)] hover:text-[var(--ed-blue)] transition-colors"
                            >
                              {move.player.ign}
                            </Link>
                            {realName && <span className="text-xs text-[var(--ed-stone)]">({realName})</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            {move.staffRole && (
                              <span className="ed-chip text-[10px] font-semibold text-[var(--ed-stone)]">
                                {move.staffRole}
                              </span>
                            )}
                            <span
                              className={cn(
                                'ed-chip text-[10px] font-semibold',
                                move.type === 'LEFT' ? 'text-rose-600 dark:text-rose-400 border-rose-500/30' : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              )}
                            >
                              {move.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--ed-sand)]/40 border border-[var(--ed-hair)] text-xs">
                          <span className="text-[var(--ed-stone)]">
                            {move.type === 'LEFT' ? move.team.name : 'Free Agent / Prior Org'}
                          </span>
                          <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--ed-blue)]" />
                          <Link
                            href={`/teams/${encodeURIComponent(move.team.slug || move.team.name.toLowerCase().replace(/\s+/g, '-'))}`}
                            className="font-semibold text-[var(--ed-ink)] hover:text-[var(--ed-blue)] transition-colors"
                          >
                            {move.team.name}
                          </Link>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[var(--ed-stone)]">
                          <span>
                            Role: <strong className="text-[var(--ed-ink)] font-medium">{move.staffRole || move.player.role || 'Player'}</strong>
                          </span>
                          <span className="num">{move.date.toISOString().slice(0, 10)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-[var(--ed-stone)]">
                    No transfers recorded yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
    </div>
  );
}
