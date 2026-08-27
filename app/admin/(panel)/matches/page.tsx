import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, Swords, Crosshair, Trophy, Shield, Users, Flame, Sparkles } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fNum } from '@/lib/admin-forms';
import {
  STAGE_TYPES,
  BGMI_PUBGM_MAPS,
  EVENT_TYPES,
  getPlacementPoints,
  computeUtilitiesTotal,
  computeTotalDistance,
  computeTotalPoints,
} from '@/lib/tournament-math';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const MATCH_STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED'];

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  LIVE: 'bg-rose-500 text-white animate-pulse',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  POSTPONED: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
};

// ---------------------------------------------------------------- server actions

async function saveMatch(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const tournamentId = fStr(formData, 'tournamentId');
  const gameId = fStr(formData, 'gameId');
  const scheduledAt = fDate(formData, 'scheduledAt');
  const matchNumber = fNum(formData, 'matchNumber') ?? 1;
  const mapName = fStr(formData, 'mapName') || 'Erangel';
  const stageType = fStr(formData, 'stageType') || 'Grand Finals';
  const groupName = fOpt(formData, 'groupName');
  const matchType = fStr(formData, 'matchType') || 'LAN';
  const matchTime = fOpt(formData, 'matchTime');

  if (!tournamentId || !gameId || !scheduledAt) {
    redirect(`/admin/matches?error=required${id ? `&edit=${id}` : ''}`);
  }

  const format = `Match ${matchNumber} - ${mapName}${groupName ? ` (${groupName})` : ''}`;

  const data = {
    tournamentId,
    stageId: fOpt(formData, 'stageId'),
    groupId: fOpt(formData, 'groupId'),
    gameId,
    matchNumber,
    stageType,
    groupName,
    mapName,
    matchType,
    format,
    status: (fStr(formData, 'status') || 'SCHEDULED') as
      | 'SCHEDULED'
      | 'LIVE'
      | 'COMPLETED'
      | 'POSTPONED',
    scheduledAt,
    matchTime,
    streamUrl: fOpt(formData, 'streamUrl'),
  };

  let matchId = id;
  if (id) {
    await prisma.match.update({ where: { id }, data });
  } else {
    const created = await prisma.match.create({ data });
    matchId = created.id;

    // Auto-create initial MatchGame sequence 1
    await prisma.matchGame.create({
      data: {
        matchId: created.id,
        sequence: 1,
        mapName,
        duration: 1680,
      },
    });
  }

  revalidatePath('/admin/matches');
  revalidatePath('/tournaments');
  redirect(`/admin/matches?edit=${matchId}`);
}

async function deleteMatch(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.matchPlayerStat.deleteMany({
      where: { matchGame: { matchId: id } },
    });
    await prisma.matchTeamResult.deleteMany({
      where: { matchGame: { matchId: id } },
    });
    await prisma.matchGame.deleteMany({ where: { matchId: id } });
    await prisma.match.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath('/admin/matches');
  redirect('/admin/matches');
}

async function saveTeamResult(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const matchGameId = fStr(formData, 'matchGameId');
  const teamId = fStr(formData, 'teamId');
  if (!matchGameId || !teamId) redirect('/admin/matches');

  const rank = fNum(formData, 'rank') ?? 1;
  const isWwcd = formData.get('wwcd') === 'on' || rank === 1;
  const placePoints = fNum(formData, 'placePoints') ?? getPlacementPoints(rank);
  const elimsPoints = fNum(formData, 'elimsPoints') ?? 0;
  const bonusPoints = fNum(formData, 'bonusPoints') ?? 0;
  const totalPoints = computeTotalPoints({ placePoints, elimsPoints, bonusPoints });

  const smokesUsed = fNum(formData, 'smokesUsed') ?? 0;
  const grenadesUsed = fNum(formData, 'grenadesUsed') ?? 0;
  const molotovsUsed = fNum(formData, 'molotovsUsed') ?? 0;
  const flashUsed = fNum(formData, 'flashUsed') ?? 0;
  const utilitiesTotal = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });

  const distDrove = fNum(formData, 'distDrove') ?? 0;
  const distWalk = fNum(formData, 'distWalk') ?? 0;
  const totalDist = computeTotalDistance({ distDrove, distWalk });

  const existing = await prisma.matchTeamResult.findFirst({
    where: { matchGameId, teamId },
    select: { id: true },
  });

  const payload = {
    shortCode: fOpt(formData, 'shortCode'),
    mp: fNum(formData, 'mp') ?? 1,
    rank,
    wwcd: isWwcd,
    placePoints,
    elimsPoints,
    bonusPoints,
    totalPoints,
    damage: fNum(formData, 'damage') ?? 0,
    survivalTime: fNum(formData, 'survivalTime') ?? 0,
    healing: fNum(formData, 'healing') ?? 0,
    damageReceived: fNum(formData, 'damageReceived') ?? 0,
    headshots: fNum(formData, 'headshots') ?? 0,
    assists: fNum(formData, 'assists') ?? 0,
    knockouts: fNum(formData, 'knockouts') ?? 0,
    longestElim: fNum(formData, 'longestElim') ?? 0,
    vehicleElims: fNum(formData, 'vehicleElims') ?? 0,
    grenadeElims: fNum(formData, 'grenadeElims') ?? 0,
    smokesUsed,
    grenadesUsed,
    molotovsUsed,
    flashUsed,
    utilitiesTotal,
    airdrops: fNum(formData, 'airdrops') ?? 0,
    rescues: fNum(formData, 'rescues') ?? 0,
    distDrove,
    distWalk,
    totalDist,
    won: isWwcd,
    score: totalPoints,
  };

  if (existing) {
    await prisma.matchTeamResult.update({ where: { id: existing.id }, data: payload });
  } else {
    await prisma.matchTeamResult.create({ data: { matchGameId, teamId, ...payload } });
  }

  const mg = await prisma.matchGame.findUnique({
    where: { id: matchGameId },
    select: { matchId: true },
  });

  revalidatePath('/admin/matches');
  redirect(mg ? `/admin/matches?edit=${mg.matchId}#team-results` : '/admin/matches');
}

async function deleteTeamResult(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const matchId = fStr(formData, 'matchId');
  if (id) {
    await prisma.matchTeamResult.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath('/admin/matches');
  redirect(matchId ? `/admin/matches?edit=${matchId}` : '/admin/matches');
}

async function savePlayerStat(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const matchGameId = fStr(formData, 'matchGameId');
  const playerId = fStr(formData, 'playerId');
  if (!matchGameId || !playerId) redirect('/admin/matches');

  const smokesUsed = fNum(formData, 'smokesUsed') ?? 0;
  const grenadesUsed = fNum(formData, 'grenadesUsed') ?? 0;
  const molotovsUsed = fNum(formData, 'molotovsUsed') ?? 0;
  const flashUsed = fNum(formData, 'flashUsed') ?? 0;
  const utilitiesTotal = computeUtilitiesTotal({ smokesUsed, grenadesUsed, molotovsUsed, flashUsed });

  const distDrove = fNum(formData, 'distDrove') ?? 0;
  const distWalk = fNum(formData, 'distWalk') ?? 0;
  const totalDist = computeTotalDistance({ distDrove, distWalk });

  const playerElims = fNum(formData, 'playerElims') ?? 0;

  const payload = {
    teamId: fOpt(formData, 'teamId'),
    shortCode: fOpt(formData, 'shortCode'),
    role: fOpt(formData, 'role'),
    mp: fNum(formData, 'mp') ?? 1,
    playerElims,
    teamRank: fNum(formData, 'teamRank') ?? 0,
    teamWwcd: formData.get('teamWwcd') === 'on',
    teamPlacePoints: fNum(formData, 'teamPlacePoints') ?? 0,
    teamElimsPoints: fNum(formData, 'teamElimsPoints') ?? 0,
    teamBonusPoints: fNum(formData, 'teamBonusPoints') ?? 0,
    teamTotalPoints: fNum(formData, 'teamTotalPoints') ?? 0,
    damage: fNum(formData, 'damage') ?? 0,
    survivalTime: fNum(formData, 'survivalTime') ?? 0,
    healing: fNum(formData, 'healing') ?? 0,
    damageReceived: fNum(formData, 'damageReceived') ?? 0,
    headshots: fNum(formData, 'headshots') ?? 0,
    assists: fNum(formData, 'assists') ?? 0,
    knockouts: fNum(formData, 'knockouts') ?? 0,
    longestElim: fNum(formData, 'longestElim') ?? 0,
    vehicleElims: fNum(formData, 'vehicleElims') ?? 0,
    grenadeElims: fNum(formData, 'grenadeElims') ?? 0,
    smokesUsed,
    grenadesUsed,
    molotovsUsed,
    flashUsed,
    utilitiesTotal,
    airdrops: fNum(formData, 'airdrops') ?? 0,
    rescues: fNum(formData, 'rescues') ?? 0,
    distDrove,
    distWalk,
    totalDist,
    isMvp: formData.get('isMvp') === 'on',
    playerPowerplay: fNum(formData, 'playerPowerplay') ?? 0,
    kills: playerElims,
  };

  const existing = await prisma.matchPlayerStat.findFirst({
    where: { matchGameId, playerId },
    select: { id: true },
  });

  if (existing) {
    await prisma.matchPlayerStat.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    await prisma.matchPlayerStat.create({
      data: { matchGameId, playerId, ...payload },
    });
  }

  const mg = await prisma.matchGame.findUnique({
    where: { id: matchGameId },
    select: { matchId: true },
  });

  revalidatePath('/admin/matches');
  redirect(mg ? `/admin/matches?edit=${mg.matchId}#player-stats` : '/admin/matches');
}

async function deletePlayerStat(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  const matchId = fStr(formData, 'matchId');
  if (id) {
    await prisma.matchPlayerStat.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath('/admin/matches');
  redirect(matchId ? `/admin/matches?edit=${matchId}` : '/admin/matches');
}

// ---------------------------------------------------------------- page

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const [tournaments, games, teams, players] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        stages: { orderBy: { sequence: 'asc' }, select: { id: true, name: true } },
      },
    }),
    prisma.game.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, tag: true } }),
    prisma.player.findMany({
      orderBy: { ign: 'asc' },
      select: { id: true, ign: true, role: true, currentTeamId: true, currentTeam: { select: { tag: true } } },
    }),
  ]);

  const editing = edit
    ? await prisma.match.findUnique({
        where: { id: edit },
        include: {
          tournament: { select: { name: true, slug: true } },
          game: { select: { name: true } },
          stage: { select: { name: true } },
          group: { select: { name: true } },
          games: {
            orderBy: { sequence: 'asc' },
            include: {
              teamResults: {
                orderBy: { rank: 'asc' },
                include: { team: { select: { name: true, tag: true, logoUrl: true } } },
              },
              playerStats: {
                orderBy: { playerElims: 'desc' },
                include: { player: { select: { ign: true, avatarUrl: true } }, team: { select: { name: true, tag: true } } },
              },
            },
          },
        },
      })
    : null;

  const selectedTournament = editing
    ? tournaments.find((t) => t.id === editing.tournamentId)
    : null;

  const activeMatchGame = editing?.games[0];

  const matchList = await prisma.match.findMany({
    orderBy: { scheduledAt: 'desc' },
    take: 50,
    include: {
      tournament: { select: { name: true } },
      game: { select: { name: true } },
      _count: { select: { games: true } },
    },
  });

  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#0A5FC4]" /> Match &amp; Scorecard Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record match metadata, team placement/finishes, and deep individual player battle royale statistics.
          </p>
        </div>
        {editing && (
          <Link
            href="/admin/matches"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New match instead
          </Link>
        )}
      </div>

      {error === 'required' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Tournament, game and scheduled time are required.
        </p>
      )}

      {/* Match Form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          {editing ? `Editing: ${editing.format} · ${editing.tournament.name}` : 'Create New Match'}
        </summary>

        {/* 1. Match Information Form */}
        <form
          action={saveMatch}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-6 space-y-4"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> 1. Match Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Tournament *</label>
              <select name="tournamentId" required defaultValue={editing?.tournamentId ?? ''} className={inputCls}>
                <option value="">Select Tournament…</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stage</label>
              <select name="stageId" defaultValue={editing?.stageId ?? ''} className={inputCls}>
                <option value="">General Stage / Finals</option>
                {(selectedTournament?.stages ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stage Type</label>
              <select name="stageType" defaultValue={editing?.stageType ?? 'Grand Finals'} className={inputCls}>
                {STAGE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Group / Battle Code</label>
              <input
                name="groupName"
                defaultValue={editing?.groupName ?? ''}
                placeholder="e.g. Group A vs Group B"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Match Number</label>
              <input
                type="number"
                name="matchNumber"
                defaultValue={editing?.matchNumber ?? 1}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Map *</label>
              <select name="mapName" defaultValue={editing?.mapName ?? 'Erangel'} className={inputCls}>
                {BGMI_PUBGM_MAPS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Match Type</label>
              <select name="matchType" defaultValue={editing?.matchType ?? 'LAN'} className={inputCls}>
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Game *</label>
              <select name="gameId" required defaultValue={editing?.gameId ?? ''} className={inputCls}>
                <option value="">Select Game…</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date &amp; Time (UTC/ISO) *</label>
              <input
                type="datetime-local"
                name="scheduledAt"
                required
                defaultValue={editing ? toLocalInput(editing.scheduledAt) : ''}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Display Time (Local)</label>
              <input
                name="matchTime"
                defaultValue={editing?.matchTime ?? '14:30 IST'}
                placeholder="14:30 IST / 18:00 UTC"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" defaultValue={editing?.status ?? 'SCHEDULED'} className={inputCls}>
                {MATCH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Broadcast Stream URL</label>
              <input
                name="streamUrl"
                defaultValue={editing?.streamUrl ?? ''}
                placeholder="https://youtube.com/…"
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            {editing ? 'Update Match Info' : 'Create Match & Enter Scorecard'}
          </button>
        </form>

        {/* 2. Team & Player Match Scorecard Entry (Only for active editing match) */}
        {editing && activeMatchGame && (
          <div className="mt-6 space-y-6">
            {/* 2.1 Team Results Section */}
            <div id="team-results" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> 2. Team Match Results ({activeMatchGame.teamResults.length} recorded)
                </h2>
              </div>

              {/* Team Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[760px]">
                  <thead>
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                      <th className="py-2 px-2 text-center w-12">Rank</th>
                      <th className="py-2 px-3 text-left">Team</th>
                      <th className="py-2 px-2 text-center">Place Pts</th>
                      <th className="py-2 px-2 text-center">Elims</th>
                      <th className="py-2 px-2 text-center font-bold text-[#0A5FC4]">Total Pts</th>
                      <th className="py-2 px-2 text-center">Damage</th>
                      <th className="py-2 px-2 text-center">Survival</th>
                      <th className="py-2 px-2 text-center">Utilities</th>
                      <th className="py-2 px-2 text-center">Distance</th>
                      <th className="py-2 px-2 text-center">Rescues</th>
                      <th className="py-2 px-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {activeMatchGame.teamResults.map((tr) => (
                      <tr key={tr.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                        <td className="py-2 px-2 text-center font-mono font-black">
                          #{tr.rank} {tr.wwcd && <span title="WWCD Winner">🍗</span>}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {tr.team.name} {tr.shortCode && <span className="text-slate-400 font-mono text-[10px]">[{tr.shortCode}]</span>}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{tr.placePoints}</td>
                        <td className="py-2 px-2 text-center font-mono">{tr.elimsPoints}</td>
                        <td className="py-2 px-2 text-center font-mono font-black text-sm text-[#0A5FC4] dark:text-blue-400">
                          {tr.totalPoints}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{tr.damage}</td>
                        <td className="py-2 px-2 text-center font-mono">
                          {Math.floor(tr.survivalTime / 60)}:{(tr.survivalTime % 60).toString().padStart(2, '0')}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {tr.utilitiesTotal} <span className="text-[9px] text-slate-400">(S:{tr.smokesUsed} G:{tr.grenadesUsed} M:{tr.molotovsUsed})</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{tr.totalDist}m</td>
                        <td className="py-2 px-2 text-center font-mono">{tr.rescues}</td>
                        <td className="py-2 px-2 text-right">
                          <form action={deleteTeamResult}>
                            <input type="hidden" name="id" value={tr.id} />
                            <input type="hidden" name="matchId" value={editing.id} />
                            <button type="submit" className="p-1 text-slate-300 hover:text-rose-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add/Edit Team Result Form */}
              <form action={saveTeamResult} className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <input type="hidden" name="matchGameId" value={activeMatchGame.id} />
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  + Add / Update Team Result Row
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div className="col-span-2">
                    <label className={labelCls}>Team *</label>
                    <select name="teamId" required className={inputCls}>
                      <option value="">Select Team…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} [{t.tag || 'TAG'}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Rank (1..16) *</label>
                    <input type="number" name="rank" min={1} max={32} required defaultValue={1} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>WWCD</label>
                    <label className="flex items-center gap-1.5 mt-2 cursor-pointer text-xs">
                      <input type="checkbox" name="wwcd" defaultChecked className="rounded text-[#0A5FC4]" />
                      <span>Winner 🍗</span>
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Place Pts</label>
                    <input type="number" name="placePoints" placeholder="Auto" defaultValue={10} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Elim Pts</label>
                    <input type="number" name="elimsPoints" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Bonus Pts</label>
                    <input type="number" name="bonusPoints" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Damage Done</label>
                    <input type="number" name="damage" defaultValue={0} className={inputCls} />
                  </div>
                </div>

                {/* Additional Team Battle Royale Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className={labelCls}>Survival (sec)</label>
                    <input type="number" name="survivalTime" placeholder="1680" defaultValue={1680} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Healing Items</label>
                    <input type="number" name="healing" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Damage Recv</label>
                    <input type="number" name="damageReceived" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Headshots</label>
                    <input type="number" name="headshots" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Assists</label>
                    <input type="number" name="assists" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Knockouts</label>
                    <input type="number" name="knockouts" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Long Elim (m)</label>
                    <input type="number" step="any" name="longestElim" placeholder="240.5" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Vehicle Elims</label>
                    <input type="number" name="vehicleElims" defaultValue={0} className={inputCls} />
                  </div>
                </div>

                {/* Utilities & Distances */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className={labelCls}>Grenade Elims</label>
                    <input type="number" name="grenadeElims" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Smokes Used</label>
                    <input type="number" name="smokesUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Grenades</label>
                    <input type="number" name="grenadesUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Molotovs</label>
                    <input type="number" name="molotovsUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Flash Used</label>
                    <input type="number" name="flashUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Airdrops Looted</label>
                    <input type="number" name="airdrops" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Rescues / Revives</label>
                    <input type="number" name="rescues" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Dist Drove (m)</label>
                    <input type="number" name="distDrove" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Dist Walk (m)</label>
                    <input type="number" name="distWalk" defaultValue={0} className={inputCls} />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase transition-colors"
                    >
                      Save Team Stats
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* 2.2 Individual Player Stats Section */}
            <div id="player-stats" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> 3. Individual Player Stats ({activeMatchGame.playerStats.length} recorded)
                </h2>
              </div>

              {/* Player Stats Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[760px]">
                  <thead>
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                      <th className="py-2 px-3 text-left">Player</th>
                      <th className="py-2 px-2 text-left">Team</th>
                      <th className="py-2 px-2 text-center font-bold text-rose-500">Elims</th>
                      <th className="py-2 px-2 text-center">Damage</th>
                      <th className="py-2 px-2 text-center">Headshots</th>
                      <th className="py-2 px-2 text-center">Knockouts</th>
                      <th className="py-2 px-2 text-center">Powerplay</th>
                      <th className="py-2 px-2 text-center">Longest Elim</th>
                      <th className="py-2 px-2 text-center">MVP</th>
                      <th className="py-2 px-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {activeMatchGame.playerStats.map((ps) => (
                      <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                        <td className="py-2 px-3 font-bold flex items-center gap-1.5">
                          {ps.player.ign}
                          {ps.isMvp && <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-black text-[9px]">MVP</span>}
                        </td>
                        <td className="py-2 px-2 text-slate-400">{ps.team?.name || '—'}</td>
                        <td className="py-2 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                          {ps.playerElims}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">{ps.damage}</td>
                        <td className="py-2 px-2 text-center font-mono">{ps.headshots}</td>
                        <td className="py-2 px-2 text-center font-mono">{ps.knockouts}</td>
                        <td className="py-2 px-2 text-center font-mono">{ps.playerPowerplay}</td>
                        <td className="py-2 px-2 text-center font-mono">{ps.longestElim}m</td>
                        <td className="py-2 px-2 text-center">{ps.isMvp ? '⭐' : '—'}</td>
                        <td className="py-2 px-2 text-right">
                          <form action={deletePlayerStat}>
                            <input type="hidden" name="id" value={ps.id} />
                            <input type="hidden" name="matchId" value={editing.id} />
                            <button type="submit" className="p-1 text-slate-300 hover:text-rose-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add/Edit Player Stat Form */}
              <form action={savePlayerStat} className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <input type="hidden" name="matchGameId" value={activeMatchGame.id} />
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  + Add / Update Player Match Performance
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div className="col-span-2">
                    <label className={labelCls}>Player *</label>
                    <select name="playerId" required className={inputCls}>
                      <option value="">Select Player…</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.ign} {p.currentTeam?.tag ? `[${p.currentTeam.tag}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Team</label>
                    <select name="teamId" className={inputCls}>
                      <option value="">Select Team…</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Eliminations *</label>
                    <input type="number" name="playerElims" defaultValue={0} min={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Damage</label>
                    <input type="number" name="damage" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>MVP?</label>
                    <label className="flex items-center gap-1.5 mt-2 cursor-pointer text-xs">
                      <input type="checkbox" name="isMvp" className="rounded text-[#0A5FC4]" />
                      <span>Best Player ⭐</span>
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Powerplay (Zone 1)</label>
                    <input type="number" name="playerPowerplay" defaultValue={0} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className={labelCls}>Headshots</label>
                    <input type="number" name="headshots" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Assists</label>
                    <input type="number" name="assists" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Knockouts</label>
                    <input type="number" name="knockouts" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Longest Elim (m)</label>
                    <input type="number" step="any" name="longestElim" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Vehicle Elims</label>
                    <input type="number" name="vehicleElims" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Grenade Elims</label>
                    <input type="number" name="grenadeElims" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Smokes</label>
                    <input type="number" name="smokesUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Grenades</label>
                    <input type="number" name="grenadesUsed" defaultValue={0} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <div>
                    <label className={labelCls}>Molotovs</label>
                    <input type="number" name="molotovsUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Flash</label>
                    <input type="number" name="flashUsed" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Airdrops</label>
                    <input type="number" name="airdrops" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Rescues</label>
                    <input type="number" name="rescues" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Dist Drove</label>
                    <input type="number" name="distDrove" defaultValue={0} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Dist Walk</label>
                    <input type="number" name="distWalk" defaultValue={0} className={inputCls} />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase transition-colors"
                    >
                      Save Player Stat
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </details>

      {/* Match List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-3 px-3 text-left">Match</th>
              <th className="py-3 px-3 text-left hidden md:table-cell">Tournament</th>
              <th className="py-3 px-3 text-left hidden sm:table-cell">Type &amp; Time</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {matchList.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-3 px-3">
                  <span className="font-bold block max-w-[240px] truncate">{m.format}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {m.game.name} · {m.stageType || 'Match'}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-500 hidden md:table-cell max-w-[240px] truncate">
                  {m.tournament.name}
                </td>
                <td className="py-3 px-3 text-slate-500 text-xs hidden sm:table-cell">
                  {m.matchType} · {m.matchTime || m.scheduledAt.toISOString().slice(0, 16)}
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${STATUS_STYLES[m.status] ?? ''}`}>
                    {m.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/admin/matches?edit=${m.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0A5FC4] transition-colors"
                      title="Edit Match & Scorecard"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deleteMatch}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Match"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {matchList.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                  No matches recorded yet — add your first match above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
