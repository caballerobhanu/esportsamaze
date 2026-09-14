import Link from 'next/link';
import { Award, Crown, Gift, Medal, Trophy } from 'lucide-react';

import { ThemeLogo } from '@/components/ui/theme-logo';
import { describeAwardReward, type TeamAward } from '@/lib/team-awards';
import type { TeamContext } from '@/lib/team-data';
import { formatPrizePool } from '@/lib/utils';

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
      <span className="text-sm font-black text-slate-700 dark:text-slate-200">
        {formatPrizePool(reward.amount, reward.currency, null, false)}
      </span>
    );
  }

  if (reward.kind === 'REWARD') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-200">
        {reward.rewardType === 'ITEM' ? (
          <Gift className="h-3.5 w-3.5 text-indigo-500" />
        ) : (
          <Award className="h-3.5 w-3.5 text-purple-500" />
        )}
        {reward.text}
      </span>
    );
  }

  return <span className="text-sm font-bold text-slate-400">—</span>;
}

function AwardRow({ award }: { award: TeamAward }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">{award.label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-bold text-slate-400">
          {award.recipientKind === 'PLAYER' && award.playerName && (
            <>
              {award.playerSlug ? (
                <Link
                  href={`/players/${award.playerSlug}`}
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
            href={`/tournaments/${award.tournamentSlug}`}
            className="transition-colors hover:text-[#0A5FC4]"
          >
            {award.tournamentName}
          </Link>
        </p>
      </div>

      <span
        className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
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
}: {
  team: TeamContext;
  awards: TeamAward[];
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

  // Total prize money won, grouped by currency so a cross-currency career stays honest.
  const totalByCurrency = new Map<string, number>();
  for (const event of ladder) {
    const currency = (event.currency || 'USD').toUpperCase();
    totalByCurrency.set(currency, (totalByCurrency.get(currency) ?? 0) + (event.prizeWon ?? 0));
  }

  const isEmpty =
    podium.length === 0 && teamAwards.length === 0 && playerAwards.length === 0;

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
                  href={`/tournaments/${event.slug}`}
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
                      {event.name}
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Team honours
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Winnings &amp; awards — Team</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Prize-ladder money the organization took home, plus any special team awards.
              </p>
            </div>
            <Medal className="h-6 w-6 shrink-0 text-slate-300 dark:text-slate-700" />
          </div>

          {ladder.length > 0 && (
            <div className="mb-5 space-y-2.5">
              {/* Total prize money won across the ladder — plain summary row */}
              {totalByCurrency.size > 0 && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[...totalByCurrency.entries()].map(([currency, total]) => (
                    <div
                      key={currency}
                      className="flex items-baseline justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Total won
                      </span>
                      <span className="shrink-0 text-sm font-black tracking-tight text-slate-900 dark:text-white">
                        {formatPrizePool(total, currency, null, false)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="ed-label pt-1 text-slate-400">Prize ladder</p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {ladder.map((event) => (
                  <Link
                    key={event.id}
                    href={`/tournaments/${event.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-500/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">{event.name}</p>
                      {event.finalRank && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Finish #{event.finalRank}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {formatPrizePool(event.prizeWon!, event.currency, null, false)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {teamAwards.length > 0 && (
            <>
              <p className="ed-label mb-2 text-slate-400">Special awards</p>
              <ul className="space-y-2">
                {teamAwards.map((award) => (
                  <AwardRow key={award.key} award={award} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ── Winnings & Awards · Players ── */}
      {playerAwards.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                Individual honours
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Winnings &amp; awards — Players</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Awards taken by {team.name} players while playing for the team. A player who has
                since left is still credited here — the honour belongs to the team that won it.
              </p>
            </div>
            <Award className="h-6 w-6 shrink-0 text-amber-500" />
          </div>
          <ul className="space-y-2">
            {playerAwards.map((award) => (
              <AwardRow key={award.key} award={award} />
            ))}
          </ul>
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