import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { ARTICLE_CATEGORIES, categoryCrumbs, categorySlug, resolveCategoryParam } from '@/lib/news';
import { baseUrl } from '@/lib/seo';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import {
  ALL_TOURNAMENT_TAB_IDS,
  normalizeStandingsConfig,
  type TournamentTabId,
} from '@/lib/standings-config';
import { fetchBoardEntries, fetchTeamTransfers } from '@/lib/krafton-data';
import { computeBoard } from '@/lib/krafton-standings';
import {
  PLAYER_TAB_ROUTES,
  TEAM_TAB_ROUTES,
  TOURNAMENT_TAB_SEGMENT,
} from '@/lib/seo-titles';

import { publishedVisibility } from '@/lib/news-queries';

export const revalidate = 3600; // Cache sitemap for 1 hour

/*
 * Intentionally a single sitemap. Entity tab URLs are listed only when the tab
 * has content behind it (see the team/player gating below), so the file stays
 * close to the entity count plus their articles rather than ballooning to every
 * possible tab of every profile. Splitting via generateSitemaps would move the
 * file to /sitemap/[id].xml — breaking the /sitemap.xml pointer in robots.ts.
 * Revisit splitting only if the entity counts grow by two orders of magnitude.
 */

/**
 * Tab routes that are their own URL, derived from the same segment maps the
 * metadata builders use so the sitemap cannot drift from the routes. The
 * overview tab is the entity base, listed separately.
 */
const TOURNAMENT_TABS: TournamentTabId[] = (
  Object.keys(TOURNAMENT_TAB_SEGMENT) as TournamentTabId[]
).filter((tab) => TOURNAMENT_TAB_SEGMENT[tab] !== null);

const TEAM_TABS = TEAM_TAB_ROUTES;
const PLAYER_TABS = PLAYER_TAB_ROUTES;

/** Live surfaces refresh hourly; reference pages change with the event itself. */
const TOURNAMENT_TAB_META: Record<
  string,
  { changeFrequency: 'hourly' | 'daily' | 'weekly'; priority: number }
> = {
  standings: { changeFrequency: 'hourly', priority: 0.9 },
  matches: { changeFrequency: 'hourly', priority: 0.8 },
  statistics: { changeFrequency: 'daily', priority: 0.8 },
  teams: { changeFrequency: 'daily', priority: 0.7 },
  prizepool: { changeFrequency: 'weekly', priority: 0.7 },
  format: { changeFrequency: 'weekly', priority: 0.6 },
  progression: { changeFrequency: 'weekly', priority: 0.5 },
};

/**
 * Newest date in a set, or undefined when nothing can date the page.
 * `lastModified` is omitted rather than faked with `new Date()`: a date that
 * changes on every crawl teaches Google to ignore it.
 */
function latest(dates: (Date | null | undefined)[]): Date | undefined {
  const times = dates.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  return times.length > 0 ? new Date(Math.max(...times)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();

  try {
    const [tournaments, teams, players, articles, teamEntries, playerEntries, transfers] =
      await Promise.all([
        prisma.tournament.findMany({
          select: { slug: true, updatedAt: true, standingsConfig: true, game: { select: { slug: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 5000,
        }),
        prisma.team.findMany({
          where: { slug: { not: null }, isVerified: true },
          select: {
            slug: true,
            updatedAt: true,
            game: { select: { slug: true } },
            _count: {
              select: {
                players: true,
                tournamentRosters: true,
                matchResults: true,
                matchPlayerStats: true,
                teamTotals: true,
                tournamentsWon: true,
                tournamentsRunnerUp: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5000,
        }),
        prisma.player.findMany({
          where: { slug: { not: null }, isVerified: true },
          select: {
            slug: true,
            updatedAt: true,
            game: { select: { slug: true } },
            _count: { select: { matchStats: true, reportedTotals: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5000,
        }),
        prisma.article.findMany({
          where: publishedVisibility(),
          select: { slug: true, updatedAt: true, tags: true, category: true, categories: true },
          orderBy: { publishedAt: 'desc' },
          take: 5000,
        }),
        fetchBoardEntries('TEAM').catch(() => []),
        fetchBoardEntries('PLAYER').catch(() => []),
        fetchTeamTransfers().catch(() => []),
      ]);

    const articlesLatest = latest(articles.map((a) => a.updatedAt));
    const tournamentsLatest = latest(tournaments.map((t) => t.updatedAt));
    const teamsLatest = latest(teams.map((t) => t.updatedAt));
    const playersLatest = latest(players.map((p) => p.updatedAt));
    const rankingsLatest = latest(
      [...teamEntries, ...playerEntries].map((entry) => entry.eventEndDate)
    );

    const hub = (path: string) => `${base}${gameHref(DEFAULT_GAME_SLUG, path)}`;

    const staticRoutes: MetadataRoute.Sitemap = [
      { url: base, lastModified: articlesLatest, changeFrequency: 'daily', priority: 1 },
      { url: hub(''), changeFrequency: 'daily', priority: 0.8 },
      {
        url: hub('tournaments'),
        lastModified: tournamentsLatest,
        changeFrequency: 'hourly',
        priority: 0.9,
      },
      {
        url: hub('rankings'),
        lastModified: rankingsLatest,
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        // A separate board, not view state — the team and player leaderboards
        // are different datasets, so each is listed and self-canonicalises.
        url: `${hub('rankings')}?board=players`,
        lastModified: rankingsLatest,
        changeFrequency: 'daily',
        priority: 0.9,
      },
      { url: `${base}/news`, lastModified: articlesLatest, changeFrequency: 'daily', priority: 0.8 },
      { url: hub('teams'), lastModified: teamsLatest, changeFrequency: 'daily', priority: 0.8 },
      { url: hub('players'), lastModified: playersLatest, changeFrequency: 'daily', priority: 0.8 },
      { url: hub('compare'), changeFrequency: 'monthly', priority: 0.4 },
      { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.3 },
      { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.3 },
      { url: `${base}/disclaimer`, changeFrequency: 'yearly', priority: 0.2 },
      { url: `${base}/privacy-policy`, changeFrequency: 'yearly', priority: 0.2 },
      { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    ];

    // Every event exposes its own tab routes; a tab the admin has switched off
    // is not listed (it is noindexed by tournamentMetadata()).
    const tournamentRoutes: MetadataRoute.Sitemap = tournaments.flatMap((tournament) => {
      const visibleTabs =
        normalizeStandingsConfig(tournament.standingsConfig).visibleTabs ?? [
          ...ALL_TOURNAMENT_TAB_IDS,
        ];

      const game = tournament.game?.slug || DEFAULT_GAME_SLUG;
      return [
        {
          url: `${base}${gameHref(game, `tournaments/${tournament.slug}`)}`,
          lastModified: tournament.updatedAt,
          changeFrequency: 'hourly' as const,
          priority: 0.9,
        },
        ...TOURNAMENT_TABS.filter((tab) => visibleTabs.includes(tab)).map((tab) => {
          const meta = TOURNAMENT_TAB_META[tab] ?? {
            changeFrequency: 'weekly' as const,
            priority: 0.5,
          };
          return {
            url: `${base}${gameHref(game, `tournaments/${tournament.slug}/${tab}`)}`,
            lastModified: tournament.updatedAt,
            ...meta,
          };
        }),
      ];
    });

    /*
     * A team's tabs are listed only when the tab has something behind it: a squad
     * with no results renders an empty stats table, no match list and no titles.
     * The base profile is always listed (it is a directory entry), but a tab page
     * with no data is thin content that only pads the crawl queue.
     */
    const teamRoutes: MetadataRoute.Sitemap = teams.flatMap((team) => {
      const counts = team._count;
      const tabs = TEAM_TABS.filter((tab) => {
        switch (tab) {
          case 'matches':
            return counts.matchResults > 0;
          case 'stats':
            return (
              counts.matchResults > 0 || counts.matchPlayerStats > 0 || counts.teamTotals > 0
            );
          case 'roster':
            return counts.players > 0;
          case 'titles':
            return counts.tournamentsWon > 0 || counts.tournamentsRunnerUp > 0;
          default:
            return false;
        }
      });

      const game = team.game?.slug || DEFAULT_GAME_SLUG;
      return [
        {
          url: `${base}${gameHref(game, `teams/${team.slug}`)}`,
          lastModified: team.updatedAt,
          changeFrequency: 'daily' as const,
          priority: 0.6,
        },
        ...tabs.map((tab) => ({
          url: `${base}${gameHref(game, `teams/${team.slug}/${tab}`)}`,
          lastModified: team.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        })),
      ];
    });

    /*
     * Same rule for players: one with no recorded match stats has nothing on
     * /stats or /results, so those tabs are dropped and only the profile is
     * listed. The three-tabs-per-player block was the single largest source of
     * near-empty URLs in the sitemap.
     */
    const playerRoutes: MetadataRoute.Sitemap = players.flatMap((player) => {
      const hasStats = player._count.matchStats > 0;
      const hasTotals = player._count.reportedTotals > 0;
      const tabs = PLAYER_TABS.filter((tab) => {
        switch (tab) {
          case 'stats':
            return hasStats;
          case 'results':
            return hasStats || hasTotals;
          case 'honours':
            return hasStats || hasTotals;
          default:
            return false;
        }
      });

      const game = player.game?.slug || DEFAULT_GAME_SLUG;
      return [
        {
          url: `${base}${gameHref(game, `players/${player.slug}`)}`,
          lastModified: player.updatedAt,
          changeFrequency: 'daily' as const,
          priority: 0.6,
        },
        ...tabs.map((tab) => ({
          url: `${base}${gameHref(game, `players/${player.slug}/${tab}`)}`,
          lastModified: player.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        })),
      ];
    });

    /*
     * KRAFTON breakdown pages are the highest-intent URLs on the site, so every
     * entity with an actual ranking gets one. Keys are resolved through the same
     * rule the pages and fetchProfileSlug() use — teams fall back to their tag
     * when slug is null — otherwise the listed URL would not match its own
     * canonical.
     *
     * Entities with no qualifying events are left out: their breakdown page has
     * nothing on it yet (a team whose only entry is for a future event scores
     * `events: 0` today). This is not permanent — the sitemap rebuilds hourly, so
     * they are listed as soon as they have something to show.
     */
    const rankedKeysWithData = (board: ReturnType<typeof computeBoard>) =>
      new Set(board.filter((entity) => entity.events > 0).map((entity) => entity.key));

    const teamsWithRankingData = rankedKeysWithData(computeBoard(teamEntries, transfers));
    const playersWithRankingData = rankedKeysWithData(computeBoard(playerEntries));

    const teamEntityIds = [
      ...new Set(teamEntries.map((entry) => entry.entityId).filter((id): id is string => !!id)),
    ];
    const playerEntityIds = [
      ...new Set(playerEntries.map((entry) => entry.entityId).filter((id): id is string => !!id)),
    ];

    const [rankedTeams, rankedPlayers] = await Promise.all([
      teamEntityIds.length > 0
        ? prisma.team.findMany({
            where: { id: { in: teamEntityIds } },
            select: { id: true, slug: true, tag: true },
          })
        : Promise.resolve([]),
      playerEntityIds.length > 0
        ? prisma.player.findMany({
            where: { id: { in: playerEntityIds } },
            select: { id: true, slug: true },
          })
        : Promise.resolve([]),
    ]);

    const rankingRoutes: MetadataRoute.Sitemap = [
      ...rankedTeams
        .filter((team) => teamsWithRankingData.has(team.id))
        .map((team) => team.slug || team.tag)
        .filter((key): key is string => !!key)
        .map((key) => ({
          url: `${base}${gameHref(DEFAULT_GAME_SLUG, `rankings/team/${key}`)}`,
          lastModified: rankingsLatest,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        })),
      ...rankedPlayers
        .filter((player) => playersWithRankingData.has(player.id))
        .map((player) => player.slug)
        .filter((key): key is string => !!key)
        .map((key) => ({
          url: `${base}${gameHref(DEFAULT_GAME_SLUG, `rankings/player/${key}`)}`,
          lastModified: rankingsLatest,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        })),
    ];

    // Indexable news category pages, dated by their newest article. The
    // predefined six plus every category the DB holds — primary or secondary —
    // and every ancestor slug a nested category implies, so "BGMI > Rosters"
    // lists both its own page and the "BGMI" parent that rolls it up.
    const articleCategoryValues = articles.flatMap((a) => [a.category, ...a.categories]);
    const knownCategories = [
      ...ARTICLE_CATEGORIES.map((c) => c.value),
      ...new Set(articleCategoryValues),
    ];
    const categorySlugs = new Set<string>([
      ...ARTICLE_CATEGORIES.map((c) => categorySlug(c.value)),
      ...articleCategoryValues.flatMap((value) => categoryCrumbs(value).map((crumb) => crumb.slug)),
    ]);
    const categoryRoutes: MetadataRoute.Sitemap = [...categorySlugs]
      .map((slug) => resolveCategoryParam(slug, knownCategories))
      .filter((resolved) => resolved !== null)
      .map((resolved) => ({
        resolved,
        matching: articles.filter(
          (a) =>
            resolved.matches.includes(a.category) ||
            a.categories.some((c) => resolved.matches.includes(c))
        ),
      }))
      // A category with no articles now 404s, so it must not be listed either —
      // the predefined six are categories, not a guarantee they hold stories.
      .filter((entry) => entry.matching.length > 0)
      .map(({ resolved, matching }) => ({
        url: `${base}/news/category/${resolved.slug}`,
        lastModified: latest(matching.map((a) => a.updatedAt)),
        changeFrequency: 'daily' as const,
        priority: 0.6,
      }));

    // Index the 20 most-used tags as dedicated archive pages.
    const tagCounts = new Map<string, { count: number; updatedAt: Date }>();
    for (const article of articles) {
      for (const tag of article.tags) {
        const existing = tagCounts.get(tag);
        tagCounts.set(tag, {
          count: (existing?.count ?? 0) + 1,
          updatedAt: latest([existing?.updatedAt, article.updatedAt]) ?? article.updatedAt,
        });
      }
    }
    const tagRoutes: MetadataRoute.Sitemap = [...tagCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([tag, meta]) => ({
        url: `${base}/news/tag/${encodeURIComponent(tag)}`,
        lastModified: meta.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.5,
      }));

    const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
      url: `${base}/news/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [
      ...staticRoutes,
      ...tournamentRoutes,
      ...rankingRoutes,
      ...teamRoutes,
      ...playerRoutes,
      ...categoryRoutes,
      ...tagRoutes,
      ...articleRoutes,
    ];
  } catch {
    return [
      { url: base, changeFrequency: 'daily', priority: 1 },
      { url: `${base}${gameHref(DEFAULT_GAME_SLUG, 'tournaments')}`, changeFrequency: 'hourly', priority: 0.9 },
      { url: `${base}${gameHref(DEFAULT_GAME_SLUG, 'rankings')}`, changeFrequency: 'daily', priority: 0.9 },
      { url: `${base}/news`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${base}${gameHref(DEFAULT_GAME_SLUG, 'teams')}`, changeFrequency: 'daily', priority: 0.8 },
      { url: `${base}${gameHref(DEFAULT_GAME_SLUG, 'players')}`, changeFrequency: 'daily', priority: 0.8 },
    ];
  }
}
