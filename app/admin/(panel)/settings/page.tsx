import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import {
  getMaintenanceSettings,
  updateMaintenanceSettings,
  toggleMaintenanceMode,
  type MaintenanceSettings,
} from '@/lib/site-settings';
import { MaintenanceSettingsForm } from '@/components/admin/maintenance-settings-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Site Settings & Maintenance | Admin',
};

async function saveSettingsAction(formData: FormData) {
  'use server';
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  const enabled = formData.get('enabled') === 'true';
  const mode = (formData.get('mode') as 'MAINTENANCE' | 'COMING_SOON') || 'MAINTENANCE';
  const title = (formData.get('title') as string) || "We're Upgrading the Arena";
  const subtitle =
    (formData.get('subtitle') as string) ||
    "EsportsAmaze is currently performing platform maintenance.";
  const noticeBadge = (formData.get('noticeBadge') as string) || '';
  const estimatedEnd = (formData.get('estimatedEnd') as string) || '';
  const showCountdown = formData.get('showCountdown') === 'true';
  const contactEmail = (formData.get('contactEmail') as string) || '';
  const discord = (formData.get('discord') as string) || '';
  const twitter = (formData.get('twitter') as string) || '';
  const instagram = (formData.get('instagram') as string) || '';
  const youtube = (formData.get('youtube') as string) || '';

  await updateMaintenanceSettings({
    enabled,
    mode,
    title,
    subtitle,
    noticeBadge,
    estimatedEnd,
    showCountdown,
    contactEmail,
    socialLinks: {
      discord,
      twitter,
      instagram,
      youtube,
    },
  });
}

async function toggleMaintenanceAction() {
  'use server';
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  const current = await getMaintenanceSettings();
  await toggleMaintenanceMode(!current.enabled);
}

export default async function AdminSettingsPage() {
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  const settings = await getMaintenanceSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          Site Settings & Maintenance Mode
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Control public access, toggle under maintenance or coming soon screens, and customize announcements.
        </p>
      </div>

      <MaintenanceSettingsForm
        initialSettings={settings}
        onSaveAction={saveSettingsAction}
        onToggleAction={toggleMaintenanceAction}
      />
    </div>
  );
}
