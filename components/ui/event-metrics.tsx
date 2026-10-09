import Link from 'next/link';
import { ClipboardList, Info } from 'lucide-react';

import { TournamentNameFit } from '@/components/ui/tournament-name-fit';
import { MetricsModeToggle } from '@/components/ui/metrics-mode-toggle';
import { cn } from '@/lib/utils';
import { eventMetricValue, type EventMetricRow, type MetricColumn, type MetricSource } from '@/lib/event-metrics';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

/**
 * Detailed metrics — the telemetry beyond matches and eliminations, per event.
 *
 * Kept apart from the match-wise performance card so the two can never be
 * blended: the first card counts games and eliminations, this one carries the
 * extra telemetry each event actually recorded. A row's Level chip says where
 * its numbers came from — a scorecard, or a reported day / stage / event slice —
 * because the same metric is match-wise for one event and day-wise for another.
 *
 * The telemetry columns carry a per-game average as well as the event total
 * (`perGame` on `MetricColumn`); a client switch flips between them so a long
 * event can be read either way. Scoring always shows as a total.
 *
 * A blank metric prints as an em dash, never a zero: nothing was recorded, so
 * nothing should read as nought.
 */

const LEVEL_LABEL: Record<MetricSource, string> = {
  MATCH: 'match-wise',
  DAY: 'day-wise',
  STAGE: 'stage-wise',
  EVENT: 'event-wise',
};

const num = (value: number | null, format?: (value: number) => string) =>
  value === null ? '—' : format ? format(value) : value.toLocaleString('en-IN');

export function EventMetrics({
  rows,
  columns,
  showTeam = false,
  gameSlug = DEFAULT_GAME_SLUG,
}: {
  rows: EventMetricRow[];
  columns: readonly MetricColumn[];
  showTeam?: boolean;
  /** The owning entity's game slug, so event/team links stay on this game. */
  gameSlug?: string;
}) {
  if (rows.length === 0) return null;

  // A metric nobody recorded stays invisible — no wall of em dashes.
  const visibleColumns = columns.filter((column) =>
    rows.some((row) => row.metrics[column.key] !== null && row.metrics[column.key] !== undefined),
  );
  if (visibleColumns.length === 0) return null;

  const partial = rows.some((row) => row.partial);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Additional data
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Detailed metrics</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            The telemetry an event recorded beyond matches and eliminations, at the level it was
            captured — scorecards where they carry it, reported day / stage / event totals where they
            don&rsquo;t. Switch the figures between the event total and the per-game average, so an
            event with more games is not flattered. Never merged into the match-wise figures above.
          </p>
        </div>
        <ClipboardList className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-700" />
      </div>

      <MetricsModeToggle>
        {partial && (
          <p className="mb-4 flex items-start gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            <Info className="mt-px h-3 w-3 shrink-0" />
            Some metrics were not recorded everywhere they could have been — hover a figure to see how
            many games or slices it covers.
          </p>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
              <tr>
                {/* Every column keeps a floor and no header wraps, so nothing is
                    squeezed to a sliver — a table too wide for the card scrolls
                    rather than crushing its figures. */}
                <th className="min-w-[200px] pb-3">Event</th>
                {showTeam && <th className="min-w-[96px] pb-3">Team</th>}
                <th className="w-[104px] whitespace-nowrap pb-3">Level</th>
                {visibleColumns.map((column) => (
                  <th key={column.key} className="min-w-[92px] whitespace-nowrap pb-3 text-center">
                    {column.perGame ? (
                      <>
                        <span className="group-data-[mode=total]:inline hidden">{column.label}</span>
                        <span className="hidden group-data-[mode=average]:inline">Avg {column.label}</span>
                      </>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {rows.map((row) => (
                <tr key={row.tournamentId} className="text-sm">
                  <td className="py-4 pr-3">
                    <Link
                      href={gameHref(gameSlug, `tournaments/${row.tournamentSlug}`)}
                      className="block w-full font-bold transition-colors hover:text-[#0A5FC4]"
                    >
                      <TournamentNameFit
                        name={row.tournamentName}
                        shortName={row.tournamentShortName}
                        series={row.tournamentSeries}
                        season={row.tournamentSeason}
                      />
                    </Link>
                    {row.startDateMs ? (
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {new Date(row.startDateMs).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </p>
                    ) : null}
                  </td>
                  {showTeam && (
                    <td className="py-4 pr-3 text-slate-500">
                      {row.teamName ? (
                        row.teamSlug ? (
                          <Link href={gameHref(gameSlug, `teams/${row.teamSlug}`)} className="font-bold hover:text-[#0A5FC4]">
                            {row.teamName}
                          </Link>
                        ) : (
                          <span className="font-bold">{row.teamName}</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  <td className="py-4">
                    <span
                      className={cn(
                        'inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                        row.level === 'MATCH'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-400/15 text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {LEVEL_LABEL[row.level]}
                    </span>
                  </td>
                  {visibleColumns.map((column) => {
                    const coverage = row.coverage[column.key];
                    const total = row.metrics[column.key] ?? null;

                    // Scoring has no per-game reading, so it renders once and the
                    // switch never touches it.
                    if (!column.perGame) {
                      return (
                        <td
                          key={column.key}
                          className="py-4 text-center font-mono font-bold text-slate-500"
                          title={
                            coverage && total !== null
                              ? `from ${coverage.samples.toLocaleString('en-IN')} of ${coverage.total.toLocaleString('en-IN')} ${row.level === 'MATCH' ? 'games' : 'slices'}`
                              : undefined
                          }
                        >
                          {num(total, column.format)}
                        </td>
                      );
                    }

                    // Telemetry carries both figures; the mode switch shows one.
                    const average = eventMetricValue(row, column);
                    const averageTitle =
                      average === null
                        ? undefined
                        : row.sources[column.key] === 'MATCH' && coverage
                          ? `averaged over ${coverage.samples.toLocaleString('en-IN')} of ${coverage.total.toLocaleString('en-IN')} games`
                          : 'averaged over the event’s reported matches';
                    const totalTitle =
                      total !== null && coverage
                        ? `from ${coverage.samples.toLocaleString('en-IN')} of ${coverage.total.toLocaleString('en-IN')} ${row.level === 'MATCH' ? 'games' : 'slices'}`
                        : undefined;

                    return (
                      <td key={column.key} className="py-4 text-center font-mono font-bold text-slate-500">
                        <span className="group-data-[mode=average]:hidden" title={totalTitle}>
                          {num(total, column.format)}
                        </span>
                        <span className="hidden group-data-[mode=average]:inline" title={averageTitle}>
                          {num(average, column.perGameFormat ?? column.format)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-3xl text-[10px] font-bold leading-5 text-slate-400">
          Each figure is resolved on its own: a scorecard value is used where the scorecards recorded
          that metric, otherwise the reported slice total is. The per-game average divides by the games
          it covers — the scorecard games that recorded it, or the event&rsquo;s reported match count.
          Match counts, eliminations, points and placement always stay totals.
        </p>
      </MetricsModeToggle>
    </section>
  );
}
