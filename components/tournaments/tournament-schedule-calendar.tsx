'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { KickoffTime } from '@/components/ui/kickoff';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Swords,
  Layers,
  Sparkles,
  Coffee,
  CheckCircle2,
  CalendarDays,
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
  isProjected?: boolean;
}

export interface CalendarStageItem {
  id: string;
  name: string;
  sequence?: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  schedulePattern?: string;
  activeDaysOfWeek?: number[];
  customDates?: string[];
  matchesPerDay?: number;
  matchTime?: string;
  groupsDivision?: string;
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
  monthLabel?: string; // e.g. "MAY", "JUN"
  isCurrentMonth: boolean;
  isWithinTournament: boolean;
  isMatchDay: boolean;
  isRestDay: boolean;
  stageName?: string;
  dailyStartTime?: string;
  groupsDivision?: string;
  isProjected?: boolean;
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

/**
 * Format a Date object to YYYY-MM-DD using its local components
 * to prevent any timezone shift (e.g. UTC+5:30 midnight becoming 18:30 on the day before).
 */
function getLocalDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  // 1. Group actual matches by local date key (YYYY-MM-DD)
  const { matchesByDate, allMatchDates, stageColorMap, dayMetaMap } = useMemo(() => {
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

      const key = getLocalDateKey(d);
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
      dates.push(d);

      const stName = m.stage?.name || m.stageName;
      if (stName && !colorMap.has(stName.toLowerCase())) {
        colorMap.set(stName.toLowerCase(), getStageColor(stName, colorMap.size));
      }
    }

    // 1b. Synthesize scheduled matchdays for upcoming events or stages with defined date windows
    const stageConfigs = (stages || []).map((s: any) => {
      const fmt = formatDetails?.stageFormats?.[s.name] || formatDetails?.stageFormats?.[s.id] || {};
      return {
        name: s.name,
        startDate: s.startDate || fmt.startDate,
        endDate: s.endDate || fmt.endDate,
        schedulePattern: s.schedulePattern || fmt.schedulePattern || 'ALL_DAYS',
        activeDaysOfWeek: s.activeDaysOfWeek || fmt.activeDaysOfWeek || [4, 5, 6, 0],
        customDates: s.customDates || fmt.customDates || [],
        matchesPerDay: Number(s.matchesPerDay || fmt.matchesPerDay) || 6,
        matchTime: s.matchTime || fmt.matchTime || null,
        groupsDivision: s.groupsDivision || fmt.groupsDivision || null,
      };
    });

    const dayMetaMap = new Map<
      string,
      {
        dailyStartTime?: string | null;
        groupsDivision?: string | null;
        isProjected?: boolean;
        stageName?: string;
      }
    >();

    for (const sc of stageConfigs) {
      if (!sc.startDate || !sc.endDate) continue;
      const sStart = new Date(sc.startDate);
      const sEnd = new Date(sc.endDate);
      if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime()) || sStart > sEnd) continue;

      const cursor = new Date(sStart.getFullYear(), sStart.getMonth(), sStart.getDate());
      const endLimit = new Date(sEnd.getFullYear(), sEnd.getMonth(), sEnd.getDate());

      let dayIndex = 1;
      while (cursor <= endLimit) {
        const key = getLocalDateKey(cursor);
        const dayOfWeek = cursor.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

        let isActiveDay = true;
        if (sc.schedulePattern === 'DAYS_OF_WEEK') {
          isActiveDay = Array.isArray(sc.activeDaysOfWeek) && sc.activeDaysOfWeek.includes(dayOfWeek);
        } else if (sc.schedulePattern === 'CUSTOM') {
          isActiveDay = Array.isArray(sc.customDates) && sc.customDates.includes(key);
        }

        if (isActiveDay) {
          const hasRealMatches = map.has(key) && map.get(key)!.length > 0;
          dayMetaMap.set(key, {
            dailyStartTime: sc.matchTime,
            groupsDivision: sc.groupsDivision,
            isProjected: !hasRealMatches,
            stageName: sc.name,
          });

          // Only inject projected match placeholders if no real matches were ingested for this day
          if (!hasRealMatches) {
            const projMatches: CalendarMatchItem[] = [];
            const count = sc.matchesPerDay || 6;
            for (let mIdx = 1; mIdx <= count; mIdx++) {
              projMatches.push({
                id: `sched-${sc.name.replace(/\s+/g, '-').toLowerCase()}-${key}-${mIdx}`,
                matchNumber: mIdx,
                overallMatchNumber: (dayIndex - 1) * count + mIdx,
                scheduledAt: new Date(cursor),
                matchTime: null, // Do not guess individual match times
                mapName: null, // NEVER guess fake maps
                groupName: null, // NEVER put stage group division on match rows
                status: 'SCHEDULED',
                stage: { name: sc.name },
                stageName: sc.name,
                isProjected: true,
              });
            }
            map.set(key, projMatches);
            dates.push(new Date(cursor));
            dayIndex++;
          }
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Sort matches on each day chronologically / by matchNumber
    for (const [, dayMatches] of map.entries()) {
      dayMatches.sort((a, b) => {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      });
    }

    dates.sort((a, b) => a.getTime() - b.getTime());
    return { matchesByDate: map, allMatchDates: dates, stageColorMap: colorMap, dayMetaMap };
  }, [matches, stages, formatDetails]);

  // 2. Determine tournament date boundaries and available months
  const { minDate, maxDate, availableMonths } = useMemo(() => {
    let start: Date | null = allMatchDates[0] ? new Date(allMatchDates[0]) : null;
    let end: Date | null = allMatchDates[allMatchDates.length - 1] ? new Date(allMatchDates[allMatchDates.length - 1]) : null;

    // Check stage start & end dates
    (stages || []).forEach((s: any) => {
      const fmt = formatDetails?.stageFormats?.[s.name] || {};
      const stStart = s.startDate || fmt.startDate;
      const stEnd = s.endDate || fmt.endDate;
      if (stStart) {
        const d = new Date(stStart);
        if (!isNaN(d.getTime()) && (!start || d < start)) start = d;
      }
      if (stEnd) {
        const d = new Date(stEnd);
        if (!isNaN(d.getTime()) && (!end || d > end)) end = d;
      }
    });

    if (formatDetails?.stages && Array.isArray(formatDetails.stages)) {
      formatDetails.stages.forEach((st: any) => {
        if (st.startDate) {
          const d = new Date(st.startDate);
          if (!isNaN(d.getTime()) && (!start || d < start)) start = d;
        }
        if (st.endDate) {
          const d = new Date(st.endDate);
          if (!isNaN(d.getTime()) && (!end || d > end)) end = d;
        }
      });
    }

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

    // Normalize start/end to midnight local time
    const normStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const normEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

    const months: { year: number; month: number; label: string }[] = [];
    const cur = new Date(normStart.getFullYear(), normStart.getMonth(), 1);
    const endMonth = new Date(normEnd.getFullYear(), normEnd.getMonth(), 1);

    while (cur <= endMonth) {
      months.push({
        year: cur.getFullYear(),
        month: cur.getMonth(),
        label: cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    return { minDate: normStart, maxDate: normEnd, availableMonths: months };
  }, [allMatchDates, formatDetails, stages]);

  // Month navigation index
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const activeMonth = availableMonths[Math.min(selectedMonthIdx, availableMonths.length - 1)] || {
    year: minDate.getFullYear(),
    month: minDate.getMonth(),
    label: minDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };

  // Selected day key for match schedule drawer/sidebar
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // The visitor's local "today", resolved after mount. Reading the local components of a
  // client-side Date keeps the calendar on the visitor's date (e.g. 23rd in IST) without a
  // UTC server render disagreeing with the browser and tripping hydration.
  const [todayKey, setTodayKey] = useState<string | null>(null);
  useEffect(() => {
    setTodayKey(getLocalDateKey(new Date()));
  }, []);

  // Open on the visitor's current month rather than the first month of the schedule.
  useEffect(() => {
    if (!todayKey) return;
    const [y, m] = todayKey.split('-').map(Number);
    const idx = availableMonths.findIndex((mo) => mo.year === y && mo.month === m - 1);
    if (idx >= 0) setSelectedMonthIdx(idx);
  }, [todayKey, availableMonths]);

  // 3. Generate 7-column calendar weeks for the active month
  const { weeksData, phasesByWeek } = useMemo(() => {
    const year = activeMonth.year;
    const month = activeMonth.month;

    // First and last day of active month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday of the week containing firstDay (1 = Mon, 7 = Sun)
    const startOffset = (firstDay.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const calStart = new Date(year, month, 1 - startOffset);

    // Sunday of the week containing lastDay
    const endOffset = (7 - ((lastDay.getDay() + 6) % 7) - 1);
    const calEnd = new Date(year, month, lastDay.getDate() + endOffset);

    const weeks: ProcessedDay[][] = [];
    let currentWeek: ProcessedDay[] = [];
    const curDate = new Date(calStart.getFullYear(), calStart.getMonth(), calStart.getDate());

    let prevMonthLabelSeen = '';

    while (curDate <= calEnd) {
      const dateKey = getLocalDateKey(curDate);
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

      // Check if we should render month tag (1st of month or first day of tournament)
      let monthLabel: string | undefined;
      const monthShort = curDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      if (curDate.getDate() === 1 || (curDate.getTime() === minDate.getTime() && monthShort !== prevMonthLabelSeen)) {
        monthLabel = monthShort;
        prevMonthLabelSeen = monthShort;
      }

      const meta = dayMetaMap.get(dateKey);
      currentWeek.push({
        date: new Date(curDate),
        dateKey,
        dayNumber: curDate.getDate(),
        monthLabel,
        isCurrentMonth,
        isWithinTournament,
        isMatchDay,
        isRestDay,
        stageName: dayStage || meta?.stageName || undefined,
        dailyStartTime: meta?.dailyStartTime || undefined,
        groupsDivision: meta?.groupsDivision || undefined,
        isProjected: meta?.isProjected || dayMatches.some((m) => m.isProjected || m.id?.startsWith('sched-')),
        matches: dayMatches,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      curDate.setDate(curDate.getDate() + 1);
    }

    // 4. Compute horizontal stage/phase span bars per week row
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
  }, [activeMonth, minDate, maxDate, matchesByDate, stageColorMap, dayMetaMap]);

  // Populate the active month so PC view is immediately filled. Today wins when the
  // visible month contains it; otherwise fall back to the month's first matchday.
  useEffect(() => {
    if (!todayKey) return;
    if (
      weeksData.some(
        (w) => w.some((d) => d.dateKey === todayKey && d.isCurrentMonth && d.isWithinTournament)
      )
    ) {
      setSelectedDayKey(todayKey);
      return;
    }
    for (const w of weeksData) {
      const firstMatchDay = w.find((d) => d.isCurrentMonth && d.isMatchDay);
      if (firstMatchDay) {
        setSelectedDayKey(firstMatchDay.dateKey);
        return;
      }
    }
    // If no matchday in this month, select any day in the current month
    const anyDay = weeksData.flatMap((w) => w).find((d) => d.isCurrentMonth);
    if (anyDay) {
      setSelectedDayKey(anyDay.dateKey);
    }
  }, [weeksData, todayKey]);

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
      className={`mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-6 ${className}`}
    >
      {/* ── HEADER: Title, Date Range & Month Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0A5FC4] dark:bg-blue-950/60 dark:text-blue-300">
            <CalendarIcon className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">
              Tournament Schedule
            </h4>
            <p className="text-[11px] font-semibold text-slate-400">
              {displayDateText}
            </p>
          </div>
        </div>

        {/* Month Switcher & Matches Count */}
        <div className="flex items-center gap-2.5">
          {matches.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300">
              <Swords className="h-3 w-3 text-[#0A5FC4] dark:text-blue-400" />
              {matches.length} matches
            </span>
          )}

          {availableMonths.length > 1 && (
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setSelectedMonthIdx((prev) => Math.max(0, prev - 1))}
                disabled={selectedMonthIdx === 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {activeMonth.label}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonthIdx((prev) => Math.min(availableMonths.length - 1, prev + 1))}
                disabled={selectedMonthIdx >= availableMonths.length - 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-white disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RESPONSIVE 2-COLUMN SPLIT (Desktop: Side-by-side | Mobile: Stacked) ── */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* ── LEFT: The 7-Day Calendar Grid (Constrained on PC, perfectly proportioned) ── */}
        <div className="lg:col-span-7">
          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayName, idx) => (
              <div
                key={idx}
                className="py-1 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Weeks with Day Cells & Horizontal Phase Markings */}
          <div className="mt-1 space-y-3">
            {weeksData.map((week, weekIdx) => {
              const weekPhases = phasesByWeek.get(weekIdx) || [];

              return (
                <div key={weekIdx} className="space-y-1">
                  {/* 7 Day Blocks */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {week.map((day) => {
                      const isSelected = selectedDayKey === day.dateKey;
                      const matchCount = day.matches.length;

                      // Days outside active month and outside tournament
                      if (!day.isCurrentMonth && !day.isWithinTournament) {
                        return (
                          <div
                            key={day.dateKey}
                            className="flex h-12 sm:h-13 flex-col items-center justify-center rounded-xl bg-transparent opacity-20"
                          >
                            <span className="text-xs font-medium text-slate-400">{day.dayNumber}</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          key={day.dateKey}
                          onClick={() => setSelectedDayKey(day.dateKey)}
                          className={`group relative flex h-12 sm:h-13 flex-col items-center justify-center rounded-xl border transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'border-[#0A5FC4] bg-blue-50/90 shadow-xs ring-2 ring-blue-500/30 dark:border-blue-400 dark:bg-blue-950/60'
                              : day.isMatchDay
                              ? 'border-slate-200/90 bg-white shadow-2xs hover:border-[#0A5FC4]/50 hover:bg-slate-50/80 dark:border-white/10 dark:bg-slate-900/90 dark:hover:bg-slate-800'
                              : day.isRestDay
                              ? 'border-slate-100 bg-slate-50/50 text-slate-300 dark:border-white/5 dark:bg-white/2 dark:text-slate-600'
                              : 'border-transparent text-slate-400 opacity-30'
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

                          {/* Month text badge if 1st of month or tournament boundary */}
                          {day.monthLabel ? (
                            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                              {day.monthLabel}
                            </span>
                          ) : day.isMatchDay ? (
                            <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#0A5FC4] dark:bg-blue-400" />
                          ) : null}

                          {/* Match count badge */}
                          {matchCount > 0 && !isSelected && (
                            <span className="pointer-events-none absolute -top-1 -right-1 hidden sm:flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-slate-900 px-1 text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity dark:bg-blue-600">
                              {matchCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Horizontal Stage/Phase Markings Span Bars */}
                  {weekPhases.length > 0 && (
                    <div className="grid grid-cols-7 gap-1.5 pt-0.5">
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

        {/* ── RIGHT: Match Schedule Drawer (Side-by-side on PC, stacked on Mobile) ── */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            {/* Selected Day Header */}
            {selectedDay ? (
              <>
                <div className="flex items-center justify-between border-b border-blue-100 pb-3 dark:border-blue-900/30">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {selectedDay.date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {selectedDay.stageName || (selectedDay.isRestDay ? 'Rest Day' : 'Matchday')}
                      </p>
                    </div>
                  </div>

                  {selectedDay.matches.length > 0 && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {selectedDay.matches.length} Matches
                    </span>
                  )}
                </div>

                {/* Stage Schedule Overview (Daily start time & Lobby format) */}
                {(selectedDay.dailyStartTime || selectedDay.groupsDivision) && !selectedDay.isRestDay && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-100/60 dark:bg-blue-950/40 px-3 py-2 border border-blue-200/60 dark:border-blue-900/40 text-xs">
                    {selectedDay.dailyStartTime && (
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200 text-[11px]">
                        <Clock className="h-3 w-3 text-[#0A5FC4] dark:text-blue-400" />
                        Broadcast: <span className="text-[#0A5FC4] dark:text-blue-300 font-extrabold">{selectedDay.dailyStartTime}</span>
                      </span>
                    )}
                    {selectedDay.groupsDivision && (
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {selectedDay.groupsDivision}
                      </span>
                    )}
                  </div>
                )}

                {/* Match List for Selected Day */}
                <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {selectedDay.matches.length > 0 ? (
                    selectedDay.matches.map((m, idx) => {
                      const matchNum = m.matchNumber || idx + 1;
                      const isProjected = Boolean(m.isProjected || m.id?.startsWith('sched-'));
                      // Only link to scorecard if it is a REAL database match that is completed or has live data
                      const hasRealScorecard = !isProjected && m.status !== 'SCHEDULED' && Boolean(m.id);
                      const matchUrl = hasRealScorecard && tournamentSlug
                        ? `${gameHref(DEFAULT_GAME_SLUG, `tournaments/${tournamentSlug}/matches`)}?matchId=${m.id}`
                        : null;

                      return (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white p-2.5 text-xs shadow-2xs transition-all hover:border-blue-300 dark:border-white/5 dark:bg-slate-900/90 dark:hover:border-blue-500/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-300">
                              #{matchNum}
                            </span>
                            {/* Real Map Name (Only if genuinely provided by match data, NEVER guessed) */}
                            {m.mapName && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#0A5FC4] dark:bg-blue-950/60 dark:text-blue-300">
                                {m.mapName}
                              </span>
                            )}
                            {/* Real Group Name (Only if match has a specific group like Group A, never the stage groups division) */}
                            {m.groupName && (
                              <span className="truncate text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                {m.groupName}
                              </span>
                            )}
                            {/* Generic fallback title when no map/group yet */}
                            {!m.mapName && !m.groupName && (
                              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                Match {matchNum}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Individual match time (only if individual match time was set) */}
                            {m.matchTime && !isProjected && (
                              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                <Clock className="h-3 w-3 text-[#0A5FC4]" />
                                <KickoffTime scheduledAt={m.scheduledAt} fallback={m.matchTime} />
                              </span>
                            )}

                            {/* Status label for projected matches */}
                            {isProjected && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded">
                                Scheduled
                              </span>
                            )}

                            {/* Scorecard Link ONLY for real matches */}
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
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                        <Coffee className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        Official Rest Day
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        No live broadcast matches scheduled on this date.
                      </p>
                    </div>
                  ) : (
                    <p className="py-6 text-center text-xs text-slate-400">
                      No matches scheduled on this date.
                    </p>
                  )}

                  {selectedDay.matches.length > 0 && selectedDay.matches.some((m) => m.isProjected || m.id?.startsWith('sched-')) && (
                    <div className="mt-2.5 rounded-lg border border-dashed border-blue-200/80 dark:border-blue-900/40 p-2 text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      Lobby groups, map order &amp; scorecards will be published once matches are scheduled.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  Select a matchday on the calendar
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Click any date to inspect scheduled fixtures and lobbies.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
