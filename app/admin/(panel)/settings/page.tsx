import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import {
  getMaintenanceSettings,
  updateMaintenanceSettings,
  toggleMaintenanceMode,
  getBrandingSettings,
  updateBrandingSettings,
  type BrandingSettings,
} from '@/lib/site-settings';
import { saveUploadedFile } from '@/lib/upload';
import { MaintenanceSettingsForm } from '@/components/admin/maintenance-settings-form';
import { BrandingSettingsForm } from '@/components/admin/branding-settings-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Site Settings & Branding | Admin',
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

async function saveBrandingAction(updates: Partial<BrandingSettings>) {
  'use server';
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  await updateBrandingSettings(updates);
}

async function uploadBrandingFileAction(
  formData: FormData,
  target: 'favicon' | 'ogImage'
): Promise<{ success: boolean; url?: string; error?: string }> {
  'use server';
  if (!(await isAdmin())) {
    return { success: false, error: 'Unauthorized' };
  }

  const file = formData.get('file');
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  const prefix = target === 'favicon' ? 'favicon' : 'social-share';
  const url = await saveUploadedFile(file, prefix);

  if (!url) {
    return { success: false, error: 'Failed to upload or optimize image. Ensure format is PNG, JPG, WEBP, SVG, or ICO.' };
  }

  if (target === 'favicon') {
    await updateBrandingSettings({ faviconUrl: url });
  } else {
    await updateBrandingSettings({ ogImageUrl: url });
  }

  return { success: true, url };
}

export default async function AdminSettingsPage() {
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  const [maintenanceSettings, brandingSettings] = await Promise.all([
    getMaintenanceSettings(),
    getBrandingSettings(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          Site Settings & Maintenance Mode
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Control public access, toggle under maintenance or coming soon screens, and customize announcements.
        </p>
      </div>

      <MaintenanceSettingsForm
        initialSettings={maintenanceSettings}
        onSaveAction={saveSettingsAction}
        onToggleAction={toggleMaintenanceAction}
      />

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Branding & Social Sharing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customize your website favicon and the fallback OpenGraph card displayed when sharing links on social media.
          </p>
        </div>

        <BrandingSettingsForm
          initialSettings={brandingSettings}
          onSaveAction={saveBrandingAction}
          onUploadFileAction={uploadBrandingFileAction}
        />
      </div>
    </div>
  );
}

