import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Coins, Crosshair, Gift, Swords, Trophy } from 'lucide-react';

import { PlayerTabShell } from '@/components/players/player-tab-shell';
import { PlayerKraftonPanel } from '@/components/players/player-krafton-panel';
import { TabIntro } from '@/components/seo/tab-intro';
import { playerHonoursIntro } from '@/lib/entity-intros';
import { EarningsAmount } from '@/components/players/earnings-amount';
import { flattenPrizeRanks } from '@/lib/standings-config';
import { TournamentName } from '@/components/ui/tournament-name';
import { gameHref, gameSlugOf } from '@/lib/games';
import { nativeTotalFor } from '@/lib/geo-currency';
import {
  loadPlayerCareer,
  loadPlayerContext,
  loadPlayerKraftonDepth,
  loadPlayerMatches,
  playerMetadata,
  usdConverter,
} from '../player-data';

export const dynamic = 'force-static';
export const revalidate = 180;

export async function generateMetadata({ params }: { params: Promise<{ game: string; slug: string }> }) {
  const { game, slug } = await params;
  return playerMetadata(slug, 'honours', game);
}

interface IndividualPrize {
  label: string;
  amount: number;
  /** Set for a non-cash honour: the item ("TVS Raider Bike") or the title. */
  rewardNote: string | null;
}

/**
 * Individual (PLAYER-recipient) awards for this player from a tournament's prize
 * distribution JSON. Non-cash honours count — a "Best IGL" stored as a TITLE with
 * no prize, or an ITEM like a bike, used to be filtered out by an `amount > 0`
 * guard, which silently hid them from the profile.
 */
function extractIndividualPrizes(prizeDistribution: unknown, playerId: string, ign: string): IndividualPrize[] {
  const out: IndividualPrize[] = [];
  for (const row of flattenPrizeRanks(prizeDistribution)) {
    if (!row || row.recipientType !== 'PLAYER') continue;
    const isMe = row.playerId
      ? row.playerId === playerId
      : (typeof row.playerName === 'string' ? row.playerName : '').trim().toLowerCase() === ign.toLowerCase();
    if (!isMe) continue;

    const amount = Number(row.prize ?? 0) || 0;
    const label = String(row.rank ?? '').trim() || 'Award';
    const rewardType = row.rewardType === 'ITEM' || row.rewardType === 'TITLE' ? row.rewardType : 'MONEY';
    const customReward =
      typeof row.customReward === 'string' && row.customReward.trim() ? row.customReward.trim() : null;

    if (amount > 0) out.push({ label, amount, rewardNote: null });
    else if (rewardType === 'ITEM' || rewardType === 'TITLE') {
      out.push({ label, amount: 0, rewardNote: customReward || label });
    }
  }
  return out;
}

export default async function PlayerHonoursPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await loadPlayerContext(slug);
  if (!context) notFound();
  const { player } = context;

  const [matches, career, krafton] = await Promise.all([
    loadPlayerMatches(player.id),
    loadPlayerCareer(player.id),
    loadPlayerKraftonDepth(player),
  ]);

  const { squadParticipations } = career;
  const lineupTournamentIds = new Set(squadParticipations.map((tt) => tt.tournament.id));

  // ── FX conversion: always the exchange rate on the event's start date ──
  const usdFor = await usdConverter();

  // ── Career earnings: one line per earning (team prize and individual awards apart) ──
  interface EarningLine {
    key: string;
    tournament: { name: string; shortName?: string | null; slug: string; startDate: Date | null };
    kind: 'team' | 'individual';
    label: string;
    sub: string | null;
    amount: number;
    currency: string | null;
    usd: number;
    dateKey: number;
    rewardNote?: string | null;
  }

  const earningLines: EarningLine[] = [];
  for (const row of squadParticipations) {
    const dateKey = row.tournament.startDate?.getTime() ?? 0;
    if ((row.prizeWon ?? 0) > 0) {
      earningLines.push({
        key: `${row.tournament.id}-team`,
        tournament: row.tournament,
        kind: 'team',
        label: 'Team prize',
        sub: `${row.team.name}${row.finalRank ? ` · Finish #${row.finalRank}` : ''}`,
        amount: row.prizeWon ?? 0,
        currency: row.tournament.currency,
        usd: await usdFor(row.prizeWon ?? 0, row.tournament.currency, row.tournament.endDate),
        dateKey,
      });
    }
    for (const [idx, prize] of extractIndividualPrizes(row.tournament.prizeDistribution, player.id, player.ign).entries()) {
      earningLines.push({
        key: `${row.tournament.id}-ind-${idx}`,
        tournament: row.tournament,
        kind: 'individual',
        label: prize.label,
        sub: `${row.team.name} · Individual award`,
        amount: prize.amount,
        currency: row.tournament.currency,
        usd: await usdFor(prize.amount, row.tournament.currency, row.tournament.endDate),
        dateKey,
        rewardNote: prize.rewardNote,
      });
    }
  }

  // Individual awards from events that have no recorded squad line-up.
  for (const row of matches) {
    const tournament = row.matchGame.match.tournament;
    if (!tournament || lineupTournamentIds.has(tournament.id)) continue;
    for (const [idx, prize] of extractIndividualPrizes(tournament.prizeDistribution, player.id, player.ign).entries()) {
      earningLines.push({
        key: `${tournament.id}-ind-${idx}`,
        tournament,
        kind: 'individual',
        label: prize.label,
        sub: 'Individual award',
        amount: prize.amount,
        currency: tournament.currency,
        usd: await usdFor(prize.amount, tournament.currency, tournament.endDate),
        dateKey: tournament.startDate?.getTime() ?? 0,
        rewardNote: prize.rewardNote,
      });
    }
  }
  earningLines.sort((a, b) => b.dateKey - a.dateKey || (a.kind === 'team' ? -1 : 1));

  const individualLines = earningLines.filter((l) => l.kind === 'individual');
  const teamLines = earningLines.filter((l) => l.kind === 'team');
  const individualTotalUsd = individualLines.reduce((sum, l) => sum + l.usd, 0);
  const teamTotalUsd = teamLines.reduce((sum, l) => sum + l.usd, 0);
  const careerTotalUsd = individualTotalUsd + teamTotalUsd;

  // Headline totals in their own currency: the exact native sum when every line of
  // that card shares a currency, else USD. The USD sum above stays the reference
  // line, so the card never leads with a round-tripped (drifted) conversion.
  const individualTotalNative = nativeTotalFor(
    individualLines.map((l) => ({ amount: l.amount, currency: l.currency })),
    individualTotalUsd,
  );
  const teamTotalNative = nativeTotalFor(
    teamLines.map((l) => ({ amount: l.amount, currency: l.currency })),
    teamTotalUsd,
  );
  const careerTotalNative = nativeTotalFor(
    earningLines.map((l) => ({ amount: l.amount, currency: l.currency })),
    careerTotalUsd,
  );

  const intro = playerHonoursIntro({
    ign: player.ign,
    entries: earningLines.length,
    events: lineupTournamentIds.size,
  });

  return (
    <PlayerTabShell slug={slug} activeTab="honours">
      <TabIntro text={intro} />
      <div className="space-y-8">
        {earningLines.length > 0 && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6 dark:border-white/10 sm:px-8 sm:py-7">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                  Prize money
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  Career earnings
                </h2>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-blue-500/15 dark:text-blue-300">
                <Coins className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-5 p-6 sm:px-8 sm:py-7">
              {/* Three totals. The career cell is azure-tinted, matching the site's
                  "key figure" treatment (the standings total column). */}
              <div className="grid grid-cols-1 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-white/10 dark:border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-blue-500/15 dark:text-blue-300">
                      <Crosshair className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
                      Individual
                    </p>
                  </div>
                  <EarningsAmount
                    amountUsd={individualTotalUsd}
                    native={individualTotalNative}
                    className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-blue-500/15 dark:text-blue-300">
                      <Swords className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
                      Team prize
                    </p>
                  </div>
                  <EarningsAmount
                    amountUsd={teamTotalUsd}
                    native={teamTotalNative}
                    className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
                  />
                </div>
                <div className="bg-[#0A5FC4]/5 p-5 dark:bg-blue-500/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-blue-500/20 dark:text-blue-300">
                      <Trophy className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#0A5FC4] dark:text-blue-300">
                      Career total
                    </p>
                  </div>
                  <EarningsAmount
                    amountUsd={careerTotalUsd}
                    native={careerTotalNative}
                    className="mt-3 text-2xl font-black tracking-tight text-[#0A5FC4] dark:text-blue-300"
                  />
                </div>
              </div>

              <div className="overflow-x-auto overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full min-w-[520px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Event</th>
                      <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Earning</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {earningLines.map((line) => (
                      <tr
                        key={line.key}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={gameHref(gameSlugOf(player), `tournaments/${line.tournament.slug}`)}
                            className="font-bold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300"
                          >
                            <TournamentName name={line.tournament.name} shortName={line.tournament.shortName} />
                          </Link>
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            {line.tournament.startDate
                              ? new Date(line.tournament.startDate).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 dark:text-white">{line.label}</span>
                          {line.sub && (
                            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              {line.sub}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-[#0A5FC4] dark:text-blue-300">
                          {line.rewardNote ? (
                            // A non-cash honour has no amount to convert, so it shows
                            // what it actually was instead of "0".
                            <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-200">
                              <Gift className="h-3.5 w-3.5 text-indigo-500" />
                              {line.rewardNote}
                            </span>
                          ) : (
                            <EarningsAmount
                              amountUsd={line.usd}
                              native={{ amount: line.amount, currency: line.currency ?? 'USD' }}
                              className="font-black"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <PlayerKraftonPanel
          contributions={krafton.contributions}
          eventCount={krafton.entries.length}
          peakRank={krafton.milestones?.highestRank ?? null}
          daysAtPeak={krafton.milestones?.daysAtHighest ?? 0}
          daysInTop5={krafton.milestones?.daysInTop5 ?? 0}
          trend={krafton.trend}
          entityName={player.ign}
        />
      </div>
    </PlayerTabShell>
  );
}
