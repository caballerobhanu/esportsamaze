import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';
import { MediaField } from '@/components/admin/media-field';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
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

  const [logoUpload, logoDarkUpload, bannerUpload] = await Promise.all([
    saveUploadedFile(formData.get('logoFile'), 'game-logo'),
    saveUploadedFile(formData.get('logoDarkFile'), 'game-logo-dark'),
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
    // Nullable on purpose: a game with no family is legitimate, and so is clearing one.
    familyId: fOpt(formData, 'familyId'),
  };

  if (id) {
    // The edit form pre-fills current URLs, so an empty field means the admin
    // cleared it on purpose — no existing-value fallback (deletions must stick).
    await prisma.game.update({
      where: { id },
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl'),
        logoDarkUrl: logoDarkUpload ?? fOpt(formData, 'logoDarkUrl'),
        bannerUrl: bannerUpload ?? fOpt(formData, 'bannerUrl'),
      },
    });
  } else {
    await prisma.game.create({
      data: {
        ...data,
        logoUrl: logoUpload ?? fOpt(formData, 'logoUrl'),
        logoDarkUrl: logoDarkUpload ?? fOpt(formData, 'logoDarkUrl'),
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

/** Create a game family, or rename one when an id is given. */
async function saveGameFamily(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name').trim();
  if (!name) redirect('/admin/games?error=family-name');

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (s) => {
    const clash = await prisma.gameFamily.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const data = { name, slug, description: fOpt(formData, 'description') };
  if (id) await prisma.gameFamily.update({ where: { id }, data });
  else await prisma.gameFamily.create({ data });

  revalidatePath('/admin/games');
  redirect('/admin/games?saved=family');
}

/**
 * Delete a family. Refused while any game still belongs to it: orphaning those games would
 * drop the grouping without saying so, and the family select would then show nothing where a
 * family used to be.
 */
async function deleteGameFamily(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    const attached = await prisma.game.count({ where: { familyId: id } });
    if (attached > 0) redirect('/admin/games?error=family-linked');
    await prisma.gameFamily.delete({ where: { id } });
  }
  revalidatePath('/admin/games');
  redirect('/admin/games?saved=family-deleted');
}

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  const { edit, error } = await searchParams;

  const [games, families] = await Promise.all([
    prisma.game.findMany({
      orderBy: { name: 'asc' },
      include: {
        family: { select: { id: true, name: true } },
        _count: { select: { tournaments: true, teams: true, players: true, matches: true } },
      },
    }),
    prisma.gameFamily.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { games: true } } },
    }),
  ]);

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
      {error === 'family-name' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          A family needs a name.
        </p>
      )}
      {error === 'family-linked' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          That family still has games in it — move them to another family (or none) before deleting it.
        </p>
      )}

      {/* Create / Edit form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 transition-colors">
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
            <MediaField
              label="Logo URL"
              name="logoUrl"
              fileField="logoFile"
              prefix="game-logo"
              defaultValue={editing?.logoUrl ?? ''}
              inputClassName={inputCls}
            />
            <MediaField
              label="Dark Logo URL (optional — shown in dark mode)"
              name="logoDarkUrl"
              fileField="logoDarkFile"
              prefix="game-logo-dark"
              defaultValue={editing?.logoDarkUrl ?? ''}
              inputClassName={inputCls}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              hint="Light wordmarks disappear on dark backgrounds — upload a white/knockout variant."
            />
            <MediaField
              label="Banner URL"
              name="bannerUrl"
              fileField="bannerFile"
              prefix="game-banner"
              defaultValue={editing?.bannerUrl ?? ''}
              inputClassName={inputCls}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Game Family
            </label>
            <select name="familyId" defaultValue={editing?.familyId ?? ''} className={inputCls}>
              <option value="">No family</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Groups titles that share an ecosystem, such as BGMI and PUBG Mobile. Managed below the list.
            </p>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors"
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
                  {g.family && (
                    <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {g.family.name}
                    </span>
                  )}
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
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
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

      {/* GAME FAMILIES — the grouping above a title. Managed here because `Game.familyId` had no
          input anywhere: a family could be set only by editing the seed, even though the public
          teams directory already filters by it. */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider">Game Families</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Groups titles that share an ecosystem, such as BGMI and PUBG Mobile. Assign one per game in the
            form above.
          </p>
        </div>

        {families.map((family) => (
          <div key={family.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800/70 p-2">
            <form action={saveGameFamily} className="flex flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={family.id} />
              <input
                name="name"
                defaultValue={family.name}
                className="flex-1 min-w-[150px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              />
              <input
                name="description"
                defaultValue={family.description ?? ''}
                placeholder="Description (optional)"
                className="flex-1 min-w-[150px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <span className="text-[10px] font-mono text-slate-400">{family._count.games} games</span>
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold"
              >
                Save
              </button>
            </form>
            <form action={deleteGameFamily}>
              <input type="hidden" name="id" value={family.id} />
              <button
                type="submit"
                aria-label={`Delete ${family.name}`}
                className="p-1.5 rounded-md text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ))}

        <form
          action={saveGameFamily}
          className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
        >
          <input
            name="name"
            required
            placeholder="New family name (e.g. PUBG Mobile / BGMI)"
            className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add family
          </button>
        </form>

        {families.length === 0 && <p className="text-xs text-slate-400">No families yet.</p>}
      </div>
    </div>
  );
}
