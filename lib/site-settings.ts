import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface MaintenanceSettings {
  enabled: boolean;
  mode: 'MAINTENANCE' | 'COMING_SOON';
  title: string;
  subtitle: string;
  noticeBadge: string;
  estimatedEnd: string; // ISO string e.g. "2026-09-15T18:00:00.000Z"
  showCountdown: boolean;
  contactEmail: string;
  socialLinks: {
    discord?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
}

export const DEFAULT_MAINTENANCE_SETTINGS: MaintenanceSettings = {
  enabled: true,
  mode: 'COMING_SOON',
  title: 'Coming Soon - The Arena Awakens',
  subtitle:
    "EsportsAmaze is gearing up to bring you real-time tournament standings, match statistics, Krafton rankings, and live esports coverage across India.",
  noticeBadge: 'Next-Gen Arena Incoming',
  estimatedEnd: '',
  showCountdown: true,
  contactEmail: 'support@esportsamaze.com',
  socialLinks: {
    discord: 'https://discord.gg/esportsamaze',
    twitter: 'https://twitter.com/esportsamaze',
    instagram: 'https://instagram.com/esportsamaze',
    youtube: 'https://youtube.com/@esportsamaze',
  },
};

const SETTINGS_KEY = 'maintenance_config';

// Resilient accessor for prisma.siteSetting in case prisma client is awaiting generate on VPS
function getSiteSettingModel() {
  return (prisma as any).siteSetting;
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  try {
    const model = getSiteSettingModel();
    if (!model) return DEFAULT_MAINTENANCE_SETTINGS;

    const row = await model.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (!row?.value) {
      return DEFAULT_MAINTENANCE_SETTINGS;
    }

    const parsed = JSON.parse(row.value) as Partial<MaintenanceSettings>;
    return {
      ...DEFAULT_MAINTENANCE_SETTINGS,
      ...parsed,
      socialLinks: {
        ...DEFAULT_MAINTENANCE_SETTINGS.socialLinks,
        ...(parsed.socialLinks || {}),
      },
    };
  } catch (error) {
    // If DB is unreachable or migration pending, fail safe to disabled
    console.error('[SiteSettings] Failed to fetch maintenance settings:', error);
    return DEFAULT_MAINTENANCE_SETTINGS;
  }
}

export async function updateMaintenanceSettings(
  updates: Partial<MaintenanceSettings>
): Promise<MaintenanceSettings> {
  const current = await getMaintenanceSettings();
  const merged: MaintenanceSettings = {
    ...current,
    ...updates,
    socialLinks: {
      ...current.socialLinks,
      ...(updates.socialLinks || {}),
    },
  };

  const model = getSiteSettingModel();
  if (model) {
    await model.upsert({
      where: { key: SETTINGS_KEY },
      update: {
        value: JSON.stringify(merged),
      },
      create: {
        key: SETTINGS_KEY,
        value: JSON.stringify(merged),
      },
    });
  }

  // Revalidate the public layout cache so changes take effect immediately
  try {
    revalidatePath('/', 'layout');
  } catch {
    // May be called outside request context during tests
  }

  return merged;
}

export async function toggleMaintenanceMode(enabled: boolean): Promise<MaintenanceSettings> {
  return updateMaintenanceSettings({ enabled });
}

export interface BrandingSettings {
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  faviconUrl: null,
  ogImageUrl: null,
};

const BRANDING_SETTINGS_KEY = 'branding_config';

export async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    const model = getSiteSettingModel();
    if (!model) return DEFAULT_BRANDING_SETTINGS;

    const row = await model.findUnique({
      where: { key: BRANDING_SETTINGS_KEY },
    });

    if (!row?.value) {
      return DEFAULT_BRANDING_SETTINGS;
    }

    const parsed = JSON.parse(row.value) as Partial<BrandingSettings>;
    return {
      faviconUrl: parsed.faviconUrl ?? null,
      ogImageUrl: parsed.ogImageUrl ?? null,
    };
  } catch (error) {
    console.error('[SiteSettings] Failed to fetch branding settings:', error);
    return DEFAULT_BRANDING_SETTINGS;
  }
}

export async function updateBrandingSettings(
  updates: Partial<BrandingSettings>
): Promise<BrandingSettings> {
  const current = await getBrandingSettings();
  const merged: BrandingSettings = {
    ...current,
    ...updates,
  };

  const model = getSiteSettingModel();
  if (model) {
    await model.upsert({
      where: { key: BRANDING_SETTINGS_KEY },
      update: {
        value: JSON.stringify(merged),
      },
      create: {
        key: BRANDING_SETTINGS_KEY,
        value: JSON.stringify(merged),
      },
    });
  }

  try {
    revalidatePath('/', 'layout');
  } catch {
    // May be called outside request context during tests
  }

  return merged;
}
