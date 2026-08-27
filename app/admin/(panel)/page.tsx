import Link from 'next/link';
import { Users, Shield, Trophy } from 'lucide-react';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [playerCount, teamCount, tournamentCount] = await Promise.all([
    prisma.player.count(),
    prisma.team.count(),
    prisma.tournament.count(),
  ]);

  const recentTournaments = await prisma.tournament.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: { name: true, slug: true, status: true },
  });

  const cards = [
    { href: '/admin/players', label: 'Players', count: playerCount, icon: Users },
    { href: '/admin/teams', label: 'Teams', count: teamCount, icon: Shield },
    {
      href: '/admin/tournaments',
      label: 'Tournaments',
      count: tournamentCount,
      icon: Trophy,
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-black uppercase tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 inline-flex items-center gap-2">
                <card.icon className="w-4 h-4" /> {card.label}
              </span>
              <span className="text-3xl font-black font-mono">{card.count}</span>
            </div>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
          Recently Updated Tournaments
        </h2>
        <ul className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden text-sm">
          {recentTournaments.map((t) => (
            <li key={t.slug} className="px-4 py-2.5 flex items-center justify-between">
              <Link
                href={`/tournaments/${t.slug}`}
                className="font-semibold hover:text-[#0A5FC4] dark:hover:text-amber-400 transition-colors"
              >
                {t.name}
              </Link>
              <span className="text-[10px] font-black uppercase text-slate-400">
                {t.status}
              </span>
            </li>
          ))}
          {recentTournaments.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-slate-400">
              No tournaments yet.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
