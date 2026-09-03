import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const GENRES = ['BATTLE_ROYALE', 'TACTICAL_FPS', 'MOBA', 'FIGHTING', 'SPORTS'];

async function saveGame(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name');
  const genre = fStr(formData, 'genre') || 'BATTLE_ROYALE';
  if (!name) redirect('/admin/games?error=name');

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (s) => {
    const clash = await prisma.game.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const [logoUpload, bannerUpload] = await Promise.all([
    saveUploadedFile(formData.get('logoFile'), 'game-logo'),
    saveUploadedFile(formData.get('bannerFile'), 'game-banner'),
  ]);

  const data = {
    name,
    slug,
    genre: genre as
      | 'BATTLE_ROYALE'
      | 'TACTICAL_FPS'
      | 'MOBA'
      | 'FIGHTING'
      | 'SPORTS',
    developer: fOpt(formData, 'developer'),
  };

  if (id) {
    const existing = await prisma.game.findUnique({
      where: { id },
      select: { logoUrl: true, bannerUrl: true },
    });
    await prisma.game.update({
      where: { id },
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl') ?? existing?.logoUrl ?? null,
        bannerUrl:
          bannerUpload ?? fOpt(formData, 'bannerUrl') ?? existing?.bannerUrl ?? null,
      },
    });
  } else {
    await prisma.game.create({
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl'),
        bannerUrl: bannerUpload ?? fOpt(formData, 'bannerUrl'),
      },
    });
  }

  revalidatePath('/admin/games');
  redirect('/admin/games');
}

async function deleteGame(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    const attached =
      (await prisma.tournament.count({ where: { gameId: id } })) +
      (await prisma.match.count({ where: { gameId: id } })) +
      (await prisma.team.count({ where: { gameId: id } })) +
      (await prisma.player.count({ where: { gameId: id } }));
    if (attached > 0) {
      redirect('/admin/games?error=linked');
    }
    await prisma.game.delete({ where: { id } });
  }
  revalidatePath('/admin/games');
  redirect('/admin/games');
}

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const games = await prisma.game.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { tournaments: true, teams: true, players: true, matches: true } },
    },
  });

  const editing = edit ? await prisma.game.findUnique({ where: { id: edit } }) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-tight">Games</h1>
        {editing && (
          <Link
            href="/admin/games"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New game instead
          </Link>
        )}
      </div>

      {error === 'name' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Game name is required.
        </p>
      )}
      {error === 'linked' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          This game still has tournaments, matches, teams or players attached — reassign or delete them first.
        </p>
      )}

      {/* Create / Edit form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          {editing ? `Editing: ${editing.name}` : 'Add New Game'}
        </summary>

        <form
          action={saveGame}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-5 space-y-4"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input name="name" required defaultValue={editing?.name ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Slug (auto if blank)</label>
              <input name="slug" defaultValue={editing?.slug ?? ''} placeholder="auto" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Genre</label>
              <select name="genre" defaultValue={editing?.genre ?? 'BATTLE_ROYALE'} className={inputCls}>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Developer</label>
              <input name="developer" defaultValue={editing?.developer ?? ''} placeholder="Krafton" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Logo URL</label>
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
              <label className={labelCls}>Banner URL</label>
              <input name="bannerUrl" defaultValue={editing?.bannerUrl ?? ''} className={inputCls} />
              <label className={labelCls + ' mt-2'}>…or Upload Image</label>
              <input
                type="file"
                name="bannerFile"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer hover:file:bg-slate-200 dark:hover:file:bg-slate-700"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            {editing ? 'Update Game' : 'Create Game'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-2.5 px-3 text-left">Game</th>
              <th className="py-2.5 px-3 text-left hidden sm:table-cell">Genre</th>
              <th className="py-2.5 px-3 text-left hidden md:table-cell">Developer</th>
              <th className="py-2.5 px-3 text-center">Events</th>
              <th className="py-2.5 px-3 text-center hidden sm:table-cell">Teams</th>
              <th className="py-2.5 px-3 text-center hidden md:table-cell">Players</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {games.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-2.5 px-3">
                  <span className="font-bold block">{g.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{g.slug}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">
                  {g.genre.replace('_', ' ')}
                </td>
                <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{g.developer ?? '—'}</td>
                <td className="py-2.5 px-3 text-center font-mono">{g._count.tournaments}</td>
                <td className="py-2.5 px-3 text-center font-mono hidden sm:table-cell">{g._count.teams}</td>
                <td className="py-2.5 px-3 text-center font-mono hidden md:table-cell">{g._count.players}</td>
                <td className="py-2.5 px-3">
                  <span className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/admin/games?edit=${g.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0A5FC4] transition-colors"
                      aria-label={`Edit ${g.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deleteGame}>
                      <input type="hidden" name="id" value={g.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        aria-label={`Delete ${g.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                  No games yet — add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
