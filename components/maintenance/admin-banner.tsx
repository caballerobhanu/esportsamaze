import Link from 'next/link';
import { cookies } from 'next/headers';
import { AlertTriangle, Settings, PowerOff, Eye, Globe } from 'lucide-react';
import type { MaintenanceSettings } from '@/lib/site-settings';
import { toggleMaintenanceMode } from '@/lib/site-settings';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function disableMaintenanceAction() {
  'use server';
  await toggleMaintenanceMode(false);
  const cookieStore = await cookies();
  cookieStore.delete('ea_preview_live');
  revalidatePath('/', 'layout');
  redirect('/');
}

async function togglePreviewLiveAction() {
  'use server';
  const cookieStore = await cookies();
  const current = cookieStore.get('ea_preview_live')?.value === '1';
  if (current) {
    cookieStore.delete('ea_preview_live');
  } else {
    cookieStore.set('ea_preview_live', '1', {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24,
    });
  }
  revalidatePath('/', 'layout');
  redirect('/');
}

export function AdminMaintenanceBanner({
  settings,
  onMaintenancePage = false,
}: {
  settings: MaintenanceSettings;
  onMaintenancePage?: boolean;
}) {
  const isComingSoon = settings.mode === 'COMING_SOON';

  return (
    <aside
      aria-label="Maintenance mode active warning"
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-slate-950 font-medium text-xs px-3 sm:px-6 py-2 shadow-lg flex flex-wrap items-center justify-between gap-2 border-b border-amber-400"
    >
      <div className="flex items-center gap-2 font-bold tracking-wide">
        <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
        <span>
          <strong className="uppercase tracking-wider">
            {isComingSoon ? 'Coming Soon Mode Active' : 'Maintenance Mode Active'}
          </strong>
          :{' '}
          {onMaintenancePage
            ? 'All non-admin public visitors see this screen. You are viewing it with admin controls.'
            : 'Public visitors see the Coming Soon screen. You are previewing the live site.'}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <form action={togglePreviewLiveAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 font-bold transition-colors text-[11px]"
          >
            {onMaintenancePage ? (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span>Preview Live Site</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>View Coming Soon Screen</span>
              </>
            )}
          </button>
        </form>

        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 font-bold transition-colors text-[11px]"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configure</span>
        </Link>

        <form action={disableMaintenanceAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-950 text-amber-400 hover:bg-slate-900 font-black uppercase tracking-wider text-[11px] transition-all active:scale-95 shadow"
          >
            <PowerOff className="w-3 h-3" />
            <span>Turn Off</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
