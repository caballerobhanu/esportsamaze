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
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

async function saveTeam(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name');
  if (!name) redirect('/admin/teams?error=name');

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (s) => {
    const clash = await prisma.team.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const [logoUpload, logoDarkUpload] = await Promise.all([
    saveUploadedFile(formData.get('logoFile'), 'team-logo'),
    saveUploadedFile(formData.get('logoDarkFile'), 'team-logo-dark'),
  ]);

  const data = {
    name,
    slug,
    displayName: fOpt(formData, 'displayName'),
    tag: fOpt(formData, 'tag'),
    region: fOpt(formData, 'region'),
    founded: fDate(formData, 'founded'),
    status: fStr(formData, 'status') || 'ACTIVE',
    sponsors: fOpt(formData, 'sponsors'),
    gameId: fOpt(formData, 'gameId'),
    socialLinks: fSocials(formData),
  };

  if (id) {
    const existing = await prisma.team.findUnique({
      where: { id },
      select: { logoUrl: true, imageDarkUrl: true },
    });
    await prisma.team.update({
      where: { id },
      data: {
        ...data,
        logoUrl:
          logoUpload ?? fOpt(formData, 'logoUrl') ?? existing?.logoUrl ?? null,
        imageDarkUrl:
          logoDarkUpload ??
          fOpt(formData, 'imageDarkUrl') ??
          existing?.imageDarkUrl ??
          null,
      },
    });
  } else {
    await prisma.team.create({
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl'),
        imageDarkUrl: logoDarkUpload ?? fOpt(formData, 'imageDarkUrl'),
      },
    });
  }

  revalidatePath('/admin/teams');
  redirect('/admin/teams');
}

async function deleteTeam(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    const attached =
      (await prisma.transfer.count({ where: { teamId: id } })) +
      (await prisma.tournamentTeam.count({ where: { teamId: id } })) +
      (await prisma.matchTeamResult.count({ where: { teamId: id } })) +
      (await prisma.matchPlayerStat.count({ where: { teamId: id } })) +
      (await prisma.teamRanking.count({ where: { teamId: id } })) +
      (await prisma.playerRanking.count({ where: { teamId: id } })) +
      (await prisma.tournament.count({ where: { OR: [{ winnerTeamId: id }, { runnerUpTeamId: id }] } })) +
      (await prisma.rankingTransferRule.count({ where: { OR: [{ oldTeamId: id }, { newTeamId: id }] } }));
    if (attached > 0) {
      redirect('/admin/teams?error=linked');
    }
    await prisma.team.delete({ where: { id } });
  }
  revalidatePath('/admin/teams');
  redirect('/admin/teams');
}

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const [games, teams] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: 'asc' } }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        game: { select: { name: true } },
        _count: { select: { players: true, tournamentRosters: true } },
      },
    }),
  ]);

  const editing = edit
    ? await prisma.team.findUnique({ where: { id: edit } })
    : null;

  const countryOptions = COUNTRIES.map((c) => ({
    value: c.name,
    label: c.name,
    keywords: `${c.code} ${c.name}`,
  }));
  const gameOptions = games.map((g) => ({ value: g.id, label: g.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-tight">Teams</h1>
        {editing && (
          <Link
            href="/admin/teams"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New team instead
          </Link>
        )}
      </div>

      {error === 'name' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Team name is required.
        </p>
      )}
      {error === 'linked' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          This team still has transfers, tournament rosters, match results, stats or rankings attached — it cannot be deleted.
        </p>
      )}

      {/* Create / Edit form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {editing ? `Editing: ${editing.name}` : 'Add New Team'}
        </summary>

        <form
          action={saveTeam}
          key={editing?.id ?? 'new'}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input name="name" required defaultValue={editing?.name ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Display Name</label>
              <input name="displayName" defaultValue={editing?.displayName ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug (auto if blank)</label>
              <input name="slug" defaultValue={editing?.slug ?? ''} placeholder="auto" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tag / Short Code</label>
              <input name="tag" defaultValue={editing?.tag ?? ''} placeholder="SOUL" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" defaultValue={editing?.status ?? 'ACTIVE'} className={inputCls}>
                {['ACTIVE', 'INACTIVE', 'DISBANDED'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Region / Country</label>
              <Combobox
                name="region"
                options={countryOptions}
                defaultValue={editing?.region ?? ''}
                freeText
                placeholder="Type a region or country…"
                ariaLabel="Region / Country"
              />
            </div>
            <div>
              <label className={labelCls}>Founded</label>
              <input
                type="date"
                name="founded"
                defaultValue={editing?.founded ? editing.founded.toISOString().slice(0, 10) : ''}
                className={inputCls}
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
              <label className={labelCls}>Sponsors</label>
              <input name="sponsors" defaultValue={editing?.sponsors ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Logo (light)</label>
              <input name="logoUrl" defaultValue={editing?.logoUrl ?? ''} className={inputCls} />
              <label className={labelCls + ' mt-2'}>…or Upload Image</label>
              <input
                type="file"
                name="logoFile"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer hover:file:bg-slate-200 dark:hover:file:bg-slate-700"
              />
            </div>
            <div>
              <label className={labelCls}>Logo (dark)</label>
              <input name="imageDarkUrl" defaultValue={editing?.imageDarkUrl ?? ''} className={inputCls} />
              <label className={labelCls + ' mt-2'}>…or Upload Image</label>
              <input
                type="file"
                name="logoDarkFile"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer hover:file:bg-slate-200 dark:hover:file:bg-slate-700"
              />
            </div>
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
            {editing ? 'Update Team' : 'Create Team'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">Team</th>
              <th className="py-2.5 px-3 text-left hidden sm:table-cell">Tag</th>
              <th className="py-2.5 px-3 text-left hidden md:table-cell">Game</th>
              <th className="py-2.5 px-3 text-center">Players</th>
              <th className="py-2.5 px-3 text-center hidden sm:table-cell">Events</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {teams.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-2.5 px-3 font-bold">{t.name}</td>
                <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">{t.tag ?? '—'}</td>
                <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{t.game?.name ?? '—'}</td>
                <td className="py-2.5 px-3 text-center font-mono">{t._count.players}</td>
                <td className="py-2.5 px-3 text-center font-mono hidden sm:table-cell">{t._count.tournamentRosters}</td>
                <td className="py-2.5 px-3">
                  <span className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/teams?edit=${t.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                      aria-label={`Edit ${t.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deleteTeam}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        aria-label={`Delete ${t.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                  No teams yet — add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
