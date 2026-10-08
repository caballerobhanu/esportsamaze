import Link from 'next/link';
import { Award, Crown, Gift, Medal, Trophy } from 'lucide-react';

import { ThemeLogo } from '@/components/ui/theme-logo';
import { TournamentName } from '@/components/ui/tournament-name';
import { describeAwardReward, type TeamAward } from '@/lib/team-awards';
import { EarningsAmount } from '@/components/players/earnings-amount';
import type { TeamContext } from '@/lib/team-data';
import { formatPrizePool } from '@/lib/utils';
import { gameHref, gameSlugOf } from '@/lib/games';

/** Reward-type chip colours: money / item / title. */
const rewardTypeClass: Record<string, string> = {
  MONEY: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  ITEM: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  TITLE: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

/**
 * What the award was worth. Cash shows the amount; an honour with no cash value
 * (a physical prize or a title) shows what it actually was — `TVS Raider Bike`,
 * or the honour's own name for a TITLE.
 */
function AwardValue({ award }: { award: TeamAward }) {
  const reward = describeAwardReward(award);

  if (reward.kind === 'MONEY') {
    return (
      <span className="num shrink-0 text-sm font-black text-[#0A5FC4] dark:text-blue-300">
        {formatPrizePool(reward.amount, reward.currency, null, false)}
      </span>
    );
  }

  if (reward.kind === 'REWARD') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-200">
        {reward.rewardType === 'ITEM' ? (
          <Gift className="h-3.5 w-3.5 text-indigo-500" />
        ) : (
          <Award className="h-3.5 w-3.5 text-purple-500" />
        )}
        {reward.text}
      </span>
    );
  }

  return <span className="shrink-0 text-sm font-bold text-slate-300 dark:text-slate-600">—</span>;
}

/** One award row. The parent supplies the bordered, hairline-divided list. */
function AwardRow({ award, gameSlug }: { award: TeamAward; gameSlug: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">{award.label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-slate-400">
          {award.recipientKind === 'PLAYER' && award.playerName && (
            <>
              {award.playerSlug ? (
                <Link
                  href={gameHref(gameSlug, `players/${award.playerSlug}`)}
                  className="uppercase tracking-wider transition-colors hover:text-[#0A5FC4]"
                >
                  {award.playerName}
                </Link>
              ) : (
                <span className="uppercase tracking-wider">{award.playerName}</span>
              )}
              <span aria-hidden>·</span>
            </>
          )}
          <Link
            href={gameHref(gameSlug, `tournaments/${award.tournamentSlug}`)}
            className="transition-colors hover:text-[#0A5FC4]"
          >
            <TournamentName name={award.tournamentName} shortName={award.tournamentShortName} />
          </Link>
        </p>
      </div>

      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
          rewardTypeClass[award.rewardType] ?? 'bg-slate-100 text-slate-500 dark:bg-white/10'
        }`}
      >
        {award.rewardType === 'MONEY' ? 'Cash' : award.rewardType === 'ITEM' ? 'Item' : 'Title'}
      </span>

      <AwardValue award={award} />
    </li>
  );
}

/** Podium styling for 1st / 2nd / 3rd finishes. */
const podiumMeta: Record<
  number,
  { rankLabel: string; badge: string; ring: string; chip: string; card: string }
> = {
  1: {
    rankLabel: 'Champion',
    badge: 'bg-amber-400 text-slate-950 font-black shadow-sm',
    ring: 'border-amber-400/60 ring-amber-400/25 dark:border-amber-400/40 dark:ring-amber-400/20',
    chip: 'border border-amber-400/40 bg-amber-400/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300',
    card: 'border-amber-300/80 bg-amber-50/70 hover:border-amber-400 dark:border-amber-400/30 dark:bg-amber-400/[0.06] dark:hover:bg-amber-400/[0.1] dark:hover:border-amber-400/50',
  },
  2: {
    rankLabel: 'Runner-up',
    badge: 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-100 font-black shadow-sm',
    ring: 'border-slate-300 ring-slate-400/20 dark:border-slate-500/40 dark:ring-slate-400/20',
    chip: 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-300',
    card: 'border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20',
  },
  3: {
    rankLabel: '3rd place',
    badge: 'bg-amber-700 text-white font-black shadow-sm',
    ring: 'border-amber-700/40 ring-amber-700/20 dark:border-amber-600/40 dark:ring-amber-600/20',
    chip: 'border border-amber-700/30 bg-amber-700/10 text-amber-800 dark:border-amber-600/30 dark:bg-amber-600/15 dark:text-amber-300',
    card: 'border-amber-700/20 bg-orange-50/50 hover:border-amber-700/40 dark:border-amber-700/30 dark:bg-amber-700/[0.05] dark:hover:border-amber-700/50',
  },
};

/**
 * Honours & Winnings tab.
 *
 * Three sections:
 *  - Trophies — podium finishes (1st / 2nd / 3rd) with the tournament emblem
 *    and a medal design signifying the placement.
 *  - Winnings & Awards (Team) — prize-ladder money plus special team awards.
 *  - Winnings & Awards (Players) — awards taken by the team's players.
 */
export function TeamTitlesPanel({
  team,
  awards,
  totalWonUsd,
  totalWonNative,
}: {
  team: TeamContext;
  awards: TeamAward[];
  /** Prize money from every event, converted to USD — the reference figure. */
  totalWonUsd: number;
  /** The headline total in its own currency: the exact native sum, or USD when mixed. */
  totalWonNative: { amount: number; currency: string };
}) {
  const teamAwards = awards.filter((award) => award.recipientKind === 'TEAM');
  const playerAwards = awards.filter((award) => award.recipientKind === 'PLAYER');

  // Podium = the team's recorded final ranks (1–3) across events, newest first.
  const podium = [...team.tournaments]
    .filter((event) => event.finalRank !== null && event.finalRank >= 1 && event.finalRank <= 3)
    .sort((a, b) => (b.startedAtMs ?? 0) - (a.startedAtMs ?? 0));

  // Prize ladder — every event where this team took money home.
  const ladder = [...team.tournaments]
    .filter((event) => (event.prizeWon ?? 0) > 0)
    .sort((a, b) => (b.startedAtMs ?? 0) - (a.startedAtMs ?? 0));

  const isEmpty =
    podium.length === 0 && ladder.length === 0 && teamAwards.length === 0 && playerAwards.length === 0;

  return (
    <section className="space-y-8">
      {/* ── Trophies ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600 dark:text-amber-300">
              Silverware
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Trophies</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Podium finishes across every tracked event, newest first.
            </p>
          </div>
          <Trophy className="h-6 w-6 shrink-0 text-amber-400" />
        </div>

        {podium.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center dark:border-white/10">
            <Trophy className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
              {team.name} hasn&rsquo;t had a recorded 1st, 2nd or 3rd-place finish yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {podium.map((event) => {
              const rank = event.finalRank ?? 3;
              const meta = podiumMeta[rank] ?? podiumMeta[3];
              return (
                <Link
                  key={event.id}
                  href={gameHref(gameSlugOf(team), `tournaments/${event.slug}`)}
                  className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 ring-4 ring-offset-2 ring-offset-white transition hover:-translate-y-0.5 hover:shadow-md dark:ring-offset-[#0b1220] ${meta.card} ${meta.ring}`}
                >
                  {/* Emblem */}
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#070b14]">
                    {event.imageUrl || event.imageDarkUrl ? (
                      <ThemeLogo
                        lightSrc={event.imageUrl}
                        darkSrc={event.imageDarkUrl}
                        alt={event.name}
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-base font-black text-[#0A5FC4]/40 dark:text-blue-300/40">
                        {(event.name.match(/\b\w/g) ?? []).slice(0, 2).join('').toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${meta.chip}`}
                    >
                      <Crown className="h-3 w-3" />
                      {meta.rankLabel}
                    </span>
                    <p className="mt-1.5 line-clamp-2 text-sm font-extrabold leading-snug text-slate-900 dark:text-white">
                      <TournamentName name={event.name} shortName={event.shortName} />
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {event.startedAtMs ? new Date(event.startedAtMs).getUTCFullYear() : ''}
                      {event.prizeWon ? ` · ${formatPrizePool(event.prizeWon, event.currency, null, false)}` : ''}
                    </p>
                  </div>

                  <span
                    className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${meta.badge}`}
                  >
                    {rank}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Winnings & Awards · Team ── */}
      {(ladder.length > 0 || teamAwards.length > 0) && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-white/10 sm:px-8 sm:py-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Team honours
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                Winnings &amp; awards
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Prize-ladder money the organization took home, plus any special team awards.
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-blue-500/15 dark:text-blue-300">
              <Medal className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-5 p-6 sm:px-8 sm:py-7">
            {ladder.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Event
                      </th>
                      <th className="hidden px-4 py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 sm:table-cell">
                        Finish
                      </th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Won
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {ladder.map((event) => (
                      <tr
                        key={event.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={gameHref(gameSlugOf(team), `tournaments/${event.slug}`)}
                            className="font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300"
                          >
                            <TournamentName name={event.name} shortName={event.shortName} />
                          </Link>
                        </td>
                        <td className="hidden px-4 py-3 text-center sm:table-cell">
                          {event.finalRank ? (
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              #{event.finalRank}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="num px-4 py-3 text-right font-black text-[#0A5FC4] dark:text-blue-300">
                          {formatPrizePool(event.prizeWon!, event.currency, null, false)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* The total is the table's own footer — the "Won" column summed.
                      The headline is the fact: the native sum when every event shares a
                      currency (so it matches the rows), USD when mixed; the converted
                      figure rides beneath as the reference. */}
                  <tfoot className="border-t border-slate-200 dark:border-white/10">
                    <tr className="bg-slate-50/80 dark:bg-white/[0.03]">
                      <td className="px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">
                        Total won
                      </td>
                      <td className="hidden sm:table-cell" />
                      <td className="px-4 py-3 text-right">
                        <EarningsAmount
                          amountUsd={totalWonUsd}
                          native={totalWonNative}
                          className="text-lg font-black tracking-tight text-[#0A5FC4] dark:text-blue-300"
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {teamAwards.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
                  Special awards
                </p>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
                  {teamAwards.map((award) => (
                    <AwardRow key={award.key} award={award} gameSlug={gameSlugOf(team)} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Winnings & Awards · Players ── */}
      {playerAwards.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-white/10 sm:px-8 sm:py-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Individual honours
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                Winnings &amp; awards
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Awards taken by {team.name} players while playing for the team. A player who has
                since left is still credited here — the honour belongs to the team that won it.
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-blue-500/15 dark:text-blue-300">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="p-6 sm:px-8 sm:py-7">
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 dark:divide-white/5 dark:border-white/10">
              {playerAwards.map((award) => (
                <AwardRow key={award.key} award={award} gameSlug={gameSlugOf(team)} />
              ))}
            </ul>
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <Trophy className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            No trophies, winnings or awards on record for {team.name} yet.
          </p>
        </div>
      )}
    </section>
  );
}