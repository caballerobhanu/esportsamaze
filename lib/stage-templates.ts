/**
 * Pure stage-template helpers.
 *
 * This module is imported directly by the stage editor, a Client Component, so it must
 * import NOTHING — no Prisma, and nothing that reaches `revalidatePath` or `next/cache`,
 * or the client bundle fails to build. The database accessors live in
 * `lib/stage-template-store.ts`, which only server code imports.
 */

/**
 * Stage fields a template deliberately does NOT carry, because they belong to one event:
 * the dates are that event's calendar, and `groups` is the declared draw naming that
 * event's actual teams. Carrying either forward is how last season's dates end up on a
 * new tournament without anyone noticing — so a template is structure only, and the
 * editor leaves these for the admin to fill.
 */
export const PER_EVENT_STAGE_FIELDS = ['dates', 'startDate', 'endDate', 'customDates', 'groups'] as const;

export type TemplateStage = Record<string, unknown> & { name: string };

export interface StageTemplate {
  id: string;
  name: string;
  createdAt: string;
  stages: TemplateStage[];
}

/**
 * Strip the per-event fields off each stage, leaving the reusable structure.
 *
 * Takes `readonly object[]` rather than `Record<string, unknown>[]` so a caller can pass
 * its own stage interface — an interface has no index signature and so is not assignable
 * to a Record.
 */
export function toTemplateStages(stages: readonly object[]): TemplateStage[] {
  return stages
    .map((stage) => {
      const copy: Record<string, unknown> = { ...(stage as Record<string, unknown>) };
      for (const field of PER_EVENT_STAGE_FIELDS) delete copy[field];
      copy.name = String(copy.name ?? '').trim();
      return copy as TemplateStage;
    })
    .filter((stage) => stage.name !== '');
}

/**
 * Apply a template's stages onto an event, keeping whatever the event already has for
 * the fields a template does not carry.
 *
 * Matched by name, so applying a template to a half-configured event does not throw away
 * dates or a draw the admin already entered for a stage the template also defines. Stage
 * ids and sequence are renumbered to the template's order, keeping an existing id where
 * the stage already existed so the save path still matches the stored record.
 */
export function applyTemplateStages(
  template: readonly TemplateStage[],
  current: readonly object[],
): Record<string, unknown>[] {
  const existingByName = new Map<string, Record<string, unknown>>();
  for (const stage of current) {
    const record = stage as Record<string, unknown>;
    existingByName.set(String(record.name ?? '').trim(), record);
  }

  return template.map((stage, index) => {
    const merged: Record<string, unknown> = { ...stage, sequence: index + 1 };
    const existing = existingByName.get(stage.name);

    if (existing) {
      for (const field of PER_EVENT_STAGE_FIELDS) {
        if (existing[field] !== undefined) merged[field] = existing[field];
      }
      if (existing.id !== undefined) merged.id = existing.id;
    } else {
      merged.id = `stage-${index + 1}`;
    }

    // Both are required by the editor's stage shape, so a stage loaded from a template
    // always comes back with them present rather than undefined.
    if (merged.groups === undefined) merged.groups = {};
    if (merged.rules === undefined) merged.rules = [];

    return merged;
  });
}

/** Parse whatever is stored under the key into templates, discarding anything malformed. */
export function normaliseStageTemplates(raw: unknown): StageTemplate[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): StageTemplate[] => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<StageTemplate>;
    if (!candidate.id || !candidate.name || !Array.isArray(candidate.stages)) return [];

    return [
      {
        id: String(candidate.id),
        name: String(candidate.name),
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : '',
        stages: candidate.stages.filter(
          (stage): stage is TemplateStage => Boolean(stage) && typeof stage === 'object' && 'name' in stage,
        ),
      },
    ];
  });
}
