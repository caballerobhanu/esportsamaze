'use server';

import { revalidatePath } from 'next/cache';

import {
  PAGE_VIEW_TYPES,
  resetPageViews,
  resetPageViewsByType,
  setEntityViewDisplay,
  type PageViewType,
} from '@/lib/page-views';
import { updateViewCountSettings } from '@/lib/site-settings';
import { isViewWindow, type ViewWindow } from '@/lib/view-window';

/** The counts are rendered inside the public pages, so purge those too. */
function revalidateAll(): void {
  revalidatePath('/admin/analytics');
  revalidatePath('/', 'layout');
}

/** A submitted window, or null when the choice is "follow the type". */
function readWindow(raw: FormDataEntryValue | null): ViewWindow | null {
  const value = String(raw || '');
  return value === 'auto' || !isViewWindow(value) ? null : value;
}

/** Flip which entity TYPES print their view count, and over what window. */
export async function saveViewVisibility(formData: FormData): Promise<void> {
  await updateViewCountSettings({
    tournaments: formData.get('tournaments') === 'on',
    teams: formData.get('teams') === 'on',
    players: formData.get('players') === 'on',
    tournamentWindow: readWindow(formData.get('tournamentWindow')) ?? 'LIFETIME',
    teamWindow: readWindow(formData.get('teamWindow')) ?? 'LIFETIME',
    playerWindow: readWindow(formData.get('playerWindow')) ?? 'LIFETIME',
  });
  revalidateAll();
}

/** A submitted entity type, or null when the field is missing or unknown. */
function readType(raw: FormDataEntryValue | null): PageViewType | null {
  const value = String(raw || '');
  return (PAGE_VIEW_TYPES as string[]).includes(value) ? (value as PageViewType) : null;
}

/**
 * Deletes one page's recorded views. Display settings are left alone — resetting
 * history and changing what is shown are separate acts.
 */
export async function resetEntityViews(formData: FormData): Promise<void> {
  const entityType = readType(formData.get('entityType'));
  const entityId = String(formData.get('entityId') || '');
  if (!entityType || !entityId) return;

  await resetPageViews(entityType, entityId);
  revalidateAll();
}

/** Deletes every recorded view for one entity type. */
export async function resetTypeViews(formData: FormData): Promise<void> {
  const entityType = readType(formData.get('entityType'));
  if (!entityType) return;

  await resetPageViewsByType(entityType);
  revalidateAll();
}

/**
 * Override one page. `on` / `off` force the count for that event, team or
 * player; `auto` clears it so the type switch decides again. The window follows
 * the same rule.
 */
export async function setPageVisibility(formData: FormData): Promise<void> {
  const rawType = String(formData.get('entityType') || '');
  const entityId = String(formData.get('entityId') || '');
  const value = String(formData.get('value') || 'auto');

  if (!(PAGE_VIEW_TYPES as string[]).includes(rawType) || !entityId) return;

  await setEntityViewDisplay(
    rawType as PageViewType,
    entityId,
    value === 'on' ? true : value === 'off' ? false : null,
    readWindow(formData.get('window')),
  );
  revalidateAll();
}
