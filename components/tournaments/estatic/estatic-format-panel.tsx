'use client';

import React, { useState, useMemo } from 'react';
import {
  ScrollText,
  Layers,
  Award,
  Smartphone,
  Gamepad2,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  FileText,
  Scale,
  Sparkles,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { TournamentScheduleCalendar } from '../tournament-schedule-calendar';
import {
  TournamentStageFormatCard,
  type StageFormatData,
  type StageAdvancementRule,
  type StageGroupSquad,
} from '../tournament-stage-format-card';

interface EstaticFormatPanelProps {
  tournament?: {
    id?: string;
    name?: string;
    slug?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    formatDetails?: any;
    standingsConfig?: any;
    matches?: any[];
    teams?: any[];
  };
  stages: Array<{
    id: string;
    sequence: number;
    name: string;
    stageType?: string | null;
    formatType?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }>;
  matches?: any[];
  teams?: any[];
  standingsConfig?: any;
  pointsMatrix?: Record<string, number>;
  killPoints?: number;
  gameMode?: string | null;
  eventType?: string | null;
  device?: string | null;
  formatDetails?: any;
}

export function EstaticFormatPanel({
  tournament,
  stages,
  matches = [],
  teams = [],
  standingsConfig: propStandingsConfig,
  pointsMatrix = {
    '1': 10,
    '2': 6,
    '3': 5,
    '4': 4,
    '5': 3,
    '6': 2,
    '7': 1,
    '8': 1,
  },
  killPoints = 1,
  gameMode = 'Battle Royale Squads TPP',
  eventType = 'LAN Stage',
  device = 'Official Tournament Device',
  formatDetails: propFormatDetails,
}: EstaticFormatPanelProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const formatDetails = propFormatDetails || tournament?.formatDetails;
  const standingsConfig = propStandingsConfig || tournament?.standingsConfig;
  const tournamentName = tournament?.name || 'Tournament';
  const customOverview = formatDetails?.formatOverview || '';
  const customRules = formatDetails?.rulesAndTiebreakers || '';
  const systemName = formatDetails?.systemName || 'Official Points System';
  const systemDesc = formatDetails?.systemDescription || 'Standard Battle Royale competitive rules.';

  // Format date range string for sharing
  const dateRangeStr = useMemo(() => {
    if (tournament?.startDate && tournament?.endDate) {
      const s = new Date(tournament.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = new Date(tournament.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${s} – ${e}`;
    }
    return '';
  }, [tournament?.startDate, tournament?.endDate]);

  // Lookup map for teams metadata
  const teamMap = useMemo(() => {
    const map = new Map<string, any>();
    const allTeams = teams.length > 0 ? teams : (tournament?.teams || []);
    for (const tt of allTeams) {
      const id = tt.teamId || tt.id;
      map.set(id, tt);
    }
    return map;
  }, [teams, tournament?.teams]);

  // Synthesize full wiki-style format data for each stage
  const synthesizedStages: StageFormatData[] = useMemo(() => {
    const sortedStages = [...stages].sort((a, b) => a.sequence - b.sequence);

    return sortedStages.map((stage, sIdx) => {
      // 1. Matches in this stage
      const stageMatches = matches.filter(
        (m) => (m.stage?.name || m.stageName || '').toLowerCase() === stage.name.toLowerCase()
      );

      // 2. Dates & Schedule
      let dateRange: string | null = null;
      if (stage.startDate && stage.endDate) {
        const s = new Date(stage.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const e = new Date(stage.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        dateRange = `${s} – ${e}`;
      } else if (stageMatches.length > 0) {
        const validDates = stageMatches
          .map((m) => (m.scheduledAt ? new Date(m.scheduledAt).getTime() : 0))
          .filter((t) => t > 0)
          .sort((a, b) => a - b);
        if (validDates.length > 0) {
          const s = new Date(validDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const e = new Date(validDates[validDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          dateRange = s === e ? s : `${s} – ${e}`;
        }
      }

      // Matchdays count
      const matchDayDates = new Set(
        stageMatches
          .map((m) => (m.scheduledAt ? new Date(m.scheduledAt).toISOString().split('T')[0] : null))
          .filter(Boolean)
      );
      const matchdaysCount = matchDayDates.size > 0 ? matchDayDates.size : undefined;

      // 3. Groups & Participating Squads
      const groups: Record<string, StageGroupSquad[]> = {};
      const stageTeamIds = new Set<string>();

      // Extract squads from matches
      for (const m of stageMatches) {
        const grp = m.groupName ? m.groupName.trim() : null;
        const results = m.games ? m.games.flatMap((g: any) => g.teamResults || []) : [];
        for (const tr of results) {
          if (!tr.teamId) continue;
          stageTeamIds.add(tr.teamId);

          if (grp) {
            const formattedGrp = grp.length === 1 ? `Group ${grp}` : grp;
            if (!groups[formattedGrp]) groups[formattedGrp] = [];
            if (!groups[formattedGrp].some((sq) => sq.teamId === tr.teamId)) {
              const meta = teamMap.get(tr.teamId);
              const tObj = meta?.team || meta;
              const roster = Array.isArray(meta?.rosterJson) ? meta.rosterJson : [];

              groups[formattedGrp].push({
                teamId: tr.teamId,
                teamName: tObj?.displayName || tObj?.name || meta?.name || 'Squad',
                displayName: tObj?.displayName || null,
                tag: tObj?.tag || meta?.tag || null,
                slug: tObj?.slug || meta?.slug || null,
                logoUrl: tObj?.logoUrl || meta?.logoUrl || null,
                logoDarkUrl: tObj?.imageDarkUrl || meta?.logoDarkUrl || null,
                seedLabel: meta?.seedLabel || (meta?.seed ? `Seed #${meta.seed}` : null),
                seed: meta?.seed ?? null,
                country: tObj?.region || meta?.country || null,
                roster: roster.map((p: any) => ({
                  ign: p.ign || 'Player',
                  role: p.role || null,
                  captain: Boolean(p.captain || p.isCaptain),
                  slug: p.slug || null,
                  playerId: p.playerId || null,
                })),
              });
            }
          }
        }
      }

      // If stage has no groups from matches, check if tournament teams can be listed as Single Lobby
      const groupKeys = Object.keys(groups);
      const distinctGroupCount = groupKeys.length;
      let groupsDivision: string | null = null;
      if (distinctGroupCount > 1) {
        const avgSquads = Math.round(stageTeamIds.size / distinctGroupCount);
        groupsDivision = `${distinctGroupCount} Groups of ${avgSquads || 16} Teams`;
      } else if (stageTeamIds.size > 0) {
        groupsDivision = `Single Lobby (${stageTeamIds.size} Teams)`;
      }

      // Sort squads inside each group alphabetically by name
      for (const k of Object.keys(groups)) {
        groups[k].sort((a, b) => a.teamName.localeCompare(b.teamName));
      }

      // 4. Synthesize Rules from standingsConfig (tabGroups & customTabs)
      const rules: StageAdvancementRule[] = [];

      // Check tabGroups in standingsConfig
      if (standingsConfig?.tabGroups) {
        for (const grp of standingsConfig.tabGroups) {
          for (const item of grp.items || []) {
            const isMatch =
              (item.stageName || '').toLowerCase() === stage.name.toLowerCase() ||
              (item.label || '').toLowerCase() === stage.name.toLowerCase();

            if (isMatch) {
              // Group-specific zones (e.g. Round 4 with A, B, C, D)
              if (item.groupZones && typeof item.groupZones === 'object') {
                for (const [gKey, zList] of Object.entries(item.groupZones as Record<string, any[]>)) {
                  for (const z of zList || []) {
                    const target = z.targetStageName || z.label || 'Next Stage';
                    const isElim = (z.label || '').toLowerCase().includes('elim');
                    rules.push({
                      groupName: `Group ${gKey}`,
                      rankRange: `${z.from}${getOrdinal(z.from)} - ${z.to}${getOrdinal(z.to)}`,
                      targetStageName: target,
                      badgeColor: isElim ? 'red' : (z.color || 'green'),
                      description: isElim
                        ? `Teams placed ${z.from}–${z.to} are eliminated`
                        : `Top ${z.to - z.from + 1} teams advance to ${target}`,
                    });
                  }
                }
              }

              // Standard zones
              if (item.zones && Array.isArray(item.zones)) {
                for (const z of item.zones) {
                  const target = z.targetStageName || z.label || 'Next Stage';
                  const isElim = (z.label || '').toLowerCase().includes('elim');
                  rules.push({
                    rankRange: `${z.from}${getOrdinal(z.from)} - ${z.to}${getOrdinal(z.to)}`,
                    targetStageName: target,
                    badgeColor: isElim ? 'red' : (z.color || 'green'),
                    description: isElim
                      ? `Teams placed ${z.from}–${z.to} are eliminated`
                      : `Top ${z.to - z.from + 1} teams advance to ${target}`,
                  });
                }
              }
            }
          }
        }
      }

      // Check customTabs in standingsConfig
      if (rules.length === 0 && standingsConfig?.customTabs) {
        for (const tab of standingsConfig.customTabs) {
          const isMatch =
            (tab.label || '').toLowerCase() === stage.name.toLowerCase() ||
            (tab.includeStages || []).some((s: string) => s.toLowerCase() === stage.name.toLowerCase());
          if (isMatch && tab.zones && Array.isArray(tab.zones)) {
            for (const z of tab.zones) {
              const target = z.targetStageName || z.label || 'Next Stage';
              const isElim = (z.label || '').toLowerCase().includes('elim');
              rules.push({
                rankRange: `${z.from}${getOrdinal(z.from)} - ${z.to}${getOrdinal(z.to)}`,
                targetStageName: target,
                badgeColor: isElim ? 'red' : (z.color || 'green'),
                description: isElim
                  ? `Teams placed ${z.from}–${z.to} are eliminated`
                  : `Top ${z.to - z.from + 1} teams advance to ${target}`,
              });
            }
          }
        }
      }

      // Default fallback rule if Grand Finals or final stage
      if (rules.length === 0) {
        const isFinals =
          stage.name.toLowerCase().includes('grand final') ||
          stage.name.toLowerCase() === 'finals' ||
          sIdx === sortedStages.length - 1;

        if (isFinals) {
          rules.push(
            {
              rankRange: '1st Place',
              targetStageName: 'Tournament Champions 🏆',
              badgeColor: 'amber',
              description: 'Winner crowned official tournament champion and claims maximum prize share',
            },
            {
              rankRange: '2nd - 3rd',
              targetStageName: 'Podium Finishers 🥈🥉',
              badgeColor: 'blue',
              description: 'Runners-up secure official podium placements and regional circuit points',
            }
          );
        } else {
          // General progression fallback
          const nextStage = sortedStages[sIdx + 1];
          if (nextStage) {
            rules.push({
              rankRange: 'Advancing Ranks',
              targetStageName: nextStage.name,
              badgeColor: 'green',
              description: `Top ranked squads qualify and punch their ticket to ${nextStage.name}`,
            });
          }
        }
      }

      // Check formatDetails custom stage override if any
      const customStage = formatDetails?.stageFormats?.[stage.id];

      return {
        stageId: stage.id,
        sequence: stage.sequence || sIdx + 1,
        name: stage.name,
        stageType: stage.stageType || stage.formatType || 'Official Stage',
        formatType: stage.formatType || null,
        dateRange: customStage?.dates || dateRange,
        matchdaysCount: customStage?.matchdaysCount || matchdaysCount,
        totalMatches: customStage?.matchCount || (stageMatches.length > 0 ? stageMatches.length : undefined),
        teamsCount: customStage?.teamsCount || (stageTeamIds.size > 0 ? stageTeamIds.size : undefined),
        groupsDivision: customStage?.groupsDivision || groupsDivision,
        description: customStage?.stageDescription || null,
        rules: customStage?.rules?.length > 0 ? customStage.rules : rules,
        groups,
      };
    });
  }, [stages, matches, teamMap, standingsConfig, formatDetails]);

  // Copy full summary to clipboard
  const handleCopySummary = () => {
    const stageSummary = synthesizedStages
      .map((s) => `  ${s.sequence}. ${s.name} (${s.stageType || 'Official Stage'})${s.totalMatches ? ` — ${s.totalMatches} matches` : ''}${s.groupsDivision ? ` · ${s.groupsDivision}` : ''}`)
      .join('\n');

    const topPoints = Object.entries(pointsMatrix)
      .slice(0, 8)
      .map(([rank, pts]) => `#${rank}: ${pts}pts`)
      .join(' | ');

    const text = `📋 ${tournamentName} — FORMAT & RULES\n${dateRangeStr ? `📅 Duration: ${dateRangeStr}\n` : ''}🎮 Mode: ${gameMode}\n⚔️ Elimination: +${killPoints} pt/kill\n🏆 Scoring: ${systemName}\n${topPoints}\n\nSTAGES ARCHITECTURE:\n${stageSummary}\n\n${customOverview ? `OVERVIEW:\n${customOverview}\n\n` : ''}Full tournament hub & live standings:\n${typeof window !== 'undefined' ? window.location.href : ''}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2200);
    }
  };

  // Copy direct share link
  const handleShareLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] + '#format' : '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0b1220]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0A5FC4] dark:bg-blue-950/60 dark:text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Official Tournament Architecture &amp; Rulebook
            </h4>
            <p className="text-[11px] font-semibold text-slate-400">
              Verified stages, qualification criteria, group divisions &amp; scoring distribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="Copy formatted text summary for WhatsApp, Discord, or Twitter"
          >
            {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
            <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A5FC4] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 dark:bg-blue-600 cursor-pointer"
            title="Copy shareable link directly to Format tab"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-white" /> : <Share2 className="h-3.5 w-3.5 text-white" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Format'}</span>
          </button>
        </div>
      </div>

      {/* Format Header Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Competition Mode
            </span>
            <Gamepad2 className="h-4 w-4 text-[#0A5FC4]" />
          </div>
          <h4 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            {gameMode}
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-400">Standard 16-Team Competitive Lobby</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Elimination Reward
            </span>
            <Award className="h-4 w-4 text-[#0A5FC4]" />
          </div>
          <h4 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            +{killPoints} Point per Kill
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-400">{systemName}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Tournament Environment
            </span>
            <Smartphone className="h-4 w-4 text-[#0A5FC4]" />
          </div>
          <h4 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
            {eventType}
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-400">{device}</p>
        </div>
      </div>

      {/* TOURNAMENT SCHEDULE CALENDAR WIDGET */}
      <section>
        <TournamentScheduleCalendar
          tournamentName={tournamentName}
          tournamentSlug={tournament?.slug}
          dateRangeText={dateRangeStr}
          stages={stages}
          matches={matches}
          formatDetails={formatDetails}
        />
      </section>

      {/* Editorial Overview & Progression Narrative */}
      {customOverview && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#0A5FC4] dark:text-blue-400" />
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
              Format Synopsis &amp; Progression Narrative
            </h3>
          </div>
          <div className="whitespace-pre-line text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
            {customOverview}
          </div>
        </section>
      )}

      {/* ── FULL-BLOWN STAGE PROGRESSION & GROUP DRAW SECTION ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
              Stage Architecture &amp; Group Draw
            </p>
            <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
              <Layers className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
              Tournament Stages &amp; Group Divisions ({synthesizedStages.length} Stages)
            </h3>
          </div>
        </div>

        {/* List of Full Stage Format Cards */}
        <div className="space-y-6">
          {synthesizedStages.map((stageItem) => (
            <TournamentStageFormatCard
              key={stageItem.stageId}
              stage={stageItem}
              initiallyExpanded={true}
            />
          ))}
        </div>
      </section>

      {/* Scoring Matrix Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Points Table Rule
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
            <ScrollText className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
            Official Placement Points Matrix ({systemName})
          </h3>
          {systemDesc && (
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {systemDesc}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Object.entries(pointsMatrix).map(([rank, pts]) => (
            <div
              key={rank}
              className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center ${
                rank === '1'
                  ? 'border-amber-400/50 bg-amber-50/70 dark:border-amber-400/30 dark:bg-amber-950/20'
                  : 'border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/5'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {rank === '1' ? '🥇 1st Place' : `#${rank} Place`}
              </span>
              <span className="mt-1 text-2xl font-black text-[#0A5FC4] dark:text-blue-300">
                {pts}
              </span>
              <span className="mt-0.5 text-[9px] font-bold uppercase text-slate-400">
                {pts === 1 ? 'Point' : 'Points'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Official Tiebreaker Protocol */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <Scale className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
            Official Tiebreaker Hierarchy
          </h3>
        </div>

        {customRules ? (
          <div className="whitespace-pre-line text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-300">
            {customRules}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase text-[#0A5FC4] dark:text-blue-300">
                Tier 1
              </span>
              <h5 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                Total Placement Points
              </h5>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Higher placement points accumulated across all completed lobby matches.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase text-[#0A5FC4] dark:text-blue-300">
                Tier 2
              </span>
              <h5 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                Total Chicken Dinners (WWCD)
              </h5>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Total number of 1st-place match victories achieved.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase text-[#0A5FC4] dark:text-blue-300">
                Tier 3
              </span>
              <h5 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                Total Elimination Points
              </h5>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Highest fragging and total kills across all scheduled fixtures.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
              <span className="text-[10px] font-black uppercase text-[#0A5FC4] dark:text-blue-300">
                Tier 4
              </span>
              <h5 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                Placement in Final Match
              </h5>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Better finishing rank in the very last match contested between the squads.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
