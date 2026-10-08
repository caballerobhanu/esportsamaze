'use client';

import Link from 'next/link';
import { TEAM_CHIP_BOX, TEAM_CHIP_FILL, TeamMark } from '@/components/ui/team-mark';
import { gameHref, gameSlugOf } from '@/lib/games';
import type { BonusPeriodResult } from '@/lib/stage-bonus';
import type { StandingsLogoMode, StandingsTeamMeta } from '@/lib/standings-config';

/**
 * The per-team × per-period bonus grid for a source stage — every team that took bonus points,
 * one column per period (day / window / stage), and the total that carries into the target stage.
 *
 * Rows mirror the standings table so the two read as one system: the same crest (honouring the
 * surface's logo mode), the full name on desktop and the short tag on mobile, and a link to the
 * team page.
 */
export function BonusBreakdown({
  periods,
  byTeamPeriod,
  byTeam,
  teams,
  label,
  logoMode = 'TEAM',
}: {
  periods: BonusPeriodResult[];
  byTeamPeriod: Record<string, Record<string, number>>;
  byTeam: Record<string, number>;
  teams: Record<string, StandingsTeamMeta>;
  label: string;
  /** How this surface draws each team — matches the standings crest. */
  logoMode?: StandingsLogoMode;
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
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
              <th className="py-2.5 sm:py-3.5 pl-2 sm:pl-4 pr-2">Team</th>
              {periods.map((p) => (
                <th key={p.key} className="px-2 sm:px-3 py-2.5 sm:py-3.5 text-center whitespace-nowrap">
                  {p.label}
                </th>
              ))}
              <th className="py-2.5 sm:py-3.5 pl-2 pr-2.5 sm:pr-6 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {rows.map((row) => {
              const meta = teams[row.teamId];
              const cleanName = meta?.displayName || meta?.name || row.teamId;
              const teamTag = meta?.tag || cleanName.slice(0, 4).toUpperCase();
              const gameSlug = typeof meta?.gameSlug === 'string' ? meta.gameSlug : null;
              const teamHref = gameHref(
                gameSlugOf({ gameSlug }),
                `teams/${meta?.slug || encodeURIComponent(cleanName)}`,
              );

              return (
                <tr key={row.teamId} className="text-sm">
                  <td className="py-2.5 sm:py-3 pl-2 sm:pl-4 pr-2">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <TeamMark
                        mode={logoMode}
                        name={cleanName}
                        lightSrc={meta?.logoUrl}
                        darkSrc={meta?.logoDarkUrl}
                        countryCode={meta?.countryCode}
                        href={teamHref}
                        tileClassName={`${TEAM_CHIP_BOX} ${TEAM_CHIP_FILL} relative flex items-center justify-center overflow-hidden hover:scale-105 transition-transform`}
                        logoClassName="object-contain p-0.5 sm:p-1"
                        fallbackClassName="text-[9px] sm:text-xs font-black text-slate-400"
                      />
                      {/* Mobile: short tag. Desktop: full squad name. */}
                      <Link
                        href={teamHref}
                        className="block min-w-0 flex-1 truncate text-xs font-black uppercase tracking-wide text-slate-900 transition-colors hover:text-[#0A5FC4] sm:hidden dark:text-white"
                        title={cleanName}
                      >
                        {teamTag}
                      </Link>
                      <Link
                        href={teamHref}
                        className="hidden min-w-0 flex-1 truncate font-extrabold text-slate-900 transition-colors hover:text-[#0A5FC4] sm:block dark:text-white"
                      >
                        {cleanName}
                      </Link>
                    </div>
                  </td>
                  {periods.map((p) => {
                    const pts = row.perPeriod[p.key] ?? 0;
                    return (
                      <td
                        key={p.key}
                        className="num px-2 sm:px-3 py-2.5 sm:py-3 text-center font-bold text-slate-600 dark:text-slate-300"
                      >
                        {pts > 0 ? pts : <span className="text-slate-300 dark:text-slate-600">·</span>}
                      </td>
                    );
                  })}
                  <td className="num py-2.5 sm:py-3 pl-2 pr-2.5 sm:pr-6 text-right font-black text-amber-600 dark:text-amber-300">
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
