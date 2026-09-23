import Link from 'next/link';
import { ArrowLeft, Eye, TrendingUp } from 'lucide-react';

import {
  PAGE_VIEW_LABELS,
  PAGE_VIEW_TYPES,
  getEntityMeta,
  getFirstViewDay,
  getPageViewSeries,
  getPageViewTable,
  getSiteViewTrend,
  getViewTotalsByType,
  rangeStartDay,
  trackedDayCount,
  typeVisibilityKey,
  typeWindowKey,
  type PageViewRow,
  type PageViewType,
} from '@/lib/page-views';
import { VIEW_WINDOW_LABELS, VIEW_WINDOWS, isViewWindow } from '@/lib/view-window';
import { getViewCountSettings } from '@/lib/site-settings';
import { ConfirmSubmit } from '@/components/admin/confirm-submit';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import { resetEntityViews, resetTypeViews, saveViewVisibility, setPageVisibility } from './actions';

export const dynamic = 'force-dynamic';

const RANGES = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: 'all', label: 'All time' },
] as const;

const MAX_TREND_DAYS = 365;

const chipBase =
  'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors';
const chipOn = 'border-[#0A5FC4] bg-[#0A5FC4] text-white';
const chipOff =
  'border-slate-200 bg-white text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

const num = (value: number) => value.toLocaleString('en-IN');

const entityHref = (type: PageViewType, slug: string | null, id: string) => {
  const key = slug || id;
  if (type === 'TOURNAMENT') return gameHref(DEFAULT_GAME_SLUG, `tournaments/${key}`);
  if (type === 'TEAM') return gameHref(DEFAULT_GAME_SLUG, `teams/${key}`);
  return gameHref(DEFAULT_GAME_SLUG, `players/${key}`);
};

/** Builds a link back to this page with one query value changed ('' clears it). */
function hrefWith(
  current: Record<string, string | undefined>,
  key: string,
  value: string,
  extra: Record<string, string> = {},
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== key) q.set(k, v);
  }
  if (value) q.set(key, value);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  const qs = q.toString();
  return qs ? `/admin/analytics?${qs}` : '/admin/analytics';
}

/** Dependency-free bar row — the daily shape is what matters, not the chrome. */
function TrendBars({ series }: { series: { day: string; count: number }[] }) {
  const max = Math.max(1, ...series.map((point) => point.count));

  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {series.map((point) => (
          <div
            key={point.day}
            title={`${point.day}: ${num(point.count)} views`}
            className="min-h-[2px] flex-1 rounded-sm bg-[#0A5FC4]/80 transition-colors hover:bg-[#0A5FC4] dark:bg-blue-500/70 dark:hover:bg-blue-400"
            style={{ height: `${Math.max(2, Math.round((point.count / max) * 100))}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>{series[0]?.day}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}

const selectClass =
  'rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-bold dark:border-white/10 dark:bg-[#0b1220]';

/**
 * Per-page override: on/off/auto, plus which window the count covers.
 *
 * Both selects are keyed on their current value so a save remounts them — React
 * resets forms after an action, and without the key the dropdowns would snap
 * back to what they held on mount, looking like the save failed.
 */
function PageDisplayControl({ row }: { row: PageViewRow }) {
  const visibility = row.showViewCount === true ? 'on' : row.showViewCount === false ? 'off' : 'auto';
  const window = isViewWindow(row.viewCountWindow) ? row.viewCountWindow : 'auto';

  return (
    <form action={setPageVisibility} className="flex items-center justify-end gap-1.5">
      <input type="hidden" name="entityType" value={row.entityType} />
      <input type="hidden" name="entityId" value={row.entityId} />
      <select key={visibility} name="value" defaultValue={visibility} className={selectClass} aria-label={`Visibility for ${row.label}`}>
        <option value="auto">Auto</option>
        <option value="on">Show</option>
        <option value="off">Hide</option>
      </select>
      <select key={window} name="window" defaultValue={window} className={selectClass} aria-label={`Window for ${row.label}`}>
        <option value="auto">Type window</option>
        {VIEW_WINDOWS.map((option) => (
          <option key={option} value={option}>
            {VIEW_WINDOW_LABELS[option]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="cursor-pointer rounded-md border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider transition-colors hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
      >
        Set
      </button>
    </form>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; type?: string; q?: string; entity?: string }>;
}) {
  const params = await searchParams;

  const rangeKey = (RANGES.find((r) => r.key === params.range)?.key ?? '30') as (typeof RANGES)[number]['key'];
  const entityType = (PAGE_VIEW_TYPES as string[]).includes(params.type ?? '')
    ? (params.type as PageViewType)
    : null;
  const query = (params.q ?? '').trim();
  const detailParam = params.entity ?? '';
  const [detailType, detailId] = detailParam.includes(':') ? detailParam.split(':') : ['', ''];

  // Both windows come from the data layer so the component stays a pure render.
  const since = rangeStartDay(rangeKey === 'all' ? null : Number(rangeKey));

  const [firstDay, totalsInRange, totalsLifetime, visibility, rows] = await Promise.all([
    getFirstViewDay(),
    getViewTotalsByType(since),
    getViewTotalsByType(),
    getViewCountSettings(),
    getPageViewTable({ entityType, since, query, limit: 200 }),
  ]);

  // "All time" charts from the first recorded day; a fixed window charts its days.
  const trendDays = since ? Number(rangeKey) : trackedDayCount(firstDay, MAX_TREND_DAYS);
  const trend = await getSiteViewTrend(trendDays, entityType);

  const rangeTotal = trend.reduce((sum, point) => sum + point.count, 0);

  const detailValid = (PAGE_VIEW_TYPES as string[]).includes(detailType) && Boolean(detailId);
  const [detailMeta, detailSeries] = detailValid
    ? await Promise.all([
        getEntityMeta(detailType as PageViewType, detailId),
        getPageViewSeries(detailType as PageViewType, detailId, trendDays),
      ])
    : [null, null];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Page views</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Tournament, team and player pages. Counted once per browser session per page — a refresh
            does not add a second view, and scripts that do not run JavaScript are never counted.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
          <Eye className="h-3.5 w-3.5" />
          {num(rangeTotal)} in {RANGES.find((r) => r.key === rangeKey)?.label.toLowerCase()}
        </span>
      </div>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1220]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Range</span>
          {RANGES.map((range) => (
            <Link
              key={range.key}
              href={hrefWith(params, 'range', range.key)}
              className={`${chipBase} ${rangeKey === range.key ? chipOn : chipOff}`}
            >
              {range.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Type</span>
          <Link href={hrefWith(params, 'type', '')} className={`${chipBase} ${!entityType ? chipOn : chipOff}`}>
            All
          </Link>
          {PAGE_VIEW_TYPES.map((type) => (
            <Link
              key={type}
              href={hrefWith(params, 'type', type)}
              className={`${chipBase} ${entityType === type ? chipOn : chipOff}`}
            >
              {PAGE_VIEW_LABELS[type]}
            </Link>
          ))}
        </div>

        <form method="GET" action="/admin/analytics" className="ml-auto flex items-center gap-2">
          <input type="hidden" name="range" value={rangeKey} />
          {entityType && <input type="hidden" name="type" value={entityType} />}
          <input
            name="q"
            defaultValue={query}
            placeholder="Search a page…"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-white/10 dark:bg-[#070b14]"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-[#0A5FC4] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-600"
          >
            Search
          </button>
          {query && (
            <Link href={hrefWith(params, 'q', '')} className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-[#0A5FC4]">
              Clear
            </Link>
          )}
        </form>
      </section>

      {/* Totals: this window beside all time */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PAGE_VIEW_TYPES.map((type) => (
          <div
            key={type}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                {PAGE_VIEW_LABELS[type]}
              </p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">all time</p>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight">{num(totalsLifetime[type])}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-400">
              {num(totalsInRange[type])} in this range
            </p>
          </div>
        ))}
      </div>

      {/* Trend — or one page's trend when a page is open */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
          <h2 className="text-sm font-black uppercase tracking-tight">
            {detailValid && detailMeta ? detailMeta.label : entityType ? `${PAGE_VIEW_LABELS[entityType]} daily views` : 'Daily views'}
          </h2>
          <span className="text-xs font-bold text-slate-400">last {num(trendDays)} days</span>
          {detailValid && (
            <Link
              href={hrefWith(params, 'entity', '')}
              className="ml-auto inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-[#0A5FC4]"
            >
              <ArrowLeft className="h-3 w-3" /> Back to all pages
            </Link>
          )}
        </div>

        {detailValid && detailSeries ? (
          <>
            <div className="mb-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>
                <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                  {num(detailSeries.total)}
                </span>{' '}
                all time
              </span>
              <span>
                <span className="font-mono text-base font-black text-[#0A5FC4] dark:text-blue-300">
                  {num(detailSeries.windowTotal)}
                </span>{' '}
                in this range
              </span>
            </div>
            <TrendBars series={detailSeries.byDay} />
          </>
        ) : (
          <TrendBars series={trend} />
        )}
      </section>

      {/* Every page, with its own switch */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-white/5">
          <h2 className="text-sm font-black uppercase tracking-tight">Pages</h2>
          <span className="text-xs font-bold text-slate-400">
            {num(rows.length)} {rows.length === 1 ? 'page' : 'pages'}
            {entityType ? ` · ${PAGE_VIEW_LABELS[entityType]}` : ''}
            {query ? ` · “${query}”` : ''}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-slate-400">
            No views recorded for this selection yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                <tr>
                  <th className="w-10 px-4 py-3 text-right">#</th>
                  <th className="min-w-[240px] px-2 py-3">Page</th>
                  <th className="px-2 py-3">Type</th>
                  <th className="px-3 py-3 text-right">This range</th>
                  <th className="px-3 py-3 text-right">All time</th>
                  <th className="px-4 py-3 text-right">Viewer sees</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {rows.map((row, index) => {
                  const isOpen = detailValid && detailType === row.entityType && detailId === row.entityId;
                  return (
                    <tr
                      key={`${row.entityType}:${row.entityId}`}
                      className={`text-sm ${isOpen ? 'bg-[#0A5FC4]/5 dark:bg-blue-500/10' : ''}`}
                    >
                      <td className="px-4 py-3 text-right font-mono text-[11px] font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={hrefWith(params, 'entity', `${row.entityType}:${row.entityId}`)}
                          className="font-bold transition-colors hover:text-[#0A5FC4]"
                        >
                          {row.label}
                        </Link>
                        <a
                          href={entityHref(row.entityType, row.slug, row.entityId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-[#0A5FC4]"
                        >
                          open ↗
                        </a>
                      </td>
                      <td className="px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {PAGE_VIEW_LABELS[row.entityType]}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-black tabular-nums text-[#0A5FC4] dark:text-blue-300">
                        {num(row.views)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-slate-500 dark:text-slate-400">
                        {num(row.lifetime)}
                      </td>
                      <td className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {(() => {
                          // What a visitor actually gets: the page's own choice,
                          // else its type's — with the window it will print.
                          const shown = row.showViewCount ?? visibility[typeVisibilityKey(row.entityType)];
                          const auto = row.showViewCount === null ? ' (auto)' : '';
                          const windowLabel = VIEW_WINDOW_LABELS[
                            isViewWindow(row.viewCountWindow)
                              ? row.viewCountWindow
                              : visibility[typeWindowKey(row.entityType)]
                          ];
                          return `${shown ? 'Shown' : 'Hidden'}${auto} · ${windowLabel}`;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <PageDisplayControl row={row} />
                          <form action={resetEntityViews}>
                            <input type="hidden" name="entityType" value={row.entityType} />
                            <input type="hidden" name="entityId" value={row.entityId} />
                            <ConfirmSubmit
                              message={`Reset every recorded view for ${row.label}?\n\nThis deletes its view history permanently. Your show/hide and window settings are kept.`}
                              className="cursor-pointer rounded-md border border-rose-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                              Reset
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Type-wide switches */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
        <h2 className="text-sm font-black uppercase tracking-tight">Show counts to visitors</h2>
        <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
          The default for every page of a type. A single page can override this in the table above —
          “Auto” clears that override and follows whatever is set here.
        </p>

        <form action={saveViewVisibility} className="mt-4 space-y-3">
          {PAGE_VIEW_TYPES.map((type) => (
            <div key={type} className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-[160px] items-center gap-2.5 text-sm font-bold">
                {/* Keyed on the saved value so a save remounts the control with the
                    new state — React resets forms after an action, and an unkeyed
                    input would snap back to what it held on mount. */}
                <input
                  key={`box-${visibility[typeVisibilityKey(type)]}`}
                  type="checkbox"
                  name={typeVisibilityKey(type)}
                  defaultChecked={visibility[typeVisibilityKey(type)]}
                  className="h-4 w-4 rounded border-slate-300 text-[#0A5FC4] focus:ring-[#0A5FC4]"
                />
                {PAGE_VIEW_LABELS[type]}
              </label>

              <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Counts cover
                <select
                  key={`win-${visibility[typeWindowKey(type)]}`}
                  name={typeWindowKey(type)}
                  defaultValue={visibility[typeWindowKey(type)]}
                  className={selectClass}
                >
                  {VIEW_WINDOWS.map((option) => (
                    <option key={option} value={option}>
                      {VIEW_WINDOW_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-[#0A5FC4] px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-600"
          >
            Save
          </button>
        </form>

        {/* Resets sit in their own forms, outside the Save: a destructive action
            must never be one mis-click away from a settings change. */}
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 dark:border-white/5">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Reset counts</p>
          {PAGE_VIEW_TYPES.map((type) => (
            <form
              key={type}
              action={resetTypeViews}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <input type="hidden" name="entityType" value={type} />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Delete every recorded view for all {PAGE_VIEW_LABELS[type].toLowerCase()}
              </span>
              <ConfirmSubmit
                message={`Reset every recorded view for ALL ${PAGE_VIEW_LABELS[type].toLowerCase()}?\n\nThis deletes the whole history for this type and cannot be undone. Your show/hide and window settings are kept.`}
                className="cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                Reset all
              </ConfirmSubmit>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
