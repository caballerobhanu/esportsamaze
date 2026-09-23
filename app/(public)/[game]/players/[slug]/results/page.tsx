import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CalendarRange } from 'lucide-react';

import { PlayerTabShell } from '@/components/players/player-tab-shell';
import { EarningsAmount } from '@/components/players/earnings-amount';
import { TabIntro } from '@/components/seo/tab-intro';
import { playerResultsIntro } from '@/lib/entity-intros';
import { TournamentName } from '@/components/ui/tournament-name';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import {
  loadPlayerCareer,
  loadPlayerContext,
  playerMetadata,
  usdConverter,
} from '../player-data';

export const revalidate = 180;

export async function generateMetadata({ params }: { params: Promise<{ game: string; slug: string }> }) {
  const { game, slug } = await params;
  return playerMetadata(slug, 'results', game);
}

interface ResultRow {
  key: string;
  name: string;
  shortName: string | null;
  slug: string | null;
  startDate: Date | null;
  teamName: string | null;
  teamSlug: string | null;
  rank: number | null;
  prizeAmount: number;
  prizeCurrency: string;
  prizeUsd: number;
  /** True when the event's participation came from reported totals, not a roster. */
  reported: boolean;
}

export default async function PlayerResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await loadPlayerContext(slug);
  if (!context) notFound();
  const { player } = context;

  const career = await loadPlayerCareer(player.id);

  const { squadParticipations, reportedRows } = career;
  const toUsd = await usdConverter();

  const rows: ResultRow[] = [];
  const eventsSeen = new Set<string>();

  for (const tt of squadParticipations) {
    eventsSeen.add(tt.tournamentId);
    const prize = tt.prizeWon ?? 0;
    rows.push({
      key: `roster-${tt.id}`,
      name: tt.tournament.name,
      shortName: tt.tournament.shortName,
      slug: tt.tournament.slug,
      startDate: tt.tournament.startDate,
      teamName: tt.team.name,
      teamSlug: tt.team.slug,
      rank: tt.finalRank ?? null,
      prizeAmount: prize,
      prizeCurrency: tt.tournament.currency ?? 'USD',
      prizeUsd: prize > 0 ? await toUsd(prize, tt.tournament.currency, tt.tournament.startDate) : 0,
      reported: false,
    });
  }

  // A reported row counts as event participation only where the event's entered
  // roster does not already list this player — entered rosters always win, and
  // one row per event keeps day slices from repeating the same appearance.
  for (const row of reportedRows) {
    if (eventsSeen.has(row.tournamentId)) continue;
    eventsSeen.add(row.tournamentId);
    rows.push({
      key: `reported-${row.tournamentId}`,
      name: row.tournament.name,
      shortName: row.tournament.shortName,
      slug: row.tournament.slug,
      startDate: row.tournament.startDate,
      teamName: row.team?.name ?? null,
      teamSlug: row.team?.slug ?? null,
      rank: null,
      prizeAmount: 0,
      prizeCurrency: 'USD',
      prizeUsd: 0,
      reported: true,
    });
  }

  rows.sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));

  const finished = rows.filter((row) => row.rank !== null);
  const winnings = rows.filter((row) => row.prizeAmount > 0);

  const intro = playerResultsIntro({
    ign: player.ign,
    events: rows.length,
    reported: rows.filter((row) => row.reported).length,
  });

  return (
    <PlayerTabShell slug={slug} activeTab="results">
      <TabIntro text={intro} />
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Event by event
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Results</h2>
            <p className="mt-2 text-xs font-semibold text-slate-400">
              {rows.length} {rows.length === 1 ? 'event' : 'events'}
              {finished.length > 0 && <> · {finished.length} with a recorded finish</>}
              {winnings.length > 0 && <> · {winnings.length} carrying prize money</>}
            </p>
          </div>
          <CalendarRange className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-700" />
        </div>

        {rows.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[540px] text-left">
              <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                <tr>
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Team</th>
                  <th className="pb-3 text-center">Rank</th>
                  <th className="pb-3 text-right">Prize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {rows.map((row) => (
                  <tr key={row.key} className="text-sm">
                    <td className="py-4 pr-3">
                      {row.slug ? (
                        <Link
                          href={gameHref(DEFAULT_GAME_SLUG, `tournaments/${row.slug}`)}
                          className="font-bold transition-colors hover:text-[#0A5FC4]"
                        >
                          <TournamentName name={row.name} shortName={row.shortName} />
                        </Link>
                      ) : (
                        <span className="font-bold">
                          <TournamentName name={row.name} shortName={row.shortName} />
                        </span>
                      )}
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {row.startDate
                          ? new Date(row.startDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Date not recorded'}
                      </p>
                    </td>
                    <td className="py-4 pr-3">
                      {row.teamName ? (
                        row.teamSlug ? (
                          <Link
                            href={gameHref(DEFAULT_GAME_SLUG, `teams/${row.teamSlug}`)}
                            className="font-semibold text-slate-600 transition-colors hover:text-[#0A5FC4] dark:text-slate-300"
                          >
                            {row.teamName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{row.teamName}</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {row.reported && (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          From reported totals
                        </p>
                      )}
                    </td>
                    <td className="py-4 text-center font-black">
                      {row.rank !== null ? (
                        <span className="text-slate-700 dark:text-slate-200">#{row.rank}</span>
                      ) : (
                        <span className="font-mono text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 text-right font-black">
                      {row.prizeAmount > 0 ? (
                        <EarningsAmount
                          amountUsd={row.prizeUsd}
                          native={{ amount: row.prizeAmount, currency: row.prizeCurrency }}
                        />
                      ) : (
                        <span className="font-mono text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">
            No events on record yet. Results appear once {player.ign} is on a tournament roster or has reported totals.
          </div>
        )}
      </section>
    </PlayerTabShell>
  );
}
