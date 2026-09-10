'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Share2,
  Copy,
  Check,
  Download,
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';

export interface CalendarPhase {
  id: string;
  name: string;
  shortName?: string;
  weekIndex: number; // 0-based week row
  startCol: number; // 1 to 7 (1 = Mon, 7 = Sun)
  endCol: number; // 1 to 7
  color: 'orange' | 'magenta' | 'blue' | 'cyan' | 'green' | 'purple' | 'amber';
  matchesCount?: number;
  stageName?: string;
}

export interface CalendarDay {
  dayNumber: number;
  monthName?: string;
  isRestDay?: boolean;
  dateKey: string; // YYYY-MM-DD
  matchesCount?: number;
  phaseLabel?: string;
  fullDate?: Date;
}

interface TournamentScheduleCalendarProps {
  tournamentName?: string;
  tournamentSlug?: string;
  dateRangeText?: string;
  stages?: Array<{
    id: string;
    name: string;
    sequence?: number;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  }>;
  matches?: Array<{
    id: string;
    scheduledAt?: any;
    stageId?: string | null;
    stage?: { name: string } | null;
    groupName?: string | null;
  }>;
  formatDetails?: any;
}

// Phase styling definitions matching official broadcast social aesthetics
const PHASE_COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800/60',
  },
  magenta: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/60',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-[#0A5FC4] dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/60',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800/60',
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/60',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/60',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60',
  },
};

export function TournamentScheduleCalendar({
  tournamentName = 'BMSD 2026',
  tournamentSlug,
  dateRangeText,
  stages = [],
  matches = [],
  formatDetails,
}: TournamentScheduleCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [copied, setCopied] = useState(false);

  // Determine if this is BMSD 2026 or has custom phases in formatDetails
  const isBmsd = useMemo(() => {
    const lower = (tournamentName || '').toLowerCase();
    return lower.includes('bmsd') || lower.includes('showdown');
  }, [tournamentName]);

  // Calendar configuration (4 weeks, 7 days M-S)
  const { weeksData, phasesByWeek, displayDateRange } = useMemo(() => {
    if (formatDetails?.calendarPhases && Array.isArray(formatDetails.calendarPhases)) {
      // User or Admin configured phases
      return {
        weeksData: formatDetails.weeksData || getDefaultBmsdWeeks(),
        phasesByWeek: groupPhasesByWeek(formatDetails.calendarPhases),
        displayDateRange: formatDetails.dateRangeText || dateRangeText || 'SEPTEMBER 22ND - OCTOBER 18TH',
      };
    }

    // Default BMSD 2026 Schedule structure (matching the verified broadcast asset)
    const defaultWeeks = getDefaultBmsdWeeks();
    const defaultPhases: CalendarPhase[] = [
      // Week 1 (Row 0): Tue-Thu = Week 1, Fri-Sun = Week 2
      {
        id: 'w1',
        name: 'WEEK 1 (PROMOTION & RELEGATION)',
        shortName: 'Week 1',
        weekIndex: 0,
        startCol: 2,
        endCol: 4,
        color: 'orange',
      },
      {
        id: 'w2',
        name: 'WEEK 2 (PROMOTION & RELEGATION)',
        shortName: 'Week 2',
        weekIndex: 0,
        startCol: 5,
        endCol: 7,
        color: 'orange',
      },
      // Week 2 (Row 1): Mon-Wed = Week 3, Thu-Sat = Upper Bracket Survival, Sun = Lower -
      {
        id: 'w3',
        name: 'WEEK 3 (PROMOTION & RELEGATION)',
        shortName: 'Week 3',
        weekIndex: 1,
        startCol: 1,
        endCol: 3,
        color: 'orange',
      },
      {
        id: 'ubs',
        name: 'UPPER BRACKET SURVIVAL',
        shortName: 'Upper Survival',
        weekIndex: 1,
        startCol: 4,
        endCol: 6,
        color: 'magenta',
      },
      {
        id: 'lbs1',
        name: 'LOWER -',
        shortName: 'Lower Bracket',
        weekIndex: 1,
        startCol: 7,
        endCol: 7,
        color: 'magenta',
      },
      // Week 3 (Row 2): Mon-Tue = - BRACKET SURVIVAL, Wed = Rest, Thu-Sun = Semi Finals
      {
        id: 'lbs2',
        name: '- BRACKET SURVIVAL',
        shortName: 'Lower Survival',
        weekIndex: 2,
        startCol: 1,
        endCol: 2,
        color: 'magenta',
      },
      {
        id: 'sf',
        name: 'SEMI FINALS',
        shortName: 'Semi Finals',
        weekIndex: 2,
        startCol: 4,
        endCol: 7,
        color: 'blue',
      },
      // Week 4 (Row 3): Mon-Tue = Last Chance, Wed-Thu = Rest, Fri-Sun = Grand Finals
      {
        id: 'lc',
        name: 'LAST CHANCE',
        shortName: 'Last Chance',
        weekIndex: 3,
        startCol: 1,
        endCol: 2,
        color: 'cyan',
      },
      {
        id: 'gf',
        name: 'GRAND FINALS',
        shortName: 'Grand Finals',
        weekIndex: 3,
        startCol: 5,
        endCol: 7,
        color: 'green',
      },
    ];

    return {
      weeksData: defaultWeeks,
      phasesByWeek: groupPhasesByWeek(defaultPhases),
      displayDateRange: dateRangeText || 'SEPTEMBER 22ND - OCTOBER 18TH',
    };
  }, [formatDetails, dateRangeText]);

  const handleCopySchedule = () => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/tournaments/${tournamentSlug || ''}?tab=format` : '';
    const text = `🏆 ${tournamentName} OFFICIAL SCHEDULE (${displayDateRange})\nCheck live match details and stage progression at:\n${shareUrl}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200/80 bg-linear-to-b from-white to-slate-50 p-4 shadow-xl dark:border-white/10 dark:from-[#0d1527] dark:to-[#070b14] sm:p-8">
      {/* Subtle Background Glow Accent */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-600/15" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl dark:bg-rose-600/10" />

      {/* Editorial Header Masthead */}
      <div className="relative mb-6 text-center">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white dark:bg-white dark:text-slate-950">
              OFFICIAL TOURNAMENT
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0A5FC4] dark:text-blue-400">
              ROADMAP
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySchedule}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              title="Copy schedule summary & share link"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-slate-500" />}
              <span>{copied ? 'Copied!' : 'Share Schedule'}</span>
            </button>
          </div>
        </div>

        {/* Big Graphic Headline */}
        <div className="mt-3 flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-tr from-slate-900 to-slate-800 text-white shadow-md dark:from-blue-600 dark:to-indigo-700">
              <CalendarIcon className="h-6 w-6" />
            </div>
          </div>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
            {tournamentName} SCHEDULE
          </h2>
          <p className="mt-1 text-xs font-black uppercase tracking-[.25em] text-slate-500 dark:text-slate-400">
            {displayDateRange}
          </p>
        </div>
      </div>

      {/* Main 7-Column Calendar Card Container */}
      <div className="relative rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-xs dark:border-white/10 dark:bg-slate-900/80 sm:p-6">
        {/* Day-of-Week Header: M | T | W | T | F | S | S */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 p-2 dark:border-white/5 dark:bg-slate-800/50 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <div key={idx} className="text-xs font-black text-slate-700 dark:text-slate-300">
              {day}
            </div>
          ))}
        </div>

        {/* 4-Week Schedule Grid with Phase Bars */}
        <div className="mt-4 space-y-5">
          {weeksData.map((week: Array<CalendarDay | null>, weekIdx: number) => {
            const weekPhases = phasesByWeek.get(weekIdx) || [];

            return (
              <div key={weekIdx} className="space-y-2">
                {/* 7 Day Blocks */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                  {week.map((day: CalendarDay | null, dIdx: number) => {
                    if (!day) {
                      // Blank/empty day block
                      return (
                        <div
                          key={`empty-${dIdx}`}
                          className="h-16 sm:h-20 rounded-2xl bg-transparent"
                        />
                      );
                    }

                    const isRest = day.isRestDay;
                    const isSelected = selectedDay?.dateKey === day.dateKey;

                    return (
                      <button
                        type="button"
                        key={day.dateKey}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`group relative flex h-16 sm:h-20 flex-col items-center justify-center rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-[#0A5FC4] bg-blue-50/80 shadow-md ring-2 ring-blue-500/30 dark:border-blue-400 dark:bg-blue-950/50'
                            : isRest
                            ? 'border-slate-100 bg-slate-50/40 text-slate-300 dark:border-white/5 dark:bg-white/2 dark:text-slate-600'
                            : 'border-slate-200/90 bg-white shadow-xs hover:border-[#0A5FC4]/60 hover:shadow-md dark:border-white/10 dark:bg-slate-800/90 dark:text-white'
                        }`}
                      >
                        <span
                          className={`text-base sm:text-xl font-black tabular-nums transition-colors ${
                            isSelected
                              ? 'text-[#0A5FC4] dark:text-blue-400'
                              : isRest
                              ? 'text-slate-400/60 dark:text-slate-600'
                              : 'text-slate-900 group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-400'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        {day.monthName && (
                          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {day.monthName}
                          </span>
                        )}

                        {/* Active Match indicator dot */}
                        {!isRest && (
                          <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#0A5FC4] dark:bg-blue-400 opacity-60" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Horizontal Phase Span Bars below date blocks */}
                {weekPhases.length > 0 && (
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-3 pt-0.5">
                    {weekPhases.map((phase) => {
                      const colSpan = phase.endCol - phase.startCol + 1;
                      const colStart = phase.startCol;
                      const style = PHASE_COLOR_STYLES[phase.color] || PHASE_COLOR_STYLES.blue;

                      return (
                        <div
                          key={phase.id}
                          style={{
                            gridColumnStart: colStart,
                            gridColumnEnd: `span ${colSpan}`,
                          }}
                          className={`flex items-center justify-center rounded-xl border px-2 py-1.5 text-center shadow-xs transition-transform hover:scale-[1.01] ${style.bg} ${style.text} ${style.border}`}
                          title={phase.name}
                        >
                          <span className="truncate text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                            {phase.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Selected Day Details Drawer */}
      {selectedDay && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-[#0A5FC4] dark:text-blue-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Day Schedule: {selectedDay.dayNumber} {selectedDay.monthName || 'Matchday'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>

          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {selectedDay.isRestDay
              ? 'Official rest and preparation day. No live broadcast matches scheduled.'
              : selectedDay.phaseLabel
              ? `Live stage matches scheduled under ${selectedDay.phaseLabel}. Tune into the official stream or check the Matches tab for lobby results.`
              : 'Official competition day. Check lobby rosters and score matrices under the Standings and Matches tabs.'}
          </p>
        </div>
      )}

      {/* Brand Footer Signature */}
      <div className="mt-8 flex flex-col items-center justify-center gap-2 border-t border-slate-200/70 pt-6 text-center dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tighter text-[#0A5FC4] dark:text-blue-400">
            esports<span className="text-rose-600 dark:text-rose-400">amaze</span>
          </span>
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:bg-white/10 dark:text-slate-300">
            Official Tournament Hub
          </span>
        </div>
        <p className="text-[11px] font-semibold text-slate-400">
          Comprehensive competitive esports coverage, progression trajectories, and official scores.
        </p>
      </div>
    </div>
  );
}

// Group phase rules by their week row (0 to 3)
function groupPhasesByWeek(phases: CalendarPhase[]): Map<number, CalendarPhase[]> {
  const map = new Map<number, CalendarPhase[]>();
  for (const p of phases) {
    const list = map.get(p.weekIndex) || [];
    list.push(p);
    map.set(p.weekIndex, list);
  }
  return map;
}

// Generate the 4-week calendar days structure matching the BMSD September-October duration
function getDefaultBmsdWeeks(): Array<Array<CalendarDay | null>> {
  return [
    // Week 1: Mon is blank; Tue 22 SEPT, Wed 23, Thu 24, Fri 25, Sat 26, Sun 27
    [
      null,
      { dayNumber: 22, monthName: 'SEPT', dateKey: '2026-09-22', phaseLabel: 'Week 1' },
      { dayNumber: 23, dateKey: '2026-09-23', phaseLabel: 'Week 1' },
      { dayNumber: 24, dateKey: '2026-09-24', phaseLabel: 'Week 1' },
      { dayNumber: 25, dateKey: '2026-09-25', phaseLabel: 'Week 2' },
      { dayNumber: 26, dateKey: '2026-09-26', phaseLabel: 'Week 2' },
      { dayNumber: 27, dateKey: '2026-09-27', phaseLabel: 'Week 2' },
    ],
    // Week 2: Mon 28, Tue 29, Wed 30, Thu 1 OCT, Fri 2, Sat 3, Sun 4
    [
      { dayNumber: 28, dateKey: '2026-09-28', phaseLabel: 'Week 3' },
      { dayNumber: 29, dateKey: '2026-09-29', phaseLabel: 'Week 3' },
      { dayNumber: 30, dateKey: '2026-09-30', phaseLabel: 'Week 3' },
      { dayNumber: 1, monthName: 'OCT', dateKey: '2026-10-01', phaseLabel: 'Upper Bracket Survival' },
      { dayNumber: 2, dateKey: '2026-10-02', phaseLabel: 'Upper Bracket Survival' },
      { dayNumber: 3, dateKey: '2026-10-03', phaseLabel: 'Upper Bracket Survival' },
      { dayNumber: 4, dateKey: '2026-10-04', phaseLabel: 'Lower Bracket Survival' },
    ],
    // Week 3: Mon 5, Tue 6, Wed 7 (Rest), Thu 8, Fri 9, Sat 10, Sun 11
    [
      { dayNumber: 5, dateKey: '2026-10-05', phaseLabel: 'Lower Bracket Survival' },
      { dayNumber: 6, dateKey: '2026-10-06', phaseLabel: 'Lower Bracket Survival' },
      { dayNumber: 7, dateKey: '2026-10-07', isRestDay: true },
      { dayNumber: 8, dateKey: '2026-10-08', phaseLabel: 'Semi Finals' },
      { dayNumber: 9, dateKey: '2026-10-09', phaseLabel: 'Semi Finals' },
      { dayNumber: 10, dateKey: '2026-10-10', phaseLabel: 'Semi Finals' },
      { dayNumber: 11, dateKey: '2026-10-11', phaseLabel: 'Semi Finals' },
    ],
    // Week 4: Mon 12, Tue 13, Wed 14 (Rest), Thu 15 (Rest), Fri 16, Sat 17, Sun 18
    [
      { dayNumber: 12, dateKey: '2026-10-12', phaseLabel: 'Last Chance' },
      { dayNumber: 13, dateKey: '2026-10-13', phaseLabel: 'Last Chance' },
      { dayNumber: 14, dateKey: '2026-10-14', isRestDay: true },
      { dayNumber: 15, dateKey: '2026-10-15', isRestDay: true },
      { dayNumber: 16, dateKey: '2026-10-16', phaseLabel: 'Grand Finals' },
      { dayNumber: 17, dateKey: '2026-10-17', phaseLabel: 'Grand Finals' },
      { dayNumber: 18, dateKey: '2026-10-18', phaseLabel: 'Grand Finals' },
    ],
  ];
}
