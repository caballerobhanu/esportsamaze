import Link from 'next/link';
import { ArrowRight, Network } from 'lucide-react';

import { TeamCrest } from './team-crest';
import type { RelatedTeamRow } from '@/lib/team-data';

function formDotClass(entry: { rank: number; wwcd: boolean }) {
  if (entry.wwcd) return 'bg-amber-400';
  if (entry.rank <= 5) return 'bg-emerald-500';
  return 'bg-slate-300 dark:bg-slate-600';
}

/**
 * Related teams: same game + same region, excluding self, ranked by shared
 * tournaments then shared match count.
 *
 * Form dots are rendered only for teams that actually have scorecards — the
 * majority of teams have none, and five grey dots would read as "lost five"
 * rather than "no data".
 */
export function RelatedTeamsBand({
  rows,
  teamName,
}: {
  rows: RelatedTeamRow[];
  teamName: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Same game, same region
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Related teams</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Squads that share {teamName}&rsquo;s tournaments and lobbies, ranked by shared events
            then games played against each other.
          </p>
        </div>
        <Network className="h-6 w-6 text-slate-300 dark:text-slate-700" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">
          No related teams found for this game and region.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const href = `/teams/${row.slug || row.id}`;
            return (
              <Link
                key={row.id}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-[#0b1220]"
              >
                <TeamCrest
                  name={row.name}
                  lightSrc={row.logoUrl}
                  darkSrc={row.imageDarkUrl}
                  className="h-11 w-11"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-black uppercase tracking-tight transition-colors group-hover:text-[#0A5FC4]">
                    {row.name}
                  </h3>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {row.sharedTournaments > 0 || row.sharedGames > 0 ? (
                      <>
                        <span>
                          {row.sharedTournaments} shared event{row.sharedTournaments === 1 ? '' : 's'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>
                          {row.sharedGames} game{row.sharedGames === 1 ? '' : 's'} faced
                        </span>
                      </>
                    ) : (
                      <span>Same game &amp; region</span>
                    )}
                  </p>
                  {row.form.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      {row.form.map((entry, i) => (
                        <span
                          key={i}
                          className={`h-1.5 w-1.5 rounded-full ${formDotClass(entry)}`}
                          title={`${i === 0 ? 'Latest game' : `${i + 1} games ago`} — rank #${entry.rank}${entry.wwcd ? ' (WWCD)' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0A5FC4]" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
