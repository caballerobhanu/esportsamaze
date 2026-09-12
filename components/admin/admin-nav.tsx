'use client';

import * as React from 'react';
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
  Newspaper,
  MessagesSquare,
  Images,
  Tags,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/news', label: 'News & Articles', icon: Newspaper },
  { href: '/admin/comments', label: 'Comments', icon: MessagesSquare },
  { href: '/admin/tags', label: 'Tag Manager', icon: Tags },
  { href: '/admin/media', label: 'Media Library', icon: Images },
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
  { href: '/admin/krafton', label: 'KRAFTON Rankings', icon: BarChart3 },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              active
                ? 'bg-(--ed-blue) text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
      <span className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded bg-(--ed-blue) text-[10px] font-black uppercase tracking-widest text-white">
          Admin
        </span>
        <span className="text-xs font-bold text-slate-300">eSportsAmaze</span>
      </span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close admin menu"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function LogoutButton({ logout }: { logout: () => Promise<void> }) {
  return (
    <form action={logout} className="p-3 border-t border-white/10 shrink-0">
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" /> Logout
      </button>
    </form>
  );
}

export function AdminSidebar({ logout }: { logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Escape closes the drawer
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-3 bg-slate-900 text-white">
        <span className="px-2 py-0.5 rounded bg-(--ed-blue) text-[10px] font-black uppercase tracking-widest">
          Admin
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={open}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          open ? '' : 'invisible pointer-events-none'
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-64 max-w-[80vw] bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-200 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Brand onClose={() => setOpen(false)} />
          <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
          <LogoutButton logout={logout} />
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-56 flex-col bg-slate-900 text-white">
        <Brand />
        <NavLinks pathname={pathname} />
        <LogoutButton logout={logout} />
      </aside>
    </>
  );
}
