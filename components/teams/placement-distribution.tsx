import type { PlacementBin } from '@/lib/team-stats';

const W = 640;
const H = 190;
const padL = 20;
const padR = 20;
const padT = 24;
const padB = 40;

/**
 * Placement distribution histogram — 1st / 2–3 / 4–10 / 11–16.
 *
 * Dependency-free inline SVG: this project has no chart library, and the
 * existing charts (`components/players/recent-form-chart.tsx`) are built the
 * same way — fixed viewBox, pure scaling closures, `--ed-*` colour tokens.
 */
export function PlacementDistribution({
  bins,
  total,
}: {
  bins: PlacementBin[];
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-white/10">
        No placements to plot yet.
      </div>
    );
  }

  const maxGames = Math.max(1, ...bins.map((bin) => bin.games));
  const slot = (W - padL - padR) / bins.length;
  const barW = slot * 0.54;
  const plotH = H - padT - padB;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Placement distribution across the team's games"
      >
        <line
          x1={padL}
          x2={W - padR}
          y1={H - padB}
          y2={H - padB}
          className="stroke-slate-200 dark:stroke-white/10"
          strokeWidth={1}
        />

        {bins.map((bin, i) => {
          const barH = plotH * (bin.games / maxGames);
          const barX = padL + slot * i + (slot - barW) / 2;
          const barY = H - padB - barH;
          const share = total > 0 ? Math.round((bin.games / total) * 100) : 0;
          const isPeak = bin.games === maxGames && bin.games > 0;

          return (
            <g key={bin.id}>
              <rect
                x={barX}
                y={barY}
                width={barW}
                height={Math.max(barH, bin.games > 0 ? 3 : 0)}
                rx={6}
                className={
                  isPeak
                    ? 'fill-(--ed-blue)'
                    : 'fill-(--ed-blue) opacity-55'
                }
              >
                <title>{`${bin.label}: ${bin.games} games (${share}%)`}</title>
              </rect>
              <text
                x={barX + barW / 2}
                y={barY - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-black dark:fill-slate-300"
              >
                {bin.games}
              </text>
              <text
                x={barX + barW / 2}
                y={H - padB + 18}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-extrabold"
              >
                {bin.label}
              </text>
              <text
                x={barX + barW / 2}
                y={H - padB + 31}
                textAnchor="middle"
                className="fill-slate-400 text-[9px] font-bold"
              >
                {share}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
