/**
 * Recent form, side by side: the last ten games oldest → newest, one plate per
 * game, with the lane's average carried underneath on a bar so the summary is
 * not something you have to read twelve numbers to find.
 *
 * Points for a team, eliminations for a player — whichever the caller passes in
 * `unit`. What earns the tint differs by entity, so the caller decides: a team's
 * plate marks a won game, a player's marks their best game. `highlightLabel`
 * names whichever it is, so the legend cannot drift from the data.
 */

export interface CompareFormPoint {
  id: string;
  value: number;
  /** Tinted plate — a match win for a team, the top game for a player. */
  highlight: boolean;
  /** Hover text — the scoreline behind the game. */
  title?: string;
}

function FormLane({
  label,
  points,
  unit,
  scale,
}: {
  label: string;
  points: CompareFormPoint[];
  unit: string;
  /** The larger of the two lanes' averages, so the bars are comparable. */
  scale: number;
}) {
  const average = points.length > 0 ? points.reduce((sum, point) => sum + point.value, 0) / points.length : null;
  const fill = average !== null && scale > 0 ? Math.max(3, Math.round((average / scale) * 100)) : 0;

  return (
    <div className="min-w-0">
      <h4 className="truncate text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
        {label}
      </h4>

      {points.length === 0 ? (
        <p className="mt-3 text-xs font-medium text-slate-400">No recent games on record.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1">
            {points.map((point) => (
              <span
                key={point.id}
                title={point.title}
                className={
                  point.highlight
                    ? 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#0A5FC4] bg-[#0A5FC4] font-mono text-xs font-bold tabular-nums text-white'
                    : 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white font-mono text-xs font-bold tabular-nums text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400'
                }
              >
                {point.value}
              </span>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                Average
              </span>
              <span className="font-mono text-xs font-black tabular-nums text-slate-900 dark:text-white">
                {average?.toFixed(2)} <span className="font-bold text-slate-400">{unit}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-[#0A5FC4] dark:bg-blue-500" style={{ width: `${fill}%` }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function FormCompare({
  labelA,
  labelB,
  formA,
  formB,
  unit,
  highlightLabel,
}: {
  labelA: string;
  labelB: string;
  formA: CompareFormPoint[];
  formB: CompareFormPoint[];
  unit: string;
  /** What the tinted plate means here — "Match win" or "Top game". */
  highlightLabel: string;
}) {
  if (formA.length === 0 && formB.length === 0) return null;

  const mean = (points: CompareFormPoint[]) =>
    points.length > 0 ? points.reduce((sum, point) => sum + point.value, 0) / points.length : 0;
  // One scale for both lanes — independently scaled bars would make the weaker
  // lane look level with the stronger.
  const scale = Math.max(mean(formA), mean(formB));

  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4 dark:border-white/5">
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
          Form guide
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-[#0A5FC4]" />
            {highlightLabel}
          </span>
          <span className="text-xs font-bold text-slate-400">Last ten · oldest → newest</span>
        </div>
      </div>

      <div className="grid gap-7 px-6 py-5 sm:grid-cols-2 sm:gap-10">
        <FormLane label={labelA} points={formA} unit={unit} scale={scale} />
        <FormLane label={labelB} points={formB} unit={unit} scale={scale} />
      </div>

      <p className="border-t border-slate-100 px-6 py-4 text-[10px] font-bold leading-5 text-slate-400 dark:border-white/5">
        The tinted plate is the {highlightLabel.toLowerCase()}. Both average bars share one scale, so
        the longer bar is the better average.
      </p>
    </section>
  );
}
