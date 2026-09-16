'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr } from '@/lib/admin-forms';
import { parsePlayerPaste, parseTeamPaste } from '@/lib/krafton-standings';
import type { KraftonBoard } from '@prisma/client';

function requireAdmin() {
  return isAdmin();
}

function refresh(eventId?: string) {
  revalidatePath('/admin/krafton');
  revalidatePath('/rankings');
  try {
    revalidateTag('krafton-rankings', 'max');
  } catch {
    // ignore if called outside action context
  }
  if (eventId) {
    revalidatePath(`/admin/krafton/${eventId}`);
    revalidatePath(`/rankings/team`);
    revalidatePath(`/rankings/player`);
  }
}

export async function saveKraftonEvent(formData: FormData) {
  if (!(await requireAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name');
  const shortName = fStr(formData, 'shortName').trim() || null;
  const endDate = fStr(formData, 'endDate');
  if (!name || !endDate) redirect(`/admin/krafton${id ? `/${id}` : ''}?error=required`);

  const tier = fStr(formData, 'tier') || 'Tier 1';
  const rawTournamentId = fStr(formData, 'tournamentId');
  const tournamentId = rawTournamentId && rawTournamentId.trim() ? rawTournamentId.trim() : null;
  const end = new Date(endDate);

  if (id) {
    await prisma.kraftonEvent.update({
      where: { id },
      data: { name, shortName, endDate: end, tier, tournamentId },
    });
    refresh(id);
    redirect(`/admin/krafton/${id}?saved=1`);
  }
  const created = await prisma.kraftonEvent.create({
    data: { name, shortName, endDate: end, tier, tournamentId },
  });
  refresh(created.id);
  redirect(`/admin/krafton/${created.id}`);
}

export async function duplicateKraftonEvent(formData: FormData) {
  if (!(await requireAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/krafton');

  const event = await prisma.kraftonEvent.findUnique({ where: { id }, include: { entries: true } });
  if (!event) redirect('/admin/krafton');

  const copy = await prisma.kraftonEvent.create({
    data: {
      name: `${event.name} (copy)`,
      shortName: event.shortName,
      endDate: event.endDate,
      tier: event.tier,
      tournamentId: event.tournamentId,
    },
  });
  if (event.entries.length > 0) {
    await prisma.kraftonEntry.createMany({
      data: event.entries.map((e) => ({
        eventId: copy.id,
        board: e.board,
        entityId: e.entityId,
        entityName: e.entityName,
        teamName: e.teamName,
        teamId: e.teamId,
        rank: e.rank,
        finishes: e.finishes,
        mvp: e.mvp,
        finalsMvp: e.finalsMvp,
        igl: e.igl,
        survivor: e.survivor,
        emerging: e.emerging,
      })),
    });
  }
  refresh(copy.id);
  redirect(`/admin/krafton/${copy.id}?saved=copy`);
}

export async function deleteKraftonEvent(formData: FormData) {
  if (!(await requireAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.kraftonEvent.delete({ where: { id } });
  }
  refresh();
  redirect('/admin/krafton');
}

/** Replace one board's entries with pasted rows. */
export async function importKraftonEntries(
  eventId: string,
  board: KraftonBoard,
  text: string
): Promise<{ ok: boolean; imported: number; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, imported: 0, error: 'Unauthorized' };
  try {
    const parsed = board === 'TEAM' ? parseTeamPaste(text) : parsePlayerPaste(text);
    if (parsed.length === 0) return { ok: false, imported: 0, error: 'No valid rows found in the pasted text.' };

    await prisma.kraftonEntry.deleteMany({ where: { eventId, board } });
    await prisma.kraftonEntry.createMany({
      data: parsed.map((r) => ({
        eventId,
        board,
        entityName: r.entityName,
        teamName: board === 'PLAYER' ? (r as { teamName: string }).teamName || null : null,
        rank: board === 'TEAM' ? (r as { rank: number }).rank : 0,
        finishes: board === 'PLAYER' ? (r as { finishes: number }).finishes : 0,
        mvp: board === 'PLAYER' ? (r as { mvp: number }).mvp : 0,
        finalsMvp: board === 'PLAYER' ? (r as { finalsMvp: number }).finalsMvp : 0,
        igl: board === 'PLAYER' ? (r as { igl: number }).igl : 0,
        survivor: board === 'PLAYER' ? (r as { survivor: number }).survivor : 0,
        emerging: board === 'PLAYER' ? (r as { emerging: number }).emerging : 0,
      })),
    });
    refresh(eventId);
    return { ok: true, imported: parsed.length };
  } catch (err) {
    return { ok: false, imported: 0, error: err instanceof Error ? err.message : 'Import failed' };
  }
}

export async function deleteKraftonEntry(entryId: string): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  try {
    await prisma.kraftonEntry.delete({ where: { id: entryId } });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Manually link an entry to a site Team/Player page (propagates to the
    same entity name across the event so all rows stay consistent). */
export async function linkKraftonEntry(
  entryId: string,
  entityId: string
): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  try {
    const entry = await prisma.kraftonEntry.findUnique({ where: { id: entryId } });
    if (!entry) return { ok: false };
    const cleanId = entityId && entityId.trim() ? entityId.trim() : null;
    await prisma.kraftonEntry.updateMany({
      where: { eventId: entry.eventId, board: entry.board, entityName: entry.entityName },
      data: { entityId: cleanId },
    });
    refresh(entry.eventId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}


export async function saveKraftonTransfer(formData: FormData) {
  if (!(await requireAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const fromTeamId = fStr(formData, 'fromTeamId');
  const toTeamId = fStr(formData, 'toTeamId');
  const cutoffDate = (fStr(formData, 'cutoffDate') || fStr(formData, 'cutoff') || '').trim();
  const cutoffTime = (fStr(formData, 'cutoffTime') || '00:00').trim();
  const preferenceRaw = fStr(formData, 'preference');
  const preference = Math.max(1, Math.min(59, preferenceRaw ? parseInt(preferenceRaw, 10) || 1 : 1));

  if (!fromTeamId || !toTeamId || fromTeamId === toTeamId || !cutoffDate) {
    redirect('/admin/krafton?error=transfer');
  }

  const [hStr, mStr] = cutoffTime.split(':');
  const h = Math.max(0, Math.min(23, parseInt(hStr || '0', 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr || '0', 10) || 0));
  const sec = String(preference).padStart(2, '0');

  // Build clean ISO UTC timestamp storing Date, Time, and Preference (in seconds)
  const cutoffObj = new Date(`${cutoffDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${sec}Z`);
  if (isNaN(cutoffObj.getTime())) {
    redirect('/admin/krafton?error=transfer');
  }

  const modeRaw = fStr(formData, 'mode');
  const mode = modeRaw === 'wipe' ? 'wipe' : modeRaw === 'own_only' ? 'own_only' : 'add';
  const amountRaw = fStr(formData, 'amount');
  const amount = amountRaw ? Math.max(0, Math.round(Number(amountRaw))) : null;

  const [from, to] = await Promise.all([
    prisma.team.findUnique({ where: { id: fromTeamId }, select: { name: true } }),
    prisma.team.findUnique({ where: { id: toTeamId }, select: { name: true } }),
  ]);
  if (!from || !to) redirect('/admin/krafton?error=transfer');

  if (id) {
    await prisma.kraftonTransfer.update({
      where: { id },
      data: {
        fromTeamId,
        fromName: from.name,
        toTeamId,
        toName: to.name,
        cutoff: cutoffObj,
        mode,
        amount: amount && amount > 0 ? amount : null,
      },
    });
  } else {
    await prisma.kraftonTransfer.create({
      data: {
        fromTeamId,
        fromName: from.name,
        toTeamId,
        toName: to.name,
        cutoff: cutoffObj,
        mode,
        amount: amount && amount > 0 ? amount : null,
      },
    });
  }
  refresh();
  redirect('/admin/krafton?saved=transfer');
}

export async function deleteKraftonTransfer(formData: FormData | string) {
  if (!(await requireAdmin())) redirect('/admin/login');
  const id = typeof formData === 'string' ? formData : fStr(formData, 'id');
  if (id) {
    try {
      await prisma.kraftonTransfer.delete({ where: { id } });
    } catch (e) {
      console.error('Failed to delete transfer:', e);
    }
  }
  refresh();
  redirect('/admin/krafton?deleted=transfer');
}
