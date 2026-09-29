import { revalidatePath, revalidateTag } from 'next/cache';

import { getSiteSettingModel } from '@/lib/site-settings';
import { HOME_CURATION_TAG } from '@/lib/cache-tags';
import { cachedRead } from '@/lib/cached-read';

/**
 * Server-only storage for the home-page news curation.
 *
 * Two ordered lists of Article ids — the Front Page (lead first, max 5) and
 * Editor's Picks (max 3). Stored as one SiteSetting row rather than a table so
 * the feature needs no schema change, matching `lib/stage-template-store.ts`.
 *
 * An empty list means "automatic": the home page falls back to the featured/date
 * wire, so a missing or unreadable row reproduces the pre-curation layout exactly.
 *
 * Reaches Prisma and `revalidatePath`, so it must never enter a Client Component.
 */
const HOME_CURATION_KEY = 'home_news_curation';

export const FRONT_PAGE_SLOTS = 5;
export const EDITOR_PICKS_SLOTS = 3;

export interface HomeNewsCuration {
  /** Article ids in display order; the first is the lead story. */
  frontPage: string[];
  /** Article ids in display order. */
  editorPicks: string[];
}

export const DEFAULT_HOME_CURATION: HomeNewsCuration = { frontPage: [], editorPicks: [] };

/** Keeps only non-empty string ids, drops duplicates, and caps the list at `max`. */
function normaliseIds(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const id = entry.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= max) break;
  }
  return ids;
}

async function readHomeCuration(): Promise<HomeNewsCuration> {
  try {
    const model = getSiteSettingModel();
    if (!model) return DEFAULT_HOME_CURATION;

    const row = await model.findUnique({ where: { key: HOME_CURATION_KEY } });
    if (!row?.value) return DEFAULT_HOME_CURATION;

    const parsed = JSON.parse(row.value) as Partial<HomeNewsCuration>;
    return {
      frontPage: normaliseIds(parsed.frontPage, FRONT_PAGE_SLOTS),
      editorPicks: normaliseIds(parsed.editorPicks, EDITOR_PICKS_SLOTS),
    };
  } catch (error) {
    console.error('[HomeCuration] Failed to read curation:', error);
    return DEFAULT_HOME_CURATION;
  }
}

/**
 * The curation the home page renders. Cached because it is read on every home
 * page request; `updateHomeCuration` purges the tag so the desk sees its own
 * board on the next load.
 */
export const getHomeCuration = cachedRead(readHomeCuration, 'home-curation:read', {
  tags: [HOME_CURATION_TAG],
  revalidate: 300,
});

/** Replaces the curation outright (the board submits the full lists, in order). */
export async function updateHomeCuration(next: HomeNewsCuration): Promise<HomeNewsCuration> {
  const merged: HomeNewsCuration = {
    frontPage: normaliseIds(next.frontPage, FRONT_PAGE_SLOTS),
    editorPicks: normaliseIds(next.editorPicks, EDITOR_PICKS_SLOTS),
  };

  const model = getSiteSettingModel();
  if (model) {
    const value = JSON.stringify(merged);
    await model.upsert({
      where: { key: HOME_CURATION_KEY },
      update: { value },
      create: { key: HOME_CURATION_KEY, value },
    });
  }

  try {
    revalidatePath('/');
    // `expire: 0` rather than 'max': 'max' is stale-while-revalidate, which would
    // show the old board to the next visitor instead of waiting for the new one.
    revalidateTag(HOME_CURATION_TAG, { expire: 0 });
  } catch {
    // May be called outside request context during tests
  }

  return merged;
}
