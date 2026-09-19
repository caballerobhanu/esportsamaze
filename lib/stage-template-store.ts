import { getSiteSettingModel } from '@/lib/site-settings';
import { normaliseStageTemplates, toTemplateStages, type StageTemplate } from '@/lib/stage-templates';

/**
 * Server-only storage for stage templates.
 *
 * Separate from `lib/stage-templates.ts` on purpose. That module holds the pure helpers,
 * which the stage editor imports directly as a Client Component, so it imports nothing.
 * This one reaches Prisma — and, through `lib/site-settings.ts`, `revalidatePath` — so it
 * must never end up in a Client Component's module graph.
 *
 * Stored as one `SiteSetting` row rather than a table: these are admin configuration,
 * there are only ever a handful, and the codebase already keeps global config in that
 * key-value store. That also means the feature needs no schema change.
 */
const STAGE_TEMPLATES_KEY = 'stage_templates';

/** Newest first, which is the order the picker offers them in. */
function sortTemplates(templates: StageTemplate[]): StageTemplate[] {
  return [...templates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function writeTemplates(templates: StageTemplate[]): Promise<void> {
  const model = getSiteSettingModel();
  if (!model) return;

  const value = JSON.stringify(templates);
  await model.upsert({
    where: { key: STAGE_TEMPLATES_KEY },
    update: { value },
    create: { key: STAGE_TEMPLATES_KEY, value },
  });
}

export async function getStageTemplates(): Promise<StageTemplate[]> {
  try {
    const model = getSiteSettingModel();
    if (!model) return [];

    const row = await model.findUnique({ where: { key: STAGE_TEMPLATES_KEY } });
    if (!row?.value) return [];

    return sortTemplates(normaliseStageTemplates(JSON.parse(row.value)));
  } catch (error) {
    console.error('[StageTemplates] Failed to read templates:', error);
    return [];
  }
}

/** Adds a template, replacing any existing one with the same name, and returns the new list. */
export async function saveStageTemplate(
  name: string,
  stages: readonly object[],
): Promise<StageTemplate[]> {
  const trimmed = name.trim();
  if (!trimmed) return getStageTemplates();

  const templateStages = toTemplateStages(stages);
  if (templateStages.length === 0) return getStageTemplates();

  const existing = await getStageTemplates();
  const kept = existing.filter((template) => template.name.toLowerCase() !== trimmed.toLowerCase());
  const next = sortTemplates([
    { id: `tpl-${Date.now()}`, name: trimmed, createdAt: new Date().toISOString(), stages: templateStages },
    ...kept,
  ]);

  await writeTemplates(next);
  return next;
}

export async function deleteStageTemplate(id: string): Promise<StageTemplate[]> {
  const next = (await getStageTemplates()).filter((template) => template.id !== id);
  await writeTemplates(next);
  return next;
}
