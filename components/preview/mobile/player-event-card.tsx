import { formatDate } from '@/lib/utils';
import type { PlayerEventCardData } from './adapters';

/**
 * Player event card. Deliberately less uniform than the table-derived cards: the
 * two figures the surface is about (elims, average) sit on the brand-blue band
 * the rest of the site uses for a headline number, with the count-style stats
 * demoted to a quiet row underneath.
 */
export function PlayerEventCard({ data }: { data: PlayerEventCardData }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <header className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h3
            className="text-sm font-black leading-snug tracking-tight text-slate-950 dark:text-white"
            title={data.fullName}
          >
            {data.eventName}
          </h3>
          {data.teamName ? (
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {data.teamName}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {data.games} {data.games === 1 ? 'game' : 'games'}
        </span>
      </header>

      <div className="mx-4 mt-3 flex items-end gap-5 rounded-xl bg-[#0A5FC4]/[0.07] px-4 py-3 dark:bg-blue-500/10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
            Elims
          </p>
          <p className="mt-1 text-3xl font-black leading-none tabular-nums text-[#0A5FC4] dark:text-blue-300">
            {data.elims}
          </p>
        </div>
        <div className="h-9 w-px bg-[#0A5FC4]/15 dark:bg-blue-400/20" aria-hidden />
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Avg / game</p>
          <p className="mt-1 text-xl font-black leading-none tabular-nums text-slate-900 dark:text-white">
            {data.avgPerGame}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Best</p>
          <p className="mt-1 text-xl font-black leading-none tabular-nums text-slate-900 dark:text-white">
            {data.bestGame}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-5 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">0-elim games</span>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
            {data.zeroElimGames}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">5+ elim games</span>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
            {data.fivePlusGames}
          </span>
        </div>
      </div>

      {data.lastGameMs ? (
        <p className="border-t border-slate-200 px-4 py-2.5 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
          Last game {formatDate(new Date(data.lastGameMs))}
        </p>
      ) : null}
    </article>
  );
}
