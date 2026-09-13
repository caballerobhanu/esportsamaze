'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings2,
  ShieldCheck,
  Calendar,
  Users,
  Award,
  Gamepad2,
  Info,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  Wand2,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

export interface HeaderCardItem {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  enabled: boolean;
}

export interface StageAdvancementRuleItem {
  thresholdRank: string;
  badgeText: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info';
  destination: string;
}

export interface StageFormatItem {
  id: string;
  name: string;
  sequence: number;
  stageType: string;
  formatType: string;
  dates?: string; // Display label e.g. "May 15 – May 25, 2026"
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  schedulePattern?: 'ALL_DAYS' | 'DAYS_OF_WEEK' | 'CUSTOM';
  activeDaysOfWeek?: number[]; // [0..6] (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
  customDates?: string[]; // Array of YYYY-MM-DD
  matchesPerDay?: number;
  matchTime?: string;
  totalMatches?: number;
  matchdaysCount?: number | string;
  teamsCount?: number;
  groupsDivision?: string;
  stageDescription?: string;
  rules: StageAdvancementRuleItem[];
}

export interface TiebreakerTierItem {
  tier: number;
  title: string;
  description: string;
}

interface TournamentStagesFormatInputProps {
  initialFormatDetails?: any;
  initialStages?: Array<{
    id?: string;
    name: string;
    sequence: number;
    formatType?: string;
    stageType?: string | null;
  }>;
}

const DEFAULT_HEADER_CARDS: HeaderCardItem[] = [
  {
    id: 'mode',
    label: 'Competition Mode',
    value: 'Squads TPP (Battle Royale)',
    subtitle: '16 Teams per lobby on Erangel & Miramar',
    enabled: true,
  },
  {
    id: 'reward',
    label: 'Elimination Reward',
    value: '1 Point / Elimination',
    subtitle: 'Standard official tournament scoring',
    enabled: true,
  },
  {
    id: 'env',
    label: 'Tournament Environment',
    value: 'Official Esports Server',
    subtitle: 'Anti-cheat monitored & verified referees',
    enabled: true,
  },
];

const DEFAULT_TIEBREAKER_TIERS: TiebreakerTierItem[] = [
  {
    tier: 1,
    title: 'Total Placement Points Across All Matches',
    description:
      'In the event of a tie in total points, the squad with the higher placement points accumulated across all stage matches takes precedence.',
  },
  {
    tier: 2,
    title: 'Total WWCD (Winner Winner Chicken Dinner) Count',
    description:
      'If still tied, precedence is granted to the squad with the greater number of 1st-place finishes (match victories).',
  },
  {
    tier: 3,
    title: 'Total Elimination / Finish Points',
    description:
      'If still tied, the team with the higher raw eliminations total over the entire stage is awarded the higher rank.',
  },
  {
    tier: 4,
    title: 'Highest Single-Match Total Score',
    description:
      'If still tied, the highest individual match point tally achieved during the stage determines the tiebreaker.',
  },
  {
    tier: 5,
    title: 'Final Match Placement Head-to-Head',
    description:
      'Should a tie persist through all criteria, placement in the very last match of the stage decides final standing.',
  },
];

const DAYS_OF_WEEK_OPTIONS = [
  { dayIndex: 1, label: 'Mon', short: 'M' },
  { dayIndex: 2, label: 'Tue', short: 'T' },
  { dayIndex: 3, label: 'Wed', short: 'W' },
  { dayIndex: 4, label: 'Thu', short: 'Th' },
  { dayIndex: 5, label: 'Fri', short: 'F' },
  { dayIndex: 6, label: 'Sat', short: 'Sa' },
  { dayIndex: 0, label: 'Sun', short: 'Su' },
];

function formatDateRangeString(startStr?: string, endStr?: string): string {
  if (!startStr) return '';
  const dStart = new Date(startStr);
  if (isNaN(dStart.getTime())) return '';
  if (!endStr) {
    return dStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const dEnd = new Date(endStr);
  if (isNaN(dEnd.getTime())) {
    return dStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const startMonth = dStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = dEnd.toLocaleDateString('en-US', { month: 'short' });
  const startDay = dStart.getDate();
  const endDay = dEnd.getDate();
  const year = dEnd.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

function calculateMatchdays(
  startStr?: string,
  endStr?: string,
  pattern?: string,
  daysOfWeek?: number[]
): number {
  if (!startStr || !endStr) return 0;
  const dStart = new Date(startStr);
  const dEnd = new Date(endStr);
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dStart > dEnd) return 0;

  const cur = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
  const limit = new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate());
  let count = 0;

  while (cur <= limit) {
    if (pattern === 'DAYS_OF_WEEK') {
      if (Array.isArray(daysOfWeek) && daysOfWeek.includes(cur.getDay())) {
        count++;
      }
    } else {
      // ALL_DAYS or fallback
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function TournamentStagesFormatInput({
  initialFormatDetails,
  initialStages,
}: TournamentStagesFormatInputProps) {
  // 0. Calendar Widget On/Off toggle
  const [showCalendarWidget, setShowCalendarWidget] = useState<boolean>(() => {
    if (typeof initialFormatDetails?.showCalendarWidget === 'boolean') {
      return initialFormatDetails.showCalendarWidget;
    }
    return true; // Default enabled
  });

  // 1. Header Cards state
  const [headerCards, setHeaderCards] = useState<HeaderCardItem[]>(() => {
    if (Array.isArray(initialFormatDetails?.headerCards) && initialFormatDetails.headerCards.length > 0) {
      return initialFormatDetails.headerCards;
    }
    return DEFAULT_HEADER_CARDS;
  });

  // 2. Stage List state
  const [stages, setStages] = useState<StageFormatItem[]>(() => {
    const existingFormats = initialFormatDetails?.stageFormats || {};
    const existingStagesArray = initialFormatDetails?.stages;

    if (Array.isArray(existingStagesArray) && existingStagesArray.length > 0) {
      return existingStagesArray.map((st: any, idx: number) => {
        const fmt = existingFormats[st.name] || existingFormats[st.id] || {};
        return {
          id: st.id || `stage-${idx + 1}`,
          name: st.name || `Stage ${idx + 1}`,
          sequence: st.sequence ?? idx + 1,
          stageType: st.stageType || fmt.stageType || 'GROUPS_WISE',
          formatType: st.formatType || fmt.formatType || 'Battle Royale Points Table',
          dates: fmt.dates || st.dates || '',
          startDate: fmt.startDate || st.startDate || '',
          endDate: fmt.endDate || st.endDate || '',
          schedulePattern: fmt.schedulePattern || st.schedulePattern || 'ALL_DAYS',
          activeDaysOfWeek: fmt.activeDaysOfWeek || st.activeDaysOfWeek || [4, 5, 6, 0],
          customDates: fmt.customDates || st.customDates || [],
          matchesPerDay: fmt.matchesPerDay ?? st.matchesPerDay ?? 6,
          matchTime: fmt.matchTime || st.matchTime || '16:00 IST',
          totalMatches: fmt.totalMatches ?? st.totalMatches ?? 18,
          matchdaysCount: fmt.matchdaysCount ?? st.matchdaysCount ?? 3,
          teamsCount: fmt.teamsCount ?? st.teamsCount ?? 16,
          groupsDivision: fmt.groupsDivision || st.groupsDivision || '',
          stageDescription: fmt.stageDescription || st.stageDescription || '',
          rules: Array.isArray(fmt.rules)
            ? fmt.rules
            : Array.isArray(st.rules)
            ? st.rules
            : [],
        };
      });
    }

    if (Array.isArray(initialStages) && initialStages.length > 0) {
      return initialStages.map((st, idx) => {
        const fmt = existingFormats[st.name] || existingFormats[st.id || ''] || {};
        return {
          id: st.id || `stage-${idx + 1}`,
          name: st.name,
          sequence: st.sequence ?? idx + 1,
          stageType: st.stageType || fmt.stageType || 'GROUPS_WISE',
          formatType: st.formatType || fmt.formatType || 'Battle Royale Points Table',
          dates: fmt.dates || '',
          startDate: fmt.startDate || '',
          endDate: fmt.endDate || '',
          schedulePattern: fmt.schedulePattern || 'ALL_DAYS',
          activeDaysOfWeek: fmt.activeDaysOfWeek || [4, 5, 6, 0],
          customDates: fmt.customDates || [],
          matchesPerDay: fmt.matchesPerDay ?? 6,
          matchTime: fmt.matchTime || '16:00 IST',
          totalMatches: fmt.totalMatches ?? 18,
          matchdaysCount: fmt.matchdaysCount ?? 3,
          teamsCount: fmt.teamsCount ?? 16,
          groupsDivision: fmt.groupsDivision || '',
          stageDescription: fmt.stageDescription || '',
          rules: Array.isArray(fmt.rules) ? fmt.rules : [],
        };
      });
    }

    // Default fallback stages if empty
    return [
      {
        id: 'stage-1',
        name: 'Grand Finals',
        sequence: 1,
        stageType: 'GROUPS_WISE',
        formatType: 'Battle Royale Points Table',
        dates: '',
        startDate: '',
        endDate: '',
        schedulePattern: 'ALL_DAYS',
        activeDaysOfWeek: [4, 5, 6, 0],
        customDates: [],
        matchesPerDay: 6,
        matchTime: '16:00 IST',
        totalMatches: 18,
        matchdaysCount: 3,
        teamsCount: 16,
        groupsDivision: 'Single Lobby (16 Teams)',
        stageDescription: '16 Qualified squads battle over 3 days for the championship trophy.',
        rules: [
          {
            thresholdRank: 'Rank 1',
            badgeText: 'Champion',
            badgeVariant: 'success',
            destination: 'Crown Champion & Direct Global Seed',
          },
          {
            thresholdRank: 'Rank 2 – 4',
            badgeText: 'Podium',
            badgeVariant: 'info',
            destination: 'Direct Seed to International Masters',
          },
        ],
      },
    ];
  });

  // 3. Tiebreaker Tiers state
  const [tiebreakerTiers, setTiebreakerTiers] = useState<TiebreakerTierItem[]>(() => {
    if (Array.isArray(initialFormatDetails?.tiebreakerTiers) && initialFormatDetails.tiebreakerTiers.length > 0) {
      return initialFormatDetails.tiebreakerTiers;
    }
    return DEFAULT_TIEBREAKER_TIERS;
  });

  // Active section tab: 'stages' | 'cards' | 'tiebreakers'
  const [activeTab, setActiveTab] = useState<'stages' | 'cards' | 'tiebreakers'>('stages');
  const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(0);

  // Compile JSON payload
  const compiledPayload = useMemo(() => {
    const stageFormatsMap: Record<string, any> = {};
    const calendarPhases: any[] = [];

    stages.forEach((st) => {
      stageFormatsMap[st.name] = {
        name: st.name,
        sequence: st.sequence,
        stageType: st.stageType,
        formatType: st.formatType,
        dates: st.dates || '',
        startDate: st.startDate || '',
        endDate: st.endDate || '',
        schedulePattern: st.schedulePattern || 'ALL_DAYS',
        activeDaysOfWeek: st.activeDaysOfWeek || [4, 5, 6, 0],
        customDates: st.customDates || [],
        matchesPerDay: Number(st.matchesPerDay) || 6,
        matchTime: st.matchTime || '16:00 IST',
        totalMatches: Number(st.totalMatches) || 0,
        matchdaysCount: st.matchdaysCount || 0,
        teamsCount: Number(st.teamsCount) || 16,
        groupsDivision: st.groupsDivision || '',
        stageDescription: st.stageDescription || '',
        rules: st.rules || [],
      };

      if (st.startDate && st.endDate) {
        calendarPhases.push({
          stageName: st.name,
          startDate: st.startDate,
          endDate: st.endDate,
          pattern: st.schedulePattern || 'ALL_DAYS',
          activeDaysOfWeek: st.activeDaysOfWeek || [4, 5, 6, 0],
          customDates: st.customDates || [],
          matchesPerDay: Number(st.matchesPerDay) || 6,
          matchTime: st.matchTime || '16:00 IST',
        });
      }
    });

    return {
      showCalendarWidget,
      headerCards,
      stageFormats: stageFormatsMap,
      stages: stages.map((st, idx) => ({
        id: st.id,
        name: st.name,
        sequence: idx + 1,
        stageType: st.stageType,
        formatType: st.formatType,
        dates: st.dates || '',
        startDate: st.startDate || '',
        endDate: st.endDate || '',
        schedulePattern: st.schedulePattern || 'ALL_DAYS',
        activeDaysOfWeek: st.activeDaysOfWeek || [4, 5, 6, 0],
        customDates: st.customDates || [],
        matchesPerDay: Number(st.matchesPerDay) || 6,
        matchTime: st.matchTime || '16:00 IST',
        totalMatches: st.totalMatches,
        matchdaysCount: st.matchdaysCount,
        teamsCount: st.teamsCount,
        groupsDivision: st.groupsDivision,
        stageDescription: st.stageDescription,
        rules: st.rules,
      })),
      calendarPhases,
      tiebreakerTiers,
    };
  }, [showCalendarWidget, headerCards, stages, tiebreakerTiers]);

  // Stage Handlers
  const addStage = () => {
    const nextSeq = stages.length + 1;
    const newStage: StageFormatItem = {
      id: `new-stage-${Date.now()}`,
      name: `Stage ${nextSeq}`,
      sequence: nextSeq,
      stageType: 'GROUPS_WISE',
      formatType: 'Battle Royale Points Table',
      dates: '',
      startDate: '',
      endDate: '',
      schedulePattern: 'ALL_DAYS',
      activeDaysOfWeek: [4, 5, 6, 0],
      customDates: [],
      matchesPerDay: 6,
      matchTime: '16:00 IST',
      totalMatches: 18,
      matchdaysCount: 3,
      teamsCount: 16,
      groupsDivision: '16 Teams Single Lobby',
      stageDescription: '',
      rules: [],
    };
    setStages([...stages, newStage]);
    setExpandedStageIndex(stages.length);
  };

  const removeStage = (idx: number) => {
    if (stages.length <= 1) return;
    const next = stages.filter((_, i) => i !== idx);
    setStages(next.map((s, i) => ({ ...s, sequence: i + 1 })));
    if (expandedStageIndex === idx) setExpandedStageIndex(null);
  };

  const updateStage = (idx: number, patch: Partial<StageFormatItem>) => {
    setStages((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx], ...patch };

      // Auto-update display dates if startDate or endDate changed and dates is empty or was auto-generated
      if ('startDate' in patch || 'endDate' in patch) {
        if (!target.dates || target.dates === formatDateRangeString(copy[idx].startDate, copy[idx].endDate)) {
          target.dates = formatDateRangeString(target.startDate, target.endDate);
        }
      }

      copy[idx] = target;
      return copy;
    });
  };

  // Rule Handlers
  const addRule = (stageIdx: number) => {
    const stage = stages[stageIdx];
    const newRule: StageAdvancementRuleItem = {
      thresholdRank: 'Top 8',
      badgeText: 'Advancement',
      badgeVariant: 'success',
      destination: 'Advance to Next Stage',
    };
    updateStage(stageIdx, { rules: [...(stage.rules || []), newRule] });
  };

  const removeRule = (stageIdx: number, ruleIdx: number) => {
    const stage = stages[stageIdx];
    const newRules = stage.rules.filter((_, i) => i !== ruleIdx);
    updateStage(stageIdx, { rules: newRules });
  };

  const updateRule = (stageIdx: number, ruleIdx: number, patch: Partial<StageAdvancementRuleItem>) => {
    const stage = stages[stageIdx];
    const copyRules = [...stage.rules];
    copyRules[ruleIdx] = { ...copyRules[ruleIdx], ...patch };
    updateStage(stageIdx, { rules: copyRules });
  };

  // Day of week toggler
  const toggleDayOfWeek = (stageIdx: number, dayIndex: number) => {
    const stage = stages[stageIdx];
    const current = stage.activeDaysOfWeek || [4, 5, 6, 0];
    const updated = current.includes(dayIndex)
      ? current.filter((d) => d !== dayIndex)
      : [...current, dayIndex];
    updateStage(stageIdx, { activeDaysOfWeek: updated });
  };

  // Tiebreaker Handlers
  const addTiebreakerTier = () => {
    const nextTier = tiebreakerTiers.length + 1;
    setTiebreakerTiers([
      ...tiebreakerTiers,
      {
        tier: nextTier,
        title: `Tier ${nextTier} Criteria`,
        description: 'Detail how ties are broken at this priority level.',
      },
    ]);
  };

  const removeTiebreakerTier = (idx: number) => {
    const next = tiebreakerTiers.filter((_, i) => i !== idx);
    setTiebreakerTiers(next.map((item, i) => ({ ...item, tier: i + 1 })));
  };

  const updateTiebreakerTier = (idx: number, patch: Partial<TiebreakerTierItem>) => {
    setTiebreakerTiers((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-(--ed-blue) transition-all';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';

  return (
    <div className="space-y-4">
      <input type="hidden" name="stagesFormatJson" value={JSON.stringify(compiledPayload)} />

      {/* TOP BAR: Calendar Widget On/Off Master Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-(--ed-blue) dark:text-blue-400 shrink-0">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Tournament Schedule Calendar Widget
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  showCalendarWidget
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {showCalendarWidget ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Controls whether the interactive monthly schedule calendar is rendered on the public Format tab.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCalendarWidget(!showCalendarWidget)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            showCalendarWidget
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
              : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
          }`}
        >
          {showCalendarWidget ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{showCalendarWidget ? 'Calendar Enabled (Click to Turn Off)' : 'Calendar Hidden (Click to Turn On)'}</span>
        </button>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setActiveTab('stages')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'stages'
              ? 'bg-white dark:bg-slate-900 text-(--ed-blue) dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Stage-by-Stage Format ({stages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'cards'
              ? 'bg-white dark:bg-slate-900 text-(--ed-blue) dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Format Header Cards ({headerCards.filter((c) => c.enabled).length}/3)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tiebreakers')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tiebreakers'
              ? 'bg-white dark:bg-slate-900 text-(--ed-blue) dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Tiebreaker Hierarchy ({tiebreakerTiers.length} Tiers)</span>
        </button>
      </div>

      {/* TAB 1: STAGE-BY-STAGE FORMAT */}
      {activeTab === 'stages' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Define stages with real calendar dates, matchdays pattern (e.g. Thu–Sun for BMPS), and advancement rules.
            </p>
            <button
              type="button"
              onClick={addStage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ed-blue) text-white text-xs font-bold hover:bg-blue-600 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stage</span>
            </button>
          </div>

          <div className="space-y-3">
            {stages.map((stage, sIdx) => {
              const isExpanded = expandedStageIndex === sIdx;
              const calculatedMatchdays = calculateMatchdays(
                stage.startDate,
                stage.endDate,
                stage.schedulePattern,
                stage.activeDaysOfWeek
              );
              const matchesPerDay = Number(stage.matchesPerDay) || 6;
              const calculatedTotalMatches = calculatedMatchdays * matchesPerDay;

              return (
                <div
                  key={stage.id || sIdx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden shadow-xs"
                >
                  {/* Stage Accordion Header */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 text-xs font-black flex items-center justify-center">
                        {sIdx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {stage.name || `Stage ${sIdx + 1}`}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {stage.totalMatches ? <span>{stage.totalMatches} Matches</span> : null}
                          {stage.matchdaysCount ? <span>• {stage.matchdaysCount} Days</span> : null}
                          {stage.dates ? (
                            <span className="text-slate-600 dark:text-slate-300 font-medium">• {stage.dates}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpandedStageIndex(isExpanded ? null : sIdx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStage(sIdx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Stage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stage Accordion Body */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Row 1: Name & Structure */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Stage Official Name *</label>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => updateStage(sIdx, { name: e.target.value })}
                            placeholder="e.g. Round 1, Survival Stage, Semifinals, Grand Finals"
                            className={inputCls + ' font-bold'}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Format Type</label>
                          <select
                            value={stage.formatType}
                            onChange={(e) => updateStage(sIdx, { formatType: e.target.value })}
                            className={inputCls}
                          >
                            <option value="Battle Royale Points Table">Battle Royale Points Table</option>
                            <option value="Round Robin Groups">Round Robin Groups</option>
                            <option value="Single Elimination">Single Elimination</option>
                            <option value="Double Elimination">Double Elimination</option>
                            <option value="Swiss Stage">Swiss Stage</option>
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Stage Structure Type</label>
                          <select
                            value={stage.stageType}
                            onChange={(e) => updateStage(sIdx, { stageType: e.target.value })}
                            className={inputCls}
                          >
                            <option value="GROUPS_WISE">Groups Wise / Lobby</option>
                            <option value="ROUND_ROBIN">Round Robin</option>
                            <option value="SWISS">Swiss System</option>
                            <option value="PLAYOFFS">Playoffs / Finals</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: REAL CALENDAR DATES & SCHEDULE PATTERN (For Calendar Widget & BMPS) */}
                      <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-(--ed-blue)" />
                            <span>Stage Calendar Dates &amp; Matchday Intervals</span>
                          </div>
                          {calculatedMatchdays > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                📅 Calculated: {calculatedMatchdays} Days ({calculatedTotalMatches} Matches)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  updateStage(sIdx, {
                                    matchdaysCount: calculatedMatchdays,
                                    totalMatches: calculatedTotalMatches,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Sync Counts</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className={labelCls}>Stage Start Date (Calendar)</label>
                            <input
                              type="date"
                              value={stage.startDate || ''}
                              onChange={(e) => updateStage(sIdx, { startDate: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <label className={labelCls}>Stage End Date (Calendar)</label>
                            <input
                              type="date"
                              value={stage.endDate || ''}
                              onChange={(e) => updateStage(sIdx, { endDate: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Display Dates Label
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const auto = formatDateRangeString(stage.startDate, stage.endDate);
                                  if (auto) updateStage(sIdx, { dates: auto });
                                }}
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <Wand2 className="w-2.5 h-2.5" />
                                <span>Auto Label</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={stage.dates || ''}
                              onChange={(e) => updateStage(sIdx, { dates: e.target.value })}
                              placeholder="e.g. May 15 – May 25, 2026"
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {/* Matchday Recurrence Pattern */}
                        <div className="pt-2 border-t border-blue-200/50 dark:border-blue-900/30">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div className="md:col-span-4">
                              <label className={labelCls}>Matchday Recurrence Pattern</label>
                              <select
                                value={stage.schedulePattern || 'ALL_DAYS'}
                                onChange={(e) =>
                                  updateStage(sIdx, { schedulePattern: e.target.value as any })
                                }
                                className={inputCls}
                              >
                                <option value="ALL_DAYS">Consecutive Daily (Every day in range)</option>
                                <option value="DAYS_OF_WEEK">Weekly Days (e.g. Thu, Fri, Sat, Sun)</option>
                              </select>
                            </div>

                            <div className="md:col-span-4">
                              <label className={labelCls}>Matches Per Matchday</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  value={stage.matchesPerDay ?? 6}
                                  onChange={(e) =>
                                    updateStage(sIdx, { matchesPerDay: parseInt(e.target.value) || 6 })
                                  }
                                  className={inputCls}
                                />
                                <span className="text-xs text-slate-500 font-bold shrink-0">matches/day</span>
                              </div>
                            </div>

                            <div className="md:col-span-4">
                              <label className={labelCls}>Daily Start Time</label>
                              <input
                                type="text"
                                value={stage.matchTime || '16:00 IST'}
                                onChange={(e) => updateStage(sIdx, { matchTime: e.target.value })}
                                placeholder="e.g. 16:00 IST or 17:30 IST"
                                className={inputCls}
                              />
                            </div>
                          </div>

                          {/* Days of Week Selectors (when DAYS_OF_WEEK selected) */}
                          {stage.schedulePattern === 'DAYS_OF_WEEK' && (
                            <div className="mt-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Active Match Days of the Week:
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => updateStage(sIdx, { activeDaysOfWeek: [4, 5, 6, 0] })}
                                    className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold hover:bg-blue-200"
                                  >
                                    BMPS/BGIS Preset (Thu–Sun)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStage(sIdx, { activeDaysOfWeek: [5, 6, 0] })}
                                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                                  >
                                    Weekend (Fri–Sun)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateStage(sIdx, { activeDaysOfWeek: [1, 2, 3, 4, 5, 6, 0] })
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
                                  >
                                    All 7 Days
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {DAYS_OF_WEEK_OPTIONS.map((dow) => {
                                  const isActive = (stage.activeDaysOfWeek || []).includes(dow.dayIndex);
                                  return (
                                    <button
                                      key={dow.dayIndex}
                                      type="button"
                                      onClick={() => toggleDayOfWeek(sIdx, dow.dayIndex)}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                        isActive
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                      }`}
                                    >
                                      {dow.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Matches & Teams Counts */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className={labelCls}>Total Matches</label>
                          <input
                            type="number"
                            min={0}
                            value={stage.totalMatches ?? ''}
                            onChange={(e) =>
                              updateStage(sIdx, { totalMatches: parseInt(e.target.value) || 0 })
                            }
                            placeholder="e.g. 18"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Matchdays Count</label>
                          <input
                            type="text"
                            value={stage.matchdaysCount || ''}
                            onChange={(e) => updateStage(sIdx, { matchdaysCount: e.target.value })}
                            placeholder="e.g. 3 or 3 Matchdays"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Teams In Stage</label>
                          <input
                            type="number"
                            min={2}
                            value={stage.teamsCount ?? 16}
                            onChange={(e) =>
                              updateStage(sIdx, { teamsCount: parseInt(e.target.value) || 16 })
                            }
                            placeholder="e.g. 16 or 24"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Lobby / Groups Division Label</label>
                          <input
                            type="text"
                            value={stage.groupsDivision || ''}
                            onChange={(e) => updateStage(sIdx, { groupsDivision: e.target.value })}
                            placeholder="e.g. 3 Groups (A, B, C) or Single Lobby"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Stage Overview &amp; Format Details</label>
                        <textarea
                          rows={2}
                          value={stage.stageDescription || ''}
                          onChange={(e) => updateStage(sIdx, { stageDescription: e.target.value })}
                          placeholder="Explain how matches are played, how squads qualify, and any special stage stipulations..."
                          className={inputCls}
                        />
                      </div>

                      {/* Advancement Rules Builder */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Advancement &amp; Elimination Zones
                          </span>
                          <button
                            type="button"
                            onClick={() => addRule(sIdx)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Qualification Rule</span>
                          </button>
                        </div>

                        {(!stage.rules || stage.rules.length === 0) ? (
                          <div className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                            No advancement zones defined for this stage yet. Click &quot;Add Qualification Rule&quot; to configure cutoffs.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {stage.rules.map((rule, rIdx) => (
                              <div
                                key={rIdx}
                                className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                              >
                                <div className="w-full sm:w-28 shrink-0">
                                  <input
                                    type="text"
                                    value={rule.thresholdRank}
                                    onChange={(e) => updateRule(sIdx, rIdx, { thresholdRank: e.target.value })}
                                    placeholder="e.g. 1st – 4th"
                                    className={inputCls + ' py-1'}
                                  />
                                </div>

                                <div className="w-full sm:w-32 shrink-0">
                                  <input
                                    type="text"
                                    value={rule.badgeText}
                                    onChange={(e) => updateRule(sIdx, rIdx, { badgeText: e.target.value })}
                                    placeholder="e.g. Qualified"
                                    className={inputCls + ' py-1'}
                                  />
                                </div>

                                <div className="w-full sm:w-28 shrink-0">
                                  <select
                                    value={rule.badgeVariant}
                                    onChange={(e) =>
                                      updateRule(sIdx, rIdx, { badgeVariant: e.target.value as any })
                                    }
                                    className={inputCls + ' py-1'}
                                  >
                                    <option value="success">Green (Success)</option>
                                    <option value="info">Blue (Info)</option>
                                    <option value="warning">Amber (Warning)</option>
                                    <option value="danger">Rose (Eliminated)</option>
                                  </select>
                                </div>

                                <div className="flex-1 min-w-[140px]">
                                  <input
                                    type="text"
                                    value={rule.destination}
                                    onChange={(e) => updateRule(sIdx, rIdx, { destination: e.target.value })}
                                    placeholder="e.g. Advance to Grand Finals"
                                    className={inputCls + ' py-1'}
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeRule(sIdx, rIdx)}
                                  className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 shrink-0"
                                  title="Delete Rule"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FORMAT HEADER CARDS */}
      {activeTab === 'cards' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Customize the 3 quick-stat format cards shown at the top of the tournament Format page. You can change titles, descriptions, or toggle them off.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {headerCards.map((card, idx) => (
              <div
                key={card.id || idx}
                className={`p-3.5 rounded-xl border transition-all ${
                  card.enabled
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-slate-200/50 dark:border-slate-800/50 bg-slate-100/50 dark:bg-slate-900/30 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Card #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...headerCards];
                      copy[idx] = { ...copy[idx], enabled: !copy[idx].enabled };
                      setHeaderCards(copy);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      card.enabled
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {card.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{card.enabled ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className={labelCls}>Card Title</label>
                    <input
                      type="text"
                      value={card.label}
                      onChange={(e) => {
                        const copy = [...headerCards];
                        copy[idx] = { ...copy[idx], label: e.target.value };
                        setHeaderCards(copy);
                      }}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Primary Value</label>
                    <input
                      type="text"
                      value={card.value}
                      onChange={(e) => {
                        const copy = [...headerCards];
                        copy[idx] = { ...copy[idx], value: e.target.value };
                        setHeaderCards(copy);
                      }}
                      className={inputCls + ' font-bold'}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Subtitle / Note</label>
                    <input
                      type="text"
                      value={card.subtitle || ''}
                      onChange={(e) => {
                        const copy = [...headerCards];
                        copy[idx] = { ...copy[idx], subtitle: e.target.value };
                        setHeaderCards(copy);
                      }}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TIEBREAKER HIERARCHY */}
      {activeTab === 'tiebreakers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Customize the official tiebreaker criteria tiers. Add, modify, or delete tiers to match your rulebook.
            </p>
            <button
              type="button"
              onClick={addTiebreakerTier}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ed-blue) text-white text-xs font-bold hover:bg-blue-600 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Priority Tier</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {tiebreakerTiers.map((tierItem, tIdx) => (
              <div
                key={tIdx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center shrink-0 mt-1">
                  T{tierItem.tier}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-12">
                      <label className={labelCls}>Tier {tierItem.tier} Title</label>
                      <input
                        type="text"
                        value={tierItem.title}
                        onChange={(e) => updateTiebreakerTier(tIdx, { title: e.target.value })}
                        placeholder="e.g. Total Placement Points Across All Matchdays"
                        className={inputCls + ' font-bold'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Rule Description</label>
                    <textarea
                      rows={2}
                      value={tierItem.description}
                      onChange={(e) => updateTiebreakerTier(tIdx, { description: e.target.value })}
                      placeholder="Explain how this tier breaks the tie..."
                      className={inputCls}
                    />
                  </div>
                </div>

                {tiebreakerTiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTiebreakerTier(tIdx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors mt-1"
                    title="Remove Tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
