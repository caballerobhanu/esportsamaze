'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Swords,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Crown,
  ChevronDown,
  ChevronUp,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { ThemeLogo } from './estatic/theme-logo';

export interface StageAdvancementRule {
  rankRange: string; // e.g. "1st - 8th"
  targetStageName: string; // e.g. "Grand Finals"
  badgeColor?: 'green' | 'blue' | 'teal' | 'amber' | 'red' | string;
  description?: string; // e.g. "Top 8 teams advance to Grand Finals"
  groupName?: string; // e.g. "Group A"
}

export interface StageGroupSquad {
  teamId: string;
  teamName: string;
  displayName?: string | null;
  tag?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  seedLabel?: string | null;
  seed?: number | null;
  country?: string | null;
  roster?: Array<{
    ign: string;
    role?: string | null;
    captain?: boolean;
    slug?: string | null;
    playerId?: string | null;
  }>;
}

export interface StageFormatData {
  stageId: string;
  sequence: number;
  name: string;
  stageType?: string | null;
  formatType?: string | null;
  dateRange?: string | null;
  matchdaysCount?: number;
  totalMatches?: number;
  teamsCount?: number;
  groupsDivision?: string | null; // e.g. "4 Groups of 16 Teams"
  description?: string | null;
  rules: StageAdvancementRule[];
  groups: Record<string, StageGroupSquad[]>;
}

interface TournamentStageFormatCardProps {
  stage: StageFormatData;
  initiallyExpanded?: boolean;
}

export function TournamentStageFormatCard({
  stage,
  initiallyExpanded = true,
}: TournamentStageFormatCardProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const groupKeys = useMemo(() => Object.keys(stage.groups).sort(), [stage.groups]);
  const hasGroups = groupKeys.length > 0;
  const [activeGroupTab, setActiveGroupTab] = useState<string>('ALL');

  const visibleGroups = useMemo(() => {
    if (activeGroupTab === 'ALL') {
      return groupKeys.map((k) => ({ groupName: k, squads: stage.groups[k] }));
    }
    return [{ groupName: activeGroupTab, squads: stage.groups[activeGroupTab] || [] }];
  }, [groupKeys, activeGroupTab, stage.groups]);

  // Group rules by groupName (if rules are group-specific) or 'Overall'
  const rulesByGroup = useMemo(() => {
    const map = new Map<string, StageAdvancementRule[]>();
    for (const r of stage.rules) {
      const g = r.groupName || 'Stage Rules';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return Array.from(map.entries()).map(([grp, rules]) => ({ group: grp, rules }));
  }, [stage.rules]);

  // Color mapper for Liquipedia badges
  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'green':
      case 'emerald':
        return {
          pill: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          card: 'border-emerald-500/30 bg-emerald-500/5',
        };
      case 'blue':
        return {
          pill: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
          card: 'border-blue-500/30 bg-blue-500/5',
        };
      case 'teal':
      case 'cyan':
        return {
          pill: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
          dot: 'bg-cyan-500',
          card: 'border-cyan-500/30 bg-cyan-500/5',
        };
      case 'amber':
      case 'yellow':
        return {
          pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          card: 'border-amber-500/30 bg-amber-500/5',
        };
      case 'red':
      case 'rose':
        return {
          pill: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
          card: 'border-rose-500/30 bg-rose-500/5',
        };
      default:
        return {
          pill: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
          dot: 'bg-slate-400',
          card: 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5',
        };
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-[#0b1220]">
      {/* ── CARD MASTHEAD ── */}
      <div className="border-b border-slate-100 p-6 dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#0A5FC4] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Stage #{stage.sequence}
              </span>
              {stage.stageType && (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {stage.stageType}
                </span>
              )}
              {stage.dateRange && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-[#0A5FC4]" />
                  {stage.dateRange}
                </span>
              )}
            </div>

            <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
              {stage.name}
            </h3>

            {stage.description && (
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                {stage.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 transition-all cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Collapse Stage</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>View Full Stage Format</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── METRIC RIBBON ── */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0A5FC4] dark:bg-blue-950/50 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Squads
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {stage.teamsCount ? `${stage.teamsCount} Teams` : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Group Division
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white truncate block max-w-[160px]">
                {stage.groupsDivision || (hasGroups ? `${groupKeys.length} Groups` : 'Single Lobby')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Swords className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Matches
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {stage.totalMatches ? `${stage.totalMatches} Matches` : 'TBD'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Schedule
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {stage.matchdaysCount ? `${stage.matchdaysCount} Matchdays` : 'Official Phase'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── EXPANDED BODY: ADVANCEMENT RULES + GROUP DRAW ── */}
      {isExpanded && (
        <div className="space-y-6 p-6">
          {/* ── ADVANCEMENT & ELIMINATION PROTOCOL (LIQUEPEDIA STYLE) ── */}
          {stage.rules.length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-[#0A5FC4]" />
                Advancement &amp; Elimination Protocol
              </h4>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rulesByGroup.map(({ group, rules }) => (
                  <div
                    key={group}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-3 dark:border-white/10">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-white">
                        {group}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {rules.length} {rules.length === 1 ? 'Rule' : 'Rules'}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {rules.map((r, rIdx) => {
                        const style = getBadgeStyle(r.badgeColor);
                        return (
                          <div
                            key={rIdx}
                            className={`flex items-start gap-2.5 rounded-xl border p-2.5 transition-colors ${style.card}`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style.pill}`}
                                >
                                  {r.rankRange}
                                </span>
                                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {r.targetStageName}
                                </span>
                              </div>
                              {r.description && (
                                <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  {r.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INTERACTIVE GROUP DRAW (ROSTER CARDS) ── */}
          {hasGroups && (
            <div className="border-t border-slate-100 pt-6 dark:border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    Stage Group Draw &amp; Squad Rosters
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Squads drafted and competing in {stage.name}
                  </p>
                </div>

                {/* Group Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveGroupTab('ALL')}
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                      activeGroupTab === 'ALL'
                        ? 'bg-[#0A5FC4] text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                    }`}
                  >
                    All Groups ({groupKeys.length})
                  </button>

                  {groupKeys.map((grpKey) => (
                    <button
                      key={grpKey}
                      type="button"
                      onClick={() => setActiveGroupTab(grpKey)}
                      className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                        activeGroupTab === grpKey
                          ? 'bg-[#0A5FC4] text-white shadow-xs'
                          : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                      }`}
                    >
                      {grpKey.replace(/^group\s*/i, 'Group ')} ({stage.groups[grpKey]?.length || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Cards Grid */}
              <div
                className={`grid gap-4 ${
                  visibleGroups.length === 1
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {visibleGroups.map(({ groupName, squads }) => (
                  <div
                    key={groupName}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-white/10 dark:bg-white/5"
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/70 px-4 py-3 dark:border-white/10 dark:bg-white/10">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0A5FC4] text-[11px] font-black text-white">
                          {groupName.replace(/^group\s*/i, '').charAt(0)}
                        </span>
                        <h5 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                          {groupName.replace(/^group\s*/i, 'Group ')}
                        </h5>
                      </div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {squads.length} Squads
                      </span>
                    </div>

                    {/* Squad List */}
                    <div className="divide-y divide-slate-100 p-2 dark:divide-white/5">
                      {squads.length === 0 ? (
                        <p className="p-4 text-center text-xs font-medium text-slate-400">
                          Squad draw pending.
                        </p>
                      ) : (
                        squads.map((squad, sIdx) => {
                          const teamUrl = squad.slug ? `/teams/${squad.slug}` : `/teams/${squad.teamId}`;
                          const roster = squad.roster || [];

                          return (
                            <div
                              key={squad.teamId || sIdx}
                              className="group/item flex flex-col gap-1.5 p-2 transition-colors hover:bg-white dark:hover:bg-white/5 rounded-xl"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Link
                                    href={teamUrl}
                                    className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-black/40 hover:scale-105 transition-transform"
                                  >
                                    {squad.logoUrl || squad.logoDarkUrl ? (
                                      <ThemeLogo
                                        lightSrc={squad.logoUrl}
                                        darkSrc={squad.logoDarkUrl}
                                        alt={squad.teamName}
                                        className="object-contain p-0.5"
                                      />
                                    ) : (
                                      <span className="text-[9px] font-black text-slate-400">
                                        {squad.teamName.slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </Link>

                                  <div className="min-w-0">
                                    <Link
                                      href={teamUrl}
                                      className="truncate text-xs font-bold text-slate-900 hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors block"
                                      title={squad.displayName || squad.teamName}
                                    >
                                      {squad.displayName || squad.teamName}
                                    </Link>
                                    {squad.seedLabel && (
                                      <span className="text-[9px] font-semibold text-slate-400 block truncate">
                                        {squad.seedLabel}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {squad.tag && (
                                  <span className="shrink-0 text-[10px] font-black uppercase text-slate-400">
                                    {squad.tag}
                                  </span>
                                )}
                              </div>

                              {/* Mini Roster Lineup (Clickable player tags) */}
                              {roster.length > 0 && (
                                <div className="flex flex-wrap gap-1 pl-9">
                                  {roster.map((player, pIdx) => {
                                    const pUrl = player.slug || player.playerId
                                      ? `/players/${player.slug || player.playerId}`
                                      : `/players?q=${encodeURIComponent(player.ign)}`;

                                    return (
                                      <Link
                                        key={pIdx}
                                        href={pUrl}
                                        className="inline-flex items-center gap-0.5 rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-600 hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-black/30 dark:text-slate-300 transition-all cursor-pointer"
                                        title={`View athlete profile: ${player.ign}`}
                                      >
                                        {player.captain && (
                                          <Crown className="h-2 w-2 text-amber-500 shrink-0" />
                                        )}
                                        <span>{player.ign}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
