import React from 'react';
import {
  Banknote,
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface TournamentPrizeRank {
  rank: string;
  percentage?: number;
  prize: number;
  rewardType?: string;
  customReward?: string;
  recipientType?: string;
  teamName?: string;
  playerName?: string;
}

interface EstaticPrizePanelProps {
  prizeStages: Array<{
    stageName: string;
    allocatedPrize?: number;
    ranks: TournamentPrizeRank[];
  }>;
  currency?: string | null;
  qualifications?: Array<{
    place: string;
    events: Array<string | { name: string }>;
    description?: string;
  }>;
}

export function EstaticPrizePanel({
  prizeStages,
  currency = 'INR',
  qualifications = [],
}: EstaticPrizePanelProps) {
  const mainStage = prizeStages[0] || { stageName: 'Grand Finals', ranks: [] };
  const ranks = mainStage.ranks || [];

  return (
    <div className="space-y-8">
      {/* Grand Prize Hero Callout Card (Estatic Gradient) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A5FC4] via-blue-700 to-indigo-950 p-8 text-white shadow-xl shadow-blue-900/25">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Official Prize Pool Allocation
            </span>
            <h3 className="mt-3 text-4xl sm:text-5xl font-black uppercase tracking-tight">
              ₹1,00,00,000 <span className="text-xl font-bold text-blue-200">INR</span>
            </h3>
            <p className="mt-2 text-sm text-blue-100 font-medium">
              Distributed across tournament podium finishes, MVP honours, and international berths.
            </p>
          </div>

          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md text-amber-300 shadow-inner">
            <Trophy className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* Podium Cards: 1st, 2nd, 3rd in Estatic Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 1st Place */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400 bg-white p-6 shadow-md shadow-amber-400/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              1st Place
            </span>
            <Crown className="h-6 w-6 text-amber-500" />
          </div>
          <h4 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            ₹60,00,000
          </h4>
          <p className="mt-1 text-xs font-bold text-slate-400">60% of Grand Finals Pool</p>
          <div className="mt-4 rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
            🏆 Championship Trophy + PMGC 2026 Slot
          </div>
        </div>

        {/* 2nd Place */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-300">
              2nd Place
            </span>
            <Medal className="h-6 w-6 text-slate-400" />
          </div>
          <h4 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            ₹30,00,000
          </h4>
          <p className="mt-1 text-xs font-bold text-slate-400">Runner-up Allocation</p>
          <div className="mt-4 rounded-xl bg-slate-100 p-2.5 text-xs font-bold text-slate-700 dark:bg-white/5 dark:text-slate-300">
            🥈 Silver Medalist Honours
          </div>
        </div>

        {/* 3rd Place */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-amber-700/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-500">
              3rd Place
            </span>
            <Award className="h-6 w-6 text-amber-700" />
          </div>
          <h4 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
            ₹20,00,000
          </h4>
          <p className="mt-1 text-xs font-bold text-slate-400">Podium Allocation</p>
          <div className="mt-4 rounded-xl bg-slate-100 p-2.5 text-xs font-bold text-slate-700 dark:bg-white/5 dark:text-slate-300">
            🥉 Bronze Medalist Honours
          </div>
        </div>
      </div>

      {/* Complete Distribution Table in Estatic Card */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Rank by Rank
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
            Complete Prize Breakdown
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                <th className="pb-3 pl-4">Rank / Position</th>
                <th className="pb-3 text-center">Share</th>
                <th className="pb-3 pr-4 text-right">Prize Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {[
                { rank: '1st Place', share: '60%', prize: '₹60,00,000', badge: 'bg-amber-400 text-slate-950' },
                { rank: '2nd Place', share: '30%', prize: '₹30,00,000', badge: 'bg-slate-300 text-slate-900' },
                { rank: '3rd Place', share: '20%', prize: '₹20,00,000', badge: 'bg-amber-600/20 text-amber-600' },
                { rank: '4th Place', share: '10%', prize: '₹10,00,000', badge: 'bg-slate-100 text-slate-500 dark:bg-white/5' },
                { rank: '5th Place', share: '5%', prize: '₹5,00,000', badge: 'bg-slate-100 text-slate-500 dark:bg-white/5' },
                { rank: 'Tournament MVP', share: 'Special', prize: '₹5,00,000', badge: 'bg-rose-500 text-white' },
              ].map((row, idx) => (
                <tr key={idx} className="text-sm hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                  <td className="py-4 pl-4 font-black">
                    <span className="flex items-center gap-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-black ${row.badge}`}>
                        {row.rank}
                      </span>
                    </span>
                  </td>
                  <td className="py-4 text-center font-bold text-slate-500">
                    {row.share}
                  </td>
                  <td className="py-4 pr-4 text-right font-black text-base text-[#0A5FC4] dark:text-blue-300">
                    {row.prize}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
