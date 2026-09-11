'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Swords,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export interface CalendarMatchItem {
  id: string;
  matchNumber?: number | null;
  overallMatchNumber?: number | null;
  scheduledAt?: any;
  matchTime?: string | null;
  mapName?: string | null;
  groupName?: string | null;
  status?: string | null;
  stageId?: string | null;
  stage?: { name: string } | null;
  stageName?: string | null;
}

export interface CalendarStageItem {
  id: string;
  name: string;
  sequence?: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

interface TournamentScheduleCalendarProps {
  tournamentName?: string;
  tournamentSlug?: string;
  dateRangeText?: string;
  stages?: CalendarStageItem[];
  matches?: CalendarMatchItem[];
  formatDetails?: any;
  className?: string;
}

interface ProcessedDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  monthLabel?: string; // e.g. "SEPT", "OCT"
  isCurrentMonth: boolean;
  isWithinTournament: boolean;
  isMatchDay: boolean;
  isRestDay: boolean;
  stageName?: string;
  matches: CalendarMatchItem[];
}

interface PhaseSpan {
  id: string;
  name: string;
  startCol: number; // 1 to 7
  endCol: number; // 1 to 7
  colorKey: string;
  matchesCount: number;
}

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
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
  emerald: {
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

const COLOR_KEYS = ['orange', 'magenta', 'blue', 'cyan', 'emerald', 'purple', 'amber'];

function getStageColor(stageName: string, index = 0): string {
  const lower = stageName.toLowerCase();
  if (lower.includes('grand final') || lower.includes('finals')) return 'emerald';
  if (lower.includes('last chance') || lower.includes('lcq')) return 'cyan';
  if (lower.includes('semi') || lower.includes('playoff')) return 'blue';
  if (lower.includes('survival') || lower.includes('bracket')) return 'magenta';
  if (lower.includes('week 1') || lower.includes('round 1')) return 'orange';
  if (lower.includes('week 2') || lower.includes('round 2')) return 'amber';
  if (lower.includes('week 3') || lower.includes('round 3')) return 'purple';
  return COLOR_KEYS[index % COLOR_KEYS.length];
}

export function TournamentScheduleCalendar({
  tournamentName = 'Tournament',
  tournamentSlug,
  dateRangeText,
  stages = [],
  matches = [],
  formatDetails,
  className = '',
}: TournamentScheduleCalendarProps) {
  // 1. Group actual matches by YYYY-MM-DD
  const { matchesByDate, allMatchDates, stageColorMap } = useMemo(() => {
    const map = new Map<string, CalendarMatchItem[]>();
    const dates: Date[] = [];
    const colorMap = new Map<string, string>();

    // Assign consistent colors to known stages
    stages.forEach((s, idx) => {
      colorMap.set(s.name.toLowerCase(), getStageColor(s.name, idx));
    });

    for (const m of matches) {
      if (!m.scheduledAt) continue;
      const d = new Date(m.scheduledAt);
      if (isNaN(d.getTime())) continue;

      const key = d.toISOString().slice(0, 10);
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
      dates.push(d);

      const stName = m.stage?.name || m.stageName;
      if (stName && !colorMap.has(stName.toLowerCase())) {
        colorMap.set(stName.toLowerCase(), getStageColor(stName, colorMap.size));
      }
    }

    // Sort matches on each day by scheduled time / matchNumber
    for (const [, dayMatches] of map.entries()) {
      dayMatches.sort((a, b) => {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      });
    }

    dates.sort((a, b) => a.getTime() - b.getTime());
    return { matchesByDate: map, allMatchDates: dates, stageColorMap: colorMap };
  }, [matches, stages]);

  // 2. Determine tournament boundaries
  const { minDate, maxDate, availableMonths } = useMemo(() => {
    let start: Date | null = allMatchDates[0] || null;
    let end: Date | null = allMatchDates[allMatchDates.length - 1] || null;

    if (formatDetails?.startDate) {
      const d = new Date(formatDetails.startDate);
      if (!isNaN(d.getTime()) && (!start || d < start)) start = d;
    }
    if (formatDetails?.endDate) {
      const d = new Date(formatDetails.endDate);
      if (!isNaN(d.getTime()) && (!end || d > end)) end = d;
    }

    if (!start) start = new Date();
    if (!end) {
      end = new Date(start);
      end.setDate(end.getDate() + 20);
    }

    // List of YYYY-MM months within the tournament range
    const months: { year: number; month: number; label: string }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cur <= endMonth) {
      months.push({
        year: cur.getFullYear(),
        month: cur.getMonth(),
        label: cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    return { minDate: start, maxDate: end, availableMonths: months };
  }, [allMatchDates, formatDetails]);

  // Month navigation index (defaults to first month with matches)
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const activeMonth = availableMonths[Math.min(selectedMonthIdx, availableMonths.length - 1)] || {
    year: minDate.getFullYear(),
    month: minDate.getMonth(),
    label: minDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };

  // Selected day for match schedule details drawer
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // 3. Generate Calendar Weeks for the active month
  const { weeksData, phasesByWeek } = useMemo(() => {
    const year = activeMonth.year;
    const month = activeMonth.month;

    // Start of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday of the week containing firstDay (1 = Mon, 7 = Sun)
    const startOffset = (firstDay.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const calStart = new Date(firstDay);
    calStart.setDate(calStart.getDate() - startOffset);

    // Sunday of the week containing lastDay
    const endOffset = (7 - ((lastDay.getDay() + 6) % 7) - 1);
    const calEnd = new Date(lastDay);
    calEnd.setDate(calEnd.getDate() + endOffset);

    const weeks: ProcessedDay[][] = [];
    let currentWeek: ProcessedDay[] = [];
    const curDate = new Date(calStart);

    let prevMonthLabelSeen = '';

    while (curDate <= calEnd) {
      const dateKey = curDate.toISOString().slice(0, 10);
      const isCurrentMonth = curDate.getMonth() === month;
      const isWithinTournament = curDate >= minDate && curDate <= maxDate;
      const dayMatches = matchesByDate.get(dateKey) || [];
      const isMatchDay = dayMatches.length > 0;
      const isRestDay = isWithinTournament && !isMatchDay;

      // Identify stage for this day
      let dayStage = dayMatches[0]?.stage?.name || dayMatches[0]?.stageName;
      if (!dayStage && isMatchDay) {
        dayStage = 'Matchday';
      }

      // Check if we should render month text (e.g. 1st of month or first day of tournament)
      let monthLabel: string | undefined;
      const monthShort = curDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      if (curDate.getDate() === 1 || (curDate.getTime() === minDate.getTime() && monthShort !== prevMonthLabelSeen)) {
        monthLabel = monthShort;
        prevMonthLabelSeen = monthShort;
      }

      currentWeek.push({
        date: new Date(curDate),
        dateKey,
        dayNumber: curDate.getDate(),
        monthLabel,
        isCurrentMonth,
        isWithinTournament,
        isMatchDay,
        isRestDay,
        stageName: dayStage || undefined,
        matches: dayMatches,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      curDate.setDate(curDate.getDate() + 1);
    }

    // 4. Compute Phase Markings per Week
    type ActiveSpan = { name: string; startCol: number; endCol: number; count: number };
    const phaseMap = new Map<number, PhaseSpan[]>();

    weeks.forEach((week, weekIdx) => {
      const spans: PhaseSpan[] = [];
      let curSpan: ActiveSpan | null = null;

      for (let dayColIdx = 0; dayColIdx < week.length; dayColIdx++) {
        const day = week[dayColIdx];
        const col = dayColIdx + 1; // 1 to 7
        const stName = day.stageName;

        if (day.isMatchDay && stName) {
          if (curSpan && curSpan.name === stName) {
            curSpan.endCol = col;
            curSpan.count += day.matches.length;
          } else {
            if (curSpan) {
              const prev: ActiveSpan = curSpan;
              spans.push({
                id: `w${weekIdx}-c${prev.startCol}-${prev.name}`,
                name: prev.name,
                startCol: prev.startCol,
                endCol: prev.endCol,
                colorKey: stageColorMap.get(prev.name.toLowerCase()) || 'blue',
                matchesCount: prev.count,
              });
            }
            curSpan = { name: stName, startCol: col, endCol: col, count: day.matches.length };
          }
        } else {
          if (curSpan) {
            const prev: ActiveSpan = curSpan;
            spans.push({
              id: `w${weekIdx}-c${prev.startCol}-${prev.name}`,
              name: prev.name,
              startCol: prev.startCol,
              endCol: prev.endCol,
              colorKey: stageColorMap.get(prev.name.toLowerCase()) || 'blue',
              matchesCount: prev.count,
            });
            curSpan = null;
          }
        }
      }

      if (curSpan) {
        const last: ActiveSpan = curSpan;
        spans.push({
          id: `w${weekIdx}-c${last.startCol}-${last.name}`,
          name: last.name,
          startCol: last.startCol,
          endCol: last.endCol,
          colorKey: stageColorMap.get(last.name.toLowerCase()) || 'blue',
          matchesCount: last.count,
        });
      }

      phaseMap.set(weekIdx, spans);
    });

    return { weeksData: weeks, phasesByWeek: phaseMap };
  }, [activeMonth, minDate, maxDate, matchesByDate, stageColorMap]);

  // Selected Day Object
  const selectedDay = useMemo(() => {
    if (!selectedDayKey) return null;
    for (const w of weeksData) {
      const match = w.find((d) => d.dateKey === selectedDayKey);
      if (match) return match;
    }
    return null;
  }, [selectedDayKey, weeksData]);

  const displayDateText = useMemo(() => {
    if (dateRangeText) return dateRangeText;
    const s = minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s} – ${e}`;
  }, [dateRangeText, minDate, maxDate]);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0b1220] sm:p-5 ${className}`}
    >
      {/* ── HEADER: Title, Date Range & Month Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0A5FC4] dark:bg-blue-950/60 dark:text-blue-300">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Schedule Calendar
            </h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {displayDateText}
            </p>
          </div>
        </div>

        {/* Month Navigation & Stats Pill */}
        <div className="flex items-center gap-2">
          {matches.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
              <Swords className="h-3 w-3 text-[#0A5FC4] dark:text-blue-400" />
              {matches.length} matches
            </span>
          )}

          {availableMonths.length > 1 && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/50 p-0.5 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setSelectedMonthIdx((prev) => Math.max(0, prev - 1))}
                disabled={selectedMonthIdx === 0}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                {activeMonth.label}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonthIdx((prev) => Math.min(availableMonths.length - 1, prev + 1))}
                disabled={selectedMonthIdx >= availableMonths.length - 1}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── CALENDAR 7-COLUMN GRID ── */}
      <div className="mt-3">
        {/* Days of week row */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayName, idx) => (
            <div
              key={idx}
              className="py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Weeks & Phase markings */}
        <div className="space-y-3 pt-1">
          {weeksData.map((week, weekIdx) => {
            const weekPhases = phasesByWeek.get(weekIdx) || [];

            return (
              <div key={weekIdx} className="space-y-1">
                {/* 7 Day Blocks */}
                <div className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const isSelected = selectedDayKey === day.dateKey;
                    const matchCount = day.matches.length;

                    // Days outside the tournament range or other months
                    if (!day.isCurrentMonth && !day.isWithinTournament) {
                      return (
                        <div
                          key={day.dateKey}
                          className="flex h-11 sm:h-12 flex-col items-center justify-center rounded-xl bg-transparent opacity-20"
                        >
                          <span className="text-xs font-medium text-slate-400">{day.dayNumber}</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        key={day.dateKey}
                        onClick={() => setSelectedDayKey(isSelected ? null : day.dateKey)}
                        className={`group relative flex h-11 sm:h-12 flex-col items-center justify-center rounded-xl border transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-[#0A5FC4] bg-blue-50/90 shadow-xs ring-2 ring-blue-500/30 dark:border-blue-400 dark:bg-blue-950/60'
                            : day.isMatchDay
                            ? 'border-slate-200/90 bg-white shadow-2xs hover:border-[#0A5FC4]/50 hover:bg-slate-50/80 dark:border-white/10 dark:bg-slate-900/90 dark:hover:bg-slate-800'
                            : day.isRestDay
                            ? 'border-slate-100 bg-slate-50/50 text-slate-300 dark:border-white/5 dark:bg-white/2 dark:text-slate-600'
                            : 'border-transparent text-slate-400 opacity-40'
                        }`}
                      >
                        {/* Day Number */}
                        <span
                          className={`text-xs sm:text-sm font-bold tabular-nums transition-colors ${
                            isSelected
                              ? 'text-[#0A5FC4] dark:text-blue-300'
                              : day.isMatchDay
                              ? 'text-slate-900 group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-300'
                              : day.isRestDay
                              ? 'text-slate-400 dark:text-slate-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {day.dayNumber}
                        </span>

                        {/* Month text label if present */}
                        {day.monthLabel ? (
                          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                            {day.monthLabel}
                          </span>
                        ) : day.isMatchDay ? (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#0A5FC4] dark:bg-blue-400" />
                        ) : null}

                        {/* Match count hover chip */}
                        {matchCount > 0 && !isSelected && (
                          <span className="pointer-events-none absolute -top-1 -right-1 hidden sm:flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-slate-900 px-1 text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity dark:bg-blue-600">
                            {matchCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Horizontal Phase Marking Bars beneath days */}
                {weekPhases.length > 0 && (
                  <div className="grid grid-cols-7 gap-1 pt-0.5">
                    {weekPhases.map((phase) => {
                      const colSpan = phase.endCol - phase.startCol + 1;
                      const style = PHASE_COLORS[phase.colorKey] || PHASE_COLORS.blue;

                      return (
                        <div
                          key={phase.id}
                          style={{
                            gridColumnStart: phase.startCol,
                            gridColumnEnd: `span ${colSpan}`,
                          }}
                          className={`flex items-center justify-center rounded-md border px-1.5 py-0.5 text-center shadow-2xs ${style.bg} ${style.text} ${style.border}`}
                          title={`${phase.name} (${phase.matchesCount} matches)`}
                        >
                          <span className="truncate text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider">
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

      {/* ── INTERACTIVE MATCH SCHEDULE DRAWER ── */}
      {selectedDay && (
        <div className="mt-4 rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2 dark:border-blue-900/30">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500" />
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedDay.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              {selectedDay.stageName && (
                <span className="rounded-md bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {selectedDay.stageName}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayKey(null)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          {/* Matches List on Selected Day */}
          <div className="mt-2.5 space-y-1.5">
            {selectedDay.matches.length > 0 ? (
              selectedDay.matches.map((m, idx) => {
                const stageLabel = m.stage?.name || m.stageName || '';
                const matchNum = m.matchNumber || idx + 1;
                const matchUrl = tournamentSlug ? `/tournaments/${tournamentSlug}?tab=matches&matchId=${m.id}` : null;

                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-xs shadow-2xs dark:border-white/5 dark:bg-slate-900/80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Match {matchNum}
                      </span>
                      {m.mapName && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          {m.mapName}
                        </span>
                      )}
                      {m.groupName && (
                        <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {m.groupName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      {m.matchTime && (
                        <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                          <Clock className="h-3 w-3 text-[#0A5FC4]" />
                          {m.matchTime}
                        </span>
                      )}
                      {matchUrl && (
                        <Link
                          href={matchUrl}
                          className="font-bold text-[#0A5FC4] hover:underline dark:text-blue-400"
                        >
                          Scorecard →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : selectedDay.isRestDay ? (
              <p className="py-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                Official Rest Day · No live broadcast matches scheduled.
              </p>
            ) : (
              <p className="py-2 text-center text-xs text-slate-400">
                No matches scheduled on this date.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
