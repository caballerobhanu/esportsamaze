'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  Trophy,
} from 'lucide-react';
import { countryCodeFor, flagUrlFor } from '@/lib/countries';
import type { StandingsLogoMode } from '@/lib/standings-config';

export interface EnrichedTournamentTeam {
  id: string;
  seed?: number | null;
  seedLabel?: string | null;
  seedTournamentId?: string | null;
  seedTournament?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  finalRank?: number | null;
  prizeWon?: number | null;
  rosterJson: unknown;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  displayName?: string | null;
  shortName?: string | null;
  country?: string | null;
  team: {
    id: string;
    name: string;
    displayName?: string | null;
    tag?: string | null;
    slug?: string | null;
    logoUrl?: string | null;
    imageDarkUrl?: string | null;
    region?: string | null;
  };
  stagesParticipated?: string[];
  groupsByStage?: Record<string, string[]>;
  deepestStageSequence?: number;
  totalPointsAcrossTournament?: number;
}

export interface TournamentTeamsPanelProps {
  teams: EnrichedTournamentTeam[];
  logoMode?: StandingsLogoMode;
  showCountryFlag?: boolean;
}

type SortOption = 'placement' | 'alphabetical' | 'seed' | 'points';

export function TournamentTeamsPanel({
  teams,
  logoMode = 'BOTH',
  showCountryFlag = true,
}: TournamentTeamsPanelProps) {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [sortBy, setSortBy] = React.useState<SortOption>('placement');
  const [expandedTeamIds, setExpandedTeamIds] = React.useState<Set<string>>(new Set());

  // Filtering Logic (only search query filter; tabs & stage/group filters removed per request)
  const filteredTeams = React.useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase().trim();

    return teams.filter((t) => {
      const teamName = (t.displayName || t.team.displayName || t.team.name || '').toLowerCase();
      const tag = (t.shortName || t.team.tag || '').toLowerCase();
      const seed = (t.seedLabel || '').toLowerCase();

      const roster = Array.isArray(t.rosterJson) ? t.rosterJson : [];
      const rosterMatch = roster.some((p) => {
        const ign = typeof p === 'string' ? p : p?.ign || '';
        return ign.toLowerCase().includes(q);
      });

      return teamName.includes(q) || tag.includes(q) || seed.includes(q) || rosterMatch;
    });
  }, [teams, searchQuery]);

  // Sorting Logic (emojis removed per request)
  const sortedTeams = React.useMemo(() => {
    const list = [...filteredTeams];

    if (sortBy === 'alphabetical') {
      list.sort((a, b) => {
        const nameA = a.displayName || a.team.displayName || a.team.name;
        const nameB = b.displayName || b.team.displayName || b.team.name;
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'seed') {
      list.sort((a, b) => {
        const hasLabelA = a.seedLabel ? 1 : 0;
        const hasLabelB = b.seedLabel ? 1 : 0;
        if (hasLabelA !== hasLabelB) return hasLabelB - hasLabelA;
        return (a.seed ?? 999) - (b.seed ?? 999);
      });
    } else if (sortBy === 'points') {
      list.sort((a, b) => (b.totalPointsAcrossTournament || 0) - (a.totalPointsAcrossTournament || 0));
    } else {
      // 'placement' (Final rank -> Deepest stage -> Points -> Name)
      list.sort((a, b) => {
        if (a.finalRank != null && b.finalRank != null) {
          return a.finalRank - b.finalRank;
        }
        if (a.finalRank != null) return -1;
        if (b.finalRank != null) return 1;

        const stageSeqA = a.deepestStageSequence ?? -1;
        const stageSeqB = b.deepestStageSequence ?? -1;
        if (stageSeqA !== stageSeqB) {
          return stageSeqB - stageSeqA;
        }

        const ptsA = a.totalPointsAcrossTournament || 0;
        const ptsB = b.totalPointsAcrossTournament || 0;
        if (ptsA !== ptsB) return ptsB - ptsA;

        const nameA = a.displayName || a.team.displayName || a.team.name;
        const nameB = b.displayName || b.team.displayName || b.team.name;
        return nameA.localeCompare(nameB);
      });
    }

    return list;
  }, [filteredTeams, sortBy]);

  // Auto-expand teams if search matches a player in that roster
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchingIds = new Set<string>();
      filteredTeams.forEach((t) => {
        const roster = Array.isArray(t.rosterJson) ? t.rosterJson : [];
        const hasPlayerMatch = roster.some((p) => {
          const ign = typeof p === 'string' ? p : p?.ign || '';
          return ign.toLowerCase().includes(q);
        });
        if (hasPlayerMatch) {
          matchingIds.add(t.id);
        }
      });
      if (matchingIds.size > 0) {
        setExpandedTeamIds((prev) => new Set([...Array.from(prev), ...Array.from(matchingIds)]));
      }
    }
  }, [searchQuery, filteredTeams]);

  // Expand All / Collapse All functionality
  const allExpanded = sortedTeams.length > 0 && expandedTeamIds.size === sortedTeams.length;

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedTeamIds(new Set());
    } else {
      setExpandedTeamIds(new Set(sortedTeams.map((t) => t.id)));
    }
  };

  const toggleTeamExpand = (teamId: string) => {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Action Toolbar: Search, Expand All, Sort ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-(--ed-hair) bg-(--ed-surface)">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams, tags, seeds, or player IGNs..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-(--ed-canvas) border border-(--ed-hair) text-xs focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right Controls: Count, Expand/Collapse All Button, Clean Sort Dropdown */}
        <div className="flex items-center gap-2.5 justify-between sm:justify-end flex-wrap">
          <span className="num text-xs font-semibold text-(--ed-stone) whitespace-nowrap">
            <strong className="text-(--ed-ink)">{sortedTeams.length}</strong> squads
          </span>

          {/* Single Button to Show All / Hide All Rosters */}
          <button
            type="button"
            onClick={toggleExpandAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-(--ed-canvas) hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-(--ed-hair) text-xs font-semibold text-(--ed-ink) transition-colors cursor-pointer whitespace-nowrap"
          >
            {allExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Collapse All Rosters</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                <span>Expand All Rosters</span>
              </>
            )}
          </button>

          {/* Sort Dropdown (No Emojis) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:inline">
              Sort:
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-9 pl-3 pr-8 rounded-lg bg-(--ed-canvas) border border-(--ed-hair) text-xs font-semibold text-(--ed-ink) focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 cursor-pointer appearance-none"
              >
                <option value="placement">Final Placement</option>
                <option value="alphabetical">Alphabetical (A - Z)</option>
                <option value="seed">Seeding &amp; Invites</option>
                <option value="points">Total Points</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Empty State ── */}
      {sortedTeams.length === 0 && (
        <div className="rounded-xl border border-dashed border-(--ed-hair) bg-(--ed-surface) p-10 text-center space-y-2">
          <Users className="w-8 h-8 text-(--ed-stone) opacity-40 mx-auto" />
          <p className="text-sm font-semibold text-(--ed-ink)">No participating teams found</p>
          <p className="text-xs text-(--ed-stone)">No squads match your search criteria.</p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-(--ed-ink) hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* ── Compact Teams Lists (Mobile: 1 column, Desktop: 2 independent columns without row height coupling) ── */}
      {sortedTeams.length > 0 && (
        <>
          {/* Mobile Single Column (< lg) */}
          <div className="space-y-2.5 lg:hidden">
            {sortedTeams.map((tt, idx) => {
              const isExpanded = expandedTeamIds.has(tt.id);
              return (
                <TeamRowCard
                  key={tt.id}
                  tt={tt}
                  index={idx + 1}
                  logoMode={logoMode}
                  showCountryFlag={showCountryFlag}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleTeamExpand(tt.id)}
                />
              );
            })}
          </div>

          {/* Desktop Two Independent Columns (>= lg) */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-2.5 items-start">
            {/* Left Column */}
            <div className="space-y-2.5 flex flex-col">
              {sortedTeams
                .filter((_, idx) => idx % 2 === 0)
                .map((tt) => {
                  const globalIdx = sortedTeams.findIndex((t) => t.id === tt.id);
                  const isExpanded = expandedTeamIds.has(tt.id);
                  return (
                    <TeamRowCard
                      key={tt.id}
                      tt={tt}
                      index={globalIdx + 1}
                      logoMode={logoMode}
                      showCountryFlag={showCountryFlag}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleTeamExpand(tt.id)}
                    />
                  );
                })}
            </div>

            {/* Right Column */}
            <div className="space-y-2.5 flex flex-col">
              {sortedTeams
                .filter((_, idx) => idx % 2 === 1)
                .map((tt) => {
                  const globalIdx = sortedTeams.findIndex((t) => t.id === tt.id);
                  const isExpanded = expandedTeamIds.has(tt.id);
                  return (
                    <TeamRowCard
                      key={tt.id}
                      tt={tt}
                      index={globalIdx + 1}
                      logoMode={logoMode}
                      showCountryFlag={showCountryFlag}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleTeamExpand(tt.id)}
                    />
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════ COMPACT TEAM ROW CARD ═══════════ */

interface TeamRowCardProps {
  tt: EnrichedTournamentTeam;
  index: number;
  logoMode: StandingsLogoMode;
  showCountryFlag: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function TeamRowCard({
  tt,
  index,
  logoMode,
  showCountryFlag,
  isExpanded,
  onToggleExpand,
}: TeamRowCardProps) {
  const roster = Array.isArray(tt.rosterJson)
    ? (tt.rosterJson as Array<{ ign: string; role?: string; captain?: boolean } | string>)
    : [];

  const lightLogo = tt.logoUrl ?? tt.team.logoUrl;
  const darkLogo = tt.logoDarkUrl ?? tt.team.imageDarkUrl;
  const countryCode = countryCodeFor(tt.country ?? tt.team.region);

  // Whether to show country flag based on admin panel toggle and data presence
  const renderFlag = showCountryFlag && countryCode && logoMode !== 'NONE' && logoMode !== 'TEAM';
  const showLogo = logoMode !== 'NONE' && logoMode !== 'COUNTRY';

  const teamSlug = tt.team.slug || tt.team.id;
  const teamDisplayName = tt.displayName || tt.team.displayName || tt.team.name;
  const teamTag = tt.shortName || tt.team.tag;

  // Determine seed text
  const seedText = tt.seedLabel || (tt.seed != null ? `Seed #${tt.seed}` : null);

  return (
    <div className="rounded-xl border border-(--ed-hair) bg-(--ed-surface) hover:border-slate-300 dark:hover:border-slate-700 transition-colors overflow-hidden">
      {/* ── Main Compact Header Row: Logo -> Team Name -> Seed ── */}
      <div
        onClick={onToggleExpand}
        className="flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer select-none hover:bg-(--ed-canvas)/60 transition-colors"
      >
        {/* Left Side: Index -> (Flag) -> Logo -> Team Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Index / Placement */}
          <span className="num text-[11px] font-mono text-slate-400 w-5 text-right shrink-0">
            {tt.finalRank != null ? `#${tt.finalRank}` : String(index).padStart(2, '0')}
          </span>

          {/* Country Flag (Optional, controlled by admin) */}
          {renderFlag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flagUrlFor(countryCode)}
              alt={countryCode}
              loading="lazy"
              className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover border border-slate-200 dark:border-slate-800"
            />
          )}

          {/* 1. Team Logo */}
          <Link
            href={`/teams/${teamSlug}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 transition-transform hover:scale-105"
            title={`View ${teamDisplayName} Profile`}
          >
            {showLogo && (lightLogo || darkLogo) ? (
              <>
                {lightLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={lightLogo} alt="" className="h-7 w-7 shrink-0 object-contain dark:hidden" />
                )}
                {darkLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={darkLogo}
                    alt=""
                    className={`h-7 w-7 shrink-0 object-contain ${lightLogo ? 'hidden dark:block' : 'dark:block'}`}
                  />
                )}
              </>
            ) : (
              <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-(--ed-hair) bg-(--ed-canvas) text-[10px] font-bold text-(--ed-stone)">
                {(teamTag || teamDisplayName).slice(0, 3)}
              </span>
            )}
          </Link>

          {/* 2. Team Name & Tag */}
          <div className="min-w-0 flex-1 flex items-baseline gap-1.5 truncate">
            <Link
              href={`/teams/${teamSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-xs sm:text-sm text-(--ed-ink) hover:text-(--ed-blue) transition-colors truncate"
              title={`View ${teamDisplayName} Profile`}
            >
              {teamDisplayName}
            </Link>
            {teamTag && (
              <span className="text-[11px] font-mono font-medium text-slate-400 shrink-0">
                [{teamTag}]
              </span>
            )}
          </div>
        </div>

        {/* Right Side: 3. Seed -> Roster Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 3. Seed */}
          {tt.seedTournament ? (
            <Link
              href={`/tournaments/${tt.seedTournament.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50 hover:bg-amber-100 transition-colors"
              title={`Seeded via ${tt.seedTournament.name}`}
            >
              <Trophy className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate max-w-[120px]">{seedText || tt.seedTournament.name}</span>
            </Link>
          ) : seedText ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-(--ed-hair) truncate max-w-[120px]">
              {seedText}
            </span>
          ) : null}

          {/* Roster Toggle Trigger */}
          <div
            className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
              isExpanded
                ? 'bg-slate-200 dark:bg-slate-800 text-(--ed-ink)'
                : 'text-slate-400 hover:text-(--ed-ink) hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title={isExpanded ? 'Collapse Roster' : 'Expand Roster'}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180 text-(--ed-ink)' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Expandable Squad Roster (Space Efficient Inline View) ── */}
      {isExpanded && (
        <div className="border-t border-(--ed-hair) bg-(--ed-canvas)/50 p-3 sm:px-4 sm:py-3 space-y-2.5 animate-in fade-in duration-150">
          {roster.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {roster.map((p, i) => {
                const ign = typeof p === 'string' ? p : p.ign;
                const role = typeof p === 'string' ? '' : p.role;
                const captain = typeof p === 'string' ? false : p.captain;

                return (
                  <div
                    key={i}
                    className="flex flex-col justify-center px-2.5 py-1.5 rounded-md bg-(--ed-surface) border border-(--ed-hair)/70 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-(--ed-ink) truncate">{ign}</span>
                      {captain && (
                        <span
                          className="px-1 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0"
                          title="Team Captain"
                        >
                          C
                        </span>
                      )}
                    </div>
                    {role && (
                      <span className="text-[10px] text-(--ed-stone) capitalize truncate mt-0.5">
                        {role}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-(--ed-stone) italic">No registered roster for this tournament.</p>
          )}

          {/* Quick Team Link Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-(--ed-hair)/40 text-[11px]">
            <span className="text-slate-400">{roster.length} registered player{roster.length === 1 ? '' : 's'}</span>
            <Link
              href={`/teams/${teamSlug}`}
              className="text-(--ed-blue) hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Team Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
