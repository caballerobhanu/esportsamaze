import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { isAdmin, revokeAdminSession } from '@/lib/admin-auth';
import { AdminNav } from '@/components/admin/admin-nav';

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

  return (
    <div className="min-h-screen flex flex-col bg-(--ed-canvas) text-[var(--ed-ink)]">
      {/* Admin top bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 min-w-0">
            <span className="mr-3 px-2 py-0.5 rounded bg-(--ed-blue) text-[10px] font-black uppercase tracking-widest shrink-0">
              Admin
            </span>
            <AdminNav />
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
