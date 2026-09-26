'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { KRAFTON_CACHE_TAG } from '@/lib/krafton-data';
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
  // Profile ranks come from the same board, and the route caches hold a rendered
  // copy — clear both, or an entry shows on the board while profiles keep the old
  // number until their own window expires.
  revalidatePath('/players/[slug]', 'page');
  revalidatePath('/teams/[slug]', 'page');
  try {
    // `expire: 0` rather than 'max': 'max' is stale-while-revalidate, which serves
    // the old board to the next visitor instead of waiting for the fresh one.
    revalidateTag(KRAFTON_CACHE_TAG, { expire: 0 });
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

/**
 * Replace one board's entries with pasted rows.
 *
 * The replacement is intended — repasting a board overwrites the previous one. What
 * is not intended is being left with NO board, which is what the old two-statement
 * form did: `deleteMany` committed, then a failing `createMany` returned an error
 * that read like "import failed" while the board was already gone.
 *
 * So the delete and the insert run in a single transaction: either the board is
 * fully replaced or it is left exactly as it was. Do not split them apart again.
 *
 * The likeliest way that insert fails is a name repeated in the paste, because
 * `entityName` is unique per (event, board) — and neither paste parser de-duplicates.
 * That case is caught by name before anything is written, so the admin is told which
 * line to fix instead of reading a raw constraint error.
 */
export async function importKraftonEntries(
  eventId: string,
  board: KraftonBoard,
  text: string
): Promise<{ ok: boolean; imported: number; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, imported: 0, error: 'Unauthorized' };
  try {
    const parsed = board === 'TEAM' ? parseTeamPaste(text) : parsePlayerPaste(text);
    if (parsed.length === 0) return { ok: false, imported: 0, error: 'No valid rows found in the pasted text.' };

    // Names that repeat, or that are blank. Reported verbatim so the admin can find
    // the offending line in the sheet they pasted from.
    const names = parsed.map((r) => r.entityName.trim());
    const repeated = [...new Set(names.filter((name, idx) => name !== '' && names.indexOf(name) !== idx))];
    const problems: string[] = [];
    if (repeated.length > 0) problems.push(`these names appear more than once: ${repeated.join(', ')}`);
    if (names.some((name) => name === '')) problems.push('at least one row has a blank name');
    if (problems.length > 0) {
      return {
        ok: false,
        imported: 0,
        error: `Nothing was changed — ${problems.join(', and ')}. Fix the sheet and paste again.`,
      };
    }

    await prisma.$transaction([
      prisma.kraftonEntry.deleteMany({ where: { eventId, board } }),
      prisma.kraftonEntry.createMany({
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
      }),
    ]);
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
    await prisma.kraftonEntry.updateMany({
      where: { eventId: entry.eventId, board: entry.board, entityName: entry.entityName },
      data: { entityId: entityId || null },
    });
    refresh(entry.eventId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Swap rank values with the adjacent row (same event + board). */
export async function moveKraftonEntry(
  entryId: string,
  direction: 'up' | 'down'
): Promise<{ ok: boolean }> {
  if (!(await requireAdmin())) return { ok: false };
  try {
    const entry = await prisma.kraftonEntry.findUnique({ where: { id: entryId } });
    if (!entry) return { ok: false };
    const neighbour = await prisma.kraftonEntry.findFirst({
      where: {
        eventId: entry.eventId,
        board: entry.board,
        ...(direction === 'up'
          ? { rank: { lt: entry.rank || 0 } }
          : { rank: { gt: entry.rank || 0 } }),
      },
      orderBy: direction === 'up' ? { rank: 'desc' } : { rank: 'asc' },
    });
    if (!neighbour) return { ok: true };
    const a = entry.rank || 0;
    const b = neighbour.rank || 0;
    await prisma.$transaction([
      prisma.kraftonEntry.update({ where: { id: entry.id }, data: { rank: b } }),
      prisma.kraftonEntry.update({ where: { id: neighbour.id }, data: { rank: a } }),
    ]);
    refresh(entry.eventId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Auto-link unlinked rows to site Team/Player pages by name/IGN match. */
export async function autoLinkKraftonEntries(
  eventId: string,
  board: KraftonBoard
): Promise<{ ok: boolean; linked: number; unmatched: string[]; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, linked: 0, unmatched: [] };
  try {
    const unlinked = await prisma.kraftonEntry.findMany({
      where: { eventId, board, entityId: null },
    });
    let linked = 0;
    const unmatched: string[] = [];

    for (const row of unlinked) {
      const name = row.entityName.trim();
      if (board === 'TEAM') {
        const exact = await prisma.team.findFirst({
          where: { OR: [{ name: name }, { tag: name }] },
          select: { id: true },
        });
        const loose = exact ?? (await prisma.team.findFirst({
          where: { name: { contains: name, mode: 'insensitive' } },
          select: { id: true },
        }));
        if (loose) {
          await prisma.kraftonEntry.update({ where: { id: row.id }, data: { entityId: loose.id } });
          linked++;
        } else {
          unmatched.push(name);
        }
      } else {
        const exact = await prisma.player.findFirst({
          where: { ign: name },
          select: { id: true },
        });
        const loose = exact ?? (await prisma.player.findFirst({
          where: { ign: { contains: name, mode: 'insensitive' } },
          select: { id: true },
        }));
        if (loose) {
          await prisma.kraftonEntry.update({ where: { id: row.id }, data: { entityId: loose.id } });
          linked++;
        } else {
          unmatched.push(name);
        }
      }
    }
    refresh(eventId);
    return { ok: true, linked, unmatched };
  } catch {
    return { ok: false, linked: 0, unmatched: [] };
  }
}

/** Import placements/finishes from a site tournament into this ranking event.
 * Per rules: Team placements come from final ranks/standings, and player finishes
 * are strictly pulled from the Grand Finals stage.
 */
export async function importKraftonEntriesFromTournament(
  eventId: string,
  tournamentId: string
): Promise<{ ok: boolean; teams: number; players: number; stageName?: string; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, teams: 0, players: 0, error: 'Unauthorized' };
  try {
    // Teams: final placements (finalRank when set), else seed/roster order
    const tournamentTeams = await prisma.tournamentTeam.findMany({
      where: { tournamentId },
      include: { team: { select: { id: true, name: true, displayName: true } } },
      orderBy: [{ finalRank: { sort: 'asc', nulls: 'last' } }, { seed: 'asc' }],
    });
    if (tournamentTeams.length === 0) {
      return { ok: false, teams: 0, players: 0, error: 'That tournament has no participating teams.' };
    }

    const filledTeams = tournamentTeams.filter(
      (tt): tt is typeof tt & { teamId: string; team: NonNullable<typeof tt.team> } =>
        tt.teamId !== null && tt.team !== null
    );

    // A seat has no team to rank, so it cannot become an entry — and the ordinal
    // fallback must not leave gaps where seats were skipped.
    const teamEntries = filledTeams.map((tt, i) => ({
      eventId,
      board: 'TEAM' as const,
      entityId: tt.teamId,
      entityName: tt.team.displayName || tt.team.name,
      rank: tt.finalRank ?? i + 1,
    }));

    // Identify Grand Finals stage strictly (or final sequence stage)
    const stages = await prisma.tournamentStage.findMany({
      where: { tournamentId },
      orderBy: { sequence: 'desc' },
      select: { id: true, name: true, sequence: true },
    });
    const grandFinalsStage =
      stages.find((s) => /grand\s*finals?|finals?/i.test(s.name)) ||
      stages[0] ||
      null;

    const gfMatches = grandFinalsStage
      ? await prisma.match.findMany({ where: { tournamentId, stageId: grandFinalsStage.id }, select: { id: true } })
      : await prisma.match.findMany({ where: { tournamentId }, select: { id: true } });
    const gfMatchIds = gfMatches.map((m) => m.id);

    // Players: aggregate finishes strictly from Grand Finals matches
    const statGroups = gfMatchIds.length
      ? await prisma.matchPlayerStat.groupBy({
          by: ['playerId'],
          where: { matchGame: { matchId: { in: gfMatchIds } } },
          _sum: { playerElims: true },
          _count: { _all: true },
        })
      : [];
    const topPlayers = statGroups
      .sort((a, b) => (b._sum?.playerElims ?? 0) - (a._sum?.playerElims ?? 0))
      .slice(0, 100);
    const playerIds = topPlayers.map((p) => p.playerId);
    const playerMetas = playerIds.length
      ? await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, ign: true, currentTeam: { select: { name: true } } },
        })
      : [];
    const metaById = new Map(playerMetas.map((p) => [p.id, p]));

    await prisma.$transaction([
      prisma.kraftonEntry.deleteMany({ where: { eventId, board: 'TEAM' } }),
      prisma.kraftonEntry.deleteMany({ where: { eventId, board: 'PLAYER' } }),
      prisma.kraftonEntry.createMany({ data: teamEntries }),
      prisma.kraftonEntry.createMany({
        data: topPlayers.map((p, i) => {
          const meta = metaById.get(p.playerId);
          return {
            eventId,
            board: 'PLAYER' as const,
            entityId: p.playerId,
            entityName: meta?.ign ?? 'Unknown',
            teamName: meta?.currentTeam?.name ?? null,
            teamId: null,
            rank: i + 1,
            finishes: p._sum?.playerElims ?? 0,
          };
        }),
      }),
      prisma.kraftonEvent.update({
        where: { id: eventId },
        data: { tournament: { connect: { id: tournamentId } } },
      }),
    ]);

    refresh(eventId);
    return {
      ok: true,
      teams: teamEntries.length,
      players: topPlayers.length,
      stageName: grandFinalsStage?.name ?? 'All Matches',
    };
  } catch (err) {
    return { ok: false, teams: 0, players: 0, error: err instanceof Error ? err.message : 'Import failed' };
  }
}

/** Create or update a single entry (rank, finishes, awards, entity name). */
export async function saveSingleKraftonEntry(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (!(await requireAdmin())) return { ok: false, error: 'Unauthorized' };
  const id = fStr(formData, 'id');
  const eventId = fStr(formData, 'eventId');
  const board = (fStr(formData, 'board') || 'TEAM') as KraftonBoard;
  const entityName = fStr(formData, 'entityName');
  const entityId = fStr(formData, 'entityId') || null;
  const teamName = fStr(formData, 'teamName') || null;
  const rank = Math.max(0, parseInt(fStr(formData, 'rank') || '0', 10));
  const finishes = Math.max(0, parseInt(fStr(formData, 'finishes') || '0', 10));
  const mvp = Math.max(0, parseInt(fStr(formData, 'mvp') || '0', 10));
  const finalsMvp = Math.max(0, parseInt(fStr(formData, 'finalsMvp') || '0', 10));
  const igl = Math.max(0, parseInt(fStr(formData, 'igl') || '0', 10));
  const survivor = Math.max(0, parseInt(fStr(formData, 'survivor') || '0', 10));
  const emerging = Math.max(0, parseInt(fStr(formData, 'emerging') || '0', 10));

  if (!entityName || !eventId) return { ok: false, error: 'Name and event ID are required.' };

  try {
    if (id) {
      await prisma.kraftonEntry.update({
        where: { id },
        data: {
          entityName,
          entityId,
          teamName,
          rank,
          finishes,
          mvp,
          finalsMvp,
          igl,
          survivor,
          emerging,
        },
      });
    } else {
      await prisma.kraftonEntry.create({
        data: {
          eventId,
          board,
          entityName,
          entityId,
          teamName,
          rank,
          finishes,
          mvp,
          finalsMvp,
          igl,
          survivor,
          emerging,
        },
      });
    }
    refresh(eventId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}
