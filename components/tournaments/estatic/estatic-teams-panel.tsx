'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Crown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ThemeLogo } from './theme-logo';

interface TeamRosterMember {
  playerId?: string | null;
  slug?: string | null;
  ign: string;
  role?: string | null;
  isCaptain?: boolean;
  captain?: boolean;
  isStaff?: boolean;
  staffRole?: string | null;
  statusTag?: string | null;
}

interface EnrichedTournamentTeam {
  id: string;
  seed?: number | null;
  seedLabel?: string | null;
  seedTournament?: { id: string; name: string; slug: string } | null;
  rosterJson?: unknown;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
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
}

interface EstaticTeamsPanelProps {
  teams: EnrichedTournamentTeam[];
  logoMode?: string;
  showCountryFlag?: boolean;
}

export type TeamSortOption = 'default' | 'name_asc' | 'name_desc' | 'seed_asc' | 'seed_desc';

export function EstaticTeamsPanel({ teams }: EstaticTeamsPanelProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<TeamSortOption>('default');
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const getTeamSeedNum = (t: EnrichedTournamentTeam): number => {
    if (typeof t.seed === 'number' && !isNaN(t.seed)) return t.seed;
    if (t.seedLabel) {
      const match = t.seedLabel.match(/#?(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return 999999;
  };

  const filteredAndSortedTeams = useMemo(() => {
    let result = [...teams];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const name = t.team.name.toLowerCase();
        const tag = t.team.tag?.toLowerCase() || '';
        const seed = (t.seedLabel || '').toLowerCase();
        return name.includes(q) || tag.includes(q) || seed.includes(q);
      });
    }

    if (sortBy === 'name_asc') {
      result.sort((a, b) => {
        const nameA = a.team.displayName || a.team.name;
        const nameB = b.team.displayName || b.team.name;
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      });
    } else if (sortBy === 'name_desc') {
      result.sort((a, b) => {
        const nameA = a.team.displayName || a.team.name;
        const nameB = b.team.displayName || b.team.name;
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
      });
    } else if (sortBy === 'seed_asc') {
      result.sort((a, b) => {
        const seedA = getTeamSeedNum(a);
        const seedB = getTeamSeedNum(b);
        if (seedA !== seedB) return seedA - seedB;
        return a.team.name.localeCompare(b.team.name);
      });
    } else if (sortBy === 'seed_desc') {
      result.sort((a, b) => {
        const seedA = getTeamSeedNum(a);
        const seedB = getTeamSeedNum(b);
        if (seedA !== seedB) return seedB - seedA;
        return a.team.name.localeCompare(b.team.name);
      });
    }

    return result;
  }, [teams, search, sortBy]);

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedTeamIds(new Set());
      setAllExpanded(false);
    } else {
      setExpandedTeamIds(new Set(filteredAndSortedTeams.map((t) => t.id)));
      setAllExpanded(true);
    }
  };

  const toggleTeam = (id: string) => {
    setExpandedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Search & Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Qualified Contenders
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-2.5">
            <Users className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
            Participating Teams ({filteredAndSortedTeams.length})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams, tags, seeds…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#0A5FC4] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TeamSortOption)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none dark:text-slate-200 cursor-pointer"
            >
              <option value="default" className="dark:bg-[#0b1220]">Default Order</option>
              <option value="name_asc" className="dark:bg-[#0b1220]">Name (A → Z)</option>
              <option value="name_desc" className="dark:bg-[#0b1220]">Name (Z → A)</option>
              <option value="seed_asc" className="dark:bg-[#0b1220]">Seed (1 → N)</option>
              <option value="seed_desc" className="dark:bg-[#0b1220]">Seed (N → 1)</option>
            </select>
          </div>

          <button
            onClick={handleToggleAll}
            className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 transition-all cursor-pointer"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Grid of Teams Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {filteredAndSortedTeams.map((tt) => {
          const rawRoster = Array.isArray(tt.rosterJson) ? (tt.rosterJson as TeamRosterMember[]) : [];
          const sortedRoster = [...rawRoster].sort((a, b) => {
            const aCapt = Boolean(a.isCaptain || a.captain);
            const bCapt = Boolean(b.isCaptain || b.captain);
            const aStaff = Boolean(a.isStaff || a.staffRole);
            const bStaff = Boolean(b.isStaff || b.staffRole);

            // Captain always first
            if (aCapt && !bCapt) return -1;
            if (!aCapt && bCapt) return 1;

            // Staff always last
            if (aStaff && !bStaff) return 1;
            if (!aStaff && bStaff) return -1;

            return 0;
          });
          const isExpanded = expandedTeamIds.has(tt.id);
          const seedLabel =
            tt.seedLabel ||
            (tt.seedTournament?.name ? `Seeded via ${tt.seedTournament.name}` : null) ||
            (tt.seed != null ? `Seed #${tt.seed}` : 'Qualified Squad');

          return (
            <div
              key={tt.id}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0A5FC4] hover:shadow-lg dark:border-white/10 dark:bg-[#0b1220]"
            >
              {/* Team Masthead inside Card */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Link
                    href={`/teams/${tt.team.slug || encodeURIComponent(tt.team.name)}`}
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-black/40 hover:scale-105 transition-transform"
                  >
                    {tt.team.logoUrl || tt.team.imageDarkUrl || tt.logoDarkUrl || tt.logoUrl ? (
                      <ThemeLogo
                        lightSrc={tt.logoUrl ?? tt.team.logoUrl}
                        darkSrc={tt.logoDarkUrl ?? tt.team.imageDarkUrl}
                        alt={tt.team.name}
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <span className="font-black text-slate-400 text-sm">{tt.team.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link
                      href={`/teams/${tt.team.slug || encodeURIComponent(tt.team.name)}`}
                      className="text-base font-black text-slate-900 hover:text-[#0A5FC4] dark:text-white transition-colors block truncate"
                    >
                      {tt.team.name}
                    </Link>
                    {/* Seed Label below team name instead of region */}
                    <div className="text-xs font-semibold text-[#0A5FC4] dark:text-blue-300 truncate">
                      {seedLabel}
                    </div>
                  </div>
                </div>

                {/* Accordion Expand/Collapse Button with Athlete Count */}
                {rawRoster.length > 0 && (
                  <button
                    onClick={() => toggleTeam(tt.id)}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 hover:border-[#0A5FC4] hover:bg-[#0A5FC4] hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:bg-[#0A5FC4] dark:hover:text-white transition-all cursor-pointer shrink-0"
                    title={isExpanded ? 'Collapse Lineup' : `View ${rawRoster.length} athletes`}
                    aria-label={isExpanded ? 'Collapse Lineup' : `View ${rawRoster.length} athletes`}
                  >
                    <Users className="h-3.5 w-3.5 opacity-60" />
                    <span className="text-[11px] font-extrabold">{rawRoster.length}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {/* Lineup / Roster Members (Accordion) */}
              {isExpanded && rawRoster.length > 0 && (
                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10 animate-in fade-in duration-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Registered Line-up ({rawRoster.length} Athletes)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedRoster.map((m, idx) => {
                      const isCapt = Boolean(m.isCaptain || m.captain);
                      const isStaff = Boolean(m.isStaff || m.staffRole);
                      const staffRole = m.staffRole || (m.isStaff ? m.role : null);
                      const playerUrl = m.slug
                        ? `/players/${m.slug}`
                        : m.playerId
                          ? `/players/${m.playerId}`
                          : `/players/${encodeURIComponent(m.ign)}`;

                      return (
                        <Link
                          key={idx}
                          href={playerUrl}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-all shadow-2xs hover:scale-105 cursor-pointer group/pill ${
                            isStaff
                              ? 'border-slate-200/80 bg-slate-100/70 text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-white/20'
                              : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300'
                          }`}
                          title={isStaff ? `Staff: ${m.ign}${staffRole ? ` (${staffRole})` : ''}` : `View ${m.ign}'s career stats & profile`}
                        >
                          {isCapt && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                          <span className="truncate">{m.ign}</span>
                          {isStaff && staffRole && (
                            <span className="text-[9px] font-semibold text-slate-400 group-hover/pill:text-[#0A5FC4] dark:group-hover/pill:text-blue-300 uppercase shrink-0">
                              • {staffRole}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
