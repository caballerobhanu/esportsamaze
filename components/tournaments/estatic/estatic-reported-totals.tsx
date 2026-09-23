import Link from 'next/link';
import { ClipboardList, Info } from 'lucide-react';
import type { ReportedPlayerTotal, ReportedTeamTotal } from '@/app/(public)/[game]/tournaments/[slug]/tournament-data';
import type { StandingsColumnKey, StandingsLogoMode } from '@/lib/standings-config';
import { TeamMark } from '@/components/ui/team-mark';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

/** Columns the reported table can draw, and what it shows when the config names none of them. */
const REPORTED_STANDINGS_COLUMNS: StandingsColumnKey[] = ['mp', 'wwcd', 'place', 'elims', 'bonus', 'total'];

/**
 * Reported totals — row-level facts entered by hand for events that have no
 * match-by-match scorecards (a day sheet, a stage summary, a whole-event table).
 *
 * These are NEVER merged into computed standings or statistics. They are shown
 * beside them, carrying a "Reported" badge, because the two come from different
 * sources and can legitimately disagree. A blank metric prints as an em dash, not
 * a zero — nothing was recorded, so nothing should read as nought.
 */

const num = (value: number | null) => (value === null ? '—' : value.toLocaleString('en-IN'));

function ProvenanceBadge({ derived }: { derived: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
      <ClipboardList className="h-3 w-3" />
      Reported{derived ? ' · rolled up' : ''}
    </span>
  );
}

function PartialNote({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      <Info className="mt-px h-3 w-3 shrink-0" />
      Some metrics were not reported in every contributing slice, so those totals are partial.
    </p>
  );
}

export function EstaticReportedStandings({
  teams,
  logoMode = 'TEAM',
  columns = REPORTED_STANDINGS_COLUMNS,
}: {
  teams: ReportedTeamTotal[];
  /** How the standings tab draws each team: crest, flag, both, or neither. */
  logoMode?: StandingsLogoMode;
  /** The standings-config column choice, so the reported table honours the same toggles. */
  columns?: StandingsColumnKey[];
}) {
  const derived = teams.some((team) => team.derived);
  const partialCount = teams.reduce((count, team) => count + team.partial.length, 0);
  const show = (key: StandingsColumnKey) => columns.includes(key);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Standings</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            No match-by-match scorecards exist for this event, so these are the totals as reported.
          </p>
        </div>
        <ProvenanceBadge derived={derived} />
      </div>

      <PartialNote count={partialCount} />

      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">Team</th>
              {show('mp') && <th className="px-4 py-3 text-center">MP</th>}
              {show('wwcd') && <th className="px-4 py-3 text-center">WWCD</th>}
              {show('place') && <th className="px-4 py-3 text-center">Place</th>}
              {show('elims') && <th className="px-4 py-3 text-center">Elims</th>}
              {show('bonus') && <th className="px-4 py-3 text-center">Bonus</th>}
              {show('total') && <th className="px-4 py-3 text-right">Total</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {teams.map((team, index) => (
              <tr key={team.teamId}>
                <td className="px-4 py-3 text-center font-mono font-black text-slate-400">
                  {team.placement ?? index + 1}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <TeamMark
                      mode={logoMode}
                      name={team.displayName || team.name}
                      lightSrc={team.logoUrl}
                      darkSrc={team.logoDarkUrl}
                      countryCode={team.countryCode}
                      tileClassName="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-white/10"
                      logoClassName="object-contain p-0.5"
                      fallbackClassName="text-[9px] font-black text-slate-400"
                    />
                    {team.slug ? (
                      <Link href={gameHref(DEFAULT_GAME_SLUG, `teams/${team.slug}`)} className="font-extrabold hover:text-[#0A5FC4]">
                        {team.displayName || team.name}
                      </Link>
                    ) : (
                      <span className="font-extrabold">{team.displayName || team.name}</span>
                    )}
                    {team.tag && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {team.tag}
                      </span>
                    )}
                  </span>
                </td>
                {show('mp') && (
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.matches)}</td>
                )}
                {show('wwcd') && (
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.wwcd)}</td>
                )}
                {show('place') && (
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.placePoints)}</td>
                )}
                {show('elims') && (
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.finishes ?? team.elimsPoints)}</td>
                )}
                {show('bonus') && (
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.bonusPoints)}</td>
                )}
                {show('total') && (
                  <td className="px-4 py-3 text-right font-mono font-black text-[#0A5FC4] dark:text-blue-300">
                    {num(team.totalPoints)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Additive block for the statistics tab — computed statistics are untouched. */
export function EstaticReportedTotals({
  teams,
  players,
}: {
  teams: ReportedTeamTotal[];
  players: ReportedPlayerTotal[];
}) {
  if (teams.length === 0 && players.length === 0) return null;

  const derived = [...teams, ...players].some((row) => row.derived);
  const partialCount =
    teams.reduce((count, team) => count + team.partial.length, 0) +
    players.reduce((count, player) => count + player.partial.length, 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Reported totals</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Entered directly for events without match-by-match scorecards — additional to the computed
            statistics above, never merged into them.
          </p>
        </div>
        <ProvenanceBadge derived={derived} />
      </div>

      <PartialNote count={partialCount} />

      {teams.length > 0 && (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">MP</th>
                <th className="px-4 py-3 text-center">WWCD</th>
                <th className="px-4 py-3 text-center">Place</th>
                <th className="px-4 py-3 text-center">Elims</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {teams.map((team, index) => (
                <tr key={team.teamId}>
                  <td className="px-4 py-3 text-center font-mono font-black text-slate-400">
                    {team.placement ?? index + 1}
                  </td>
                  <td className="px-4 py-3 font-extrabold">{team.displayName || team.name}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.matches)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.wwcd)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(team.placePoints)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">
                    {num(team.finishes ?? team.elimsPoints)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-[#0A5FC4] dark:text-blue-300">
                    {num(team.totalPoints)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {players.length > 0 && (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">MP</th>
                <th className="px-4 py-3 text-center">Elims</th>
                <th className="px-4 py-3 text-center">Damage</th>
                <th className="px-4 py-3 text-center">Headshots</th>
                <th className="px-4 py-3 text-center">Assists</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {players.map((player) => (
                <tr key={player.playerId}>
                  <td className="px-4 py-3">
                    {player.slug ? (
                      <Link href={gameHref(DEFAULT_GAME_SLUG, `players/${player.slug}`)} className="font-extrabold hover:text-[#0A5FC4]">
                        {player.ign}
                      </Link>
                    ) : (
                      <span className="font-extrabold">{player.ign}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{player.teamName ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(player.matches)}</td>
                  <td className="px-4 py-3 text-center font-mono font-black text-[#0A5FC4] dark:text-blue-300">
                    {num(player.playerElims)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(player.damage)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(player.headshots)}</td>
                  <td className="px-4 py-3 text-center font-mono text-slate-500">{num(player.assists)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
