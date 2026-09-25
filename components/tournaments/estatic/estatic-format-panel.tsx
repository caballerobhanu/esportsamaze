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
import { pendingSeatLabel, resolvePendingTeamId } from '@/lib/stage-groups';

/** The shape of a roster entry as an editor writes it, before normalisation. */
interface RosterEntryLike {
  ign?: string | null;
  role?: string | null;
  captain?: boolean;
  isCaptain?: boolean;
  slug?: string | null;
  playerId?: string | null;
}

/** The team metadata the panel resolves a seat against — team row first, slot second. */
interface TeamMetaLike {
  team?: {
    name?: string | null;
    displayName?: string | null;
    tag?: string | null;
    slug?: string | null;
    logoUrl?: string | null;
    imageDarkUrl?: string | null;
    region?: string | null;
  } | null;
  name?: string | null;
  tag?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  country?: string | null;
  rosterJson?: unknown;
}

/**
 * Refreshes a declared seat from the current team record, so a team renamed or re-logoed
 * after the draw was published does not stay stale on the page. A seat with no team keeps
 * exactly what the draw recorded — it is a place in the field, not a competitor.
 *
 * A pending slot is the other case: it has no team of its own, only a source. Once that
 * source stage has been played it resolves to whoever finished in that position, and the
 * provenance becomes the row's second line ("Team X" over "Group A #1").
 */
function resolveDeclaredSquad(
  squad: StageGroupSquad,
  teamMap: Map<string, TeamMetaLike>,
  groupRankings: Record<string, string[]>
): StageGroupSquad {
  if (squad?.source && !squad.teamId) {
    const label = pendingSeatLabel(squad.source);
    const resolvedTeamId = resolvePendingTeamId(squad.source, groupRankings);
    const meta = resolvedTeamId ? teamMap.get(resolvedTeamId) : undefined;

    if (!resolvedTeamId || !meta) return { ...squad, teamName: label, seedLabel: null };

    const team = meta.team || null;
    const resolved: StageGroupSquad = {
      ...squad,
      teamName: team?.displayName || team?.name || meta.name || label,
      displayName: team?.displayName || null,
      tag: team?.tag || meta.tag || null,
      slug: team?.slug || meta.slug || null,
      logoUrl: team?.logoUrl || meta.logoUrl || null,
      logoDarkUrl: team?.imageDarkUrl || meta.logoDarkUrl || null,
      seedLabel: label,
    };

    // Without a slug there is no team page, and claiming a teamId would render a link to
    // /teams/<label> that 404s. Keep the resolved name, drop the link.
    return resolved.slug ? { ...resolved, teamId: resolvedTeamId } : resolved;
  }

  if (!squad?.teamId) return squad;

  const meta = teamMap.get(squad.teamId);
  if (!meta) return squad;

  const team = meta.team || null;
  const roster = (Array.isArray(meta.rosterJson) ? meta.rosterJson : squad.roster ?? []) as RosterEntryLike[];

  return {
    ...squad,
    teamName: team?.displayName || team?.name || meta.name || squad.teamName,
    displayName: team?.displayName || squad.displayName || null,
    tag: team?.tag || meta.tag || squad.tag || null,
    slug: team?.slug || meta.slug || squad.slug || null,
    logoUrl: team?.logoUrl || meta.logoUrl || squad.logoUrl || null,
    logoDarkUrl: team?.imageDarkUrl || meta.logoDarkUrl || squad.logoDarkUrl || null,
    country: team?.region || meta.country || squad.country || null,
    roster: roster.map((p) => ({
      ign: p.ign || 'Player',
      role: p.role || null,
      captain: Boolean(p.captain || p.isCaptain),
      slug: p.slug || null,
      playerId: p.playerId || null,
    })),
  };
}

interface EstaticFormatPanelProps {
  tournament?: {
    id?: string;
    name?: string;
    slug?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    formatDetails?: any;
    standingsConfig?: any;
    game?: { slug: string | null } | null;
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
  /** Finishing order per stage and group, for resolving pending seats. */
  groupRankings?: Record<string, string[]>;
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
  groupRankings = {},
}: EstaticFormatPanelProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'TABS'>('LIST');
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [activeStageId, setActiveStageId] = useState<string>('');

  const formatDetails = propFormatDetails || tournament?.formatDetails;
  const standingsConfig = propStandingsConfig || tournament?.standingsConfig;
  const tournamentName = tournament?.name || 'Tournament';
  const customOverview = formatDetails?.formatOverview || '';
  const customRules = formatDetails?.rulesAndTiebreakers || '';
  const systemName = formatDetails?.systemName || '';
  const systemDesc = formatDetails?.systemDescription || '';

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
    let rawStages = stages;
    if (rawStages.length === 0 && formatDetails?.stages && Array.isArray(formatDetails.stages)) {
      rawStages = formatDetails.stages;
    } else if (rawStages.length === 0 && formatDetails?.stageFormats && typeof formatDetails.stageFormats === 'object') {
      rawStages = Object.entries(formatDetails.stageFormats).map(([key, sf]: [string, any], idx) => ({
        id: sf.id || key,
        sequence: sf.sequence || idx + 1,
        name: sf.name || key,
        stageType: sf.stageType || 'Official Stage',
        formatType: sf.formatType || null,
        startDate: sf.startDate || null,
        endDate: sf.endDate || null,
      }));
    }

    const sortedStages = [...rawStages].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

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
      // A declared stage is measured in slots, not teams: a pending slot holds a place even
      // though nobody has taken it yet.
      let declaredSlots = 0;

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

      // Check formatDetails custom stage override if any
      const customStage = formatDetails?.stageFormats?.[stage.id] || formatDetails?.stageFormats?.[stage.name];

      // The admin's declared draw, for a stage that has not been played yet. Matches win
      // once they exist, so this only fills a stage whose matches define no groups.
      if (Object.keys(groups).length === 0 && customStage?.groups && typeof customStage.groups === 'object') {
        for (const [groupName, declared] of Object.entries(customStage.groups as Record<string, StageGroupSquad[]>)) {
          const squads = (Array.isArray(declared) ? declared : []).map((squad) =>
            resolveDeclaredSquad(squad, teamMap, groupRankings)
          );
          if (squads.length === 0) continue;

          groups[groupName] = squads;
          // A declared entry is a slot in the stage whether or not its team is known yet,
          // including a pending slot waiting on another stage's result.
          declaredSlots += squads.length;
        }
      }

      // If stage has no groups from matches, check if tournament teams can be listed as Single Lobby
      const groupKeys = Object.keys(groups);
      const distinctGroupCount = groupKeys.length;
      const stageSlotCount = declaredSlots > 0 ? declaredSlots : stageTeamIds.size;
      let groupsDivision: string | null = null;
      if (distinctGroupCount > 1) {
        const avgSquads = Math.round(stageSlotCount / distinctGroupCount);
        groupsDivision = `${distinctGroupCount} Groups of ${avgSquads || 16} Teams`;
      } else if (stageSlotCount > 0) {
        groupsDivision = `Single Lobby (${stageSlotCount} Teams)`;
      }

      // Sort squads inside each group alphabetically by name. A declared draw is left in the
      // order it was published — that order is the admin's intent, and sorting would scatter
      // pending slots through the teams.
      if (declaredSlots === 0) {
        for (const k of Object.keys(groups)) {
          groups[k].sort((a, b) => a.teamName.localeCompare(b.teamName));
        }
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

      return {
        stageId: stage.id,
        sequence: stage.sequence || sIdx + 1,
        name: stage.name,
        stageType: stage.stageType || stage.formatType || customStage?.stageType || 'Official Stage',
        formatType: stage.formatType || customStage?.formatType || null,
        startDate: (stage as any).startDate || customStage?.startDate || null,
        endDate: (stage as any).endDate || customStage?.endDate || null,
        dateRange:
          customStage?.dates ||
          customStage?.dateRange ||
          (customStage?.startDate && customStage?.endDate
            ? `${new Date(customStage.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(customStage.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : null) ||
          dateRange,
        matchdaysCount: customStage?.matchdaysCount || matchdaysCount,
        totalMatches: customStage?.totalMatches || customStage?.matchCount || (stageMatches.length > 0 ? stageMatches.length : undefined),
        matchesPerGroup: customStage?.matchesPerGroup ? Number(customStage.matchesPerGroup) : undefined,
        matchesPerTeam: customStage?.matchesPerTeam ? Number(customStage.matchesPerTeam) : undefined,
        teamsCount: customStage?.teamsCount || (stageSlotCount > 0 ? stageSlotCount : undefined),
        groupsDivision: customStage?.groupsDivision || groupsDivision,
        description: customStage?.stageDescription || customStage?.description || null,
        rules: customStage?.rules?.length > 0
          ? customStage.rules.map((r: any) => ({
              rankRange: r.rankRange || r.thresholdRank || '',
              targetStageName: r.targetStageName || r.destination || '',
              badgeColor:
                r.badgeColor ||
                (r.badgeVariant === 'danger'
                  ? 'red'
                  : r.badgeVariant === 'warning'
                  ? 'amber'
                  : r.badgeVariant === 'info'
                  ? 'blue'
                  : 'green'),
              description: r.description || (r.badgeText ? `${r.badgeText}: ${r.destination || ''}` : ''),
              groupName: r.groupName || undefined,
            }))
          : rules,
        groups,
      };
    });
  }, [stages, matches, teamMap, standingsConfig, formatDetails, groupRankings]);

  // Set default active tab
  React.useEffect(() => {
    if (synthesizedStages.length > 0 && !activeStageId) {
      setActiveStageId(synthesizedStages[0].stageId);
    }
  }, [synthesizedStages, activeStageId]);

  // Copy full summary to clipboard
  const handleCopySummary = () => {
    const stageSummary = synthesizedStages
      .map((s) => `  ${s.sequence}. ${s.name} (${s.stageType || 'Official Stage'})${s.totalMatches ? ` — ${s.totalMatches} matches` : ''}${s.groupsDivision ? ` · ${s.groupsDivision}` : ''}`)
      .join('\n');

    const topPoints = Object.entries(pointsMatrix)
      .slice(0, 8)
      .map(([r, p]) => `#${r}: ${p}pts`)
      .join(', ');

    const text = `🏆 ${tournamentName} — Official Format Summary
📅 Schedule: ${dateRangeStr || 'TBD'}
🎮 Game Mode: ${gameMode}
⚔️ Elimination Value: +${killPoints} Point per Kill
🎯 Points Matrix: ${topPoints}

📋 Tournament Stages:
${stageSummary}

🔗 Full rules and group draws: ${typeof window !== 'undefined' ? window.location.href : ''}`;

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

  // Dynamic header cards
  const headerCards = useMemo(() => {
    if (Array.isArray(formatDetails?.headerCards) && formatDetails.headerCards.length > 0) {
      return formatDetails.headerCards.filter((c: any) => c.enabled !== false);
    }
    return [
      {
        id: 'competition-mode',
        label: 'Competition Mode',
        value: gameMode,
        subtitle: 'Standard 16-Team Competitive Lobby',
        icon: 'gamepad',
        enabled: true,
      },
      {
        id: 'elimination-reward',
        label: 'Elimination Reward',
        value: `+${killPoints} Point per Kill`,
        subtitle: systemName || undefined,
        icon: 'award',
        enabled: true,
      },
      {
        id: 'tournament-environment',
        label: 'Tournament Environment',
        value: eventType || 'LAN',
        subtitle: device || undefined,
        icon: 'smartphone',
        enabled: true,
      },
    ].filter((c) => Boolean(c.value));
  }, [formatDetails?.headerCards, gameMode, killPoints, systemName, eventType, device]);

  // Tiebreaker tiers
  const tiebreakerTiers = useMemo(() => {
    if (Array.isArray(formatDetails?.tiebreakerTiers) && formatDetails.tiebreakerTiers.length > 0) {
      return formatDetails.tiebreakerTiers;
    }
    return [
      {
        tier: 1,
        title: 'Total Placement Points',
        description: 'Higher placement points accumulated across all completed lobby matches.',
      },
      {
        tier: 2,
        title: 'Total Chicken Dinners (WWCD)',
        description: 'Total number of 1st-place match victories achieved.',
      },
      {
        tier: 3,
        title: 'Total Elimination Points',
        description: 'Highest fragging and total kills across all scheduled fixtures.',
      },
      {
        tier: 4,
        title: 'Placement in Final Match',
        description: 'Better finishing rank in the very last match contested between the squads.',
      },
    ];
  }, [formatDetails?.tiebreakerTiers]);

  return (
    <div className="space-y-8">

      {/* Format Header Cards Grid */}
      {headerCards.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 ${headerCards.length === 1 ? 'sm:grid-cols-1' : headerCards.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {headerCards.map((card: any, idx: number) => (
            <div
              key={card.id || idx}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                  {card.label}
                </span>
                {card.icon === 'award' ? (
                  <Award className="h-4 w-4 text-[#0A5FC4]" />
                ) : card.icon === 'smartphone' ? (
                  <Smartphone className="h-4 w-4 text-[#0A5FC4]" />
                ) : (
                  <Gamepad2 className="h-4 w-4 text-[#0A5FC4]" />
                )}
              </div>
              <h4 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                {card.value}
              </h4>
              {card.subtitle && (
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {card.subtitle}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TOURNAMENT SCHEDULE CALENDAR WIDGET */}
      {formatDetails?.showCalendarWidget !== false && (
        <section>
          <TournamentScheduleCalendar
            tournamentName={tournamentName}
            tournamentSlug={tournament?.slug}
            gameSlug={tournament?.game?.slug ?? undefined}
            dateRangeText={dateRangeStr}
            stages={synthesizedStages.map((s) => ({
              id: s.stageId,
              name: s.name,
              sequence: s.sequence,
              startDate: s.startDate,
              endDate: s.endDate,
            }))}
            matches={matches}
            formatDetails={formatDetails}
          />
        </section>
      )}

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

          <div className="flex items-center gap-2">
            {/* Expand / Collapse All (available in List View) */}
            {viewMode === 'LIST' && (
              <button
                type="button"
                onClick={() => setAllExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}

            {/* List View vs. Tabs View Switcher */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-white dark:bg-slate-800 text-[#0A5FC4] dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABS')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  viewMode === 'TABS'
                    ? 'bg-white dark:bg-slate-800 text-[#0A5FC4] dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Tabs View
              </button>
            </div>
          </div>
        </div>

        {/* In Tabs View: Horizontal Stage Selection Ribbon */}
        {viewMode === 'TABS' && synthesizedStages.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-white/10">
            {synthesizedStages.map((stageItem) => {
              const isActive = (activeStageId || synthesizedStages[0].stageId) === stageItem.stageId;
              return (
                <button
                  key={stageItem.stageId}
                  type="button"
                  onClick={() => setActiveStageId(stageItem.stageId)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border cursor-pointer ${
                    isActive
                      ? 'bg-[#0A5FC4] text-white border-[#0A5FC4] shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-white/10 dark:hover:bg-slate-800'
                  }`}
                >
                  {stageItem.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Stage Content */}
        {synthesizedStages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-[#0A5FC4] dark:text-blue-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black uppercase text-slate-900 dark:text-white">
              Stage Architecture &amp; Format To Be Announced
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              The official competitive structure, group draw, and qualification progression for this tournament will be announced closer to the event schedule.
            </p>
          </div>
        ) : viewMode === 'LIST' ? (
          <div className="space-y-6">
            {synthesizedStages.map((stageItem) => (
              <TournamentStageFormatCard
                key={stageItem.stageId}
                stage={stageItem}
                forceExpanded={allExpanded}
              />
            ))}
          </div>
        ) : (
          <div>
            {(() => {
              const activeStage =
                synthesizedStages.find((s) => s.stageId === (activeStageId || synthesizedStages[0]?.stageId)) ||
                synthesizedStages[0];
              if (!activeStage) return null;
              return (
                <TournamentStageFormatCard
                  key={activeStage.stageId}
                  stage={activeStage}
                  initiallyExpanded={true}
                />
              );
            })()}
          </div>
        )}
      </section>

      {/* Scoring Matrix Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Points Table Rule
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
            <ScrollText className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
            {systemName || 'Official Placement Points Matrix'}
          </h3>
          {systemDesc && systemDesc.trim().length > 0 && (
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
            {tiebreakerTiers.map((t: any, idx: number) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <span className="text-[10px] font-black uppercase text-[#0A5FC4] dark:text-blue-300">
                  Tier {t.tier ?? idx + 1}
                </span>
                <h5 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {t.title}
                </h5>
                {t.description && (
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {t.description}
                  </p>
                )}
              </div>
            ))}
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
