import Link from 'next/link';
import { AlertTriangle, Settings, PowerOff, ExternalLink } from 'lucide-react';
import type { MaintenanceSettings } from '@/lib/site-settings';
import { toggleMaintenanceMode } from '@/lib/site-settings';

async function disableMaintenanceAction() {
  'use server';
  await toggleMaintenanceMode(false);
}

export function AdminMaintenanceBanner({
  settings,
}: {
  settings: MaintenanceSettings;
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
          : Public visitors are currently viewing the {isComingSoon ? 'Coming Soon' : 'Maintenance'} screen. You are seeing the live site because you are logged in as Admin.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/maintenance"
          target="_blank"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 font-bold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Preview Screen</span>
        </Link>

        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 font-bold transition-colors"
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
