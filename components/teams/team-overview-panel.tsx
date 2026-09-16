import Link from 'next/link';
import { TournamentName } from '@/components/ui/tournament-name';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ExternalLink,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

import { RecentFormStrip } from './recent-form-strip';
import { TeamStatBand } from './team-stat-band';
import type { TeamContext, TeamFormPoint, TeamMatchSummaryPayload } from '@/lib/team-data';

export interface KraftonSummary {
  rank: number;
  points: number;
  events: number;
}

/**
 * Overview tab: identity lives in the shell hero, so this panel carries the
 * extended stat band, the recent-form strip, a trophy summary, and the
 * existing sidebar cards.
 */
export function TeamOverviewPanel({
  team,
  matchSummary,
  form,
  krafton,
  last20Avg,
}: {
  team: TeamContext;
  matchSummary: TeamMatchSummaryPayload;
  form: TeamFormPoint[];
  krafton: KraftonSummary | null;
  last20Avg?: number | null;
}) {
  const titles = team.won.length;
  const runnerUp = team.runnerUp.length;
  const rosterCount = team.players.filter((player) => player.isPlayer).length;

  const recentEvents = [...team.tournaments].sort(
    (a, b) => (b.startedAtMs ?? 0) - (a.startedAtMs ?? 0),
  );

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[1.4fr_.8fr]">
      <div className="min-w-0 space-y-8">
        <TeamStatBand
          summary={matchSummary.summary}
          last20Avg={last20Avg ?? null}
          hasMatchData={matchSummary.hasMatchData}
        />

        {/* Recent form — points, not placement */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Form guide
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Recent form</h2>
            </div>
            <BarChart3 className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-700" />
          </div>
          <p className="mb-5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Points scored in the team&rsquo;s last {Math.min(form.length, 10) || 10} games, oldest
            to newest. Placement alone hides games won on eliminations, so this tracks total points.
          </p>
          <RecentFormStrip points={form.slice(-10)} />
        </section>

        {/* Trophy summary */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Silverware
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Trophy summary</h2>
            </div>
            <Trophy className="h-6 w-6 shrink-0 text-amber-400" />
          </div>

          {titles > 0 || runnerUp > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-300/50 bg-amber-400/10 p-5">
                  <p className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-300">
                    {titles}
                  </p>
                  <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600/80 dark:text-amber-300/80">
                    Championship{titles === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                  <p className="text-3xl font-black tracking-tight text-slate-500 dark:text-slate-300">
                    {runnerUp}
                  </p>
                  <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                    Runner-up finish{runnerUp === 1 ? '' : 'es'}
                  </p>
                </div>
              </div>
              <Link
                href={`/teams/${team.slug || team.id}/titles`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
              >
                Open trophy cabinet <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-white/10">
              No championship or runner-up finishes on record yet.
            </div>
          )}
        </section>
      </div>

      {/* Sidebar */}
      <aside className="min-w-0 space-y-8">
        {/* Recent events timeline */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="mb-6 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
            <h2 className="text-lg font-black">Recent events</h2>
          </div>

          {recentEvents.length > 0 ? (
            <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5 dark:border-white/10">
              {recentEvents.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#0A5FC4] dark:border-[#0b1220]" />
                  <Link href={`/tournaments/${event.slug}`} className="group block">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="line-clamp-2 text-sm font-extrabold transition-colors group-hover:text-[#0A5FC4]">
                        <TournamentName name={event.name} shortName={event.shortName} />
                      </h4>
                      {event.finalRank && (
                        <span className="shrink-0 rounded-md bg-[#0A5FC4]/10 px-2 py-0.5 text-xs font-black text-[#0A5FC4] dark:text-blue-300">
                          #{event.finalRank}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <CalendarDays className="h-3 w-3" />
                      {event.startedAtMs
                        ? new Date(event.startedAtMs).getUTCFullYear()
                        : 'TBD'}
                      <ExternalLink className="ml-1 h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-white/10">
              No tournament history available.
            </div>
          )}
        </section>

        {/* Team details */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
            <h2 className="text-lg font-black">Team details</h2>
          </div>
          <dl className="space-y-4 text-sm">
            {[
              ['Region', team.region || 'Global'],
              ['Founded', team.foundedYear ? String(team.foundedYear) : 'Unknown'],
              ['Status', team.status || 'Active'],
              ['Game', team.game?.name || 'Not listed'],
              ['Roster', `${rosterCount} player${rosterCount === 1 ? '' : 's'}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-white/10"
              >
                <dt className="text-slate-400">{label}</dt>
                <dd className="text-right font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* KRAFTON ranking — kept as-is */}
        <section className="overflow-hidden rounded-3xl bg-[#0A5FC4] p-6 text-white shadow-xl shadow-blue-900/15">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">KRAFTON ranking</p>
              <p className="mt-3 text-5xl font-black tracking-tight">{krafton ? `#${krafton.rank}` : '—'}</p>
            </div>
            <BarChart3 className="h-6 w-6 text-amber-300" />
          </div>
          <p className="mt-5 text-sm leading-6 text-blue-100">
            {krafton
              ? `${krafton.points.toFixed(1)} decay-adjusted points across ${krafton.events} ranking event${krafton.events === 1 ? '' : 's'}.`
              : 'No decayed ranking points yet — results in ranking-eligible events will add up here.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {krafton && (
              <Link
                href={`/rankings/team/${team.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black uppercase tracking-wider text-[#0A5FC4] shadow-sm transition hover:bg-blue-50"
              >
                Points breakdown <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link
              href="/rankings?board=teams"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/20 hover:text-amber-200"
            >
              Leaderboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* The blue "Verified team profile" card was removed by request. */}
      </aside>
    </div>
  );
}
