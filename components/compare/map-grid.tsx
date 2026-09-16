import type { CompareMapStats } from '@/lib/compare-stats';

/**
 * Whole-map grid: one row per map with both sides' numbers side by side, so
 * every map is visible at once instead of one at a time.
 *
 * A map only one side has ever played still gets a row — an empty column is the
 * honest answer, not a hidden map. The better figure in each pair carries the
 * brand colour, and a map neither side has played cannot appear at all.
 */

const rate = (wins: number, matches: number) => (matches > 0 ? (wins / matches) * 100 : null);
const perGame = (total: number, matches: number) => (matches > 0 ? total / matches : null);

const fmtRate = (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`);
const fmtAverage = (value: number | null) => (value === null ? '—' : value.toFixed(2));
const fmtCount = (value: number | null) => (value === null ? '—' : `${value}`);

const headCell = 'px-4 py-2.5 text-[10px] font-black uppercase tracking-[.16em] text-slate-400';

export function MapGrid({
  labelA,
  labelB,
  mapsA,
  mapsB,
  elimsLabel,
}: {
  labelA: string;
  labelB: string;
  mapsA: CompareMapStats[];
  mapsB: CompareMapStats[];
  /** What the averages are per game — elimination points for a team, kills for a player. */
  elimsLabel: string;
}) {
  const byNameA = new Map(mapsA.map((map) => [map.mapName, map]));
  const byNameB = new Map(mapsB.map((map) => [map.mapName, map]));

  const totals = new Map<string, number>();
  for (const map of mapsA) totals.set(map.mapName, (totals.get(map.mapName) ?? 0) + map.matches);
  for (const map of mapsB) totals.set(map.mapName, (totals.get(map.mapName) ?? 0) + map.matches);
  const mapNames = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);

  if (mapNames.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4 dark:border-white/5">
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
          Map breakdown
        </h3>
        <span className="text-xs font-bold text-slate-400">{mapNames.length} maps played</span>
      </div>

      <div className="overflow-x-auto">
        {/* Fixed layout: every figure column gets the same share, so a long
            header like "Avg Elim Points" can't claim three times the width of
            "MP" and leave a two-digit number stranded in a 240px cell. */}
        <table className="w-full min-w-[720px] table-fixed text-left">
          <thead className="border-b border-slate-100 dark:border-white/10">
            <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
              <th rowSpan={2} className={`${headCell} w-[16%] align-bottom`}>Map</th>
              <th colSpan={3} className={`${headCell} w-[42%] text-center text-slate-500 dark:text-slate-300`}>
                {labelA}
              </th>
              <th colSpan={3} className={`${headCell} w-[42%] text-center text-slate-500 dark:text-slate-300`}>
                {labelB}
              </th>
            </tr>
            <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
              <MapSubHead elimsLabel={elimsLabel} />
              <MapSubHead elimsLabel={elimsLabel} divider />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {mapNames.map((mapName) => {
              const mapA = byNameA.get(mapName) ?? null;
              const mapB = byNameB.get(mapName) ?? null;

              const matchesA = mapA?.matches ?? null;
              const matchesB = mapB?.matches ?? null;
              const rateA = mapA ? rate(mapA.wins, mapA.matches) : null;
              const rateB = mapB ? rate(mapB.wins, mapB.matches) : null;
              const avgA = mapA ? perGame(mapA.elims, mapA.matches) : null;
              const avgB = mapB ? perGame(mapB.elims, mapB.matches) : null;

              // Same type treatment as the benchmark table above: plain text-sm,
              // the better of a pair in heavy brand blue, the rest medium slate.
              const cell = 'px-4 py-3 text-center text-sm tabular-nums';
              const win = 'font-black text-[#0A5FC4] dark:text-blue-300';
              const lose = 'font-medium text-slate-400';

              return (
                <tr key={mapName} className="text-sm">
                  <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">{mapName}</td>
                  <td className={`${cell} ${lose}`}>{fmtCount(matchesA)}</td>
                  <td className={`${cell} ${rateA !== null && rateB !== null ? (rateA > rateB ? win : lose) : lose}`}>
                    {fmtRate(rateA)}
                  </td>
                  <td className={`${cell} ${avgA !== null && avgB !== null ? (avgA > avgB ? win : lose) : lose}`}>
                    {fmtAverage(avgA)}
                  </td>
                  <td className={`${cell} ${lose} border-l border-slate-200 dark:border-white/10`}>
                    {fmtCount(matchesB)}
                  </td>
                  <td className={`${cell} ${rateB !== null && rateA !== null ? (rateB > rateA ? win : lose) : lose}`}>
                    {fmtRate(rateB)}
                  </td>
                  <td className={`${cell} ${avgB !== null && avgA !== null ? (avgB > avgA ? win : lose) : lose}`}>
                    {fmtAverage(avgB)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-100 px-6 py-4 text-[10px] font-bold leading-5 text-slate-400 dark:border-white/5">
        MP is games played on that map, so a big map sample needs reading before the rates beside it.
        Win % is first places over games played; Avg {elimsLabel} is per game on that map. An em dash
        means that side never played it.
      </p>
    </section>
  );
}

function MapSubHead({ elimsLabel, divider }: { elimsLabel: string; divider?: boolean }) {
  return (
    <>
      <th className={`${headCell} w-[14%] text-center ${divider ? 'border-l border-slate-200 dark:border-white/10' : ''}`}>
        MP
      </th>
      <th className={`${headCell} w-[14%] text-center`}>Win %</th>
      <th className={`${headCell} w-[14%] text-center`}>Avg {elimsLabel}</th>
    </>
  );
}
