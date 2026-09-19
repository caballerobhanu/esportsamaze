import prisma from '@/lib/prisma';

/**
 * Previous slugs for players, teams and tournaments.
 *
 * When a slug changes, the old one is recorded here pointing at the entity that
 * kept it. The public `[slug]` routes fall back to this table when a slug no
 * longer resolves in the live table and redirect permanently to the current one —
 * so an inbound link, a search result or an accumulated ranking survives a rename
 * or a merge instead of 404ing.
 *
 * The decision logic (`decideSlugRedirect`) is pure and separate from the database
 * access, so the cases that matter are tested without a connection.
 */

export type SlugEntityType = 'player' | 'team' | 'tournament';

/** Public path prefix per entity type; the redirect target is `<prefix>/<slug>`. */
export const SLUG_ENTITY_PATH: Record<SlugEntityType, string> = {
  player: '/players',
  team: '/teams',
  tournament: '/tournaments',
};

/* The Prisma client may be older than the schema on a running box, so the model is
   reached structurally and a missing one degrades to "no history" rather than
   throwing on a public page. */
interface SlugHistoryModel {
  findUnique(args: {
    where: { entityType_oldSlug: { entityType: string; oldSlug: string } };
    select: { entityId: true };
  }): Promise<{ entityId: string } | null>;
  upsert(args: {
    where: { entityType_oldSlug: { entityType: string; oldSlug: string } };
    update: { entityId: string };
    create: { entityType: string; oldSlug: string; entityId: string };
  }): Promise<unknown>;
}

interface EntitySlugModel {
  findUnique(args: {
    where: { id: string };
    select: { slug: true };
  }): Promise<{ slug: string | null } | null>;
}

function slugHistoryModel(client: unknown): SlugHistoryModel | null {
  const model = (client as { slugHistory?: unknown } | null | undefined)?.slugHistory;
  return (model as SlugHistoryModel | undefined) ?? null;
}

/**
 * Returns the slug a stale request should be redirected to, or null when no
 * redirect is warranted. Pure, so the three cases that matter are tested directly:
 *
 *  - the entity is gone            → null (a correct 404 stays a 404)
 *  - its slug now equals the request → null (the live lookup would have found it)
 *  - it was renamed                → its current slug
 */
export function decideSlugRedirect(
  requestedSlug: string,
  entity: { slug: string | null } | null
): string | null {
  if (!entity) return null;
  const current = entity.slug;
  if (!current || current === requestedSlug) return null;
  return current;
}

/**
 * Records that `entityId` used to answer to `oldSlug`. A no-op when the slug did
 * not actually change, so ordinary saves do not litter the table.
 *
 * Pass the surrounding transaction client when there is one, so the history cannot
 * diverge from the rename it describes. Re-pointing an existing row — the merge
 * case, where the absorbed slug now belongs to the survivor — is the upsert's update.
 */
export async function recordSlugChange(
  entityType: SlugEntityType,
  oldSlug: string | null | undefined,
  newSlug: string | null | undefined,
  entityId: string,
  client: unknown = prisma
): Promise<void> {
  const from = oldSlug?.trim();
  if (!from || from === newSlug) return;

  const model = slugHistoryModel(client);
  if (!model) return;

  try {
    await model.upsert({
      where: { entityType_oldSlug: { entityType, oldSlug: from } },
      update: { entityId },
      create: { entityType, oldSlug: from, entityId },
    });
  } catch (error) {
    // Losing a redirect is not worth failing the save that triggered it.
    console.error('[SlugHistory] Failed to record slug change:', error);
  }
}

/** Loads the entity's current slug, or null when it no longer exists. */
async function loadCurrentSlug(
  entityType: SlugEntityType,
  entityId: string,
  client: unknown
): Promise<{ slug: string | null } | null> {
  // The Prisma model name is the same as the entity type.
  const model = (client as Record<string, EntitySlugModel | undefined>)?.[entityType];
  if (!model?.findUnique) return null;
  return model.findUnique({ where: { id: entityId }, select: { slug: true } });
}

/**
 * Resolves a stale slug to its entity's current one, for the `[slug]` routes to
 * redirect to. Null when there is no history entry, or when the entry points at an
 * entity that no longer exists — the caller then renders its own not-found, so a
 * deleted entity is never redirected to nothing.
 */
export async function resolveSlugRedirect(
  entityType: SlugEntityType,
  slug: string
): Promise<string | null> {
  try {
    const model = slugHistoryModel(prisma);
    if (!model) return null;

    const entry = await model.findUnique({
      where: { entityType_oldSlug: { entityType, oldSlug: slug } },
      select: { entityId: true },
    });
    if (!entry) return null;

    const entity = await loadCurrentSlug(entityType, entry.entityId, prisma);
    return decideSlugRedirect(slug, entity);
  } catch {
    return null;
  }
}
