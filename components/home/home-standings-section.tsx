import Link from 'next/link';
import { BarChart3, Crosshair, ArrowRight } from 'lucide-react';
import type { TeamStandingEntry, PlayerFraggerEntry } from '@/lib/match-standings';

interface HomeStandingsSectionProps {
  tournamentTitle: string;
  tournamentSlug: string;
  stageName: string;
  standings: TeamStandingEntry[];
  fraggers: PlayerFraggerEntry[];
}

/** Compact "tournament pulse": top-8 points table plus top-5 fraggers. */
export function HomeStandingsSection({
  tournamentTitle,
  tournamentSlug,
  stageName,
  standings,
  fraggers,
}: HomeStandingsSectionProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Left Column: Official Points Table (8 cols) */}
      <section id="rankings" className="min-w-0 space-y-4 lg:col-span-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--ed-blue)]/10 text-[var(--ed-blue)]">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-extrabold leading-tight tracking-tight text-[var(--ed-ink)] sm:text-2xl">
              {tournamentTitle}
            </h2>
            <span className="shrink-0 rounded-full bg-[var(--ed-blue)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--ed-blue)]">
              {stageName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/tournaments/${tournamentSlug}/standings`}
              className="group flex items-center gap-1.5 text-xs font-bold text-[var(--ed-blue)] hover:underline"
            >
              <span>Full Standings</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="ed-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--ed-hair)] bg-[var(--ed-sand)]/60">
                <tr>
                  <th className="ed-th w-12 px-3 py-3 text-center">#</th>
                  <th className="ed-th px-3 py-3">Team Name</th>
                  <th className="ed-th px-2 py-3 text-center">Played</th>
                  <th className="ed-th px-2 py-3 text-center">WWCD 🍗</th>
                  <th className="ed-th hidden px-2 py-3 text-center sm:table-cell">Place Pts</th>
                  <th className="ed-th hidden px-2 py-3 text-center sm:table-cell">Finishes</th>
                  <th className="ed-th px-3 py-3 text-center">Total Pts</th>
                  <th className="ed-th hidden px-3 py-3 text-center md:table-cell">Recent Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ed-hair)] font-medium">
                {standings.length > 0 ? (
                  standings.slice(0, 8).map((team) => {
                    return (
                      <tr
                        key={team.teamId}
                        className="transition-colors hover:bg-[var(--ed-sand)]/50"
                      >
                        <td className="px-3 py-2.5 text-center">
                          {team.rank === 1 ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-500 text-xs font-bold text-slate-950">
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
                            <span className="text-xs font-bold text-[var(--ed-stone)]">
                              {team.rank}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/teams/${encodeURIComponent(team.teamSlug || team.teamName.toLowerCase().replace(/\s+/g, '-'))}`}
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
                            <span className="font-bold text-[var(--ed-ink)] transition-colors group-hover:text-[var(--ed-blue)]">
                              {team.teamName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-center font-semibold text-[var(--ed-stone)]">
                          {team.matchesPlayed}
                        </td>
                        <td className="num px-2 py-2.5 text-center font-bold text-amber-600 dark:text-amber-400">
                          {team.wwcd}
                        </td>
                        <td className="hidden px-2 py-2.5 text-center font-semibold text-[var(--ed-stone)] sm:table-cell">
                          {team.placementPoints}
                        </td>
                        <td className="hidden px-2 py-2.5 text-center font-semibold text-[var(--ed-stone)] sm:table-cell">
                          {team.eliminationPoints}
                        </td>
                        <td className="num bg-[var(--ed-blue)]/5 px-3 py-2.5 text-center font-bold text-[var(--ed-blue)]">
                          {team.totalPoints}
                        </td>
                        <td className="hidden px-3 py-2.5 text-center md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {team.matchHistory.slice(-5).map((mh, idx) => (
                              <span
                                key={idx}
                                title={`M${mh.matchNumber} (${mh.mapName}): #${mh.rank} (${mh.elimsPoints} K) = ${mh.totalPoints} pts`}
                                className={`flex h-4 w-5 items-center justify-center rounded text-[9px] font-bold ${
                                  mh.rank === 1
                                    ? 'bg-amber-400 text-slate-950'
                                    : mh.rank <= 4
                                      ? 'bg-[var(--ed-blue)]/10 text-[var(--ed-blue)]'
                                      : 'bg-[var(--ed-sand)] text-[var(--ed-stone)]'
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
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--ed-stone)]">
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
      <section id="rankings-fraggers" className="min-w-0 space-y-4 lg:col-span-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Crosshair className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--ed-ink)] sm:text-2xl">
              Top Fraggers
            </h2>
          </div>
          <span className="rounded-full bg-[var(--ed-sand)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--ed-stone)]">
            {stageName}
          </span>
        </div>

        <div className="ed-card">
          <div className="divide-y divide-[var(--ed-hair)]">
            {fraggers.length > 0 ? (
              fraggers.slice(0, 5).map((player) => (
                <div
                  key={player.playerId}
                  className="p-4 transition-colors hover:bg-[var(--ed-sand)]/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                          player.rank === 1
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950'
                            : player.rank === 2
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                              : player.rank === 3
                                ? 'bg-amber-600/20 text-amber-700 dark:text-amber-400'
                                : 'bg-[var(--ed-sand)] text-[var(--ed-stone)]'
                        }`}
                      >
                        {player.rank}
                      </span>
                      <div>
                        <Link
                          href={`/players/${encodeURIComponent(player.playerSlug || player.ign.toLowerCase())}`}
                          className="text-sm font-bold text-[var(--ed-ink)] transition-colors hover:text-[var(--ed-blue)]"
                        >
                          {player.ign}
                        </Link>
                        <div className="mt-0.5 truncate text-[11px] font-medium text-[var(--ed-stone)]">
                          {player.teamName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="num text-sm font-bold text-[var(--ed-blue)]">
                        {player.elims} Kills
                      </div>
                      <div className="text-[11px] font-semibold text-[var(--ed-stone)]">
                        {player.matchesPlayed} Matches
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-[var(--ed-hair)] pt-2.5 text-[11px] text-[var(--ed-stone)]">
                    <span>Role: <strong className="font-bold text-[var(--ed-ink)]">{player.role || 'Player'}</strong></span>
                    <span>Headshots: <strong className="font-bold text-[var(--ed-ink)]">{player.headshots}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[var(--ed-stone)]">
                No player fragger statistics recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
