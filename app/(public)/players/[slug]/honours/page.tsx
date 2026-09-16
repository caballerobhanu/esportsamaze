import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Coins, Crosshair, Gift, Swords, Trophy } from 'lucide-react';

import { PlayerTabShell } from '@/components/players/player-tab-shell';
import { PlayerKraftonPanel } from '@/components/players/player-krafton-panel';
import { EarningsAmount } from '@/components/players/earnings-amount';
import { flattenPrizeRanks } from '@/lib/standings-config';
import { TournamentName } from '@/components/ui/tournament-name';
import {
  loadPlayerCareer,
  loadPlayerContext,
  loadPlayerKraftonDepth,
  loadPlayerMatches,
  playerMetadata,
  usdConverter,
} from '../player-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return playerMetadata(slug, 'honours');
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
        usd: await usdFor(row.prizeWon ?? 0, row.tournament.currency, row.tournament.startDate),
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
        usd: await usdFor(prize.amount, row.tournament.currency, row.tournament.startDate),
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
        usd: await usdFor(prize.amount, tournament.currency, tournament.startDate),
        dateKey: tournament.startDate?.getTime() ?? 0,
        rewardNote: prize.rewardNote,
      });
    }
  }
  earningLines.sort((a, b) => b.dateKey - a.dateKey || (a.kind === 'team' ? -1 : 1));

  const individualTotalUsd = earningLines.filter((l) => l.kind === 'individual').reduce((sum, l) => sum + l.usd, 0);
  const teamTotalUsd = earningLines.filter((l) => l.kind === 'team').reduce((sum, l) => sum + l.usd, 0);
  const careerTotalUsd = individualTotalUsd + teamTotalUsd;

  // Native totals — the sum of the ORIGINAL prize amounts in the event's own
  // currency, never re-derived from the USD sum (that would float the total on
  // whichever rate applies at view time).
  const nativeTotalFor = (lines: EarningLine[]) => {
    const byCurrency = new Map<string, { amount: number; count: number }>();
    for (const line of lines) {
      const currency = (line.currency || 'USD').toUpperCase();
      const entry = byCurrency.get(currency) ?? { amount: 0, count: 0 };
      entry.amount += line.amount;
      entry.count += 1;
      byCurrency.set(currency, entry);
    }
    let dominant = { currency: 'USD', amount: 0, count: 0 };
    for (const [currency, entry] of byCurrency.entries()) {
      if (entry.amount > dominant.amount) dominant = { currency, ...entry };
    }
    return dominant;
  };
  const individualNative = nativeTotalFor(earningLines.filter((l) => l.kind === 'individual'));
  const teamNative = nativeTotalFor(earningLines.filter((l) => l.kind === 'team'));
  const careerNative = nativeTotalFor(earningLines);

  return (
    <PlayerTabShell slug={slug} activeTab="honours">
      <div className="space-y-8">
        {earningLines.length > 0 && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                  Prize money
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Career earnings</h2>
              </div>
              <Coins className="h-6 w-6 text-amber-400" />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <Crosshair className="mb-3 h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                <EarningsAmount
                  amountUsd={individualTotalUsd}
                  native={{ amount: individualNative.amount, currency: individualNative.currency }}
                  className="text-xl font-black tracking-tight"
                />
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                  Individual winnings
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <Swords className="mb-3 h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                <EarningsAmount
                  amountUsd={teamTotalUsd}
                  native={{ amount: teamNative.amount, currency: teamNative.currency }}
                  className="text-xl font-black tracking-tight"
                />
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                  Team prize winnings
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/50 bg-amber-400/10 p-4">
                <Trophy className="mb-3 h-4 w-4 text-amber-500" />
                <EarningsAmount
                  amountUsd={careerTotalUsd}
                  native={{ amount: careerNative.amount, currency: careerNative.currency }}
                  className="text-xl font-black tracking-tight"
                />
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600 dark:text-amber-300">
                  Career total
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <tr>
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Earning</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {earningLines.map((line) => (
                    <tr key={line.key} className="text-sm">
                      <td className="py-4 pr-3">
                        <Link
                          href={`/tournaments/${line.tournament.slug}`}
                          className="font-bold transition-colors hover:text-[#0A5FC4]"
                        >
                          <TournamentName name={line.tournament.name} shortName={line.tournament.shortName} />
                        </Link>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {line.tournament.startDate
                            ? new Date(line.tournament.startDate).toLocaleDateString('en-IN', {
                                month: 'short',
                                year: 'numeric',
                              })
                            : ''}
                        </p>
                      </td>
                      <td className="py-4 pr-3">
                        <span
                          className={
                            'font-bold ' +
                            (line.kind === 'team'
                              ? 'text-[#0A5FC4] dark:text-blue-300'
                              : 'text-amber-600 dark:text-amber-400')
                          }
                        >
                          {line.label}
                        </span>
                        {line.sub && (
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {line.sub}
                          </p>
                        )}
                      </td>
                      <td className="py-4 text-right font-black">
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
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
