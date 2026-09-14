import type { TeamFormPoint } from '@/lib/team-data';

const W = 640;
const H = 210;
const padL = 38;
const padR = 16;
const padT = 18;
const padB = 38;

function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Recent-form strip: `totalPoints` for the last N games, oldest → newest.
 *
 * Points, not placement — a 12th-place finish with 9 elims is a better game
 * than a 9th-place finish with none, and only points capture that.
 *
 * Dependency-free inline SVG, same construction as
 * `components/players/recent-form-chart.tsx`.
 */
export function RecentFormStrip({ points }: { points: TeamFormPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-white/10">
        No recent games to plot yet.
      </div>
    );
  }

  const n = points.length;
  const maxPoints = Math.max(10, ...points.map((point) => point.totalPoints));
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (value: number) => padT + (H - padT - padB) * (1 - value / maxPoints);

  const path = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(point.totalPoints)}`)
    .join(' ');

  const gridVals = [0, Math.round(maxPoints / 2), maxPoints];

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Points scored in the last ten games"
      >
        {gridVals.map((value) => (
          <g key={value}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(value)}
              y2={y(value)}
              className="stroke-slate-100 dark:stroke-white/10"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={y(value) + 3}
              textAnchor="end"
              className="fill-slate-400 text-[9px] font-bold"
            >
              {value}
            </text>
          </g>
        ))}

        <path
          d={path}
          fill="none"
          className="stroke-(--ed-blue)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point, i) => (
          <circle
            key={point.matchGameId}
            cx={x(i)}
            cy={y(point.totalPoints)}
            r={point.wwcd ? 5 : 3.5}
            className={point.wwcd ? 'fill-amber-500 dark:fill-amber-400' : 'fill-(--ed-blue)'}
          >
            <title>
              {`${point.totalPoints} pts · rank #${point.rank}${point.wwcd ? ' · WWCD' : ''} — ${point.tournamentName}${point.mapName ? ` · ${point.mapName}` : ''} (${shortDate(point.scheduledAtMs)})`}
            </title>
          </circle>
        ))}

        {[0, Math.floor((n - 1) / 2), n - 1]
          .filter((i, idx, arr) => n > 1 && arr.indexOf(i) === idx)
          .map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 12}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-slate-400 text-[9px] font-bold"
            >
              {shortDate(points[i].scheduledAtMs)}
            </text>
          ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-(--ed-blue)" /> Points
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-amber-400" /> WWCD
        </span>
        <span className="font-bold normal-case tracking-normal text-slate-400">
          Last {n} game{n === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
