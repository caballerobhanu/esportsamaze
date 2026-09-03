import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fSocials, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';
import { COUNTRIES } from '@/lib/countries';
import { Combobox } from '@/components/admin/combobox';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const STAFF_ROLES = ['Head Coach', 'Coach', 'Assistant Coach', 'Analyst', 'Manager', 'Content Creator'];

async function savePlayer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const ign = fStr(formData, 'ign');
  if (!ign) redirect('/admin/players?error=ign');

  const slug = await uniqueSlug(fStr(formData, 'slug') || ign, async (s) => {
    const clash = await prisma.player.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const avatarUpload = await saveUploadedFile(
    formData.get('avatarFile'),
    'player-avatar'
  );

  const data = {
    ign,
    slug,
    firstName: fOpt(formData, 'firstName'),
    lastName: fOpt(formData, 'lastName'),
    role: fOpt(formData, 'role'),
    nationality: fOpt(formData, 'nationality'),
    birthDate: fDate(formData, 'birthDate'),
    status: fStr(formData, 'status') || 'ACTIVE',
    isPlayer: formData.get('isPlayer') === 'on',
    staffRole: fOpt(formData, 'staffRole'),
    gameId: fOpt(formData, 'gameId'),
    currentTeamId: fOpt(formData, 'currentTeamId'),
    socialLinks: fSocials(formData),
  };

  if (id) {
    const existing = await prisma.player.findUnique({
      where: { id },
      select: { avatarUrl: true },
    });
    await prisma.player.update({
      where: { id },
      data: {
        ...data,
        // uploaded file wins, then manual URL, then keep previous image
        avatarUrl:
          avatarUpload ?? fOpt(formData, 'avatarUrl') ?? existing?.avatarUrl ?? null,
      },
    });
  } else {
    await prisma.player.create({
      data: { ...data, avatarUrl: avatarUpload ?? fOpt(formData, 'avatarUrl') },
    });
  }

  revalidatePath('/admin/players');
  redirect('/admin/players');
}

async function deletePlayer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    const attached =
      (await prisma.transfer.count({ where: { playerId: id } })) +
      (await prisma.matchPlayerStat.count({ where: { playerId: id } })) +
      (await prisma.playerRanking.count({ where: { playerId: id } }));
    if (attached > 0) {
      redirect('/admin/players?error=linked');
    }
    await prisma.player.delete({ where: { id } });
  }
  revalidatePath('/admin/players');
  redirect('/admin/players');
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const [games, teams, players] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, tag: true } }),
    prisma.player.findMany({
      orderBy: { ign: 'asc' },
      include: {
        currentTeam: { select: { name: true, tag: true } },
        game: { select: { name: true } },
      },
    }),
  ]);

  const editing = edit
    ? await prisma.player.findUnique({ where: { id: edit } })
    : null;

  const countryOptions = COUNTRIES.map((c) => ({
    value: c.name,
    label: c.name,
    keywords: `${c.code} ${c.name}`,
  }));
  const gameOptions = games.map((g) => ({ value: g.id, label: g.name }));
  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name + (t.tag ? ` [${t.tag}]` : ''),
    keywords: `${t.name} ${t.tag ?? ''}`,
  }));
  const staffRoleOptions = STAFF_ROLES.map((r) => ({ value: r, label: r }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-tight">Players</h1>
        {editing && (
          <Link
            href="/admin/players"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New player instead
          </Link>
        )}
      </div>

      {error === 'ign' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          IGN is required.
        </p>
      )}
      {error === 'linked' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          This player still has transfers, match statistics or rankings attached — it cannot be deleted.
        </p>
      )}

      {/* Create / Edit form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {editing ? `Editing: ${editing.ign}` : 'Add New Player'}
        </summary>

        <form
          action={savePlayer}
          key={editing?.id ?? 'new'}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>IGN *</label>
              <input name="ign" required defaultValue={editing?.ign ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug (auto if blank)</label>
              <input name="slug" defaultValue={editing?.slug ?? ''} placeholder="auto" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" defaultValue={editing?.status ?? 'ACTIVE'} className={inputCls}>
                {['ACTIVE', 'INACTIVE', 'BENCHED', 'RETIRED'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>First Name</label>
              <input name="firstName" defaultValue={editing?.firstName ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input name="lastName" defaultValue={editing?.lastName ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Birth Date</label>
              <input
                type="date"
                name="birthDate"
                defaultValue={editing?.birthDate ? editing.birthDate.toISOString().slice(0, 10) : ''}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <input name="role" defaultValue={editing?.role ?? ''} placeholder="Assaulter / IGL..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nationality</label>
              <Combobox
                name="nationality"
                options={countryOptions}
                defaultValue={editing?.nationality ?? ''}
                freeText
                placeholder="Type a country…"
                ariaLabel="Nationality"
              />
            </div>
            <div>
              <label className={labelCls}>Avatar URL</label>
              <input name="avatarUrl" defaultValue={editing?.avatarUrl ?? ''} className={inputCls} />
              <label className={labelCls + ' mt-2'}>…or Upload Image</label>
              <input
                type="file"
                name="avatarFile"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer hover:file:bg-slate-200 dark:hover:file:bg-slate-700"
              />
            </div>
            <div>
              <label className={labelCls}>Game</label>
              <Combobox
                name="gameId"
                options={gameOptions}
                defaultValue={editing?.gameId ?? ''}
                emptyOptionLabel="—"
                placeholder="Type a game…"
                ariaLabel="Game"
              />
            </div>
            <div>
              <label className={labelCls}>Current Team</label>
              <Combobox
                name="currentTeamId"
                options={teamOptions}
                defaultValue={editing?.currentTeamId ?? ''}
                emptyOptionLabel="Free Agent"
                placeholder="Type a team name or tag…"
                ariaLabel="Current Team"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                name="isPlayer"
                defaultChecked={editing?.isPlayer ?? true}
                className="h-4 w-4 rounded border-slate-300 text-[#0A5FC4] focus:ring-[#0A5FC4]"
              />
              Playing roster member
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Support staff role
              </span>
              <div className="w-56">
                <Combobox
                  name="staffRole"
                  options={staffRoleOptions}
                  defaultValue={editing?.staffRole ?? ''}
                  emptyOptionLabel="— Not staff —"
                  freeText
                  placeholder="Coach, Analyst…"
                  ariaLabel="Support staff role"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              A person can be both: tick the checkbox and set a staff role to show them in both sections.
            </p>
          </div>

          <fieldset className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Social Links (optional)
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {['instagram', 'twitter', 'youtube', 'discord', 'website'].map((key) => (
                <div key={key}>
                  <label className={labelCls}>{key}</label>
                  <input
                    name={key}
                    defaultValue={
                      editing && typeof editing.socialLinks === 'object' && editing.socialLinks !== null
                        ? String((editing.socialLinks as Record<string, unknown>)[key] ?? '')
                        : ''
                    }
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {editing ? 'Update Player' : 'Create Player'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">IGN</th>
              <th className="py-2.5 px-3 text-left">Team</th>
              <th className="py-2.5 px-3 text-left hidden sm:table-cell">Role</th>
              <th className="py-2.5 px-3 text-left hidden md:table-cell">Game</th>
              <th className="py-2.5 px-3 text-left">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {players.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-2.5 px-3 font-bold">
                  {p.ign}
                  {p.staffRole && (
                    <span className="ml-2 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                      {p.staffRole}
                    </span>
                  )}
                  {!p.isPlayer && (
                    <span className="ml-1.5 rounded bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Staff only
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-slate-500">{p.currentTeam?.name ?? '—'}</td>
                <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">{p.role ?? '—'}</td>
                <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{p.game?.name ?? '—'}</td>
                <td className="py-2.5 px-3">
                  <span className="text-[10px] font-black uppercase">{p.status}</span>
                </td>
                <td className="py-2.5 px-3">
                  <span className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/players?edit=${p.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0A5FC4] transition-colors"
                      aria-label={`Edit ${p.ign}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deletePlayer}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        aria-label={`Delete ${p.ign}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                  No players yet — add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
