import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { ArrowRight, CalendarDays, Globe2, ShieldCheck, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teams Hub | Esports Amaze — Rosters, Profiles & Tournament History',
  description:
    'Browse every esports team in the Esports Amaze wiki — verified rosters, regional info, and tournament history for BGMI, PUBG Mobile and more.',
};

async function getTeamsDirectoryData() {
  try {
    return await prisma.team.findMany({
      include: {
        game: { select: { name: true } },
        _count: { select: { players: true, tournamentRosters: true } },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch teams directory data:', error);
    return [];
  }
}

export default async function TeamsPage() {
  const teams = await getTeamsDirectoryData();

  const totalPlayers = teams.reduce((acc, t) => acc + (t._count?.players || 0), 0);
  const totalAppearances = teams.reduce((acc, t) => acc + (t._count?.tournamentRosters || 0), 0);
  const regions = new Set(teams.map((t) => t.region?.trim()).filter(Boolean));

  const metrics = [
    { label: 'Teams Tracked', icon: ShieldCheck, value: teams.length },
    { label: 'Players on Rosters', icon: Users, value: totalPlayers },
    { label: 'Event Appearances', icon: CalendarDays, value: totalAppearances },
    { label: 'Regions Covered', icon: Globe2, value: regions.size },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Estatic masthead */}
        <div className="mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Official Team &amp; Roster Wiki</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Teams
          </h1>
          <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            Every organization in the Esports Amaze verified database — explore active rosters,
            trophy cabinets, match histories, and publisher circuit records.
          </p>
        </div>

        {/* Metric ribbon — rounded-3xl card */}
        <div className="mb-10 grid grid-cols-2 gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220] md:grid-cols-4 md:divide-x divide-slate-200 dark:divide-white/10">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1.5 p-3 text-center">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <m.icon className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-300" />
                {m.label}
              </p>
              <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                <span>{m.value}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Directory grid */}
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug || team.tag || team.id}`}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-[#0A5FC4] hover:shadow-md dark:border-white/10 dark:bg-[#0b1220] transition-all flex items-center gap-4"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2 dark:border-white/10 dark:bg-[#141e33] group-hover:scale-105 transition-transform">
                  {team.logoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="h-full w-full object-contain p-1 dark:hidden"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={team.imageDarkUrl || team.logoUrl}
                        alt=""
                        aria-hidden="true"
                        className="hidden h-full w-full object-contain p-1 dark:block"
                      />
                    </>
                  ) : (
                    <span className="text-xl font-black text-[#0A5FC4] dark:text-blue-300">
                      {(team.tag || team.name).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h2 className="truncate text-base font-black uppercase tracking-tight text-slate-900 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-400">
                    {team.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {team.region || 'Global'}
                    </span>
                    {team.game?.name && (
                      <span className="rounded-full bg-[#0A5FC4]/10 px-2 py-0.5 text-[10px] font-bold text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                        {team.game.name}
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-slate-400">
                      · {team._count.players} roster
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-[#0A5FC4] dark:text-slate-600 dark:group-hover:text-blue-400" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-16 text-center text-sm text-slate-400 dark:border-white/10">
            No teams have been added to the wiki yet. Check back soon.
          </div>
        )}
      </main>
    </div>
  );
}
