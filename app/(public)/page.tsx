import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { EventsSection } from '@/components/events-section';
import { HomeMatchHighlight, type HighlightMatchData } from '@/components/home/home-match-highlight';
import { HomeStandingsSection } from '@/components/home/home-standings-section';
import { FrontPage } from '@/components/home/front-page';
import { KraftonTopFive } from '@/components/home/krafton-top-five';
import { TheBrief } from '@/components/home/the-brief';
import { EditorsPicks } from '@/components/home/editors-picks';
import { StatsBand } from '@/components/home/stats-band';
import { SectionHeading } from '@/components/home/section-heading';
import { TournamentName } from '@/components/ui/tournament-name';
import prisma from '@/lib/prisma';
import { computeTournamentStandings, computeTournamentFraggers, type TeamStandingEntry, type PlayerFraggerEntry } from '@/lib/match-standings';
import { getFrontPageArticles, type ArticleCardData } from '@/lib/news-queries';
import type { Metadata } from 'next';
import { canonical, itemListJsonLd, serializeJsonLd } from '@/lib/seo';
import { formatDate, formatPrizePool, cn } from '@/lib/utils';
import { formatTournamentDates } from '@/lib/tournament-dates';
import { teamHref, playerHref } from '@/lib/entity-links';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

export const revalidate = 120;

// The one indexable page that shipped without a canonical of its own: without
// this "/" emits no <link rel="canonical"> and is open to duplicate indexing on a
// variant host (e.g. www).
export const metadata: Metadata = {
  ...canonical('/'),
};

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
      game: { select: { slug: true } },
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
      tournament: { select: { id: true, name: true, shortName: true, series: true, season: true, slug: true, game: { select: { slug: true } } } },
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
        shortName: latestCompletedMatch.tournament.shortName,
        series: latestCompletedMatch.tournament.series,
        season: latestCompletedMatch.tournament.season,
        slug: latestCompletedMatch.tournament.slug,
        game: latestCompletedMatch.tournament.game,
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
        tournament: { select: { id: true, name: true, shortName: true, series: true, season: true, slug: true, game: { select: { slug: true } } } },
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
          shortName: nextMatch.tournament.shortName,
          series: nextMatch.tournament.series,
          season: nextMatch.tournament.season,
          slug: nextMatch.tournament.slug,
          game: nextMatch.tournament.game,
        },
        stage: nextMatch.stage ? { name: nextMatch.stage.name } : null,
      };
    }
  }

  // 4. Tournaments List (Ongoing, Upcoming, and Completed).
    // Prisma can't order by a custom enum sequence, so query each status tier
    // explicitly and concatenate — `orderBy: status asc` would sort by enum
    // declaration order and let four upcoming qualifiers crowd out a live event.
  const tournamentCardSelect = {
    id: true,
    name: true,
    shortName: true,
    series: true,
    season: true,
    slug: true,
    status: true,
    tier: true,
    prizePool: true,
    currency: true,
    usdRate: true,
    startDate: true,
    endDate: true,
    datePrecision: true,
    imageUrl: true,
    imageDarkUrl: true,
    eventType: true,
    legacyVenue: true,
    legacyLocation: true,
    legacyOrganizer: true,
    game: { select: { name: true, slug: true } },
    venues: { include: { venue: true } },
    organizers: { include: { organizer: true } },
  } as const;
  const [ongoingTournaments, upcomingTournaments, completedTournaments] = await Promise.all([
    prisma.tournament
      .findMany({ where: { status: 'ONGOING' }, orderBy: { startDate: 'desc' }, take: 4, select: tournamentCardSelect })
      .catch(() => []),
    prisma.tournament
      .findMany({ where: { status: 'UPCOMING' }, orderBy: { startDate: 'asc' }, take: 4, select: tournamentCardSelect })
      .catch(() => []),
    prisma.tournament
      .findMany({ where: { status: 'COMPLETED' }, orderBy: { endDate: 'desc' }, take: 4, select: tournamentCardSelect })
      .catch(() => []),
  ]);
  const tournaments = [...ongoingTournaments, ...upcomingTournaments, ...completedTournaments].slice(0, 4);

  // 5. Transfer Ledger
  const transfers = await prisma.transfer.findMany({
    orderBy: { date: 'desc' },
    take: 6,
    include: {
      player: { select: { ign: true, firstName: true, lastName: true, slug: true, role: true } },
      team: { select: { name: true, tag: true, slug: true } },
      fromTeam: { select: { name: true, tag: true, slug: true } },
    },
  }).catch(() => []);

  // 6. Database counts for the closing stats band — real numbers, nothing projected
  const [tournamentsCount, teamsCount, matchesCount, playersCount] = await Promise.all([
    prisma.tournament.count().catch(() => 0),
    prisma.team.count().catch(() => 0),
    prisma.match.count().catch(() => 0),
    prisma.player.count({ where: { isPlayer: true } }).catch(() => 0),
  ]);

  // 7. Editorial pool feeding every magazine block (lead, latest, picks, brief)
  let pool: ArticleCardData[] = [];
  try {
    pool = await getFrontPageArticles(24);
  } catch (err) {
    console.error('Failed to fetch articles for homepage:', err);
  }

  const lead = pool.find((a) => a.coverImage) ?? pool[0] ?? null;
  const usedIds = new Set<string>(lead ? [lead.id] : []);

  const stories = pool.filter((a) => !usedIds.has(a.id) && a.coverImage).slice(0, 4);
  stories.forEach((a) => usedIds.add(a.id));

  // The Brief takes priority on unique stories; picks fill from what's left
  // and may backfill from earlier stories so the photographic band still
  // renders on a small editorial pool.
  const brief = pool.filter((a) => !usedIds.has(a.id)).slice(0, 10);
  brief.forEach((a) => usedIds.add(a.id));

  let picks = pool.filter((a) => !usedIds.has(a.id) && a.coverImage);
  if (picks.length < 3) {
    picks = [
      ...picks,
      ...pool.filter(
        (a) =>
          a.coverImage &&
          a.id !== lead?.id &&
          !stories.some((s) => s.id === a.id) &&
          !picks.some((p) => p.id === a.id)
      ),
    ];
  }
  const editorPicks: ArticleCardData[] = [];
  for (const article of picks) {
    if (editorPicks.length >= 3) break;
    if (!editorPicks.some((p) => p.id === article.id)) {
      editorPicks.push(article);
    }
  }

  // 8. Circuit Tournaments & Krafton Rankings pre-computed on server (SSR)
  const [circuitTournaments] = await Promise.all([
    prisma.tournament.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        status: true,
        startDate: true,
        endDate: true,
        imageUrl: true,
        imageDarkUrl: true,
        game: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            logoDarkUrl: true,
          },
        },
        stages: {
          select: {
            sequence: true,
            name: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { startDate: 'asc' },
    }).catch(() => []),
  ]);

  return (
    <div className="relative min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white transition-colors">
      {/* Signature broadcast radial bloom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] overflow-hidden sm:h-[520px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(10,95,196,0.15),transparent_65%),linear-gradient(115deg,transparent_42%,rgba(10,95,196,0.03)_42%,rgba(10,95,196,0.03)_43%,transparent_43%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.22),transparent_65%),linear-gradient(115deg,transparent_42%,rgba(255,255,255,0.02)_42%,rgba(255,255,255,0.02)_43%,transparent_43%)]" />
      </div>

      {/* 1. Live & Upcoming Events Strip */}
      <EventsSection initialTournaments={circuitTournaments} />

      {/* 2. Main body — the front page, then match center, news, reference data */}
      <main className="relative mx-auto w-full max-w-[var(--page-max-width)] flex-1 space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd(pool.slice(0, 10))) }}
        />

        {/* The Front Page: lead story beside a four-up story grid */}
        <FrontPage lead={lead} stories={stories} />

        {/* Latest match result (or next scheduled match) */}
        {highlightMatch && (
          <HomeMatchHighlight match={highlightMatch} gameSlug={highlightMatch.tournament.game?.slug} />
        )}

        {/* Points table & fraggers for the ongoing tournament */}
        {liveTournament && (
          <HomeStandingsSection
            tournament={liveTournament}
            tournamentSlug={liveTournament.slug}
            stageName={stageName}
            standings={standings}
            fraggers={fraggers}
            gameSlug={liveTournament.game?.slug}
          />
        )}

        {/* Dense magazine news list */}
        <TheBrief articles={brief} />

        {/* Featured photographic cards */}
        <EditorsPicks articles={editorPicks} />

        {/* KRAFTON rankings */}
        <KraftonTopFive />

        {/* Tournaments & transfers */}
        <div className="grid grid-cols-1 gap-8 pt-2 lg:grid-cols-12">
          {/* Active & Upcoming Tournaments (7 cols) */}
          <section id="tournaments" className="min-w-0 space-y-4 lg:col-span-7">
            <SectionHeading
              id="tournaments-heading"
              kicker="Competitions"
              title="Tournaments"
              href={gameHref(DEFAULT_GAME_SLUG, 'tournaments')}
              linkLabel="All tournaments"
            />

            <div className="grid gap-4 md:grid-cols-2">
              {tournaments.map((tourney) => {
                const organizerName =
                  tourney.organizers[0]?.organizer?.name || tourney.legacyOrganizer || null;

                const statusLabel =
                  tourney.status === 'ONGOING'
                    ? 'In progress'
                    : tourney.status === 'UPCOMING'
                      ? 'Upcoming'
                      : 'Concluded';

                return (
                  <Link
                    key={tourney.id}
                    href={gameHref(tourney.game?.slug || DEFAULT_GAME_SLUG, `tournaments/${tourney.slug}`)}
                    className="group block rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-[#0b1220]"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Top Meta: Badges on left, Single primary Prize Pool on right */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            {tourney.tier || 'Tier 1'}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                              tourney.status === 'ONGOING'
                                ? 'border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : tourney.status === 'UPCOMING'
                                  ? 'border border-[#0A5FC4]/20 bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                            )}
                          >
                            {statusLabel}
                          </span>
                          {tourney.game?.name && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {tourney.game.name}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 text-right shrink-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Prize pool
                          </div>
                          <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 num">
                            {formatPrizePool(tourney.prizePool || 0, tourney.currency, tourney.usdRate, false)}
                          </div>
                        </div>
                      </div>

                      {/* Tournament Logo + Name & Organizer */}
                      <div className="flex items-start gap-3.5">
                        {(tourney.imageUrl || tourney.imageDarkUrl) && (
                          <div className="relative h-12 w-12 shrink-0 rounded-xl bg-slate-100 border border-slate-200 p-1.5 flex items-center justify-center overflow-hidden dark:bg-white/5 dark:border-white/10">
                            {tourney.imageUrl && tourney.imageDarkUrl ? (
                              <>
                                <img
                                  src={tourney.imageUrl}
                                  alt={tourney.name}
                                  className="h-full w-full object-contain dark:hidden"
                                />
                                <img
                                  src={tourney.imageDarkUrl}
                                  alt={tourney.name}
                                  className="h-full w-full object-contain hidden dark:block"
                                />
                              </>
                            ) : (
                              <img
                                src={tourney.imageUrl || tourney.imageDarkUrl || ''}
                                alt={tourney.name}
                                className="h-full w-full object-contain"
                              />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300 leading-snug">
                            <TournamentName
                              name={tourney.name}
                              shortName={tourney.shortName}
                              series={tourney.series}
                              season={tourney.season}
                            />
                          </h3>
                          {organizerName && (
                            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{organizerName}</p>
                          )}
                        </div>
                      </div>

                      {/* Date Row: Sleek border-t rule with no artificial container */}
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatTournamentDates(tourney.startDate, tourney.endDate, tourney.datePrecision)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                          View details <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Roster moves (5 cols) */}
          <section id="teams" className="min-w-0 space-y-4 lg:col-span-5">
            <SectionHeading
              id="roster-heading"
              kicker="The transfer wire"
              title="Roster moves"
            />

            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-[#0b1220]">
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {transfers.length > 0 ? (
                  transfers.map((move) => {
                    const realName = move.player.firstName
                      ? `${move.player.firstName} ${move.player.lastName || ''}`.trim()
                      : null;

                    return (
                      <div
                        key={move.id}
                        className="group flex flex-col gap-2 p-3.5 sm:p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                      >
                        {/* Top: Player name, role & formatted date */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Link
                              href={playerHref({ slug: move.player.slug, ign: move.player.ign })}
                              className="font-black text-sm text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300 truncate"
                            >
                              {move.player.ign}
                            </Link>
                            {realName && (
                              <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 truncate">
                                ({realName})
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                              • {move.staffRole || move.player.role || 'Player'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                              {formatDate(move.date)}
                            </span>
                          </div>
                        </div>

                        {/* Movement: Team → Team */}
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {move.fromTeam ? (
                            <Link
                              href={teamHref({ slug: move.fromTeam.slug, tag: move.fromTeam.tag, name: move.fromTeam.name })}
                              className="transition-colors hover:text-slate-900 dark:hover:text-white truncate max-w-[140px] sm:max-w-[180px]"
                            >
                              {move.fromTeam.name}
                            </Link>
                          ) : (
                            <span className="font-normal text-slate-400">Free agent</span>
                          )}

                          <ArrowRight className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-400 shrink-0" />

                          {move.type === 'LEFT' ? (
                            <span className="font-normal text-slate-400">Free agent</span>
                          ) : move.team ? (
                            <Link
                              href={teamHref({ slug: move.team.slug, tag: move.team.tag, name: move.team.name })}
                              className="font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300 truncate max-w-[140px] sm:max-w-[180px]"
                            >
                              {move.team.name}
                            </Link>
                          ) : (
                            <span className="font-normal text-slate-400">Unknown</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No roster moves recorded yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 3. Stats Band & Closing H1 */}
      <StatsBand
        tournamentsCount={tournamentsCount}
        teamsCount={teamsCount}
        playersCount={playersCount}
        matchesCount={matchesCount}
      />
    </div>
  );
}
