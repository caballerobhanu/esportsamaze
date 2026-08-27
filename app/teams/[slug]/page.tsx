import * as React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Trophy, ExternalLink, CalendarDays } from 'lucide-react';
import prisma from '@/lib/prisma';
import { StatsTable, StatsRow } from '@/components/ui/stats-table';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;

  // 1. Fetch team by slug (or legacy tag/name/id)
  const team = await prisma.team.findFirst({
    where: {
      OR: [
        { slug },
        { tag: { equals: slug, mode: 'insensitive' } },
        { name: { equals: slug, mode: 'insensitive' } },
        { displayName: { equals: slug, mode: 'insensitive' } },
        { id: slug }
      ]
    },
    include: {
      game: true,
      players: {
        orderBy: { ign: 'asc' }
      },
      tournamentRosters: {
        include: {
          tournament: true
        }
      }
    }
  });

  if (!team) {
    notFound();
  }

  // Safe navigation links
  const otherTeams = await prisma.team.findMany({
    where: { id: { not: team.id } },
    take: 2,
    orderBy: { name: 'asc' },
    select: { id: true, slug: true, tag: true, name: true }
  });

  const prevTeam = otherTeams[0] || null;
  const nextTeam = otherTeams[1] || null;

  const validTournaments = team.tournamentRosters.filter(
    (tt) => tt && tt.tournament
  );

  const teamHref = (t: { slug: string | null; tag: string | null; id: string }) =>
    `/teams/${t.slug || t.tag || t.id}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#041129] text-slate-900 dark:text-white font-sans selection:bg-[#0A5FC4] selection:text-white transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <div className="relative w-full overflow-hidden bg-white dark:bg-[#041129] pt-8 md:pt-16 pb-0 border-b-4 border-[#0A5FC4]">
        
        {/* Massive Background Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12vw] font-black leading-none text-slate-100 dark:text-white/[0.02] uppercase whitespace-nowrap z-0 pointer-events-none tracking-tighter">
          {team.tag || team.name}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8 md:gap-12">
            
            {/* Left: Team Title & Image */}
            <div className="flex-1 flex flex-col md:flex-row items-center md:items-end gap-8 relative w-full pb-6 md:pb-12">
              
              <div className="flex-shrink-0 w-40 h-40 md:w-56 md:h-56 relative flex justify-center items-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-6 shadow-xl">
                {team.logoUrl ? (
                  <img
                    src={team.logoUrl} 
                    alt={team.name}
                    className="max-h-full max-w-full object-contain p-2 drop-shadow-lg"
                  />
                ) : (
                  <div className="font-black text-4xl text-[#0A5FC4]">{team.tag || team.name.slice(0, 2).toUpperCase()}</div>
                )}
              </div>

              <div className="text-center md:text-left z-10 flex-1">
                {team.game && (
                  <div className="mb-3 inline-flex px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    {team.game.name}
                  </div>
                )}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
                  {team.name}
                </h1>
                {team.tag && (
                  <p className="text-xl md:text-2xl font-bold text-[#0A5FC4] mt-1 uppercase tracking-widest">
                    [{team.tag}]
                  </p>
                )}
              </div>
            </div>

            {/* Right: Data Table */}
            <div className="w-full md:w-[380px] lg:w-[420px] pb-6 md:pb-12">
              <StatsTable 
                title="Team Profile"
                action={
                  <div className="px-3 py-1 bg-[#0A5FC4] text-white text-[10px] font-bold uppercase tracking-widest rounded-sm flex items-center gap-1.5 shadow-sm">
                    <Trophy className="w-3 h-3" /> Title Contender
                  </div>
                }
              >
                <StatsRow label="Region" value={team.region || 'Global'} />
                <StatsRow label="Founded" value={team.founded ? new Date(team.founded).getFullYear().toString() : 'Unknown'} />
                <StatsRow label="Status" value={
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {team.status || 'Active'}
                  </span>
                } />
                <StatsRow label="Active Roster" value={`${(team.players || []).length} Players`} />
                <StatsRow label="Recent Events" value={validTournaments.length} />
              </StatsTable>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar (Previous / Next) */}
      <div className="bg-slate-900 dark:bg-black/40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {prevTeam ? (
              <Link href={teamHref(prevTeam)} className="flex items-center gap-4 group">
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover:text-white transition-colors" />
                <div className="hidden sm:block">
                  <div className="text-[10px] sm:text-xs font-bold text-[#0A5FC4] tracking-widest uppercase mb-0.5">Previous Team</div>
                  <div className="text-sm sm:text-xl font-black text-white uppercase tracking-tighter group-hover:text-[#0A5FC4] transition-colors">{prevTeam.name}</div>
                </div>
              </Link>
            ) : <div />}
            
            {nextTeam ? (
              <Link href={teamHref(nextTeam)} className="flex items-center gap-4 group text-right">
                <div className="hidden sm:block">
                  <div className="text-[10px] sm:text-xs font-bold text-[#0A5FC4] tracking-widest uppercase mb-0.5">Next Team</div>
                  <div className="text-sm sm:text-xl font-black text-white uppercase tracking-tighter group-hover:text-[#0A5FC4] transition-colors">{nextTeam.name}</div>
                </div>
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover:text-white transition-colors" />
              </Link>
            ) : <div />}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          
          {/* Active Roster Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter border-l-4 border-[#0A5FC4] pl-4">Active Roster</h2>
            </div>
            
            {(team.players || []).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {team.players.map((player) => (
                  <Link key={player.id} href={`/players/${player.slug || player.ign.toLowerCase()}`}>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-slate-800 hover:border-[#0A5FC4] dark:hover:border-[#0A5FC4] transition-all group">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-black/50 relative border border-slate-200 dark:border-slate-700">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt={player.ign} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{player.ign.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-[#0A5FC4] transition-colors">
                          {player.ign}
                        </h4>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{player.role || 'Player'}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-[#0A5FC4] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 border-dashed">
                <p className="text-slate-500 font-medium">No active roster found for this team.</p>
              </div>
            )}
          </div>
          
          {/* Recent Tournaments */}
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">
              <h2 className="text-xl font-black uppercase tracking-tighter border-l-4 border-slate-400 pl-4">Recent Events</h2>
            </div>
            
            {validTournaments.length > 0 ? (
              <div className="space-y-3">
                {validTournaments.map((tt) => (
                  <Link key={tt.id} href={`/tournaments/${tt.tournament.slug}`}>
                    <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                          {tt.tournament.name}
                        </h4>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>{tt.tournament.startDate ? new Date(tt.tournament.startDate).getFullYear() : ''}</span>
                        </div>
                        {tt.finalRank && (
                          <div className="font-black text-[#0A5FC4]">#{tt.finalRank}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 border-dashed">
                <p className="text-slate-400 text-xs font-medium">No tournament history available.</p>
              </div>
            )}
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}
