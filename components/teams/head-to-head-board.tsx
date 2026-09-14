import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';

import { TeamCrest } from './team-crest';
import { MIN_AVERAGE_SAMPLES, formatAverage } from '@/lib/team-stats';
import type { HeadToHeadRow } from '@/lib/team-data';

/** Rows shown before the board collapses behind a "show all" disclosure. */
const VISIBLE_ROWS = 15;

/** "+1.8" / "−0.4" / "+0.0" — the sign is the point of the column. */
function formatDiff(myAvg: number, oppAvg: number, samples: number): string {
  if (samples < MIN_AVERAGE_SAMPLES) return '—';
  const diff = myAvg - oppAvg;
  const rounded = Math.abs(diff) < 0.05 ? 0 : diff;
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(1)}`;
}

function HeadToHeadTable({
  rows,
  teamSlug,
  teamName,
}: {
  rows: HeadToHeadRow[];
  teamSlug: string;
  teamName: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left dark:border-white/10 dark:bg-white/5">
            {['Opponent', 'Faced', 'W–L (rank)', 'Opp avg pts', 'Points diff', 'Last meeting', ''].map(
              (heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-400"
                >
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const opponentSlug = row.slug || row.opponentId;
            const wonLast = row.lastMyRank < row.lastOppRank;
            const lostLast = row.lastMyRank > row.lastOppRank;

            return (
              <tr
                key={row.opponentId}
                className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/5"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/teams/${opponentSlug}`}
                    className="group flex items-center gap-3"
                  >
                    <TeamCrest name={row.name} lightSrc={row.logoUrl} darkSrc={row.imageDarkUrl} />
                    <span className="min-w-0">
                      <span className="block truncate font-extrabold transition-colors group-hover:text-[#0A5FC4]">
                        {row.name}
                      </span>
                      {row.tag && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {row.tag}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm font-black">{row.faced}</td>
                <td
                  className="px-4 py-3 text-xs font-black"
                  title={`${teamName} finished ahead in ${row.wins}, behind in ${row.losses}${
                    row.ties > 0 ? `, level in ${row.ties}` : ''
                  } of ${row.faced} shared game${row.faced === 1 ? '' : 's'}. Rank-based — not WWCD wins.`}
                >
                  <span className="text-emerald-600 dark:text-emerald-400">{row.wins}</span>
                  <span className="text-slate-300 dark:text-slate-600">–</span>
                  <span className="text-rose-600 dark:text-rose-400">{row.losses}</span>
                  {row.ties > 0 && (
                    <span className="text-slate-400">
                      –{row.ties}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {formatAverage(row.oppAvgPoints, row.faced)}
                </td>
                <td className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400">
                  <span
                    className={
                      row.faced < MIN_AVERAGE_SAMPLES
                        ? ''
                        : row.myAvgPoints > row.oppAvgPoints
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.myAvgPoints < row.oppAvgPoints
                            ? 'text-rose-600 dark:text-rose-400'
                            : ''
                    }
                    title={`${teamName} ${formatAverage(row.myAvgPoints, row.faced)} · ${row.name} ${formatAverage(row.oppAvgPoints, row.faced)}`}
                  >
                    {formatDiff(row.myAvgPoints, row.oppAvgPoints, row.faced)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-400">
                  {new Date(row.lastMeetingMs).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: '2-digit',
                  })}
                  <span className="mt-0.5 block text-[10px] font-bold">
                    <span className={wonLast ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                      us #{row.lastMyRank}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600"> vs </span>
                    <span className={lostLast ? 'text-rose-600 dark:text-rose-400' : ''}>
                      #{row.lastOppRank}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/compare?type=teams&teamA=${encodeURIComponent(teamSlug)}&teamB=${encodeURIComponent(opponentSlug)}`}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                    aria-label={`Compare ${teamName} with ${row.name}`}
                  >
                    Compare <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Head-to-head board.
 *
 * Opponents share a `matchGameId` and every game carries all 16 teams, so this
 * is a complete record — no sampling, always 15 opponents per game.
 *
 * The disclosure uses a native `<details>` so the panel stays a server
 * component.
 */
export function HeadToHeadBoard({
  rows,
  teamSlug,
  teamName,
}: {
  rows: HeadToHeadRow[];
  teamSlug: string;
  teamName: string;
}) {
  if (rows.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-8 dark:border-white/10 dark:bg-white/[0.02]">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
          Head to head
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Head-to-head board</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          No head-to-head record yet. Opponents appear here as soon as {teamName} shares a lobby
          with them.
        </p>
      </section>
    );
  }

  const visible = rows.slice(0, VISIBLE_ROWS);
  const hidden = rows.slice(VISIBLE_ROWS);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Every shared lobby
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Head-to-head board</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {rows.length} opponent{rows.length === 1 ? '' : 's'} faced across shared games.{' '}
            <strong className="font-black text-slate-600 dark:text-slate-300">
              W–L is rank-based
            </strong>
            : a win means {teamName} placed higher in the same game and an identical placement
            counts as neither — it is not a count of WWCD wins. &ldquo;Points diff&rdquo; is{' '}
            {teamName}&rsquo;s average points minus the opponent&rsquo;s in those same games.
          </p>
        </div>
        <Scale className="h-6 w-6 text-slate-300 dark:text-slate-700" />
      </div>

      <HeadToHeadTable rows={visible} teamSlug={teamSlug} teamName={teamName} />

      {hidden.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1220]">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
            Show all {rows.length} opponents
          </summary>
          <div className="mt-4">
            <HeadToHeadTable rows={hidden} teamSlug={teamSlug} teamName={teamName} />
          </div>
        </details>
      )}

      <Link
        href={`/compare?type=teams&teamA=${encodeURIComponent(teamSlug)}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
      >
        Compare {teamName} with another team <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
