/**
 * Side-by-side benchmark table for the compare sheet.
 *
 * One row per metric, the higher value winning. A value that had to be completed
 * from reported day / stage / event totals rather than scorecards carries a `*`,
 * so a match-wise sum is never silently sitting next to a reported one.
 * An em dash means nothing recorded the metric — never a fabricated zero.
 */

export interface BenchmarkRow {
  label: string;
  valA: number | null;
  valB: number | null;
  format: (value: number | null) => string;
  /** Fixed strings for a row that is not numeric (e.g. a role). */
  formatCustomA?: string;
  formatCustomB?: string;
  /** This side's figure also draws on reported totals. */
  reportedA?: boolean;
  reportedB?: boolean;
  /** Defaults to true; a ranking row sets false so the lower number wins. */
  higherIsBetter?: boolean;
}

function ReportedMark({ reported }: { reported?: boolean }) {
  if (!reported) return null;
  return (
    <span
      className="ml-1 align-super text-[10px] font-black text-amber-600 dark:text-amber-400"
      title="Includes reported day / stage / event totals, not only scorecards"
    >
      *
    </span>
  );
}

export function BenchmarkTable({
  labelA,
  labelB,
  rows,
}: {
  labelA: string;
  labelB: string;
  rows: BenchmarkRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/30 border-b border-slate-100 dark:bg-white/[0.01] dark:border-white/5">
            <th className="py-3 px-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">{labelA}</th>
            <th className="py-3 px-4 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">Benchmark Metric</th>
            <th className="py-3 px-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">{labelB}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
          {rows.map((row) => {
            const a = row.valA ?? 0;
            const b = row.valB ?? 0;
            const higherWins = row.higherIsBetter !== false;
            // An em dash is "never recorded", so it can never win — which matters
            // on a lower-is-better row, where an absent value would otherwise
            // read as the smallest number.
            const aMissing = row.valA === null;
            const bMissing = row.valB === null;
            const aWins = !aMissing && (bMissing || (higherWins ? a > b : a < b));
            const bWins = !bMissing && (aMissing || (higherWins ? b > a : b < a));
            const aText = row.formatCustomA || row.format(row.valA);
            const bText = row.formatCustomB || row.format(row.valB);
            return (
              <tr key={row.label} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                <td className={`p-4 text-sm ${aWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                  {aText}
                  <ReportedMark reported={row.reportedA} />
                  {aWins && ' ★'}
                </td>
                <td className="p-4 text-center font-black text-xs text-slate-500 uppercase tracking-wider">
                  {row.label}
                </td>
                <td className={`p-4 text-right text-sm ${bWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                  {bWins && '★ '}
                  {bText}
                  <ReportedMark reported={row.reportedB} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The footnote both compare modes share. */
export function BenchmarkNote({ period }: { period: string }) {
  return (
    <p className="border-t border-slate-100 px-6 py-4 text-[10px] font-bold leading-5 text-slate-400 dark:border-white/5">
      Benchmarks cover {period}. A value marked{' '}
      <span className="align-super font-black text-amber-600 dark:text-amber-400">*</span> also draws on reported
      day / stage / event totals, because scorecards do not cover that event. An em dash means the metric was never
      recorded — never a zero.
    </p>
  );
}
