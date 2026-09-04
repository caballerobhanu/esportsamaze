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
  ign: string;
  role?: string | null;
  isCaptain?: boolean;
}

interface EnrichedTournamentTeam {
  id: string;
  seed?: number | null;
  seedGroup?: string | null;
  seedNotes?: string | null;
  rosterJson?: any;
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

export function EstaticTeamsPanel({ teams }: EstaticTeamsPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter((t) => {
      const name = t.team.name.toLowerCase();
      const tag = t.team.tag?.toLowerCase() || '';
      return name.includes(q) || tag.includes(q);
    });
  }, [teams, search]);

  const handleToggleAll = () => {
    if (allExpanded) {
      setExpandedTeamIds(new Set());
      setAllExpanded(false);
    } else {
      setExpandedTeamIds(new Set(filteredTeams.map((t) => t.id)));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
            Qualified Contenders
          </p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-2.5">
            <Users className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
            Participating Teams ({filteredTeams.length})
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search teams or tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-[#0A5FC4] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <button
            onClick={handleToggleAll}
            className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-300 transition-all cursor-pointer"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Teams Grid (Estatic Signature Cards) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTeams.map((tt) => {
          const rawRoster = Array.isArray(tt.rosterJson) ? (tt.rosterJson as TeamRosterMember[]) : [];
          const isExpanded = expandedTeamIds.has(tt.id);
          const seedLabel = tt.seedNotes || (tt.seed ? `Seed #${tt.seed}` : (tt.seedGroup ? `Group ${tt.seedGroup}` : 'Qualified Squad'));

          return (
            <div
              key={tt.id}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0A5FC4] hover:shadow-lg dark:border-white/10 dark:bg-[#0b1220]"
            >
              {/* Team Masthead inside Card */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Link
                    href={`/teams/${tt.team.slug || tt.team.id}`}
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-black/40 hover:scale-105 transition-transform"
                  >
                    {tt.team.logoUrl || tt.team.imageDarkUrl || tt.logoDarkUrl ? (
                      <ThemeLogo
                        lightSrc={tt.team.logoUrl}
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
                      href={`/teams/${tt.team.slug || tt.team.id}`}
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

                {/* Accordion Expand/Collapse Chevron Button */}
                {rawRoster.length > 0 && (
                  <button
                    onClick={() => toggleTeam(tt.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-[#0A5FC4] hover:text-white dark:bg-white/5 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
                    title={isExpanded ? 'Collapse Lineup' : 'Expand Lineup'}
                    aria-label={isExpanded ? 'Collapse Lineup' : 'Expand Lineup'}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                    {rawRoster.map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      >
                        {m.isCaptain && <Crown className="h-3 w-3 text-amber-500" />}
                        <span>{m.ign}</span>
                        {m.role && (
                          <span className="text-[9px] font-semibold text-slate-400 uppercase">
                            • {m.role}
                          </span>
                        )}
                      </span>
                    ))}
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
