'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin-auth';
import { type StageTemplate } from '@/lib/stage-templates';
import { deleteStageTemplate, saveStageTemplate } from '@/lib/stage-template-store';

export interface StageTemplateActionResult {
  ok: boolean;
  templates: StageTemplate[];
  error?: string;
}

/**
 * Save the editor's current stage list as a reusable template.
 *
 * The stages arrive as JSON rather than as form fields because this is a side action on
 * the tournament form, not a submit of it — nothing about the tournament being edited is
 * written here, and the template is stored on its own.
 */
export async function saveStageTemplateAction(
  name: string,
  stagesJson: string,
): Promise<StageTemplateActionResult> {
  if (!(await isAdmin())) return { ok: false, templates: [], error: 'Unauthorized' };

  if (!name.trim()) return { ok: false, templates: [], error: 'Give the template a name.' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stagesJson);
  } catch {
    return { ok: false, templates: [], error: 'The stage list could not be read.' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, templates: [], error: 'The stage list could not be read.' };
  }

  const templates = await saveStageTemplate(name, parsed as Record<string, unknown>[]);
  revalidatePath('/admin/tournaments');
  return { ok: true, templates };
}

export async function deleteStageTemplateAction(id: string): Promise<StageTemplateActionResult> {
  if (!(await isAdmin())) return { ok: false, templates: [], error: 'Unauthorized' };

  const templates = await deleteStageTemplate(id);
  revalidatePath('/admin/tournaments');
  return { ok: true, templates };
}
