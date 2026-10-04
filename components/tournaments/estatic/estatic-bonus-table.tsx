'use client';

import type { BonusPeriodResult } from '@/lib/stage-bonus';
import type { StandingsTeamMeta } from '@/lib/standings-config';

/**
 * The per-team × per-period bonus grid for a source stage — every team that took bonus points,
 * one column per period (day / window / stage), and the total that carries into the target stage.
 */
export function BonusBreakdown({
  periods,
  byTeamPeriod,
  byTeam,
  teams,
  label,
}: {
  periods: BonusPeriodResult[];
  byTeamPeriod: Record<string, Record<string, number>>;
  byTeam: Record<string, number>;
  teams: Record<string, StandingsTeamMeta>;
  label: string;
}) {
  const rows = Object.keys(byTeam)
    .map((teamId) => ({ teamId, total: byTeam[teamId], perPeriod: byTeamPeriod[teamId] ?? {} }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        (teams[a.teamId]?.name || '').localeCompare(teams[b.teamId]?.name || ''),
    );

  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <div className="border-b border-slate-100 px-5 py-3 dark:border-white/10">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
          Bonus breakdown
        </p>
        <h3 className="text-sm font-black text-slate-900 dark:text-white">{label}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
            <tr>
              <th className="px-4 py-2.5">Team</th>
              {periods.map((p) => (
                <th key={p.key} className="px-3 py-2.5 text-center whitespace-nowrap">
                  {p.label}
                </th>
              ))}
              <th className="px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {rows.map((row) => {
              const meta = teams[row.teamId];
              const name = meta?.displayName || meta?.name || row.teamId;
              return (
                <tr key={row.teamId}>
                  <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200">{name}</td>
                  {periods.map((p) => {
                    const pts = row.perPeriod[p.key] ?? 0;
                    return (
                      <td
                        key={p.key}
                        className="px-3 py-2 text-center font-bold text-slate-600 dark:text-slate-300"
                      >
                        {pts > 0 ? pts : <span className="text-slate-300 dark:text-slate-600">·</span>}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-right font-black text-amber-600 dark:text-amber-300">
                    {row.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
