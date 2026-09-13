'use client';

import * as React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { RankTrendPoint } from '@/lib/krafton-standings';

export function RankTrendChart({
  trend,
  entityName,
}: {
  trend: RankTrendPoint[];
  entityName: string;
}) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  if (trend.length === 0) return null;

  // Limit to recent 10 movements only
  const points = trend.slice(-10);
  const n = points.length;

  // If only 1 data point, show a simple baseline badge
  if (n === 1) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-sm font-black text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            #{points[0].rank}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
              Current Rank #{points[0].rank}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Recorded at {points[0].eventName ?? points[0].dateLabel} ({Math.round(points[0].totalPoints)} pts)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Multi-point graph (matches Player Recent Form aesthetic)
  const ranks = points.map((t) => t.rank);
  const bestRank = Math.min(...ranks);
  const worstRank = Math.max(...ranks);
  const isRising = points[points.length - 1].rank <= points[0].rank;

  // Chart layout dimensions
  const W = 640;
  const H = 220;
  const padL = 42;
  const padR = 24;
  const padT = 24;
  const padB = 34;

  // Inverted rank Y-scale: #1 near top (padT), worst rank near bottom (H - padB)
  const yMin = Math.max(1, bestRank - 1);
  const yMax = Math.max(worstRank + 1, yMin + 2);

  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (rank: number) => padT + ((rank - yMin) / (yMax - yMin)) * (H - padT - padB);

  const pointsPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.rank).toFixed(1)}`).join(' ');
  const areaPath = `${pointsPath} L${x(n - 1).toFixed(1)},${(H - padB).toFixed(1)} L${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;

  // Grid tick values (min, mid, max rank)
  const gridRanks = [yMin, Math.round((yMin + yMax) / 2), yMax].filter(
    (v, idx, arr) => arr.indexOf(v) === idx
  );

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
      {/* Header — mirrors Player Recent Form styling */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Performance log
          </p>
          <div className="mt-1 flex items-center gap-2.5">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Recent rank movement
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isRising
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isRising ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isRising ? 'Form Improving' : 'Rank Step Down'}
            </span>
          </div>
        </div>
        <TrendingUp className="h-6 w-6 text-slate-300 dark:text-slate-700" />
      </div>

      {/* Sub-bar: fixed height summary prevents ANY vertical layout shift */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Rank movement · last {n} movements
        </p>
        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0A5FC4]" /> Event addition
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Decay step
          </span>
        </div>
      </div>

      {/* Fixed-height inspection strip — stays exactly 28px high so layout never shifts */}
      <div className="mb-3 flex h-7 items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 text-xs font-semibold text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300">
        {activePoint ? (
          <div className="flex w-full items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-medium text-slate-500 dark:text-slate-400">
              {activePoint.eventName ?? activePoint.dateLabel} ({activePoint.dateLabel})
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                  activePoint.changeType === 'decay'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}
              >
                {activePoint.changeType === 'decay' ? 'Decay Step' : 'Event Addition'}
              </span>
              <strong className="font-mono text-[#0A5FC4] dark:text-blue-300">
                Rank #{activePoint.rank} · {Math.round(activePoint.totalPoints)} pts
              </strong>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            Hover any data point below for snapshot breakdown.
          </span>
        )}
      </div>

      {/* SVG Container — strictly isolated coordinate space, zero DOM shift */}
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Rank movement chart for ${entityName}`}
        >
          <defs>
            <linearGradient id="recentRankArea" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0A5FC4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0A5FC4" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines + Y labels */}
          {gridRanks.map((r) => {
            const yPos = y(r);
            return (
              <g key={r}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={yPos}
                  y2={yPos}
                  className="stroke-slate-100 dark:stroke-white/10"
                  strokeWidth={1}
                />
                <text
                  x={padL - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[9px] font-bold font-mono"
                >
                  #{r}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#recentRankArea)" />

          {/* Main trend line */}
          <path
            d={pointsPath}
            fill="none"
            className="stroke-[#0A5FC4] dark:stroke-blue-400"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Milestone points & touch/hover hit areas */}
          {points.map((p, idx) => {
            const cx = x(idx);
            const cy = y(p.rank);
            const isHovered = hoveredIdx === idx;
            const isDecay = p.changeType === 'decay';

            return (
              <g
                key={p.date + idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Generous transparent hit area so hovering never jitters */}
                <circle cx={cx} cy={cy} r={14} fill="transparent" />

                {/* Outer halo when active */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    className="fill-[#0A5FC4]/20 dark:fill-blue-400/25"
                  />
                )}

                {/* Data point dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5 : 3.5}
                  className={
                    isDecay
                      ? 'fill-amber-500 stroke-2 stroke-white dark:stroke-[#0b1220]'
                      : 'fill-[#0A5FC4] stroke-2 stroke-white dark:fill-blue-400 dark:stroke-[#0b1220]'
                  }
                >
                  <title>{`${p.dateLabel}: Rank #${p.rank} (${Math.round(p.totalPoints)} pts) · ${
                    isDecay ? 'Decay Step' : 'Event Addition'
                  }${p.eventName ? ` — ${p.eventName}` : ''}`}</title>
                </circle>
              </g>
            );
          })}

          {/* X-axis date labels at first, middle, and last milestone (matches RecentFormChart) */}
          {[0, Math.floor((n - 1) / 2), n - 1]
            .filter((i, idx, arr) => n > 1 && arr.indexOf(i) === idx)
            .map((i) => {
              const p = points[i];
              const parts = p.dateLabel.trim().split(' ');
              const formatted = parts.length === 3 ? `${parts[0]} ${parts[1]} '${parts[2].slice(-2)}` : p.dateLabel;

              return (
                <text
                  key={i}
                  x={x(i)}
                  y={H - 10}
                  textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
                  className="fill-slate-400 font-mono text-[9px] font-bold"
                >
                  {formatted}
                </text>
              );
            })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-400">
        <span>Chronological progression</span>
        <span className="font-mono text-[10px]">Y-axis inverted (#1 is top)</span>
      </div>
    </section>
  );
}
