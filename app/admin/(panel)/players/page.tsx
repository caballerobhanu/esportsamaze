import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, Copy, CheckCircle2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fSocials, uniqueSlug } from '@/lib/admin-forms';
import { setRosterMembership } from '@/lib/player-transfers';
import { revalidateTransferSurfaces } from '@/lib/revalidate-transfers';
import { saveUploadedFile } from '@/lib/upload';
import { COUNTRIES } from '@/lib/countries';
import { Combobox } from '@/components/admin/combobox';
import { MediaField } from '@/components/admin/media-field';
import { PlayersManagerTable } from '@/components/admin/players-manager-table';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
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

  const desiredTeamId = fOpt(formData, 'currentTeamId');
  const staffRole = fOpt(formData, 'staffRole');

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
    staffRole,
    gameId: fOpt(formData, 'gameId'),
    socialLinks: fSocials(formData),
  };

  await prisma.$transaction(async (tx) => {
    let playerId: string;
    if (id) {
      const existing = await tx.player.findUnique({
        where: { id },
        select: { avatarUrl: true },
      });
      await tx.player.update({
        where: { id },
        data: {
          ...data,
          // uploaded file wins, then manual URL, then keep previous image
          avatarUrl:
            avatarUpload ?? fOpt(formData, 'avatarUrl') ?? existing?.avatarUrl ?? null,
        },
      });
      playerId = id;
    } else {
      const created = await tx.player.create({
        data: { ...data, avatarUrl: avatarUpload ?? fOpt(formData, 'avatarUrl') },
      });
      playerId = created.id;
    }

    // Roster membership is a stored slot; the Transfer ledger is admin-only history.
    await setRosterMembership(tx, playerId, desiredTeamId);
  });

  revalidatePath('/admin/players');
  revalidateTransferSurfaces();
  redirect('/admin/players');
}

async function duplicatePlayer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/players');

  const source = await prisma.player.findUnique({ where: { id } });
  if (!source) redirect('/admin/players');

  const baseIgn = `${source.ign} (Copy)`;
  const slug = await uniqueSlug(fStr(formData, 'slug') || `${source.slug || source.ign}-copy`, async (s) => {
    const clash = await prisma.player.findFirst({ where: { slug: s }, select: { id: true } });
    return Boolean(clash);
  });

  const created = await prisma.$transaction(async (tx) => {
    const copy = await tx.player.create({
      data: {
        ign: baseIgn,
        slug,
        firstName: source.firstName,
        lastName: source.lastName,
        avatarUrl: source.avatarUrl,
        nationality: source.nationality,
        birthDate: source.birthDate,
        status: source.status,
        isVerified: source.isVerified,
        isPlayer: source.isPlayer,
        role: source.role,
        staffRole: source.staffRole,
        gameId: source.gameId,
        socialLinks: source.socialLinks ?? undefined,
      },
    });
    // The copy keeps the source's roster slot (membership is stored, not history).
    if (source.currentTeamId) {
      await setRosterMembership(tx, copy.id, source.currentTeamId);
    }
    return copy;
  });

  revalidatePath('/admin/players');
  revalidateTransferSurfaces();
  redirect(`/admin/players?edit=${created.id}&saved=copy`);
}

async function deletePlayer(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    const attached =
      (await prisma.transfer.count({ where: { playerId: id } })) +
      (await prisma.matchPlayerStat.count({ where: { playerId: id } }));
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
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  const { edit, error, saved } = await searchParams;

  const [games, teams, players] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, tag: true } }),
    prisma.player.findMany({
      orderBy: { ign: 'asc' },
      include: {
        currentTeam: { select: { id: true, name: true, tag: true } },
        game: { select: { id: true, name: true } },
        _count: { select: { matchStats: true, transferHistory: true } },
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
          <div className="flex items-center gap-3">
            <form action={duplicatePlayer}>
              <input type="hidden" name="id" value={editing.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-(--ed-blue) dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={`Duplicate "${editing.ign}"`}
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
            </form>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <Link
              href="/admin/players"
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              + New player instead
            </Link>
          </div>
        )}
      </div>

      {saved === 'copy' && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>Player duplicated successfully into a new profile. You can now customize their IGN and details below.</span>
        </div>
      )}

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
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
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
            <MediaField
              label="Avatar URL"
              name="avatarUrl"
              fileField="avatarFile"
              prefix="player-avatar"
              defaultValue={editing?.avatarUrl ?? ''}
              inputClassName={inputCls}
            />
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
                className="h-4 w-4 rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
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
            className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {editing ? 'Update Player' : 'Create Player'}
          </button>
        </form>
      </details>

      {/* List */}
      <PlayersManagerTable players={players as any} deletePlayerAction={deletePlayer} />
    </div>
  );
}
