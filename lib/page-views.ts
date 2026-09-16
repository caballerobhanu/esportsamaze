/**
 * Page views for entity pages — tournaments, teams and players.
 *
 * One row per page per day (UTC), so the same table answers "how many in total"
 * (a sum) and "how many lately" (the recent rows) without a second schema, and
 * a trend can be read straight off the rows.
 *
 * Views are recorded by a client beacon, never in the render: the tournament
 * routes are ISR-cached, so a counter bumped while rendering would fire once per
 * revalidation window rather than once per visit.
 *
 * Read paths are server-only (Prisma). No React.
 */

import prisma from '@/lib/prisma';
import { getViewCountSettings } from '@/lib/site-settings';
import { isViewWindow, windowDays, type ViewWindow } from '@/lib/view-window';

export type PageViewType = 'TOURNAMENT' | 'TEAM' | 'PLAYER';

export const PAGE_VIEW_TYPES: PageViewType[] = ['TOURNAMENT', 'TEAM', 'PLAYER'];

// Window words live in their own module (settings needs them too); re-exported
// so a caller reading views has one import.
export {
  VIEW_WINDOWS,
  VIEW_WINDOW_LABELS,
  VIEW_WINDOW_SUFFIX,
  windowDays,
  isViewWindow,
  type ViewWindow,
} from '@/lib/view-window';

export const PAGE_VIEW_LABELS: Record<PageViewType, string> = {
  TOURNAMENT: 'Tournaments',
  TEAM: 'Teams',
  PLAYER: 'Players',
};

/** The UTC day a view belongs to. */
export function viewDay(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

const dayKey = (day: Date) => day.toISOString().slice(0, 10);

/** Counts one view of one page. Additive and idempotent per call. */
export async function recordPageView(
  entityType: PageViewType,
  entityId: string,
  at: Date = new Date(),
): Promise<number> {
  const day = viewDay(at);
  const row = await prisma.pageView.upsert({
    where: { entityType_entityId_day: { entityType, entityId, day } },
    create: { entityType, entityId, day, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return row.count;
}

export interface PageViewSeries {
  /** Every view ever recorded for the page. */
  total: number;
  /** Views inside the window. */
  windowTotal: number;
  /** Oldest → newest, one entry per day that has views. */
  byDay: { day: string; count: number }[];
}

/** One page's views: lifetime, the recent window, and the daily rows behind both. */
export async function getPageViewSeries(
  entityType: PageViewType,
  entityId: string,
  windowDays = 30,
): Promise<PageViewSeries> {
  const since = viewDay(new Date(Date.now() - (windowDays - 1) * 24 * 60 * 60 * 1000));

  const [all, recent] = await Promise.all([
    prisma.pageView.aggregate({
      where: { entityType, entityId },
      _sum: { count: true },
    }),
    prisma.pageView.findMany({
      where: { entityType, entityId, day: { gte: since } },
      orderBy: { day: 'asc' },
      select: { day: true, count: true },
    }),
  ]);

  return {
    total: all._sum.count ?? 0,
    windowTotal: recent.reduce((sum, row) => sum + row.count, 0),
    byDay: recent.map((row) => ({ day: dayKey(row.day), count: row.count })),
  };
}

/** Lifetime view counts for many pages at once, for a list or a leaderboard. */
export async function getViewTotals(
  entityType: PageViewType,
  entityIds: string[],
): Promise<Map<string, number>> {
  if (entityIds.length === 0) return new Map();

  const rows = await prisma.pageView.groupBy({
    by: ['entityId'],
    where: { entityType, entityId: { in: entityIds } },
    _sum: { count: true },
  });

  return new Map(rows.map((row) => [row.entityId, row._sum.count ?? 0]));
}

export interface TopPage {
  entityType: PageViewType;
  entityId: string;
  /** Lifetime views, or views inside the window when one is given. */
  count: number;
  label: string;
  slug: string | null;
}

/**
 * The busiest pages over a window, newest-heavy first, with a readable label.
 *
 * A page whose entity has since been deleted is dropped rather than shown as a
 * bare id — the row cannot be linked to anything.
 */
export async function getTopPages({
  entityType,
  days,
  limit = 10,
}: {
  entityType: PageViewType;
  days?: number;
  limit?: number;
}): Promise<TopPage[]> {
  const since = days ? viewDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)) : null;

  const grouped = await prisma.pageView.groupBy({
    by: ['entityId'],
    where: { entityType, ...(since ? { day: { gte: since } } : {}) },
    _sum: { count: true },
    orderBy: { _sum: { count: 'desc' } },
    take: limit,
  });

  const ids = grouped.map((row) => row.entityId);
  if (ids.length === 0) return [];

  const labels = await entityMeta(entityType, ids);

  return grouped
    .map((row) => {
      const meta = labels.get(row.entityId);
      if (!meta) return null;
      return {
        entityType,
        entityId: row.entityId,
        count: row._sum.count ?? 0,
        label: meta.label,
        slug: meta.slug,
      };
    })
    .filter((row): row is TopPage => row !== null);
}

export interface EntityMeta {
  label: string;
  slug: string | null;
  /** The entity's own switch; null follows the site-wide setting. */
  showViewCount: boolean | null;
  /** The entity's own window; null follows the site-wide window. */
  viewCountWindow: string | null;
}

/** Names, slugs and visibility for a set of entity ids — one query per type. */
async function entityMeta(entityType: PageViewType, ids: string[]): Promise<Map<string, EntityMeta>> {
  if (ids.length === 0) return new Map();

  if (entityType === 'TOURNAMENT') {
    const rows = await prisma.tournament.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, showViewCount: true, viewCountWindow: true },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          label: row.name,
          slug: row.slug,
          showViewCount: row.showViewCount,
          viewCountWindow: row.viewCountWindow,
        },
      ]),
    );
  }

  if (entityType === 'TEAM') {
    const rows = await prisma.team.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, showViewCount: true, viewCountWindow: true },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          label: row.name,
          slug: row.slug,
          showViewCount: row.showViewCount,
          viewCountWindow: row.viewCountWindow,
        },
      ]),
    );
  }

  const rows = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: { id: true, ign: true, slug: true, showViewCount: true, viewCountWindow: true },
  });
  return new Map(
    rows.map((row) => [
      row.id,
      {
        label: row.ign,
        slug: row.slug,
        showViewCount: row.showViewCount,
        viewCountWindow: row.viewCountWindow,
      },
    ]),
  );
}

/** First day of a `days`-long window ending today, or null for all time. */
export function rangeStartDay(days: number | null): Date | null {
  if (days === null) return null;
  return viewDay(new Date(Date.now() - (days - 1) * 86_400_000));
}

/** Days from the first recorded view to today — how wide an "all time" chart is. */
export function trackedDayCount(firstDay: Date | null, cap = 365): number {
  if (!firstDay) return 1;
  return Math.min(cap, Math.max(1, Math.round((Date.now() - firstDay.getTime()) / 86_400_000) + 1));
}

/** One entity's label and visibility, for a detail panel. */
export async function getEntityMeta(entityType: PageViewType, entityId: string): Promise<EntityMeta | null> {
  return (await entityMeta(entityType, [entityId])).get(entityId) ?? null;
}

/** The earliest day with any recorded view, so "all time" has a real span. */
export async function getFirstViewDay(): Promise<Date | null> {
  const row = await prisma.pageView.findFirst({ orderBy: { day: 'asc' }, select: { day: true } });
  return row?.day ?? null;
}

/** Site-wide views per day, oldest → newest. Optionally narrowed to one type. */
export async function getSiteViewTrend(
  days = 30,
  entityType?: PageViewType | null,
): Promise<{ day: string; count: number }[]> {
  const since = viewDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));

  const rows = await prisma.pageView.groupBy({
    by: ['day'],
    where: { day: { gte: since }, ...(entityType ? { entityType } : {}) },
    _sum: { count: true },
    orderBy: { day: 'asc' },
  });

  // Fill every day in the window so the chart has a continuous x-axis rather
  // than a gap wherever a day saw no traffic at all.
  const byDay = new Map(rows.map((row) => [dayKey(row.day), row._sum.count ?? 0]));
  const series: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = dayKey(viewDay(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
    series.push({ day, count: byDay.get(day) ?? 0 });
  }
  return series;
}

export interface PageViewRow {
  entityType: PageViewType;
  entityId: string;
  label: string;
  slug: string | null;
  /** Views inside the selected window. */
  views: number;
  /** Views ever recorded for this page. */
  lifetime: number;
  /** The entity's own switch; null follows the site-wide setting. */
  showViewCount: boolean | null;
  /** The entity's own window; null follows the site-wide window. */
  viewCountWindow: string | null;
}

/**
 * Every tracked page with both windows side by side.
 *
 * Both sums are read in one pass each and joined in memory, so a page that was
 * busy last month but quiet this one still appears with 0 in the window rather
 * than dropping out of the list.
 *
 * Search filters on the page's label, which only exists once the entities have
 * been resolved — so it is applied after the lookup, not in SQL.
 */
export async function getPageViewTable({
  entityType,
  since,
  query,
  limit = 200,
}: {
  entityType?: PageViewType | null;
  since?: Date | null;
  query?: string;
  limit?: number;
} = {}): Promise<PageViewRow[]> {
  const scoped = entityType ? { entityType } : {};

  const [windowRows, lifeRows] = await Promise.all([
    prisma.pageView.groupBy({
      by: ['entityType', 'entityId'],
      where: { ...scoped, ...(since ? { day: { gte: since } } : {}) },
      _sum: { count: true },
    }),
    prisma.pageView.groupBy({
      by: ['entityType', 'entityId'],
      where: { ...scoped },
      _sum: { count: true },
    }),
  ]);

  const lifetime = new Map(lifeRows.map((row) => [`${row.entityType}:${row.entityId}`, row._sum.count ?? 0]));

  // Resolve names once per type, then filter and order in memory.
  const idsByType = new Map<PageViewType, Set<string>>();
  for (const row of windowRows) {
    const type = row.entityType as PageViewType;
    const set = idsByType.get(type) ?? new Set<string>();
    set.add(row.entityId);
    idsByType.set(type, set);
  }

  const metaByType = new Map<PageViewType, Map<string, EntityMeta>>();
  await Promise.all(
    [...idsByType.entries()].map(async ([type, ids]) => {
      metaByType.set(type, await entityMeta(type, [...ids]));
    }),
  );

  const need = query?.trim().toLowerCase();
  const rows: PageViewRow[] = [];
  for (const row of windowRows) {
    const type = row.entityType as PageViewType;
    const meta = metaByType.get(type)?.get(row.entityId);
    if (!meta) continue;
    if (need && !meta.label.toLowerCase().includes(need)) continue;
    rows.push({
      entityType: type,
      entityId: row.entityId,
      label: meta.label,
      slug: meta.slug,
      views: row._sum.count ?? 0,
      lifetime: lifetime.get(`${type}:${row.entityId}`) ?? 0,
      showViewCount: meta.showViewCount,
      viewCountWindow: meta.viewCountWindow,
    });
  }

  rows.sort((a, b) => b.views - a.views || b.lifetime - a.lifetime || a.label.localeCompare(b.label));
  return rows.slice(0, limit);
}

/**
 * Sets one page's own display: show/hide (null follows the type) and window
 * (null follows the type's window).
 */
export async function setEntityViewDisplay(
  entityType: PageViewType,
  entityId: string,
  show: boolean | null,
  window: ViewWindow | null,
): Promise<void> {
  const data = { showViewCount: show, viewCountWindow: window };

  if (entityType === 'TOURNAMENT') {
    await prisma.tournament.update({ where: { id: entityId }, data });
    return;
  }
  if (entityType === 'TEAM') {
    await prisma.team.update({ where: { id: entityId }, data });
    return;
  }
  await prisma.player.update({ where: { id: entityId }, data });
}

/**
 * Deletes one page's recorded views and reports how many rows went.
 *
 * The only place counts are ever removed. Nothing else in the app deletes from
 * this table — display settings filter reads, they never touch history.
 */
export async function resetPageViews(entityType: PageViewType, entityId: string): Promise<number> {
  const result = await prisma.pageView.deleteMany({ where: { entityType, entityId } });
  return result.count;
}

/** Deletes recorded views for an entire entity type, reporting how many rows went. */
export async function resetPageViewsByType(entityType: PageViewType): Promise<number> {
  const result = await prisma.pageView.deleteMany({ where: { entityType } });
  return result.count;
}

/** View totals per type — lifetime, or inside a window when one is given. */
export async function getViewTotalsByType(since?: Date | null): Promise<Record<PageViewType, number>> {
  const rows = await prisma.pageView.groupBy({
    by: ['entityType'],
    where: since ? { day: { gte: since } } : {},
    _sum: { count: true },
  });

  const totals: Record<PageViewType, number> = { TOURNAMENT: 0, TEAM: 0, PLAYER: 0 };
  for (const row of rows) {
    totals[row.entityType as PageViewType] = row._sum.count ?? 0;
  }
  return totals;
}

/** The settings key that decides a type's default on/off. */
export function typeVisibilityKey(type: PageViewType): 'tournaments' | 'teams' | 'players' {
  if (type === 'TOURNAMENT') return 'tournaments';
  if (type === 'TEAM') return 'teams';
  return 'players';
}

/** The settings key that decides a type's default window. */
export function typeWindowKey(type: PageViewType): 'tournamentWindow' | 'teamWindow' | 'playerWindow' {
  if (type === 'TOURNAMENT') return 'tournamentWindow';
  if (type === 'TEAM') return 'teamWindow';
  return 'playerWindow';
}

/** How one page should print its count: whether to show it, and over what span. */
export async function resolveViewDisplay(
  entityType: PageViewType,
  override: boolean | null | undefined,
  windowOverride: string | null | undefined,
): Promise<{ show: boolean; window: ViewWindow }> {
  const settings = await getViewCountSettings();

  const show =
    override === true || override === false ? override : settings[typeVisibilityKey(entityType)];
  const window = isViewWindow(windowOverride) ? windowOverride : settings[typeWindowKey(entityType)];

  return { show, window };
}

/** Views for one page over the chosen window — lifetime sums every row. */
export async function getPageViewCount(
  entityType: PageViewType,
  entityId: string,
  window: ViewWindow,
): Promise<number> {
  const days = windowDays(window);
  const since = days === null ? null : viewDay(new Date(Date.now() - (days - 1) * 86_400_000));

  const row = await prisma.pageView.aggregate({
    where: { entityType, entityId, ...(since ? { day: { gte: since } } : {}) },
    _sum: { count: true },
  });
  return row._sum.count ?? 0;
}
