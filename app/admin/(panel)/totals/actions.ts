'use server';

/**
 * Server actions for REPORTED tournament totals — the match-free DAY → STAGE →
 * EVENT ladder entered by hand when an event has no match-by-match scorecards.
 *
 * These actions never touch Match / MatchGame / MatchPlayerStat / MatchTeamResult.
 * They also enforce the one rule the ladder depends on: a parent level cannot be
 * entered while its children exist, because a parent is only ever read from its
 * own row when it has no children — letting both exist is how a total gets
 * double-counted.
 */

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr } from '@/lib/admin-forms';
import { parsePlayerTotalsPaste, parseTeamTotalsPaste } from '@/lib/tournament-totals-import';
import { sliceKey, type AggregateScopeValue } from '@/lib/tournament-totals';

const SCOPES: readonly AggregateScopeValue[] = ['DAY', 'STAGE', 'EVENT'];

function back(tournamentId: string, query: string) {
  return `/admin/totals?tournament=${tournamentId}&${query}`;
}

/**
 * A parent level may not be entered while children exist — per kind, because the
 * team ladder and the player ladder are independent of one another.
 */
async function hasChildren(
  tournamentId: string,
  scope: AggregateScopeValue,
  stageId: string | null,
  kind: 'TEAM' | 'PLAYER',
): Promise<boolean> {
  if (scope === 'DAY') return false;

  if (scope === 'STAGE') {
    const where = { tournamentId, scope: 'DAY' as const, stageId };
    return kind === 'TEAM'
      ? (await prisma.tournamentTeamTotals.count({ where })) > 0
      : (await prisma.tournamentPlayerTotals.count({ where })) > 0;
  }

  const where = { tournamentId, scope: { in: ['STAGE', 'DAY'] as AggregateScopeValue[] } };
  return kind === 'TEAM'
    ? (await prisma.tournamentTeamTotals.count({ where })) > 0
    : (await prisma.tournamentPlayerTotals.count({ where })) > 0;
}

export async function saveReportedTotals(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const tournamentId = fStr(formData, 'tournamentId');
  const kind = fStr(formData, 'kind') === 'PLAYER' ? 'PLAYER' : 'TEAM';
  const rawScope = fStr(formData, 'scope') as AggregateScopeValue;
  const scope: AggregateScopeValue = SCOPES.includes(rawScope) ? rawScope : 'EVENT';
  const stageId = fStr(formData, 'stageId') || null;
  const label = fStr(formData, 'label');
  const paste = String(formData.get('paste') ?? '');

  if (!tournamentId) redirect('/admin/totals');
  if (scope === 'STAGE' && !stageId) redirect(back(tournamentId, 'totals=need-stage'));
  if (scope === 'DAY' && !label) redirect(back(tournamentId, 'totals=need-label'));
  if (!paste.trim()) redirect(back(tournamentId, 'totals=empty'));

  if (await hasChildren(tournamentId, scope, stageId, kind)) {
    redirect(back(tournamentId, `totals=conflict&scope=${scope}`));
  }

  // Parsed per kind so each branch below narrows to its own row shape.
  const parsedTeam = kind === 'TEAM' ? parseTeamTotalsPaste(paste) : null;
  const parsedPlayer = kind === 'PLAYER' ? parsePlayerTotalsPaste(paste) : null;
  const parsed = parsedTeam ?? parsedPlayer;
  if (!parsed) redirect('/admin/totals');
  if (parsed.error) {
    redirect(back(tournamentId, `totals=parse&msg=${encodeURIComponent(parsed.error)}`));
  }
  if (parsed.rows.length === 0) redirect(back(tournamentId, 'totals=empty'));

  const key = sliceKey({ scope, stageId, label });
  const notes = new URLSearchParams({ totals: 'ok', rows: String(parsed.rows.length) });
  if (parsed.skipped > 0) notes.set('skipped', String(parsed.skipped));
  if (parsed.unrecognisedHeaders.length > 0) {
    notes.set('headers', parsed.unrecognisedHeaders.slice(0, 6).join(', '));
  }

  if (parsedTeam) {
    const names = parsedTeam.rows.map((row) => row.team);
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { name: { in: names, mode: 'insensitive' } },
          { tag: { in: names, mode: 'insensitive' } },
          { slug: { in: names.map((name) => name.toLowerCase().replace(/\s+/g, '-')), mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, tag: true, slug: true },
    });

    const byName = new Map<string, string>();
    for (const team of teams) {
      byName.set(team.name.toLowerCase(), team.id);
      if (team.tag) byName.set(team.tag.toLowerCase(), team.id);
      if (team.slug) byName.set(team.slug.toLowerCase(), team.id);
    }

    const missing: string[] = [];
    for (const row of parsedTeam.rows) {
      const teamId = byName.get(row.team.toLowerCase());
      if (!teamId) {
        missing.push(row.team);
        continue;
      }
      await prisma.tournamentTeamTotals.upsert({
        where: { tournamentId_sliceKey_teamId: { tournamentId, sliceKey: key, teamId } },
        create: { tournamentId, scope, stageId, label, sliceKey: key, teamId, ...row.metrics },
        update: { scope, stageId, label, ...row.metrics },
      });
    }
    if (missing.length > 0) notes.set('missing', missing.slice(0, 8).join(', '));
  } else if (parsedPlayer) {
    const names = parsedPlayer.rows.map((row) => row.player);
    const players = await prisma.player.findMany({
      where: { ign: { in: names, mode: 'insensitive' } },
      select: { id: true, ign: true },
    });
    const playerByName = new Map(players.map((player) => [player.ign.toLowerCase(), player.id]));

    // A reported row may name the team the player turned out for; it is optional.
    const teamNames = [
      ...new Set(
        parsedPlayer.rows
          .map((row) => row.team)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    const teams = teamNames.length
      ? await prisma.team.findMany({
          where: {
            OR: [
              { name: { in: teamNames, mode: 'insensitive' } },
              { tag: { in: teamNames, mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, tag: true },
        })
      : [];
    const teamByName = new Map<string, string>();
    for (const team of teams) {
      teamByName.set(team.name.toLowerCase(), team.id);
      if (team.tag) teamByName.set(team.tag.toLowerCase(), team.id);
    }

    const missing: string[] = [];
    for (const row of parsedPlayer.rows) {
      const playerId = playerByName.get(row.player.toLowerCase());
      if (!playerId) {
        missing.push(row.player);
        continue;
      }
      const teamId = row.team ? teamByName.get(row.team.toLowerCase()) ?? null : null;
      await prisma.tournamentPlayerTotals.upsert({
        where: { tournamentId_sliceKey_playerId: { tournamentId, sliceKey: key, playerId } },
        create: { tournamentId, scope, stageId, label, sliceKey: key, playerId, teamId, ...row.metrics },
        update: { scope, stageId, label, teamId, ...row.metrics },
      });
    }
    if (missing.length > 0) notes.set('missing', missing.slice(0, 8).join(', '));
  }

  revalidatePath('/admin/totals');
  redirect(back(tournamentId, notes.toString()));
}

export async function deleteReportedTotals(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login');

  const tournamentId = fStr(formData, 'tournamentId');
  const id = fStr(formData, 'id');
  const kind = fStr(formData, 'kind') === 'PLAYER' ? 'PLAYER' : 'TEAM';
  if (!tournamentId || !id) redirect('/admin/totals');

  if (kind === 'PLAYER') await prisma.tournamentPlayerTotals.delete({ where: { id } }).catch(() => null);
  else await prisma.tournamentTeamTotals.delete({ where: { id } }).catch(() => null);

  revalidatePath('/admin/totals');
  redirect(back(tournamentId, 'totals=deleted'));
}
