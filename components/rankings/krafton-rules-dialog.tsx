'use client';

import * as React from 'react';
import {
  BookOpen,
  Trophy,
  X,
  Zap,
  Clock,
  ArrowRightLeft,
  Award,
  Crown,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

type RulesTab = 'teams' | 'players' | 'decay' | 'transfers';

export function KraftonRulesDialog() {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<RulesTab>('teams');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs backdrop-blur-md transition-all hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300"
      >
        <BookOpen className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-400" />
        <span>Scoring &amp; Decay Rules</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0b101c]">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-6 pb-5 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                  <Trophy className="h-3 w-3" />
                  Official Rulebook
                </div>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  Ranking Methodology
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  KRAFTON official tier matrix, Grand Finals formulas, and rolling time decay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="border-b border-slate-100 px-6 pt-3 pb-2 dark:border-slate-800">
              <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100/80 p-1 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => setActiveTab('teams')}
                  className={`flex-1 min-w-[120px] rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'teams'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Team Points
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('players')}
                  className={`flex-1 min-w-[120px] rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'players'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Player Points
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('decay')}
                  className={`flex-1 min-w-[120px] rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'decay'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Decay Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('transfers')}
                  className={`flex-1 min-w-[120px] rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'transfers'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Transfers Policy
                </button>
              </div>
            </div>

            {/* Scrollable Tab Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: TEAM POINTS MATRIX */}
              {activeTab === 'teams' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        Team Placement Base Points
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Points allocated strictly based on final tournament finish position and sanctioned event tier.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-white/[0.03]">
                          <th className="px-4 py-3">Finish Placement</th>
                          <th className="px-4 py-3 text-right">Publisher</th>
                          <th className="px-4 py-3 text-right">Tier 1</th>
                          <th className="px-4 py-3 text-right">Tier 2</th>
                          <th className="px-4 py-3 text-right">Tier 3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[12px] dark:divide-slate-800/60">
                        {/* 1st Place Champion Highlight */}
                        <tr className="bg-amber-500/[0.04] dark:bg-amber-500/[0.07]">
                          <td className="px-4 py-2.5 font-sans font-bold text-slate-900 dark:text-white">
                            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                              <Crown className="h-3.5 w-3.5 shrink-0" />
                              1st Place (Champion)
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-amber-600 dark:text-amber-400">1,000</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">800</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">600</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">400</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-sans font-medium text-slate-700 dark:text-slate-300">2nd Place</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">800</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">700</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">500</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">350</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-sans font-medium text-slate-700 dark:text-slate-300">3rd Place</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">700</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">600</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800 dark:text-slate-200">400</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">300</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-sans font-medium text-slate-700 dark:text-slate-300">4th Place</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">600</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">500</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">300</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">250</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-sans font-medium text-slate-700 dark:text-slate-300">5th Place</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">500</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">400</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">250</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">200</td>
                        </tr>
                        <tr className="bg-slate-50/40 dark:bg-white/[0.01]">
                          <td className="px-4 py-2 font-sans text-slate-600 dark:text-slate-400">6th – 10th</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">400</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">300</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">200</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">150</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-sans text-slate-600 dark:text-slate-400">11th – 20th</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">300</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">200</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">150</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">100</td>
                        </tr>
                        <tr className="bg-slate-50/40 dark:bg-white/[0.01]">
                          <td className="px-4 py-2 font-sans text-slate-600 dark:text-slate-400">21st – 30th</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">200</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">100</td>
                          <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">75</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">50</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-sans text-slate-600 dark:text-slate-400">31st – 48th</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">100</td>
                          <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">50</td>
                          <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">35</td>
                          <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">25</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-white/[0.02] dark:text-slate-400">
                    <strong>Publisher tier</strong> includes official KRAFTON championships (e.g. BGIS, BMPS). Third-party partner events fall under Tier 1, 2, or 3 based on authorized prize pool and competitive qualification format.
                  </div>
                </div>
              )}

              {/* TAB 2: PLAYER POINTS FORMULA */}
              {activeTab === 'players' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Player Points Formulation
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Evaluated exclusively on Grand Finals performance to preserve competitive fairness across varying group formats.
                    </p>
                  </div>

                  {/* Visual Calculation Formula */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-white/[0.02]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Base Calculation</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                      <div className="rounded-lg bg-white px-3 py-1.5 border border-slate-200 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                        Finals Eliminations <span className="text-slate-400">×</span> Tier Multiplier
                      </div>
                      <span className="text-slate-400 font-black">+</span>
                      <div className="rounded-lg bg-white px-3 py-1.5 border border-slate-200 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                        Individual Awards
                      </div>
                      <span className="text-slate-400 font-black">=</span>
                      <div className="rounded-lg bg-(--ed-blue) px-3 py-1.5 text-white shadow-2xs">
                        Base Points
                      </div>
                    </div>
                  </div>

                  {/* Multipliers and Awards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Tier Multipliers */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080d17]">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        <Layers className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-400" />
                        Tier Multipliers
                      </div>
                      <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800/60">
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Publisher Events</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">2.0×</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Tier 1 Events</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">1.5×</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Tier 2 &amp; Tier 3 Events</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">1.0×</span>
                        </div>
                      </div>
                    </div>

                    {/* Official Awards */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#080d17]">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        <Award className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-400" />
                        Performance Award Bonuses
                      </div>
                      <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800/60">
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">MVP of Tournament</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">+20 pts</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Finals MVP</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">+10 pts</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Best In-Game Leader (IGL)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">+10 pts</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Best Survivor</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">+10 pts</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Emerging Player</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">+5 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TIME DECAY SYSTEM */}
              {activeTab === 'decay' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Rolling Time Decay System
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Points decay automatically over a 36-month window to prioritize recent competitive form over legacy results.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Team Decay Schedule */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#080d17]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Team Retention Curve
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          36-Month Window
                        </span>
                      </div>

                      <div className="mt-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">0 – 180 days (6 mo)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">100% (1.00×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-(--ed-blue) w-full" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 dark:text-slate-400">181 – 270 days (9 mo)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">75% (0.75×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-(--ed-blue)/80 w-3/4" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 dark:text-slate-400">271 – 365 days (1 yr)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">50% (0.50×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-(--ed-blue)/60 w-1/2" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 dark:text-slate-400">366 – 1095 days (3 yrs)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">10% (0.10×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-slate-400/40 w-[10%]" />
                        </div>

                        <div className="flex items-center justify-between pt-1 text-slate-400">
                          <span>&gt; 1095 days (3+ yrs)</span>
                          <span className="font-mono">0% (Expired)</span>
                        </div>
                      </div>
                    </div>

                    {/* Player Decay Schedule */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#080d17]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Player Retention Curve
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          Faster Mid-Drop
                        </span>
                      </div>

                      <div className="mt-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">0 – 180 days (6 mo)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">100% (1.00×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-(--ed-blue) w-full" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 dark:text-slate-400">181 – 240 days (8 mo)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">75% (0.75×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-(--ed-blue)/80 w-3/4" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 dark:text-slate-400">241 – 300 days (10 mo)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">50% (0.50×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-(--ed-blue)/60 w-1/2" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 dark:text-slate-400">301 – 365 days (1 yr)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">25% (0.25×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-(--ed-blue)/40 w-1/4" />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-600 dark:text-slate-400">366 – 1095 days (3 yrs)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">10% (0.10×)</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-slate-400/40 w-[10%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TRANSFERS & ROSTER POLICY */}
              {activeTab === 'transfers' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Roster Rebranding &amp; Point Transfers
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Official rules governing competitive slot buyouts, brand mergers, and historical ranking continuity.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-[#080d17]">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Cutoff-Based Historical Inheritance
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        When an organisation acquires an active roster or assumes an esports slot, points accrued prior to the approved cutoff timestamp transfer to the acquiring entity. Decay remains strictly anchored to the original event conclusion date.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-[#080d17]">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Historical Ledger Transparency
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        Every sanctioned transfer is permanently recorded in the public <strong>Point Transfer Ledger</strong>. The originating organisation retains an audited record of departed event contributions with direct linkage to the successor organisation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
