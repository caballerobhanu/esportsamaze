import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isViewWindow, type ViewWindow } from '@/lib/view-window';

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

/**
 * Fail-OPEN on purpose.
 *
 * These are the values used when the settings row is missing or the read
 * throws. `enabled: true` here meant a database hiccup silently re-gated the
 * whole public site behind a "coming soon" placeholder — which is the single
 * worst thing that can happen to a live site, because the placeholder is what
 * gets served (and indexed) instead of the content. While the site is public,
 * unknown state must mean "serve the site", not "hide it".
 *
 * Turning maintenance ON is always an explicit admin action.
 */
export const DEFAULT_MAINTENANCE_SETTINGS: MaintenanceSettings = {
  enabled: false,
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

// Resilient accessor for prisma.siteSetting in case prisma client is awaiting generate on VPS.
// Exported so other SiteSetting-backed config (lib/stage-templates.ts) reuses this guard
// instead of duplicating the cast.
export function getSiteSettingModel() {
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

export interface ViewCountSettings {
  tournaments: boolean;
  teams: boolean;
  players: boolean;
  /** Which window each type's public count covers unless a page overrides it. */
  tournamentWindow: ViewWindow;
  teamWindow: ViewWindow;
  playerWindow: ViewWindow;
}

/** Off by default: a low count reads worse than no count, so showing is opt-in per type. */
export const DEFAULT_VIEW_COUNT_SETTINGS: ViewCountSettings = {
  tournaments: false,
  teams: false,
  players: false,
  tournamentWindow: 'LIFETIME',
  teamWindow: 'LIFETIME',
  playerWindow: 'LIFETIME',
};

const VIEW_COUNT_SETTINGS_KEY = 'view_count_visibility';

export async function getViewCountSettings(): Promise<ViewCountSettings> {
  try {
    const model = getSiteSettingModel();
    if (!model) return DEFAULT_VIEW_COUNT_SETTINGS;

    const row = await model.findUnique({ where: { key: VIEW_COUNT_SETTINGS_KEY } });
    if (!row?.value) return DEFAULT_VIEW_COUNT_SETTINGS;

    const parsed = JSON.parse(row.value) as Partial<ViewCountSettings>;
    return {
      tournaments: parsed.tournaments ?? false,
      teams: parsed.teams ?? false,
      players: parsed.players ?? false,
      tournamentWindow: isViewWindow(parsed.tournamentWindow) ? parsed.tournamentWindow : 'LIFETIME',
      teamWindow: isViewWindow(parsed.teamWindow) ? parsed.teamWindow : 'LIFETIME',
      playerWindow: isViewWindow(parsed.playerWindow) ? parsed.playerWindow : 'LIFETIME',
    };
  } catch (error) {
    console.error('[SiteSettings] Failed to fetch view-count settings:', error);
    return DEFAULT_VIEW_COUNT_SETTINGS;
  }
}

export async function updateViewCountSettings(
  updates: Partial<ViewCountSettings>
): Promise<ViewCountSettings> {
  const merged = { ...(await getViewCountSettings()), ...updates };

  const model = getSiteSettingModel();
  if (model) {
    await model.upsert({
      where: { key: VIEW_COUNT_SETTINGS_KEY },
      update: { value: JSON.stringify(merged) },
      create: { key: VIEW_COUNT_SETTINGS_KEY, value: JSON.stringify(merged) },
    });
  }

  try {
    revalidatePath('/', 'layout');
  } catch {
    // May be called outside request context during tests
  }

  return merged;
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
