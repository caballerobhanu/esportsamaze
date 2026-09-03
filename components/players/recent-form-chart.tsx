'use client';

import * as React from 'react';

export interface RecentMatchPoint {
  elims: number;
  dateLabel: string;
  tournament: string;
  map: string;
}

/**
 * Recent-form line chart (last N matches) with an optional rolling 5-match
 * average overlay. Dependency-free SVG so it renders inline with the page.
 */
export function RecentFormChart({ points }: { points: RecentMatchPoint[] }) {
  const [showRolling, setShowRolling] = React.useState(true);

  const n = points.length;
  const W = 640;
  const H = 240;
  const padL = 30;
  const padR = 14;
  const padT = 16;
  const padB = 30;

  const maxElims = Math.max(5, ...points.map((p) => p.elims));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / maxElims);

  const elimsPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.elims)}`).join(' ');

  // Rolling 5-match average (window of 5 ending at each index)
  const rolling = points.map((_, i) => {
    if (i < 4) return null;
    const window = points.slice(i - 4, i + 1);
    return window.reduce((sum, p) => sum + p.elims, 0) / 5;
  });
  const rollingPath = rolling
    .map((v, i) => ({ v, i }))
    .filter((d): d is { v: number; i: number } => d.v !== null)
    .map((d, idx) => `${idx === 0 ? 'M' : 'L'}${x(d.i)},${y(d.v)}`)
    .join(' ');

  const gridVals = [0, Math.round(maxElims / 2), maxElims];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Eliminations per match · last {n} matches
        </p>
        <button
          type="button"
          onClick={() => setShowRolling((s) => !s)}
          className={
            'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ' +
            (showRolling
              ? 'border-amber-400/60 bg-amber-400/10 text-amber-600 dark:text-amber-300'
              : 'border-slate-200 text-slate-400 hover:border-slate-300 dark:border-white/10')
          }
          aria-pressed={showRolling}
        >
          <span
            className={
              'h-1.5 w-1.5 rounded-full ' + (showRolling ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600')
            }
          />
          Rolling 5-match avg
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Recent match eliminations chart">
        {/* grid + y labels */}
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="stroke-slate-100 dark:stroke-white/10" strokeWidth={1} />
            <text x={padL - 6} y={y(v) + 3} textAnchor="end" className="fill-slate-400 text-[9px] font-bold">
              {v}
            </text>
          </g>
        ))}

        {/* eliminations line + dots */}
        <path d={elimsPath} fill="none" className="stroke-(--ed-blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.elims)} r={3.5} className="fill-(--ed-blue)">
              <title>{`${p.elims} elims — ${p.tournament}${p.map ? ` · ${p.map}` : ''} (${p.dateLabel})`}</title>
            </circle>
          </g>
        ))}

        {/* rolling average line */}
        {showRolling && rollingPath && (
          <path d={rollingPath} fill="none" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
        )}

        {/* x labels: first / middle / last match dates */}
        {[0, Math.floor((n - 1) / 2), n - 1]
          .filter((i, idx, arr) => n > 1 && arr.indexOf(i) === idx)
          .map((i) => (
            <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="fill-slate-400 text-[9px] font-bold">
              {points[i]?.dateLabel}
            </text>
          ))}
      </svg>

      <div className="mt-2 flex items-center gap-4 text-[11px] font-bold text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-(--ed-blue)" /> Eliminations
        </span>
        {showRolling && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-amber-500 dark:bg-amber-400" /> Rolling 5-match avg
          </span>
        )}
      </div>
    </div>
  );
}
