'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Trophy,
  Gamepad2,
  ArrowLeftRight,
  Swords,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/games', label: 'Games', icon: Gamepad2 },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/matches', label: 'Matches', icon: Swords },
  { href: '/admin/matches/matrix', label: 'Score Matrix', icon: FileSpreadsheet },
  { href: '/admin/teams', label: 'Teams', icon: Shield },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/organizers', label: 'Organizers', icon: LayoutDashboard },
  { href: '/admin/sponsors', label: 'Sponsors', icon: LayoutDashboard },
  { href: '/admin/venues', label: 'Venues', icon: LayoutDashboard },
  { href: '/admin/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { href: '/admin/rankings', label: 'Rankings', icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              active
                ? 'bg-(--ed-blue) text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
