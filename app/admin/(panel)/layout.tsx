import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Trophy,
  LogOut,
  Gamepad2,
  ArrowLeftRight,
  Swords,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { isAdmin, revokeAdminSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

async function logout() {
  'use server';
  await revokeAdminSession();
  redirect('/admin/login');
}

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect('/admin/login');

  const navItems = [
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#07090e] text-slate-900 dark:text-slate-100">
      {/* Admin top bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="mr-3 px-2 py-0.5 rounded bg-[#0A5FC4] text-[10px] font-black uppercase tracking-widest shrink-0">
              Admin
            </span>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            ))}
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
    </div>
  );
}
