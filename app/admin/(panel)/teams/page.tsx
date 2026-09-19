import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AlertTriangle, CheckCircle2, Copy, Plus } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fSocials, uniqueSlug } from '@/lib/admin-forms';
import { recordSlugChange } from '@/lib/slug-history';
import { setRosterMembership } from '@/lib/player-transfers';
import { revalidateTransferSurfaces } from '@/lib/revalidate-transfers';
import { saveUploadedFile } from '@/lib/upload';
import { COUNTRIES } from '@/lib/countries';
import { Combobox } from '@/components/admin/combobox';
import { MediaField } from '@/components/admin/media-field';
import { TeamPeopleManager } from '@/components/admin/team-people-manager';
import { TeamsManagerTable } from '@/components/admin/teams-manager-table';

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

  const rawTag = fOpt(formData, 'tag');
  const tag = rawTag ? rawTag.trim().toUpperCase() : null;

  // Short code / tag MUST be unique between teams (case-insensitive)
  if (tag) {
    const tagClash = await prisma.team.findFirst({
      where: {
        tag: { equals: tag, mode: 'insensitive' },
        ...(id ? { NOT: { id } } : {}),
      },
      select: { id: true, name: true, tag: true },
    });
    if (tagClash) {
      redirect(
        `/admin/teams?error=tag_clash&clashTag=${encodeURIComponent(tag)}&clashName=${encodeURIComponent(
          tagClash.name
        )}${id ? `&edit=${id}` : ''}`
      );
    }
  }

  const [logoUpload, logoDarkUpload] = await Promise.all([
    saveUploadedFile(formData.get('logoFile'), 'team-logo'),
    saveUploadedFile(formData.get('logoDarkFile'), 'team-logo-dark'),
  ]);

  const data = {
    name,
    slug,
    displayName: fOpt(formData, 'displayName'),
    tag,
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
      select: { logoUrl: true, imageDarkUrl: true, slug: true },
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
    await recordSlugChange('team', existing?.slug, slug, id);
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

async function duplicateTeam(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/teams');

  const source = await prisma.team.findUnique({ where: { id } });
  if (!source) redirect('/admin/teams');

  const newName = `${source.name} (Copy)`;
  const slug = await uniqueSlug(fStr(formData, 'slug') || `${source.slug || source.name}-copy`, async (s) => {
    const clash = await prisma.team.findFirst({ where: { slug: s }, select: { id: true } });
    return Boolean(clash);
  });

  const created = await prisma.team.create({
    data: {
      name: newName,
      displayName: source.displayName ? `${source.displayName} (Copy)` : null,
      slug,
      tag: null, // Left null to strictly enforce short code uniqueness between teams
      region: source.region,
      founded: source.founded,
      status: source.status,
      sponsors: source.sponsors,
      gameId: source.gameId,
      logoUrl: source.logoUrl,
      imageDarkUrl: source.imageDarkUrl,
      socialLinks: source.socialLinks ?? undefined,
    },
  });

  revalidatePath('/admin/teams');
  redirect(`/admin/teams?edit=${created.id}&saved=copy`);
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
      (await prisma.tournament.count({ where: { OR: [{ winnerTeamId: id }, { runnerUpTeamId: id }] } }));
    if (attached > 0) {
      redirect('/admin/teams?error=linked');
    }
    await prisma.team.delete({ where: { id } });
  }
  revalidatePath('/admin/teams');
  redirect('/admin/teams');
}

/** Attach an existing player to this team (already a Player row). */
async function attachTeamPerson(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const teamId = fStr(formData, 'teamId');
  const playerId = fStr(formData, 'playerId');
  const role = fOpt(formData, 'role');
  const staffRole = fOpt(formData, 'staffRole');
  const isPlayer = formData.get('isPlayer') === 'on';
  if (!teamId || !playerId) redirect(`/admin/teams?edit=${teamId}&error=person`);

  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: playerId },
      data: { role: role || null, staffRole, isPlayer },
    });
    // Roster membership is a stored slot — attaching a person records no transfer.
    await setRosterMembership(tx, playerId, teamId);
  });

  revalidatePath('/admin/teams');
  revalidateTransferSurfaces();
  redirect(`/admin/teams?edit=${teamId}`);
}

/** Create a brand-new person (staff / organisation member) linked to this team. */
async function createTeamPerson(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const teamId = fStr(formData, 'teamId');
  const ign = fStr(formData, 'ign');
  if (!teamId || !ign) redirect(`/admin/teams?edit=${teamId}&error=person`);
  const slug = await uniqueSlug(`${ign}`, async (s) => {
    const clash = await prisma.player.findFirst({ where: { slug: s }, select: { id: true } });
    return Boolean(clash);
  });
  const staffRole = fOpt(formData, 'staffRole');

  await prisma.$transaction(async (tx) => {
    // Starts a free agent; the ledger records the appointment.
    const created = await tx.player.create({
      data: {
        ign,
        slug,
        role: fOpt(formData, 'role'),
        staffRole,
        isPlayer: formData.get('isPlayer') === 'on',
        status: 'ACTIVE',
        gameId: fOpt(formData, 'gameId'),
      },
    });
    await setRosterMembership(tx, created.id, teamId);
  });

  revalidatePath('/admin/teams');
  revalidateTransferSurfaces();
  redirect(`/admin/teams?edit=${teamId}`);
}

/** Unlink a person from this team (keeps the Player row). */
async function removeTeamPerson(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const teamId = fStr(formData, 'teamId');
  const playerId = fStr(formData, 'playerId');
  if (teamId && playerId) {
    await prisma.$transaction(async (tx) => {
      await setRosterMembership(tx, playerId, null);
    });
  }
  revalidatePath('/admin/teams');
  revalidateTransferSurfaces();
  redirect(`/admin/teams?edit=${teamId}`);
}

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    clashTag?: string;
    clashName?: string;
    saved?: string;
  }>;
}) {
  const { edit, error, clashTag, clashName, saved } = await searchParams;

  const [games, teams] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: 'asc' } }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        game: { select: { id: true, name: true } },
        _count: { select: { players: true, tournamentRosters: true } },
      },
    }),
  ]);

  const editing = edit
    ? await prisma.team.findUnique({
        where: { id: edit },
        include: {
          players: { orderBy: { isPlayer: 'desc' }, take: 60 },
          game: { select: { id: true, name: true } },
        },
      })
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
          <div className="flex items-center gap-3">
            <form action={duplicateTeam}>
              <input type="hidden" name="id" value={editing.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-(--ed-blue) dark:hover:text-slate-200 transition-colors cursor-pointer"
                title={`Duplicate "${editing.name}"`}
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
            </form>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <Link
              href="/admin/teams"
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              + New team instead
            </Link>
          </div>
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
      {error === 'tag_clash' && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>
            Short code <strong className="font-mono underline">{clashTag || 'entered'}</strong> is already used by team{' '}
            <strong>&quot;{clashName || 'another team'}&quot;</strong>. Short codes cannot be shared between teams.
          </span>
        </div>
      )}
      {error === 'person' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          The person could not be saved — make sure a player was selected (for attach) or an IGN
          was entered (for create).
        </p>
      )}
      {saved === 'copy' && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>
            Team duplicated successfully! Short code was left blank to prevent collision — please assign a unique short code if needed.
          </span>
        </div>
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
              <label className={labelCls}>
                Tag / Short Code <span className="text-[10px] text-slate-400 font-normal normal-case">(Must be unique)</span>
              </label>
              <input
                name="tag"
                defaultValue={editing?.tag ?? ''}
                placeholder="SOUL"
                className={`${inputCls} font-mono uppercase`}
              />
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
            <MediaField
              label="Logo (light)"
              name="logoUrl"
              fileField="logoFile"
              prefix="team-logo"
              defaultValue={editing?.logoUrl ?? ''}
              inputClassName={inputCls}
            />
            <MediaField
              label="Logo (dark)"
              name="imageDarkUrl"
              fileField="logoDarkFile"
              prefix="team-logo-dark"
              defaultValue={editing?.imageDarkUrl ?? ''}
              inputClassName={inputCls}
            />
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
            className="px-4 py-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            {editing ? 'Update Team' : 'Create Team'}
          </button>
        </form>
      </details>

      {/* People & roster — only relevant when editing an existing team */}
      {editing && (
        <TeamPeopleManager
          teamId={editing.id}
          players={editing.players.map((p) => ({
            id: p.id,
            ign: p.ign,
            slug: p.slug,
            role: p.role,
            staffRole: p.staffRole,
            isPlayer: p.isPlayer,
          }))}
          attachAction={attachTeamPerson}
          createAction={createTeamPerson}
          removeAction={removeTeamPerson}
        />
      )}

      {/* Teams Manager Table with Live Search & Filtering */}
      <TeamsManagerTable
        teams={teams}
        games={games}
        deleteTeamAction={deleteTeam}
        duplicateTeamAction={duplicateTeam}
      />
    </div>
  );
}
