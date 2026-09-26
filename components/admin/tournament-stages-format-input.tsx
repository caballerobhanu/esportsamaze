'use client';

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import {
  Layers,
  Plus,
  Copy,
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
  Edit2,
  Tag,
  Swords,
} from 'lucide-react';
import type { StageGroupSquad } from '@/components/tournaments/tournament-stage-format-card';
import { pendingSeatKey, pendingSeatLabel, type PendingSeatSource } from '@/lib/stage-groups';
import { ZONE_COLOR_OPTIONS } from '@/lib/standings-config';
import { applyTemplateStages, type StageTemplate } from '@/lib/stage-templates';
import { parseStageSheet, type ParsedStageRow } from '@/lib/tournament-scaffold-parse';
import { TabPasteBox, type TabPastePreview } from '@/components/admin/tab-paste-box';
import {
  deleteStageTemplateAction,
  saveStageTemplateAction,
} from '@/app/admin/(panel)/tournaments/stage-template-actions';

/**
 * A squad the draw can place: a seat in the tournament's field, carrying whatever the
 * public card needs to render it without another lookup.
 */
export interface GroupCandidate {
  teamId: string | null;
  teamName: string;
  displayName?: string | null;
  tag?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  seed?: number | null;
  seedLabel?: string | null;
  country?: string | null;
  roster?: StageGroupSquad['roster'];
}

/** A seat with no team is identified by its entry label — the label is its name. */
function candidateKey(candidate: {
  teamId?: string | null;
  seedLabel?: string | null;
  teamName?: string;
  source?: PendingSeatSource | null;
}): string {
  if (candidate.source) return pendingSeatKey(candidate.source);
  return candidate.teamId || `seat:${candidate.seedLabel || candidate.teamName || ''}`;
}

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
  /** The zone colour. Shared with the Standings editor so both offer the same set. */
  badgeColor?: string;
  /** Legacy tokens written by the old four-value picker; still read, never written. */
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info';
  destination: string;
  groupName?: string; // e.g. "All Groups", "Group A", "Group B", "Group C"
}

/** Maps the retired badge tokens onto the shared colour list. */
const LEGACY_BADGE_COLOR: Record<string, string> = {
  success: 'green',
  info: 'blue',
  warning: 'amber',
  danger: 'red',
};

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
  matchesPerGroup?: number;
  matchesPerTeam?: number;
  matchdaysCount?: number | string;
  teamsCount?: number;
  groupsDivision?: string;
  stageDescription?: string;
  rules: StageAdvancementRuleItem[];
  /** Declared draw, used on the public Format tab until the stage's matches define groups. */
  groups: Record<string, StageGroupSquad[]>;
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
  /** Stage templates saved from earlier events, offered as a starting point. */
  initialStageTemplates?: StageTemplate[];
  /** The tournament's field of seats, offered when building a stage's group draw. */
  groupCandidates?: GroupCandidate[];
  /** Stage name → the group names its matches carry. Non-empty means matches own them. */
  stageMatchGroups?: Record<string, string[]>;
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
    title: 'Total Elimination Points',
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

const DEFAULT_FORMAT_TYPES = [
  'Battle Royale Points Table',
  'Round Robin Groups',
  'Single Elimination',
  'Double Elimination',
  'Swiss Stage',
  'Survival Stage',
  'Gauntlet Stage',
  'Leaderboard Chase',
  'Double Round Robin',
];

const DEFAULT_STRUCTURE_TYPES = [
  { id: 'GROUPS_WISE', label: 'Groups Wise / Lobby' },
  { id: 'ROUND_ROBIN', label: 'Round Robin' },
  { id: 'SWISS', label: 'Swiss System' },
  { id: 'PLAYOFFS', label: 'Playoffs / Finals' },
  { id: 'SURVIVAL_STAGE', label: 'Survival Stage' },
  { id: 'LAST_CHANCE_QUALIFIER', label: 'Last Chance Qualifier (LCQ)' },
  { id: 'SINGLE_ELIMINATION', label: 'Single Elimination Bracket' },
  { id: 'DOUBLE_ELIMINATION', label: 'Double Elimination Bracket' },
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
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function TournamentStagesFormatInput({
  initialFormatDetails,
  initialStages,
  initialStageTemplates = [],
  groupCandidates = [],
  stageMatchGroups = {},
}: TournamentStagesFormatInputProps) {
  // 0. Calendar Widget On/Off toggle (optional)
  const [showCalendarWidget, setShowCalendarWidget] = useState<boolean>(() => {
    if (typeof initialFormatDetails?.showCalendarWidget === 'boolean') {
      return initialFormatDetails.showCalendarWidget;
    }
    return true;
  });

  // 1. Available Format Types (dynamically extendable)
  const [availableFormatTypes, setAvailableFormatTypes] = useState<string[]>(() => {
    const list = [...DEFAULT_FORMAT_TYPES];
    if (Array.isArray(initialFormatDetails?.availableFormatTypes)) {
      initialFormatDetails.availableFormatTypes.forEach((ft: string) => {
        if (ft && !list.includes(ft)) list.push(ft);
      });
    }
    return list;
  });
  const [newFormatTypeInput, setNewFormatTypeInput] = useState('');
  const [isAddingFormatType, setIsAddingFormatType] = useState(false);

  // 2. Available Structure Types (dynamically extendable)
  const [availableStructureTypes, setAvailableStructureTypes] = useState<
    Array<{ id: string; label: string }>
  >(() => {
    const list = [...DEFAULT_STRUCTURE_TYPES];
    if (Array.isArray(initialFormatDetails?.availableStructureTypes)) {
      initialFormatDetails.availableStructureTypes.forEach((st: any) => {
        if (st && st.id && !list.some((item) => item.id === st.id)) {
          list.push(st);
        }
      });
    }
    return list;
  });
  const [newStructureIdInput, setNewStructureIdInput] = useState('');
  const [newStructureLabelInput, setNewStructureLabelInput] = useState('');
  const [isAddingStructureType, setIsAddingStructureType] = useState(false);

  // 3. Header Cards state
  const [headerCards, setHeaderCards] = useState<HeaderCardItem[]>(() => {
    if (Array.isArray(initialFormatDetails?.headerCards) && initialFormatDetails.headerCards.length > 0) {
      return initialFormatDetails.headerCards;
    }
    return DEFAULT_HEADER_CARDS;
  });

  // 4. Stage List state — NOT COMPULSORY (defaults to empty array if no stages exist!)
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
          totalMatches: fmt.totalMatches ?? st.totalMatches ?? undefined,
          matchesPerGroup: fmt.matchesPerGroup ?? st.matchesPerGroup ?? undefined,
          matchesPerTeam: fmt.matchesPerTeam ?? st.matchesPerTeam ?? undefined,
          matchdaysCount: fmt.matchdaysCount ?? st.matchdaysCount ?? '',
          teamsCount: fmt.teamsCount ?? st.teamsCount ?? undefined,
          groupsDivision: fmt.groupsDivision || st.groupsDivision || '',
          stageDescription: fmt.stageDescription || st.stageDescription || '',
          rules: Array.isArray(fmt.rules)
            ? fmt.rules
            : Array.isArray(st.rules)
            ? st.rules
            : [],
          groups: fmt.groups && typeof fmt.groups === 'object' ? fmt.groups : {},
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
          totalMatches: fmt.totalMatches ?? undefined,
          matchesPerGroup: fmt.matchesPerGroup ?? undefined,
          matchesPerTeam: fmt.matchesPerTeam ?? undefined,
          matchdaysCount: fmt.matchdaysCount ?? '',
          teamsCount: fmt.teamsCount ?? undefined,
          groupsDivision: fmt.groupsDivision || '',
          stageDescription: fmt.stageDescription || '',
          rules: Array.isArray(fmt.rules) ? fmt.rules : [],
          groups: fmt.groups && typeof fmt.groups === 'object' ? fmt.groups : {},
        };
      });
    }

    // Default to EMPTY array so no stage is compulsory!
    return [];
  });

  // 5. Tiebreaker Tiers state
  const [tiebreakerTiers, setTiebreakerTiers] = useState<TiebreakerTierItem[]>(() => {
    if (Array.isArray(initialFormatDetails?.tiebreakerTiers) && initialFormatDetails.tiebreakerTiers.length > 0) {
      return initialFormatDetails.tiebreakerTiers;
    }
    return DEFAULT_TIEBREAKER_TIERS;
  });

  // Active section tab: 'stages' | 'cards' | 'tiebreakers'
  const [activeTab, setActiveTab] = useState<'stages' | 'cards' | 'tiebreakers'>('stages');
  const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(0);

  // ---- Stage templates: a reusable stage list, carrying structure only ----
  const [stageTemplates, setStageTemplates] = useState<StageTemplate[]>(initialStageTemplates);
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [isTemplateBusy, startTemplateTransition] = useTransition();

  const handleSaveTemplate = () => {
    const name = newTemplateName.trim();
    if (!name || stages.length === 0) return;
    startTemplateTransition(async () => {
      const res = await saveStageTemplateAction(name, JSON.stringify(stages));
      if (res.ok) {
        setStageTemplates(res.templates);
        setNewTemplateName('');
        setShowTemplateSave(false);
        setTemplateMessage(`Saved "${name}" (${stages.length} stages).`);
      } else {
        setTemplateMessage(res.error ?? 'Could not save the template.');
      }
    });
  };

  const handleApplyTemplate = (id: string) => {
    const template = stageTemplates.find((t) => t.id === id);
    if (!template) return;

    if (
      stages.length > 0 &&
      !window.confirm(
        `Replace the current ${stages.length} stage(s) with "${template.name}" (${template.stages.length} stages)?\n\nDates and group draws already entered for stages of the same name are kept.`,
      )
    ) {
      return;
    }

    // The stage shape lives with this component, so the merge result is cast into it here
    // rather than making lib/stage-templates depend on a component type.
    setStages(applyTemplateStages(template.stages, stages) as unknown as StageFormatItem[]);
    setExpandedStageIndex(0);
    setTemplateMessage(`Applied "${template.name}". Check the dates and group draw before saving.`);
  };

  const handleDeleteTemplate = (id: string) => {
    const template = stageTemplates.find((t) => t.id === id);
    if (!template || !window.confirm(`Delete the template "${template.name}"?`)) return;
    startTemplateTransition(async () => {
      const res = await deleteStageTemplateAction(id);
      setStageTemplates(res.templates);
      setTemplateMessage(res.error ?? `Deleted "${template.name}".`);
    });
  };

  // ---- Paste a stage sheet straight into this tab ----
  // The sheet wins for every column it carries. The one thing it cannot carry is the
  // declared group draw, so that survives from a stage of the same name.
  const previewStagePaste = (text: string): TabPastePreview => {
    const res = parseStageSheet(text);
    return {
      summary: res.error ? [] : [`${res.rows.length} stage${res.rows.length === 1 ? '' : 's'} recognised`],
      unrecognised: res.unrecognisedHeaders,
      error: res.error,
    };
  };

  const applyStagePaste = (text: string) => {
    const { rows } = parseStageSheet(text);
    if (rows.length === 0) return;

    const existingByName = new Map(stages.map((stage) => [stage.name.trim(), stage]));

    const next: StageFormatItem[] = rows.map((row: ParsedStageRow, index) => {
      const existing = existingByName.get(row.name);
      return {
        id: existing?.id ?? `stage-${index + 1}`,
        name: row.name,
        sequence: index + 1,
        stageType: row.stageType || existing?.stageType || 'GROUPS_WISE',
        formatType: row.formatType || existing?.formatType || 'Battle Royale Points Table',
        dates: existing?.dates ?? '',
        startDate: row.startDate ?? existing?.startDate ?? '',
        endDate: row.endDate ?? existing?.endDate ?? '',
        schedulePattern: existing?.schedulePattern ?? 'ALL_DAYS',
        activeDaysOfWeek: existing?.activeDaysOfWeek ?? [4, 5, 6, 0],
        customDates: existing?.customDates ?? [],
        matchesPerDay: row.matchesPerDay ?? existing?.matchesPerDay ?? 6,
        matchTime: row.matchTime ?? existing?.matchTime ?? '16:00 IST',
        totalMatches: row.totalMatches ?? existing?.totalMatches,
        matchesPerGroup: row.matchesPerGroup ?? existing?.matchesPerGroup,
        matchesPerTeam: row.matchesPerTeam ?? existing?.matchesPerTeam,
        matchdaysCount: row.matchdaysCount ?? existing?.matchdaysCount ?? '',
        teamsCount: row.teamsCount ?? existing?.teamsCount,
        groupsDivision: row.groupsDivision ?? existing?.groupsDivision ?? '',
        stageDescription: row.stageDescription ?? existing?.stageDescription ?? '',
        rules: existing?.rules ?? [],
        groups: existing?.groups ?? {},
      };
    });

    setStages(next);
    setExpandedStageIndex(0);
  };

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
        matchesPerDay: st.matchesPerDay ? Number(st.matchesPerDay) : undefined,
        matchTime: st.matchTime || '',
        totalMatches: st.totalMatches ? Number(st.totalMatches) : undefined,
        matchesPerGroup: st.matchesPerGroup ? Number(st.matchesPerGroup) : undefined,
        matchesPerTeam: st.matchesPerTeam ? Number(st.matchesPerTeam) : undefined,
        matchdaysCount: st.matchdaysCount || '',
        teamsCount: st.teamsCount ? Number(st.teamsCount) : undefined,
        groupsDivision: st.groupsDivision || '',
        stageDescription: st.stageDescription || '',
        rules: st.rules || [],
        groups: st.groups || {},
      };

      if (st.startDate && st.endDate) {
        calendarPhases.push({
          stageName: st.name,
          startDate: st.startDate,
          endDate: st.endDate,
          pattern: st.schedulePattern || 'ALL_DAYS',
          activeDaysOfWeek: st.activeDaysOfWeek || [4, 5, 6, 0],
          customDates: st.customDates || [],
          matchesPerDay: st.matchesPerDay ? Number(st.matchesPerDay) : 6,
          matchTime: st.matchTime || '16:00 IST',
        });
      }
    });

    return {
      showCalendarWidget,
      availableFormatTypes,
      availableStructureTypes,
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
        matchesPerDay: st.matchesPerDay,
        matchTime: st.matchTime,
        totalMatches: st.totalMatches,
        matchesPerGroup: st.matchesPerGroup,
        matchesPerTeam: st.matchesPerTeam,
        matchdaysCount: st.matchdaysCount,
        teamsCount: st.teamsCount,
        groupsDivision: st.groupsDivision,
        stageDescription: st.stageDescription,
        rules: st.rules,
        groups: st.groups || {},
      })),
      calendarPhases,
      tiebreakerTiers,
    };
  }, [showCalendarWidget, availableFormatTypes, availableStructureTypes, headerCards, stages, tiebreakerTiers]);

  // Stage Handlers — completely optional, can add or delete all stages
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
      totalMatches: undefined,
      matchesPerGroup: undefined,
      matchesPerTeam: undefined,
      matchdaysCount: '',
      teamsCount: undefined,
      groupsDivision: '',
      stageDescription: '',
      rules: [],
      groups: {},
    };
    setStages([...stages, newStage]);
    setExpandedStageIndex(stages.length);
  };

  const removeStage = (idx: number) => {
    const next = stages.filter((_, i) => i !== idx);
    setStages(next.map((s, i) => ({ ...s, sequence: i + 1 })));
    if (expandedStageIndex === idx) setExpandedStageIndex(null);
  };

  const updateStage = (idx: number, patch: Partial<StageFormatItem>) => {
    setStages((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx], ...patch };

      if ('startDate' in patch || 'endDate' in patch) {
        if (!target.dates || target.dates === formatDateRangeString(copy[idx].startDate, copy[idx].endDate)) {
          target.dates = formatDateRangeString(target.startDate, target.endDate);
        }
      }

      copy[idx] = target;
      return copy;
    });
  };

  // Group draw handlers — the declared draw shown on the public Format tab before a
  // stage's matches exist. Seats may repeat across different stages (a team can be in
  // Group A of one stage and also in the finals) but not twice within one stage.
  const stageGroups = (idx: number): Record<string, StageGroupSquad[]> => stages[idx]?.groups || {};

  const setStageGroups = (idx: number, groups: Record<string, StageGroupSquad[]>) => {
    updateStage(idx, { groups });
  };

  /** Identities already placed anywhere in this stage. */
  const usedInStage = (idx: number): Set<string> =>
    new Set(Object.values(stageGroups(idx)).flat().map((squad) => candidateKey(squad)));

  const availableForStage = (idx: number): GroupCandidate[] => {
    const used = usedInStage(idx);
    return groupCandidates.filter((candidate) => !used.has(candidateKey(candidate)));
  };

  const addGroup = (idx: number) => {
    const groups = { ...stageGroups(idx) };
    let n = Object.keys(groups).length + 1;
    while (groups[`Group ${String.fromCharCode(64 + n)}`]) n += 1;
    groups[`Group ${String.fromCharCode(64 + n)}`] = [];
    setStageGroups(idx, groups);
  };

  const removeGroup = (idx: number, name: string) => {
    const groups = { ...stageGroups(idx) };
    delete groups[name];
    setStageGroups(idx, groups);
  };

  const renameGroup = (idx: number, from: string, to: string) => {
    const next = to.trim();
    if (!next || next === from) return;

    const groups = { ...stageGroups(idx) };
    const squads = groups[from] || [];
    delete groups[from];
    groups[next] = squads;
    setStageGroups(idx, groups);
  };

  const addSeat = (idx: number, groupName: string, key: string) => {
    const candidate = groupCandidates.find((c) => candidateKey(c) === key);
    if (!candidate) return;

    const groups = { ...stageGroups(idx) };
    groups[groupName] = [
      ...(groups[groupName] || []),
      {
        teamId: candidate.teamId,
        teamName: candidate.displayName || candidate.teamName || candidate.seedLabel || 'Seat',
        displayName: candidate.displayName ?? null,
        tag: candidate.tag ?? null,
        slug: candidate.slug ?? null,
        logoUrl: candidate.logoUrl ?? null,
        logoDarkUrl: candidate.logoDarkUrl ?? null,
        seedLabel: candidate.seedLabel ?? null,
        seed: candidate.seed ?? null,
        country: candidate.country ?? null,
        roster: (candidate.roster || []).map((p) => ({
          ign: p.ign,
          role: p.role ?? null,
          captain: Boolean(p.captain),
          slug: p.slug ?? null,
          playerId: p.playerId ?? null,
        })),
      },
    ];
    setStageGroups(idx, groups);
  };

  const removeSeat = (idx: number, groupName: string, seatIdx: number) => {
    const groups = { ...stageGroups(idx) };
    groups[groupName] = (groups[groupName] || []).filter((_, i) => i !== seatIdx);
    setStageGroups(idx, groups);
  };

  /** The groups a stage is known to have: the ones declared for it, plus its match groups. */
  const sourceGroupNames = (stageName: string): string[] => {
    const declared = stages.find((s) => s.name === stageName)?.groups;
    return Array.from(new Set([...(declared ? Object.keys(declared) : []), ...(stageMatchGroups[stageName] || [])]));
  };

  /**
   * A place in this stage that another stage's result will fill. Defaults to coming out of
   * the stage before this one, which is the usual shape; every part is editable afterwards.
   */
  const addPendingSlot = (idx: number, groupName: string) => {
    const previous = stages[idx - 1]?.name ?? stages[0]?.name ?? '';
    const source: PendingSeatSource = {
      stage: previous,
      group: sourceGroupNames(previous)[0] ?? null,
      rank: 1,
    };

    const groups = { ...stageGroups(idx) };
    groups[groupName] = [
      ...(groups[groupName] || []),
      { teamId: null, teamName: pendingSeatLabel(source), seedLabel: null, source },
    ];
    setStageGroups(idx, groups);
  };

  const updatePendingSource = (
    idx: number,
    groupName: string,
    seatIdx: number,
    patch: Partial<PendingSeatSource>
  ) => {
    const groups = { ...stageGroups(idx) };
    const squads = [...(groups[groupName] || [])];
    const squad = squads[seatIdx];
    if (!squad?.source) return;

    const source = { ...squad.source, ...patch };
    squads[seatIdx] = { ...squad, source, teamName: pendingSeatLabel(source) };
    groups[groupName] = squads;
    setStageGroups(idx, groups);
  };

  // Rule Handlers with per-group qualification support
  const addRule = (stageIdx: number, defaultGroup = '') => {
    const stage = stages[stageIdx];
    const newRule: StageAdvancementRuleItem = {
      thresholdRank: 'Top 8',
      badgeText: 'Advancement',
      badgeColor: 'green',
      destination: 'Advance to Next Stage',
      groupName: defaultGroup,
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

  // Custom Format Type Handler
  const handleAddCustomFormatType = () => {
    const val = newFormatTypeInput.trim();
    if (val && !availableFormatTypes.includes(val)) {
      setAvailableFormatTypes([...availableFormatTypes, val]);
      setNewFormatTypeInput('');
      setIsAddingFormatType(false);
    }
  };

  // Custom Structure Type Handler
  const handleAddCustomStructureType = () => {
    const id = newStructureIdInput.trim().toUpperCase().replace(/\s+/g, '_');
    const label = newStructureLabelInput.trim() || id;
    if (id && !availableStructureTypes.some((st) => st.id === id)) {
      setAvailableStructureTypes([...availableStructureTypes, { id, label }]);
      setNewStructureIdInput('');
      setNewStructureLabelInput('');
      setIsAddingStructureType(false);
    }
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

      {/* STAGE TEMPLATES — reuse a stage list across events */}
      <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Copy className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Stage Templates</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Reuse this stage list on another event. A template carries the structure only — stage
                dates and the group draw are left for each event, and anything already entered here is
                kept.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stageTemplates.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleApplyTemplate(e.target.value);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-(--ed-blue) cursor-pointer"
              >
                <option value="">Load template…</option>
                {stageTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.stages.length})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowTemplateSave((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save as template</span>
            </button>
          </div>
        </div>

        {showTemplateSave && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="e.g. Standard 4-Stage Format"
              className={`${inputCls} max-w-xs`}
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isTemplateBusy || stages.length === 0 || !newTemplateName.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
            >
              {isTemplateBusy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTemplateSave(false);
                setNewTemplateName('');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            {stages.length === 0 && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Add a stage first.
              </span>
            )}
          </div>
        )}

        {stageTemplates.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved</span>
            {stageTemplates.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <span>{t.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(t.id)}
                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
                  title={`Delete template "${t.name}"`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {templateMessage && (
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{templateMessage}</p>
        )}
      </div>

      <TabPasteBox
        label="Stages — paste from a sheet"
        hint="One row per stage. Columns are matched by header name, so include the header row — anything it does not recognise is reported rather than guessed. The declared group draw is never touched."
        sampleHeader={
          'Stage\tFormat\tStructure\tStart Date\tEnd Date\tMatches Per Day\tMatch Time\tTotal Matches\tTeams\tGroups'
        }
        parse={previewStagePaste}
        onApply={applyStagePaste}
      />

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
              Configure stages, match breakdown (total, per group, per team), group qualification zones, and schedules. All fields are optional.
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

          {/* EMPTY STATE: When no stage is configured (NOT COMPULSORY) */}
          {stages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
              <div className="mx-auto w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2.5">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                No Stages Configured (Format TBD / Optional)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                No stages are compulsory. You can save the tournament without stages, and add them later when the official rulebook is announced.
              </p>
              <button
                type="button"
                onClick={addStage}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--ed-blue) text-white text-xs font-bold hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Stage</span>
              </button>
            </div>
          ) : (
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

                // Extract group names from lobby division or rules for typeahead/group badges
                const detectedGroups: string[] = ['All Groups'];
                if (stage.groupsDivision) {
                  const matches = stage.groupsDivision.match(/Group[s]?\s*([A-Z0-9,\s]+)/i);
                  if (matches && matches[1]) {
                    const letters = matches[1].split(/[,&/]/).map((l) => l.trim()).filter(Boolean);
                    letters.forEach((letStr) => {
                      const clean = `Group ${letStr.replace(/^Group\s*/i, '')}`;
                      if (!detectedGroups.includes(clean)) detectedGroups.push(clean);
                    });
                  }
                }
                // Also add standard Group A, B, C, D if not present
                ['Group A', 'Group B', 'Group C', 'Group D'].forEach((g) => {
                  if (!detectedGroups.includes(g)) detectedGroups.push(g);
                });

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
                            {stage.matchesPerGroup ? <span>• {stage.matchesPerGroup}/Group</span> : null}
                            {stage.matchesPerTeam ? <span>• {stage.matchesPerTeam}/Team</span> : null}
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
                        <button
                          type="button"
                          onClick={() => removeStage(sIdx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Stage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stage Accordion Body */}
                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        {/* Row 1: Name, Format Type & Structure Type (WITH CUSTOM WRITING & FUTURE SAVING) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                          <div className="sm:col-span-2 md:col-span-4">
                            <label className={labelCls}>Stage Official Name (Optional)</label>
                            <input
                              type="text"
                              value={stage.name}
                              onChange={(e) => updateStage(sIdx, { name: e.target.value })}
                              placeholder={`e.g. Stage ${sIdx + 1}, Round 1, Finals`}
                              className={inputCls + ' font-bold'}
                            />
                          </div>

                          {/* Format Type (Custom write-in & save for future) */}
                          <div className="md:col-span-4">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Format Type
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsAddingFormatType(!isAddingFormatType)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>{isAddingFormatType ? 'Cancel' : 'New Type'}</span>
                              </button>
                            </div>

                            {isAddingFormatType ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={newFormatTypeInput}
                                  onChange={(e) => setNewFormatTypeInput(e.target.value)}
                                  placeholder="Write custom format type..."
                                  className={inputCls}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddCustomFormatType();
                                    if (newFormatTypeInput.trim()) {
                                      updateStage(sIdx, { formatType: newFormatTypeInput.trim() });
                                    }
                                  }}
                                  className="px-2.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold shrink-0 hover:bg-blue-700"
                                >
                                  Add
                                </button>
                              </div>
                            ) : (
                              <select
                                value={stage.formatType}
                                onChange={(e) => {
                                  if (e.target.value === '__CUSTOM__') {
                                    setIsAddingFormatType(true);
                                  } else {
                                    updateStage(sIdx, { formatType: e.target.value });
                                  }
                                }}
                                className={inputCls}
                              >
                                {availableFormatTypes.map((ft) => (
                                  <option key={ft} value={ft}>
                                    {ft}
                                  </option>
                                ))}
                                <option value="__CUSTOM__">+ Write Custom Format Type...</option>
                              </select>
                            )}
                          </div>

                          {/* Stage Structure Type (Custom write-in & save for future) */}
                          <div className="md:col-span-4">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Structure Type
                              </label>
                              <button
                                type="button"
                                onClick={() => setIsAddingStructureType(!isAddingStructureType)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>{isAddingStructureType ? 'Cancel' : 'New Structure'}</span>
                              </button>
                            </div>

                            {isAddingStructureType ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={newStructureLabelInput}
                                  onChange={(e) => {
                                    setNewStructureLabelInput(e.target.value);
                                    if (!newStructureIdInput) {
                                      setNewStructureIdInput(
                                        e.target.value.toUpperCase().replace(/\s+/g, '_')
                                      );
                                    }
                                  }}
                                  placeholder="Display Label e.g. Gauntlet Bracket"
                                  className={inputCls}
                                />
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={newStructureIdInput}
                                    onChange={(e) => setNewStructureIdInput(e.target.value)}
                                    placeholder="Key ID e.g. GAUNTLET"
                                    className={inputCls}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const keyId = newStructureIdInput.trim().toUpperCase().replace(/\s+/g, '_');
                                      handleAddCustomStructureType();
                                      if (keyId) {
                                        updateStage(sIdx, { stageType: keyId });
                                      }
                                    }}
                                    className="px-2.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold shrink-0 hover:bg-blue-700"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <select
                                value={stage.stageType}
                                onChange={(e) => {
                                  if (e.target.value === '__CUSTOM__') {
                                    setIsAddingStructureType(true);
                                  } else {
                                    updateStage(sIdx, { stageType: e.target.value });
                                  }
                                }}
                                className={inputCls}
                              >
                                {availableStructureTypes.map((st) => (
                                  <option key={st.id} value={st.id}>
                                    {st.label}
                                  </option>
                                ))}
                                <option value="__CUSTOM__">+ Write Custom Structure Type...</option>
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Row 2: REAL CALENDAR DATES & SCHEDULE PATTERN (ALL OPTIONAL) */}
                        <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                              <Calendar className="w-3.5 h-3.5 text-(--ed-blue)" />
                              <span>Stage Calendar Dates &amp; Matchday Intervals (Optional)</span>
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
                              <label className={labelCls}>Stage Start Date (Optional)</label>
                              <input
                                type="date"
                                value={stage.startDate || ''}
                                onChange={(e) => updateStage(sIdx, { startDate: e.target.value })}
                                className={inputCls}
                              />
                            </div>

                            <div>
                              <label className={labelCls}>Stage End Date (Optional)</label>
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
                                  Display Dates Label (Optional)
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
                                <label className={labelCls}>Matches Per Matchday (Optional)</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    max={16}
                                    value={stage.matchesPerDay ?? ''}
                                    onChange={(e) =>
                                      updateStage(sIdx, {
                                        matchesPerDay: e.target.value ? parseInt(e.target.value) : undefined,
                                      })
                                    }
                                    placeholder="6"
                                    className={inputCls}
                                  />
                                  <span className="text-xs text-slate-500 font-bold shrink-0">matches/day</span>
                                </div>
                              </div>

                              <div className="md:col-span-4">
                                <label className={labelCls}>Daily Start Time (Optional)</label>
                                <input
                                  type="text"
                                  value={stage.matchTime || ''}
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

                        {/* Row 3: MATCHES BREAKDOWN — TOTAL STAGE, PER GROUP, PER TEAM (Point 5) */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                            Matches Breakdown &amp; Team Counts (All Optional)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            <div>
                              <label className={labelCls}>Total Matches in Stage</label>
                              <input
                                type="number"
                                min={0}
                                value={stage.totalMatches ?? ''}
                                onChange={(e) =>
                                  updateStage(sIdx, {
                                    totalMatches: e.target.value ? parseInt(e.target.value) : undefined,
                                  })
                                }
                                placeholder="e.g. 72"
                                className={inputCls}
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5">Across all lobbies</p>
                            </div>

                            <div>
                              <label className={labelCls}>Matches in a Group</label>
                              <input
                                type="number"
                                min={0}
                                value={stage.matchesPerGroup ?? ''}
                                onChange={(e) =>
                                  updateStage(sIdx, {
                                    matchesPerGroup: e.target.value ? parseInt(e.target.value) : undefined,
                                  })
                                }
                                placeholder="e.g. 24"
                                className={inputCls}
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5">Per group pool</p>
                            </div>

                            <div>
                              <label className={labelCls}>Matches per Team</label>
                              <input
                                type="number"
                                min={0}
                                value={stage.matchesPerTeam ?? ''}
                                onChange={(e) =>
                                  updateStage(sIdx, {
                                    matchesPerTeam: e.target.value ? parseInt(e.target.value) : undefined,
                                  })
                                }
                                placeholder="e.g. 12"
                                className={inputCls}
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5">Played by each squad</p>
                            </div>

                            <div>
                              <label className={labelCls}>Matchdays Count</label>
                              <input
                                type="text"
                                value={stage.matchdaysCount || ''}
                                onChange={(e) => updateStage(sIdx, { matchdaysCount: e.target.value })}
                                placeholder="e.g. 4 or 4 Days"
                                className={inputCls}
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5">Broadcast days</p>
                            </div>

                            <div>
                              <label className={labelCls}>Teams In Stage</label>
                              <input
                                type="number"
                                min={0}
                                value={stage.teamsCount ?? ''}
                                onChange={(e) =>
                                  updateStage(sIdx, {
                                    teamsCount: e.target.value ? parseInt(e.target.value) : undefined,
                                  })
                                }
                                placeholder="e.g. 128"
                                className={inputCls}
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5">Total squads</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className={labelCls}>Lobby / Groups Division Label (Optional)</label>
                          <input
                            type="text"
                            value={stage.groupsDivision || ''}
                            onChange={(e) => updateStage(sIdx, { groupsDivision: e.target.value })}
                            placeholder="e.g. 3 Groups (A, B, C) — 24 Teams or Single Lobby"
                            className={inputCls}
                          />
                        </div>

                        {/* GROUP DRAW — declares the groups a stage is drawn into, so the
                            public Format tab can show them before any match is played. */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                                Group Draw
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Shown on the public Format tab until this stage&apos;s matches define the groups.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addGroup(sIdx)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Group
                            </button>
                          </div>

                          {(stageMatchGroups[stage.name] || []).length > 0 ? (
                            <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
                              <span>
                                This stage&apos;s matches already carry group names, and those take over on the
                                page. A draw entered here is only used until then.
                              </span>
                            </p>
                          ) : groupCandidates.length === 0 ? (
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                              Add squads on the Squads tab first — the draw is built from them.
                            </p>
                          ) : Object.keys(stageGroups(sIdx)).length === 0 ? (
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                              No groups yet. Add one to publish a draw for this stage.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {Object.entries(stageGroups(sIdx)).map(([groupName, squads]) => (
                                <div
                                  key={groupName}
                                  className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                                >
                                  <div className="flex items-center gap-1.5 border-b border-slate-100 p-2 dark:border-slate-800">
                                    <input
                                      type="text"
                                      defaultValue={groupName}
                                      onBlur={(e) => renameGroup(sIdx, groupName, e.target.value)}
                                      className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold dark:border-slate-700 dark:bg-slate-800"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeGroup(sIdx, groupName)}
                                      title="Remove this group"
                                      className="shrink-0 rounded-md p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {squads.length === 0 ? (
                                      <p className="p-3 text-center text-[10px] font-medium text-slate-400">
                                        No squads in this group yet.
                                      </p>
                                    ) : (
                                      squads.map((squad, sqIdx) =>
                                        squad.source ? (
                                          <div
                                            key={`${candidateKey(squad)}-${sqIdx}`}
                                            className="space-y-1.5 bg-amber-500/5 p-2"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                {pendingSeatLabel(squad.source)}
                                              </span>
                                              <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">
                                                Pending
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => removeSeat(sIdx, groupName, sqIdx)}
                                                title="Remove from this group"
                                                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-white/10"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <select
                                                value={squad.source.stage}
                                                onChange={(e) =>
                                                  updatePendingSource(sIdx, groupName, sqIdx, { stage: e.target.value })
                                                }
                                                title="Stage this place comes out of"
                                                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-800"
                                              >
                                                {stages.map((option) => (
                                                  <option key={option.name} value={option.name}>
                                                    {option.name}
                                                  </option>
                                                ))}
                                              </select>
                                              <select
                                                value={squad.source.group ?? ''}
                                                onChange={(e) =>
                                                  updatePendingSource(sIdx, groupName, sqIdx, {
                                                    group: e.target.value || null,
                                                  })
                                                }
                                                title="Group within that stage"
                                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-800"
                                              >
                                                <option value="">— no group —</option>
                                                {sourceGroupNames(squad.source.stage).map((name) => (
                                                  <option key={name} value={name}>
                                                    {name}
                                                  </option>
                                                ))}
                                              </select>
                                              <input
                                                type="number"
                                                min={1}
                                                value={squad.source.rank}
                                                onChange={(e) =>
                                                  updatePendingSource(sIdx, groupName, sqIdx, {
                                                    rank: Math.max(1, parseInt(e.target.value, 10) || 1),
                                                  })
                                                }
                                                title="Finishing position in that group"
                                                className="w-14 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] dark:border-slate-700 dark:bg-slate-800"
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <div
                                            key={`${candidateKey(squad)}-${sqIdx}`}
                                            className="flex items-center gap-2 p-2"
                                          >
                                            {squad.logoUrl || squad.logoDarkUrl ? (
                                              // eslint-disable-next-line @next/next/no-img-element
                                              <img
                                                src={squad.logoUrl || squad.logoDarkUrl || ''}
                                                alt=""
                                                className="h-5 w-5 shrink-0 rounded border border-slate-200 bg-white object-contain dark:border-slate-700"
                                              />
                                            ) : (
                                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[8px] font-black text-slate-400 dark:bg-white/10">
                                                {(squad.teamName || '?').slice(0, 2).toUpperCase()}
                                              </span>
                                            )}
                                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                              {squad.displayName || squad.teamName || squad.seedLabel}
                                              {squad.tag ? ` (${squad.tag})` : ''}
                                            </span>
                                            {!squad.teamId && (
                                              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400 dark:bg-white/10">
                                                Seat
                                              </span>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => removeSeat(sIdx, groupName, sqIdx)}
                                              title="Remove from this group"
                                              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-white/10"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                        )
                                      )
                                    )}
                                  </div>

                                  <div className="space-y-1.5 p-2">
                                    {availableForStage(sIdx).length === 0 ? (
                                      <p className="text-center text-[10px] font-medium text-slate-400">
                                        Every squad is already placed in this stage.
                                      </p>
                                    ) : (
                                      <select
                                        value=""
                                        onChange={(e) => e.target.value && addSeat(sIdx, groupName, e.target.value)}
                                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-800"
                                      >
                                        <option value="">+ Add squad…</option>
                                        {availableForStage(sIdx).map((candidate) => (
                                          <option key={candidateKey(candidate)} value={candidateKey(candidate)}>
                                            {candidate.displayName || candidate.teamName || candidate.seedLabel}
                                            {candidate.tag ? ` (${candidate.tag})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => addPendingSlot(sIdx, groupName)}
                                      title="A place here that another stage's result will fill"
                                      className="w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                                    >
                                      + Pending slot (decided by another stage)
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={labelCls}>Stage Overview &amp; Format Details (Optional)</label>
                          <textarea
                            rows={2}
                            value={stage.stageDescription || ''}
                            onChange={(e) => updateStage(sIdx, { stageDescription: e.target.value })}
                            placeholder="Explain how matches are played, how squads qualify, and any special stage stipulations..."
                            className={inputCls}
                          />
                        </div>

                        {/* ADVANCEMENT RULES BUILDER WITH PER-GROUP QUALIFICATIONS (Point 3) */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                                Advancement &amp; Elimination Zones (Per Group or Overall)
                              </span>
                              <p className="text-[10px] text-slate-400">
                                If a stage has different qualifications per group (e.g. Group A vs Group B), assign each rule to its respective group.
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => addRule(sIdx, '')}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add General Rule</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => addRule(sIdx, 'Group A')}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Group Rule</span>
                              </button>
                            </div>
                          </div>

                          {(!stage.rules || stage.rules.length === 0) ? (
                            <div className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                              No qualification rules defined yet (optional). Click &quot;Add Rule&quot; to configure cutoffs.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {stage.rules.map((rule, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                                >
                                  {/* Group Target Selector */}
                                  <div className="w-full sm:w-32 shrink-0">
                                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                                      Group Target
                                    </label>
                                    <input
                                      type="text"
                                      list={`group-options-${sIdx}`}
                                      value={rule.groupName || ''}
                                      onChange={(e) => updateRule(sIdx, rIdx, { groupName: e.target.value })}
                                      placeholder="All Groups"
                                      className={inputCls + ' py-1 text-xs'}
                                    />
                                    <datalist id={`group-options-${sIdx}`}>
                                      {detectedGroups.map((g) => (
                                        <option key={g} value={g === 'All Groups' ? '' : g}>
                                          {g}
                                        </option>
                                      ))}
                                    </datalist>
                                  </div>

                                  <div className="w-full sm:w-28 shrink-0">
                                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                                      Rank Cutoff
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.thresholdRank}
                                      onChange={(e) => updateRule(sIdx, rIdx, { thresholdRank: e.target.value })}
                                      placeholder="e.g. 1st – 4th"
                                      className={inputCls + ' py-1'}
                                    />
                                  </div>

                                  <div className="w-full sm:w-28 shrink-0">
                                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                                      Status Tag
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.badgeText}
                                      onChange={(e) => updateRule(sIdx, rIdx, { badgeText: e.target.value })}
                                      placeholder="Qualified"
                                      className={inputCls + ' py-1'}
                                    />
                                  </div>

                                  <div className="w-full sm:w-28 shrink-0">
                                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                                      Badge Color
                                    </label>
                                    <select
                                      value={LEGACY_BADGE_COLOR[rule.badgeVariant || ''] || rule.badgeColor || 'green'}
                                      onChange={(e) =>
                                        updateRule(sIdx, rIdx, { badgeColor: e.target.value, badgeVariant: undefined })
                                      }
                                      className={inputCls + ' py-1'}
                                    >
                                      {ZONE_COLOR_OPTIONS.map((c) => (
                                        <option key={c.key} value={c.key}>
                                          {c.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex-1 min-w-[130px]">
                                    <label className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">
                                      Destination / Next Stage
                                    </label>
                                    <input
                                      type="text"
                                      value={rule.destination}
                                      onChange={(e) => updateRule(sIdx, rIdx, { destination: e.target.value })}
                                      placeholder="e.g. Advance to Semifinals"
                                      className={inputCls + ' py-1'}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => removeRule(sIdx, rIdx)}
                                    className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 shrink-0 self-end mb-1"
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
          )}
        </div>
      )}

      {/* TAB 2: FORMAT HEADER CARDS */}
      {activeTab === 'cards' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Customize the quick-stat format cards shown at the top of the tournament Format page. All fields are optional.
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

                <button
                  type="button"
                  onClick={() => removeTiebreakerTier(tIdx)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors mt-1"
                  title="Remove Tier"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
