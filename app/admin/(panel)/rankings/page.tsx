import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Copy, Trash2, Plus, Wand2, ClipboardPaste, ArrowLeftRight } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fNum } from '@/lib/admin-forms';
import { loadTransferRules } from '@/lib/ranking-rules';
import {
  computeTeamRankings,
  computePlayerRankings,
  getTeamBasePoints,
  getPlayerBasePoints,
} from '@/lib/krafton-rankings';
import { Combobox } from '@/components/admin/combobox';
import { flattenPrizeRanks } from '@/lib/standings-config';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const TIERS = ['Publisher', 'Tier 1', 'Tier 2', 'Tier 3', 'Qualifier'];

const AWARD_CHIPS: Array<{ key: 'mvpTourney' | 'mvpFinals' | 'igl' | 'survivor' | 'emerging'; label: string }> = [
  { key: 'mvpTourney', label: 'MVP' },
  { key: 'mvpFinals', label: 'Finals MVP' },
  { key: 'igl', label: 'IGL' },
  { key: 'survivor', label: 'Survivor' },
  { key: 'emerging', label: 'Emerging' },
];

/** Maps a prize-distribution award label to a PlayerRanking flag. */
function classifyAward(label: string): 'mvpTourney' | 'mvpFinals' | 'igl' | 'survivor' | 'emerging' | null {
  const l = label.toLowerCase();
  if (l.includes('mvp') && l.includes('final')) return 'mvpFinals';
  if (l.includes('mvp')) return 'mvpTourney';
  if (l.includes('igl')) return 'igl';
  if (l.includes('surviv')) return 'survivor';
  if (l.includes('emerg')) return 'emerging';
  return null;
}

// =================================================================
// Server actions
// =================================================================

async function saveTeamRanking(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const endDate = fDate(formData, 'endDate');
  const teamId = fStr(formData, 'teamId');
  const rank = fNum(formData, 'rank');
  if (!endDate || !teamId || rank === null || rank < 1) {
    redirect(`/admin/rankings?tab=team${id ? `&edit=${id}` : ''}&error=required`);
  }

  const data = {
    tournamentId: fOpt(formData, 'tournamentId'),
    tier: fStr(formData, 'tier') || 'Tier 1',
    endDate,
    teamId,
    rank: Math.round(rank),
  };

  if (id) {
    try {
      await prisma.teamRanking.update({ where: { id }, data });
    } catch {
      redirect(`/admin/rankings?tab=team&edit=${id}&error=save-failed`);
    }
  } else {
    await prisma.teamRanking.create({ data });
  }

  revalidatePath('/admin/rankings');
  redirect('/admin/rankings?tab=team');
}

async function deleteTeamRanking(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) await prisma.teamRanking.delete({ where: { id } });
  revalidatePath('/admin/rankings');
  redirect('/admin/rankings?tab=team');
}

async function savePlayerRanking(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const endDate = fDate(formData, 'endDate');
  const playerId = fStr(formData, 'playerId');
  if (!endDate || !playerId) {
    redirect(`/admin/rankings?tab=player${id ? `&edit=${id}` : ''}&error=required`);
  }

  const flag = (name: string) => (formData.get(name) === 'on' ? 1 : 0);
  const data = {
    tournamentId: fOpt(formData, 'tournamentId'),
    tier: fStr(formData, 'tier') || 'Tier 1',
    endDate,
    playerId,
    teamId: fOpt(formData, 'teamId'),
    finishes: Math.max(0, Math.round(fNum(formData, 'finishes') ?? 0)),
    mvpTourney: flag('mvpTourney'),
    mvpFinals: flag('mvpFinals'),
    igl: flag('igl'),
    survivor: flag('survivor'),
    emerging: flag('emerging'),
  };

  if (id) {
    try {
      await prisma.playerRanking.update({ where: { id }, data });
    } catch {
      redirect(`/admin/rankings?tab=player&edit=${id}&error=save-failed`);
    }
  } else {
    await prisma.playerRanking.create({ data });
  }

  revalidatePath('/admin/rankings');
  redirect('/admin/rankings?tab=player');
}

async function deletePlayerRanking(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) await prisma.playerRanking.delete({ where: { id } });
  revalidatePath('/admin/rankings');
  redirect('/admin/rankings?tab=player');
}

/** Generates TeamRanking + PlayerRanking rows from a tournament's recorded data. */
/** Excluded events (tournament unchecked in its admin form) never feed the rankings.
 *  Rows without a tournament link are treated as the admin's explicit manual choice → included. */
function isRowEligible(tournamentId: string | null, rankingIncluded: boolean | null | undefined) {
  return !tournamentId || rankingIncluded !== false;
}

async function generateFromTournament(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const tournamentId = fStr(formData, 'tournamentId');
  const tier = fStr(formData, 'tier') || 'Tier 1';
  if (!tournamentId) redirect('/admin/rankings?error=required');

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: { include: { team: { select: { id: true, name: true } } } } },
  });
  if (!tournament) redirect('/admin/rankings?error=required');
  if (!tournament.rankingIncluded) redirect('/admin/rankings?error=excluded');

  const endDate = tournament.endDate ?? tournament.startDate ?? new Date();

  // Skip teams/players that already have a ranking row for this event
  const [existingTeamRows, existingPlayerRows] = await Promise.all([
    prisma.teamRanking.findMany({ where: { tournamentId }, select: { teamId: true } }),
    prisma.playerRanking.findMany({ where: { tournamentId }, select: { playerId: true } }),
  ]);
  const existingTeamIds = new Set(existingTeamRows.map((r) => r.teamId));
  const existingPlayerIds = new Set(existingPlayerRows.map((r) => r.playerId));

  // 1. Team rows from final rankings
  let teamsCreated = 0;
  for (const tt of tournament.teams) {
    if (tt.finalRank == null || existingTeamIds.has(tt.teamId)) continue;
    await prisma.teamRanking.create({
      data: { tournamentId, tier, endDate, teamId: tt.teamId, rank: tt.finalRank },
    });
    teamsCreated += 1;
  }

  // 2. Player rows: finishes from match stats, team from most-played team
  const players = await prisma.player.findMany({ select: { id: true, ign: true } });
  const playerById = new Map(players.map((p) => [p.id, p]));
  const playerByName = new Map(players.map((p) => [p.ign.trim().toLowerCase(), p]));

  interface Agg {
    playerId: string;
    finishes: number;
    teamCounts: Map<string, number>;
    flags: { mvpTourney: number; mvpFinals: number; igl: number; survivor: number; emerging: number };
  }
  const agg = new Map<string, Agg>();
  const ensure = (playerId: string) => {
    let a = agg.get(playerId);
    if (!a) {
      a = { playerId, finishes: 0, teamCounts: new Map(), flags: { mvpTourney: 0, mvpFinals: 0, igl: 0, survivor: 0, emerging: 0 } };
      agg.set(playerId, a);
    }
    return a;
  };

  const stats = await prisma.matchPlayerStat.findMany({
    where: { matchGame: { match: { tournamentId } } },
    select: { playerId: true, teamId: true, playerElims: true, kills: true },
  });
  for (const s of stats) {
    const a = ensure(s.playerId);
    a.finishes += Math.max(s.playerElims ?? 0, s.kills ?? 0);
    if (s.teamId) a.teamCounts.set(s.teamId, (a.teamCounts.get(s.teamId) ?? 0) + 1);
  }

  // 3. Award flags from the prize distribution's PLAYER recipients
  const prizeRows = flattenPrizeRanks(tournament.prizeDistribution);
  for (const r of prizeRows) {
    if (!r || r.recipientType !== 'PLAYER') continue;
    const kind = classifyAward(String(r.rank ?? ''));
    if (!kind) continue;
    let player = r.playerId ? playerById.get(String(r.playerId)) : undefined;
    if (!player) {
      const nameKey = (typeof r.playerName === 'string' ? r.playerName : '').trim().toLowerCase();
      player = nameKey ? playerByName.get(nameKey) : undefined;
    }
    if (!player) continue;
    ensure(player.id).flags[kind] = 1;
  }

  // 4. Persist player rows (skip already-present; skip rows with no finishes AND no awards)
  let playersCreated = 0;
  for (const a of agg.values()) {
    if (existingPlayerIds.has(a.playerId)) continue;
    const hasAwards = Object.values(a.flags).some((v) => v > 0);
    if (!a.finishes && !hasAwards) continue;
    const topTeamId = [...a.teamCounts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
    await prisma.playerRanking.create({
      data: {
        tournamentId,
        tier,
        endDate,
        playerId: a.playerId,
        teamId: topTeamId,
        finishes: a.finishes,
        mvpTourney: a.flags.mvpTourney,
        mvpFinals: a.flags.mvpFinals,
        igl: a.flags.igl,
        survivor: a.flags.survivor,
        emerging: a.flags.emerging,
      },
    });
    playersCreated += 1;
  }

  revalidatePath('/admin/rankings');
  redirect(`/admin/rankings?tab=player&generated=t${teamsCreated}-p${playersCreated}`);
}

/** Bulk paste import: one entry per line, tab- or pipe-separated. */
async function bulkImportRankings(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const tab = fStr(formData, 'tab') === 'player' ? 'player' : 'team';
  const text = fStr(formData, 'bulkText');
  if (!text) redirect(`/admin/rankings?tab=${tab}&error=parse`);

  const [teams, players, tournaments] = await Promise.all([
    prisma.team.findMany({ select: { id: true, name: true, tag: true } }),
    prisma.player.findMany({ select: { id: true, ign: true } }),
    prisma.tournament.findMany({ select: { id: true, name: true, rankingIncluded: true } }),
  ]);
  const teamByName = new Map<string, string>();
  for (const t of teams) {
    teamByName.set(t.name.trim().toLowerCase(), t.id);
    if (t.tag) teamByName.set(t.tag.trim().toLowerCase(), t.id);
  }
  const playerByName = new Map(players.map((p) => [p.ign.trim().toLowerCase(), p.id]));
  const tournamentByName = new Map(
    tournaments.map((t) => [t.name.trim().toLowerCase(), { id: t.id, included: t.rankingIncluded }])
  );

  let created = 0;
  let skipped = 0;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = (line.includes('\t') ? line.split('\t') : line.split('|')).map((p) => p.trim());
    const parsedDate = new Date(parts[2] ?? '');
    if (parts.length < 5 || isNaN(parsedDate.getTime())) {
      skipped += 1;
      continue;
    }
    const tournamentRef = tournamentByName.get((parts[0] || '').toLowerCase());
    const tournamentId = tournamentRef?.id ?? null;
    const tier = parts[1] || 'Tier 1';
    if (tournamentRef && !tournamentRef.included) {
      skipped += 1; // event is excluded from KRAFTON rankings
      continue;
    }

    if (tab === 'team') {
      const teamId = teamByName.get((parts[3] || '').toLowerCase());
      const rank = Number(parts[4]);
      if (!teamId || !Number.isFinite(rank) || rank < 1) {
        skipped += 1;
        continue;
      }
      await prisma.teamRanking.create({ data: { tournamentId, tier, endDate: parsedDate, teamId, rank: Math.round(rank) } });
      created += 1;
    } else {
      const playerId = playerByName.get((parts[3] || '').toLowerCase());
      if (!playerId) {
        skipped += 1;
        continue;
      }
      const teamId = teamByName.get((parts[4] || '').toLowerCase()) ?? null;
      const finishes = Math.max(0, Math.round(Number(parts[5]) || 0));
      const flag = (v?: string) => (v === '1' ? 1 : 0);
      await prisma.playerRanking.create({
        data: {
          tournamentId,
          tier,
          endDate: parsedDate,
          playerId,
          teamId,
          finishes,
          mvpTourney: flag(parts[6]),
          mvpFinals: flag(parts[7]),
          igl: flag(parts[8]),
          survivor: flag(parts[9]),
          emerging: flag(parts[10]),
        },
      });
      created += 1;
    }
  }

  revalidatePath('/admin/rankings');
  redirect(`/admin/rankings?tab=${tab}&bulk=${created}-${skipped}`);
}

async function addTransferRule(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const oldTeamId = fStr(formData, 'oldTeamId');
  const newTeamId = fStr(formData, 'newTeamId');
  const before = fDate(formData, 'before');
  if (!oldTeamId || !newTeamId || !before || oldTeamId === newTeamId) {
    redirect('/admin/rankings?error=duprule');
  }

  await prisma.rankingTransferRule.create({ data: { oldTeamId, newTeamId, before } });
  revalidatePath('/admin/rankings');
  redirect('/admin/rankings');
}

async function deleteTransferRule(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) await prisma.rankingTransferRule.delete({ where: { id } });
  revalidatePath('/admin/rankings');
  redirect('/admin/rankings');
}

// =================================================================
// Page
// =================================================================

export default async function AdminRankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string; copy?: string; error?: string; bulk?: string; generated?: string }>;
}) {
  const { tab: tabParam, edit, copy, error, bulk, generated } = await searchParams;
  const tab = tabParam === 'player' ? 'player' : 'team';
  const sourceId = edit ?? copy;
  const isEditing = Boolean(edit && sourceId);

  const [teams, players, tournaments, teamRows, playerRows, rules] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, tag: true } }),
    prisma.player.findMany({
      orderBy: { ign: 'asc' },
      select: { id: true, ign: true, currentTeam: { select: { name: true, tag: true } } },
    }),
    prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, tier: true, startDate: true, endDate: true, rankingIncluded: true },
    }),
    prisma.teamRanking.findMany({
      orderBy: { endDate: 'desc' },
      take: 500,
      include: {
        team: { select: { id: true, name: true, tag: true, slug: true } },
        tournament: { select: { id: true, name: true, rankingIncluded: true } },
      },
    }),
    prisma.playerRanking.findMany({
      orderBy: { endDate: 'desc' },
      take: 500,
      include: {
        player: { select: { id: true, ign: true, slug: true } },
        team: { select: { id: true, name: true, tag: true, slug: true } },
        tournament: { select: { id: true, name: true, rankingIncluded: true } },
      },
    }),
    loadTransferRules(),
  ]);

  const teamEligibleRows = teamRows.filter((r) => isRowEligible(r.tournamentId, r.tournament?.rankingIncluded));
  const playerEligibleRows = playerRows.filter((r) => isRowEligible(r.tournamentId, r.tournament?.rankingIncluded));

  // Live preview — exactly what the public rankings will show
  const teamPreview = computeTeamRankings(
    teamEligibleRows.map((r) => ({
      tournament: r.tournament?.name ?? '—',
      tier: r.tier,
      endDate: r.endDate.toISOString().slice(0, 10),
      team: r.team.name,
      rank: r.rank,
    })),
    new Date(),
    rules
  ).slice(0, 15);

  const playerPreview = computePlayerRankings(
    playerEligibleRows.map((r) => ({
      tournament: r.tournament?.name ?? '—',
      tier: r.tier,
      endDate: r.endDate.toISOString().slice(0, 10),
      player: r.player.ign,
      team: r.team?.name ?? '',
      finishes: r.finishes,
      mvpTourney: r.mvpTourney > 0,
      mvpFinals: r.mvpFinals > 0,
      igl: r.igl > 0,
      survivor: r.survivor > 0,
      emerging: r.emerging > 0,
    })),
    new Date(),
    rules
  ).slice(0, 15);

  const transferRules = await prisma.rankingTransferRule.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      oldTeam: { select: { id: true, name: true, tag: true } },
      newTeam: { select: { id: true, name: true, tag: true } },
    },
  });

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name + (t.tag ? ` [${t.tag}]` : ''),
    keywords: `${t.name} ${t.tag ?? ''}`,
  }));
  const playerOptions = players.map((p) => ({
    value: p.id,
    label: p.ign + (p.currentTeam ? ` — ${p.currentTeam.name}` : ' — Free Agent'),
    keywords: p.currentTeam ? `${p.currentTeam.name} ${p.currentTeam.tag ?? ''}` : '',
  }));
  const tournamentOptions = tournaments.map((t) => ({
    value: t.id,
    label: t.name,
    keywords: t.name,
  }));
  // Generation is only offered for events that count toward the rankings
  const eligibleTournamentOptions = tournaments
    .filter((t) => t.rankingIncluded)
    .map((t) => ({ value: t.id, label: t.name, keywords: t.name }));
  const tierOptions = TIERS.map((t) => ({ value: t, label: t }));

  // Edit/copy source for the active tab
  const editTeamRow = tab === 'team' && sourceId ? teamRows.find((r) => r.id === sourceId) : null;
  const editPlayerRow = tab === 'player' && sourceId ? playerRows.find((r) => r.id === sourceId) : null;
  const source = tab === 'team' ? editTeamRow : editPlayerRow;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-tight">Rankings</h1>
        {source && (
          <Link
            href={`/admin/rankings?tab=${tab}`}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New entry instead
          </Link>
        )}
      </div>

      {error === 'required' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Missing required fields — end date, team/player and a valid rank are mandatory.
        </p>
      )}
      {error === 'duprule' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          A transfer rule needs two different teams and a cutoff date.
        </p>
      )}
      {error === 'parse' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Paste some rows first.
        </p>
      )}
      {error === 'excluded' && (
        <p className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          That event is excluded from KRAFTON rankings — tick &ldquo;Counts toward KRAFTON rankings&rdquo; on the tournament in the Tournaments panel to enable generation.
        </p>
      )}
      {error === 'save-failed' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          The ranking row could not be saved — the selected team, player or tournament no longer exists.
        </p>
      )}
      {bulk && (
        <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Bulk import done — {bulk.split('-')[0]} rows created, {bulk.split('-')[1] ?? 0} skipped (unknown team/player or bad date/rank).
        </p>
      )}
      {generated && (
        <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Generated from tournament — {generated.replace('t', '').split('-p')[0]} team rows, {generated.split('-p')[1] ?? 0} player rows created (existing entries skipped).
        </p>
      )}

      {/* ── Live preview ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Preview — Teams</h2>
            <span className="text-[10px] font-bold uppercase text-slate-400">Decay-adjusted · live</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                <th className="py-2 px-3 text-left">#</th>
                <th className="py-2 px-3 text-left">Team</th>
                <th className="py-2 px-3 text-center">Events</th>
                <th className="py-2 px-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {teamPreview.map((t) => (
                <tr key={t.name}>
                  <td className="py-2 px-3 font-mono text-xs text-slate-400">{t.rank}</td>
                  <td className="py-2 px-3 font-bold">{t.name}</td>
                  <td className="py-2 px-3 text-center text-slate-500">{t.events}</td>
                  <td className="py-2 px-3 text-right font-black text-(--ed-blue) dark:text-blue-300">{t.points.toFixed(2)}</td>
                </tr>
              ))}
              {teamPreview.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-400">No team ranking rows yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Preview — Players</h2>
            <span className="text-[10px] font-bold uppercase text-slate-400">Decay-adjusted · live</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                <th className="py-2 px-3 text-left">#</th>
                <th className="py-2 px-3 text-left">Player</th>
                <th className="py-2 px-3 text-center">Finishes</th>
                <th className="py-2 px-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {playerPreview.map((p) => (
                <tr key={p.name}>
                  <td className="py-2 px-3 font-mono text-xs text-slate-400">{p.rank}</td>
                  <td className="py-2 px-3">
                    <span className="font-bold">{p.name}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.team || 'Free Agent'}</span>
                  </td>
                  <td className="py-2 px-3 text-center text-slate-500">{p.totalFinishes}</td>
                  <td className="py-2 px-3 text-right font-black text-(--ed-blue) dark:text-blue-300">{p.points.toFixed(2)}</td>
                </tr>
              ))}
              {playerPreview.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-400">No player ranking rows yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {(['team', 'player'] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/rankings?tab=${t}`}
            className={
              'px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ' +
              (tab === t
                ? 'border-(--ed-blue) text-(--ed-blue)'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')
            }
          >
            {t === 'team' ? 'Team rankings' : 'Player rankings'}
          </Link>
        ))}
      </div>

      {tab === 'team' ? (
        <>
          {/* Team add/edit form */}
          <details open={Boolean(source)}>
            <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              {source ? `Editing: ${editTeamRow?.team.name} — ${editTeamRow?.tournament?.name ?? 'manual'}` : 'Add Team Ranking Entry'}
            </summary>
            <form
              action={saveTeamRanking}
              key={`team-${sourceId ?? 'new'}`}
              className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
            >
              {isEditing && <input type="hidden" name="id" value={sourceId ?? ''} />}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className={labelCls}>Tournament</label>
                  <Combobox name="tournamentId" options={tournamentOptions} defaultValue={editTeamRow?.tournamentId ?? ''} emptyOptionLabel="— Manual entry —" placeholder="Type a tournament…" ariaLabel="Tournament" />
                </div>
                <div>
                  <label className={labelCls}>Tier *</label>
                  <Combobox name="tier" options={tierOptions} defaultValue={editTeamRow?.tier ?? 'Tier 1'} freeText placeholder="Publisher / Tier 1…" ariaLabel="Tier" />
                </div>
                <div>
                  <label className={labelCls}>End Date *</label>
                  <input type="date" name="endDate" required defaultValue={editTeamRow ? editTeamRow.endDate.toISOString().slice(0, 10) : ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Team *</label>
                  <Combobox name="teamId" options={teamOptions} defaultValue={editTeamRow?.teamId ?? ''} placeholder="Type a team…" ariaLabel="Team" />
                </div>
                <div>
                  <label className={labelCls}>Rank *</label>
                  <input type="number" name="rank" min={1} required defaultValue={editTeamRow?.rank ?? ''} className={inputCls} />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors">
                {isEditing ? 'Update Entry' : 'Create Entry'}
              </button>
            </form>
          </details>

          {/* Team bulk paste */}
          <details>
            <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
              <ClipboardPaste className="w-3.5 h-3.5" /> Bulk Paste Team Rows
            </summary>
            <form action={bulkImportRankings} className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-3">
              <input type="hidden" name="tab" value="team" />
              <p className="text-[11px] text-slate-500">
                One entry per line, tab- or pipe-separated:{' '}
                <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">tournament | tier | end_date | team | rank</code>
              </p>
              <textarea name="bulkText" rows={6} className={`${inputCls} font-mono text-xs`} placeholder={'BGIS 2026 | Tier 1 | 2026-05-10 | Team Soul | 1\nBMPS 2026 | Tier 1 | 2026-06-15 | Team Soul | 2'} />
              <button type="submit" className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors">
                Import Rows
              </button>
            </form>
          </details>

          {/* Team list */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                  <th className="py-2.5 px-3 text-left">Team</th>
                  <th className="py-2.5 px-3 text-left hidden sm:table-cell">Tournament</th>
                  <th className="py-2.5 px-3 text-left">Tier</th>
                  <th className="py-2.5 px-3 text-left hidden md:table-cell">End Date</th>
                  <th className="py-2.5 px-3 text-center">Rank</th>
                  <th className="py-2.5 px-3 text-center">Base Pts</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {teamRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                    <td className="py-2.5 px-3 font-bold">{r.team.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">
                      {r.tournament?.name ?? '—'}
                      {r.tournament && !r.tournament.rankingIncluded && (
                        <span className="ml-2 rounded bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Excluded
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3"><span className="ed-chip px-1.5 py-0.5 text-[10px]">{r.tier}</span></td>
                    <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{r.endDate.toISOString().slice(0, 10)}</td>
                    <td className="py-2.5 px-3 text-center font-mono">#{r.rank}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-(--ed-blue) dark:text-blue-300">
                      {getTeamBasePoints(r.tier, r.rank) || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center justify-end gap-1.5">
                        <Link href={`/admin/rankings?tab=team&edit=${r.id}`} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors" aria-label="Edit entry">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <Link href={`/admin/rankings?tab=team&copy=${r.id}`} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors" aria-label="Duplicate entry">
                          <Copy className="w-3.5 h-3.5" />
                        </Link>
                        <form action={deleteTeamRanking}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors" aria-label="Delete entry">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </span>
                    </td>
                  </tr>
                ))}
                {teamRows.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-slate-400">No team ranking entries yet — add one above, bulk paste, or generate from a tournament.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Player add/edit form */}
          <details open={Boolean(source)}>
            <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              {source ? `Editing: ${editPlayerRow?.player.ign}` : 'Add Player Ranking Entry'}
            </summary>
            <form
              action={savePlayerRanking}
              key={`player-${sourceId ?? 'new'}`}
              className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
            >
              {isEditing && <input type="hidden" name="id" value={sourceId ?? ''} />}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <div>
                  <label className={labelCls}>Tournament</label>
                  <Combobox name="tournamentId" options={tournamentOptions} defaultValue={editPlayerRow?.tournamentId ?? ''} emptyOptionLabel="— Manual entry —" placeholder="Type a tournament…" ariaLabel="Tournament" />
                </div>
                <div>
                  <label className={labelCls}>Tier *</label>
                  <Combobox name="tier" options={tierOptions} defaultValue={editPlayerRow?.tier ?? 'Tier 1'} freeText placeholder="Publisher / Tier 1…" ariaLabel="Tier" />
                </div>
                <div>
                  <label className={labelCls}>End Date *</label>
                  <input type="date" name="endDate" required defaultValue={editPlayerRow ? editPlayerRow.endDate.toISOString().slice(0, 10) : ''} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Player *</label>
                  <Combobox name="playerId" options={playerOptions} defaultValue={editPlayerRow?.playerId ?? ''} placeholder="Type an IGN…" ariaLabel="Player" />
                </div>
                <div>
                  <label className={labelCls}>Team</label>
                  <Combobox name="teamId" options={teamOptions} defaultValue={editPlayerRow?.teamId ?? ''} emptyOptionLabel="— Free Agent —" placeholder="Type a team…" ariaLabel="Team" />
                </div>
                <div>
                  <label className={labelCls}>Finishes (elims)</label>
                  <input type="number" name="finishes" min={0} defaultValue={editPlayerRow?.finishes ?? 0} className={inputCls} />
                </div>
              </div>
              <fieldset className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <legend className={labelCls}>Awards (flat bonus points)</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {AWARD_CHIPS.map(({ key, label }) => (
                    <label key={key} className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        name={key}
                        defaultChecked={editPlayerRow ? editPlayerRow[key] > 0 : false}
                        className="h-4 w-4 rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="submit" className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors">
                {isEditing ? 'Update Entry' : 'Create Entry'}
              </button>
            </form>
          </details>

          {/* Player bulk paste */}
          <details>
            <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
              <ClipboardPaste className="w-3.5 h-3.5" /> Bulk Paste Player Rows
            </summary>
            <form action={bulkImportRankings} className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-3">
              <input type="hidden" name="tab" value="player" />
              <p className="text-[11px] text-slate-500">
                One entry per line, tab- or pipe-separated:{' '}
                <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">tournament | tier | end_date | player | team | finishes | mvp | mvp_finals | igl | survivor | emerging</code>{' '}
                — flags are 1 or 0, unknown teams become Free Agent.
              </p>
              <textarea name="bulkText" rows={6} className={`${inputCls} font-mono text-xs`} placeholder={'BGIS 2026 | Tier 1 | 2026-05-10 | Jonathan | GodLike | 68 | 1 | 0 | 0 | 0 | 0'} />
              <button type="submit" className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors">
                Import Rows
              </button>
            </form>
          </details>

          {/* Player list */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                  <th className="py-2.5 px-3 text-left">Player</th>
                  <th className="py-2.5 px-3 text-left hidden sm:table-cell">Team</th>
                  <th className="py-2.5 px-3 text-left hidden md:table-cell">Tournament</th>
                  <th className="py-2.5 px-3 text-left">Tier</th>
                  <th className="py-2.5 px-3 text-left hidden lg:table-cell">End Date</th>
                  <th className="py-2.5 px-3 text-center">Finishes</th>
                  <th className="py-2.5 px-3 text-center">Awards</th>
                  <th className="py-2.5 px-3 text-center">Base Pts</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {playerRows.map((r) => {
                  const base = getPlayerBasePoints(r.finishes, r.tier, {
                    mvpTourney: r.mvpTourney > 0,
                    mvpFinals: r.mvpFinals > 0,
                    igl: r.igl > 0,
                    survivor: r.survivor > 0,
                    emerging: r.emerging > 0,
                  });
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                      <td className="py-2.5 px-3 font-bold">{r.player.ign}</td>
                      <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">{r.team?.name ?? '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">
                        {r.tournament?.name ?? '—'}
                        {r.tournament && !r.tournament.rankingIncluded && (
                          <span className="ml-2 rounded bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            Excluded
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3"><span className="ed-chip px-1.5 py-0.5 text-[10px]">{r.tier}</span></td>
                      <td className="py-2.5 px-3 text-slate-500 hidden lg:table-cell">{r.endDate.toISOString().slice(0, 10)}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{r.finishes}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex gap-1 flex-wrap justify-center">
                          {AWARD_CHIPS.filter(({ key }) => r[key] > 0).map(({ key, label }) => (
                            <span key={key} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">{label}</span>
                          ))}
                          {AWARD_CHIPS.every(({ key }) => r[key] === 0) && <span className="text-slate-400 text-xs">—</span>}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-(--ed-blue) dark:text-blue-300">{base || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="flex items-center justify-end gap-1.5">
                          <Link href={`/admin/rankings?tab=player&edit=${r.id}`} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors" aria-label="Edit entry">
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/admin/rankings?tab=player&copy=${r.id}`} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors" aria-label="Duplicate entry">
                            <Copy className="w-3.5 h-3.5" />
                          </Link>
                          <form action={deletePlayerRanking}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors" aria-label="Delete entry">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {playerRows.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-xs text-slate-400">No player ranking entries yet — add one above, bulk paste, or generate from a tournament.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Generate from tournament ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-(--ed-blue)" /> Generate from Tournament
        </h2>
        <p className="text-[11px] text-slate-500 mb-3">
          Creates team rows from the event&rsquo;s final rankings and player rows from match-stats finishes + MVP/IGL/Survivor/Emerging award winners.
          Existing entries for the event are skipped.
        </p>
        <form action={generateFromTournament} className="grid grid-cols-1 sm:grid-cols-[1fr_12rem_auto] gap-3 items-end">
          <div>
            <label className={labelCls}>Tournament * (ranking-eligible events only)</label>
            <Combobox name="tournamentId" options={eligibleTournamentOptions} placeholder="Type a tournament…" ariaLabel="Tournament to generate from" />
          </div>
          <div>
            <label className={labelCls}>Ranking Tier</label>
            <Combobox name="tier" options={tierOptions} defaultValue="Tier 1" freeText ariaLabel="Ranking tier" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors h-[38px]">
            Generate
          </button>
        </form>
      </div>

      {/* ── Point transfer rules ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-(--ed-blue)" /> Point Transfer Rules (Roster Acquisitions)
        </h2>
        <p className="text-[11px] text-slate-500 mb-3">
          Points the old org earned <strong>on or before</strong> the cutoff date are attributed to the acquiring org. Earlier events resolve recursively
          (e.g. an org acquired twice). These rules apply to both team and player rankings.
        </p>

        {transferRules.length > 0 && (
          <div className="overflow-x-auto mb-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                  <th className="py-2 px-3 text-left">Points before cutoff move</th>
                  <th className="py-2 px-3 text-left">From</th>
                  <th className="py-2 px-3 text-left">To</th>
                  <th className="py-2 px-3 text-left">Cutoff</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transferRules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-2 text-xs font-bold">
                        <span>{rule.oldTeam.name}</span>
                        <ArrowLeftRight className="w-3 h-3 text-(--ed-blue)" />
                        <span className="text-(--ed-blue) dark:text-blue-300">{rule.newTeam.name}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500">{rule.oldTeam.name}</td>
                    <td className="py-2 px-3 text-slate-500">{rule.newTeam.name}</td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-500">{rule.before.toISOString().slice(0, 10)}</td>
                    <td className="py-2 px-3 text-right">
                      <form action={deleteTransferRule}>
                        <input type="hidden" name="id" value={rule.id} />
                        <button type="submit" className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors" aria-label="Delete rule">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={addTransferRule} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_10rem_auto] gap-3 items-end">
          <div>
            <label className={labelCls}>Old Org *</label>
            <Combobox name="oldTeamId" options={teamOptions} placeholder="Team whose points move…" ariaLabel="Old team" />
          </div>
          <div>
            <label className={labelCls}>Acquiring Org *</label>
            <Combobox name="newTeamId" options={teamOptions} placeholder="Team receiving points…" ariaLabel="New team" />
          </div>
          <div>
            <label className={labelCls}>Cutoff Date *</label>
            <input type="date" name="before" required className={inputCls} />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors h-[38px]">
            Add Rule
          </button>
        </form>
      </div>
    </div>
  );
}
