import Link from 'next/link';
import { BarChart3, Crosshair, ArrowRight } from 'lucide-react';
import { TournamentShortName } from '@/components/ui/tournament-name';
import type { TeamStandingEntry, PlayerFraggerEntry } from '@/lib/match-standings';
import { teamHref, playerHref } from '@/lib/entity-links';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

interface HomeStandingsSectionProps {
  tournament: { name: string; shortName?: string | null; series?: string | null; season?: string | null };
  tournamentSlug: string;
  stageName: string;
  standings: TeamStandingEntry[];
  fraggers: PlayerFraggerEntry[];
  /** The event's own game slug, so the standings link stays on this game. */
  gameSlug?: string;
}

/** Compact "tournament pulse": top-8 points table plus top-5 fraggers. */
export function HomeStandingsSection({
  tournament,
  tournamentSlug,
  stageName,
  standings,
  fraggers,
  gameSlug = DEFAULT_GAME_SLUG,
}: HomeStandingsSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left Column: Official Points Table (8 cols) */}
      <section id="rankings" className="flex min-w-0 flex-col gap-4 lg:col-span-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--ed-blue)]/10 text-[var(--ed-blue)]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-extrabold leading-tight tracking-tight text-[var(--ed-ink)] sm:text-2xl">
              <TournamentShortName
                name={tournament.name}
                shortName={tournament.shortName}
                series={tournament.series}
                season={tournament.season}
              />
            </h2>
            <span className="shrink-0 rounded-full bg-[var(--ed-blue)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--ed-blue)]">
              {stageName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={gameHref(gameSlug, `tournaments/${tournamentSlug}/standings`)}
              className="group flex items-center gap-1.5 text-xs font-bold text-[var(--ed-blue)] hover:underline"
            >
              <span>Full Standings</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* `flex-1`: the table gives the pair its height, so the fraggers list
            can stretch to the same bottom edge. */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0b1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900 text-white dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="w-12 px-3 py-3 text-center font-bold text-[11px] uppercase tracking-wider text-slate-300">#</th>
                  <th className="px-3 py-3 font-bold text-[11px] uppercase tracking-wider text-white">Team Name</th>
                  <th className="px-2 py-3 text-center font-bold text-[11px] uppercase tracking-wider text-slate-300">Played</th>
                  <th className="px-2 py-3 text-center font-bold text-[11px] uppercase tracking-wider text-amber-400">WWCD 🍗</th>
                  <th className="hidden px-2 py-3 text-center font-bold text-[11px] uppercase tracking-wider text-slate-300 sm:table-cell">Place Pts</th>
                  <th className="hidden px-2 py-3 text-center font-bold text-[11px] uppercase tracking-wider text-slate-300 sm:table-cell">Elims</th>
                  <th className="px-3 py-3 text-center font-black text-[11px] uppercase tracking-wider text-white bg-white/10">Total Pts</th>
                  <th className="hidden px-3 py-3 text-center font-bold text-[11px] uppercase tracking-wider text-slate-300 md:table-cell">Recent Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {standings.length > 0 ? (
                  standings.slice(0, 8).map((team) => {
                    return (
                      <tr
                        key={team.teamId}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-2.5 text-center">
                          {team.rank === 1 ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-500 text-xs font-bold text-slate-950 shadow-xs">
                              1
                            </span>
                          ) : team.rank === 2 ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              2
                            </span>
                          ) : team.rank === 3 ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-amber-600/20 text-xs font-bold text-amber-700 dark:text-amber-400">
                              3
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                              {team.rank}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={teamHref({ slug: team.teamSlug, name: team.teamName })}
                            className="group flex items-center gap-2.5"
                          >
                            {team.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={team.logoUrl}
                                alt={team.teamName}
                                className="h-5 w-5 shrink-0 rounded object-contain"
                              />
                            ) : null}
                            <span className="font-bold text-slate-900 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300">
                              {team.teamName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-center font-semibold text-slate-500 dark:text-slate-400">
                          {team.matchesPlayed}
                        </td>
                        <td className="num px-2 py-2.5 text-center font-bold text-amber-600 dark:text-amber-400">
                          {team.wwcd}
                        </td>
                        <td className="hidden px-2 py-2.5 text-center font-semibold text-slate-500 dark:text-slate-400 sm:table-cell">
                          {team.placementPoints}
                        </td>
                        <td className="hidden px-2 py-2.5 text-center font-semibold text-slate-500 dark:text-slate-400 sm:table-cell">
                          {team.eliminationPoints}
                        </td>
                        <td className="num bg-[#0A5FC4]/5 px-3 py-2.5 text-center font-black text-[#0A5FC4] dark:bg-blue-500/10 dark:text-blue-300">
                          {team.totalPoints}
                        </td>
                        <td className="hidden px-3 py-2.5 text-center md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {team.matchHistory.slice(-5).map((mh, idx) => (
                              <span
                                key={idx}
                                title={`M${mh.matchNumber} (${mh.mapName}): #${mh.rank} (${mh.elimsPoints} elims) = ${mh.totalPoints} pts`}
                                className={`flex h-4 w-5 items-center justify-center rounded text-[9px] font-bold ${
                                  mh.rank === 1
                                    ? 'bg-amber-400 text-slate-950'
                                    : mh.rank <= 4
                                      ? 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300'
                                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                                }`}
                              >
                                {mh.totalPoints}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                      No points recorded yet for this stage.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Right Column: Top Fraggers (4 cols) */}
      <section id="rankings-fraggers" className="flex min-w-0 flex-col gap-4 lg:col-span-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Crosshair className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Top Fraggers
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400">
            {stageName}
          </span>
        </div>

        {/* Stretched to the points table's height; the rows share the slack. */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex flex-1 flex-col divide-y divide-slate-100 dark:divide-white/5">
            {fraggers.length > 0 ? (
              fraggers.slice(0, 5).map((player) => (
                <div
                  key={player.playerId}
                  className="flex flex-1 items-center p-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                          player.rank === 1
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950'
                            : player.rank === 2
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                              : player.rank === 3
                                ? 'bg-amber-600/20 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                        }`}
                      >
                        {player.rank}
                      </span>
                      <div>
                        <Link
                          href={playerHref({ slug: player.playerSlug, ign: player.ign })}
                          className="text-sm font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300"
                        >
                          {player.ign}
                        </Link>
                        <div className="mt-0.5 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {player.teamName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="num text-sm font-black text-[#0A5FC4] dark:text-blue-400">
                        {player.elims} elims
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {player.matchesPlayed} Matches
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No player fragger statistics recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
