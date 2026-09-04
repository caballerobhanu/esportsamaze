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
    <div className="min-h-screen flex flex-col bg-[#f6f8fc] text-slate-950 transition-colors selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      {/* 1. Live & Upcoming Events Strip */}
      <EventsSection />

      {/* 2. Welcoming Masthead */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(10,95,196,.14),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(10,95,196,.04)_42%,rgba(10,95,196,.04)_43%,transparent_43%)] dark:bg-[radial-gradient(circle_at_80%_-10%,rgba(37,99,235,.2),transparent_45%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,.02)_42%,rgba(255,255,255,.02)_43%,transparent_43%)]" />
        <div className="relative mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
              <Trophy className="h-3.5 w-3.5" />
              <span>Official Esports Wiki &amp; Live Match Intelligence</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              Competitive Esports Dashboard
            </h1>
            <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              Track verified publisher power rankings, real-time stage scorecards, certified squad rosters, and official tournament distributions.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
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
          <section id="tournaments" className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                  <Trophy className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  Active &amp; Upcoming Tournaments
                </h2>
              </div>
              <Link
                href="/tournaments"
                className="text-xs font-bold text-[#0A5FC4] hover:underline dark:text-blue-400 flex items-center gap-1.5"
              >
                <span>All Tournaments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
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
                    className="block p-5 rounded-3xl border border-slate-200 bg-white hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-[#0b1220] transition-all space-y-3.5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {tourney.tier || 'Tier 1'}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                              tourney.status === 'ONGOING'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : tourney.status === 'UPCOMING'
                                  ? 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 border border-[#0A5FC4]/20'
                                  : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                            )}
                          >
                            {statusLabel}
                          </span>
                          {tourney.game?.name && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {tourney.game.name}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-900 mt-2 group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-400 transition-colors">
                          {tourney.name}
                        </h3>
                        <p className="text-xs font-medium text-slate-400">
                          {organizerName}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Prize Pool</div>
                        <div className="text-base font-black text-amber-600 dark:text-amber-400">
                          {formatPrizePool(tourney.prizePool || 0, tourney.currency, tourney.usdRate)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:bg-white/[0.02] dark:border-white/5 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-[#0A5FC4]" />
                        {formatDate(tourney.startDate)} – {formatDate(tourney.endDate)}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
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
          <section id="teams" className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  Transfer Ledger
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-white/10 dark:text-slate-400">
                Verified Signings
              </span>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {transfers.length > 0 ? (
                  transfers.map((move) => {
                    const realName = move.player.firstName
                      ? `${move.player.firstName} ${move.player.lastName || ''}`.trim()
                      : null;

                    return (
                      <div key={move.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/players/${encodeURIComponent(move.player.slug || move.player.ign.toLowerCase())}`}
                              className="font-bold text-sm text-slate-900 hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors"
                            >
                              {move.player.ign}
                            </Link>
                            {realName && <span className="text-xs text-slate-400">({realName})</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            {move.staffRole && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-white/10 dark:text-slate-400">
                                {move.staffRole}
                              </span>
                            )}
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                                move.type === 'LEFT' ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              )}
                            >
                              {move.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs dark:bg-white/[0.02] dark:border-white/5">
                          <span className="text-slate-400 font-medium">
                            {move.type === 'LEFT' ? move.team.name : 'Free Agent / Prior Org'}
                          </span>
                          <ArrowLeftRight className="w-3.5 h-3.5 text-[#0A5FC4]" />
                          <Link
                            href={`/teams/${encodeURIComponent(move.team.slug || move.team.name.toLowerCase().replace(/\s+/g, '-'))}`}
                            className="font-bold text-slate-900 hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors"
                          >
                            {move.team.name}
                          </Link>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Role: <strong className="text-slate-700 dark:text-slate-300 font-bold">{move.staffRole || move.player.role || 'Player'}</strong>
                          </span>
                          <span className="font-bold">{move.date.toISOString().slice(0, 10)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No transfers recorded yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
