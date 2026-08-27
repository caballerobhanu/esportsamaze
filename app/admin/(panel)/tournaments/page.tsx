import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, Trophy, Award, Calendar, DollarSign, Globe } from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fNum, fSocials, uniqueSlug } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';
import {
  TOURNAMENT_TIERS,
  EVENT_TYPES,
  GAME_MODES,
  CURRENCIES,
  deriveTournamentStatus,
  calculateTournamentStandings,
} from '@/lib/tournament-math';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

async function saveTournament(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');

  const id = fStr(formData, 'id');
  const name = fStr(formData, 'name');
  const gameId = fStr(formData, 'gameId');
  const startDate = fDate(formData, 'startDate');
  const endDate = fDate(formData, 'endDate');
  if (!name || !gameId || !startDate || !endDate) {
    redirect(`/admin/tournaments?error=required${id ? `&edit=${id}` : ''}`);
  }

  const slug = await uniqueSlug(fStr(formData, 'slug') || name, async (s) => {
    const clash = await prisma.tournament.findFirst({
      where: { slug: s, ...(id ? { NOT: { id } } : {}) },
      select: { id: true },
    });
    return Boolean(clash);
  });

  const [imageUpload, imageDarkUpload, bannerUpload] = await Promise.all([
    saveUploadedFile(formData.get('imageFile'), 'tournament-logo-light'),
    saveUploadedFile(formData.get('imageDarkFile'), 'tournament-logo-dark'),
    saveUploadedFile(formData.get('bannerFile'), 'tournament-banner'),
  ]);

  // Derived or selected status
  const manualStatus = fStr(formData, 'status');
  const status = (manualStatus && manualStatus !== 'AUTO'
    ? manualStatus
    : deriveTournamentStatus(startDate, endDate)) as
    | 'UPCOMING'
    | 'ONGOING'
    | 'COMPLETED'
    | 'CANCELED';

  // Multi-countries parsing
  const countriesInput = fStr(formData, 'countries');
  const countries = countriesInput
    ? countriesInput.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  // Prize pool distribution JSON
  let prizeDistribution: any = null;
  const prizeDistRaw = fStr(formData, 'prizeDistribution');
  if (prizeDistRaw) {
    try {
      prizeDistribution = JSON.parse(prizeDistRaw);
    } catch {
      prizeDistribution = null;
    }
  }

  // Format details JSON
  let formatDetails: any = null;
  const formatDetailsRaw = fStr(formData, 'formatDetails');
  if (formatDetailsRaw) {
    try {
      formatDetails = JSON.parse(formatDetailsRaw);
    } catch {
      formatDetails = { description: formatDetailsRaw };
    }
  }

  // Selected Organizers, Sponsors, Venues
  const selectedOrganizers = formData.getAll('organizerIds').map(String).filter(Boolean);
  const selectedSponsors = formData.getAll('sponsorIds').map(String).filter(Boolean);
  const selectedVenues = formData.getAll('venueIds').map(String).filter(Boolean);

  const data = {
    name,
    slug,
    gameId,
    series: fOpt(formData, 'series'),
    season: fOpt(formData, 'season'),
    seriesValue: fNum(formData, 'seriesValue'),
    tier: fStr(formData, 'tier') || 'A-Tier',
    status,
    eventType: fStr(formData, 'eventType') || 'LAN',
    gameMode: fStr(formData, 'gameMode') || 'Squads TPP',
    device: fOpt(formData, 'device'),
    region: fOpt(formData, 'region'),
    countries,
    prizePool: fNum(formData, 'prizePool'),
    currency: fStr(formData, 'currency') || 'INR',
    usdRate: fNum(formData, 'usdRate'),
    prizeDistribution,
    startDate,
    endDate,
    winnerTeamId: fOpt(formData, 'winnerTeamId'),
    winner: fOpt(formData, 'winner'),
    runnerUpTeamId: fOpt(formData, 'runnerUpTeamId'),
    runnerUp: fOpt(formData, 'runnerUp'),
    liquipedia: fOpt(formData, 'liquipedia'),
    socialLinks: fSocials(formData),
    formatDetails,
  };

  let tournamentId = id;

  if (id) {
    const existing = await prisma.tournament.findUnique({
      where: { id },
      select: { imageUrl: true, imageDarkUrl: true, bannerUrl: true },
    });

    await prisma.tournament.update({
      where: { id },
      data: {
        ...data,
        imageUrl: imageUpload ?? fOpt(formData, 'imageUrl') ?? existing?.imageUrl ?? null,
        imageDarkUrl: imageDarkUpload ?? fOpt(formData, 'imageDarkUrl') ?? existing?.imageDarkUrl ?? null,
        bannerUrl: bannerUpload ?? fOpt(formData, 'bannerUrl') ?? existing?.bannerUrl ?? null,
      },
    });

    // Update relations
    await prisma.tournamentOrganizer.deleteMany({ where: { tournamentId: id } });
    if (selectedOrganizers.length > 0) {
      await prisma.tournamentOrganizer.createMany({
        data: selectedOrganizers.map((orgId) => ({ tournamentId: id, organizerId: orgId })),
      });
    }

    await prisma.tournamentSponsor.deleteMany({ where: { tournamentId: id } });
    if (selectedSponsors.length > 0) {
      await prisma.tournamentSponsor.createMany({
        data: selectedSponsors.map((spId) => ({ tournamentId: id, sponsorId: spId })),
      });
    }

    await prisma.tournamentVenue.deleteMany({ where: { tournamentId: id } });
    if (selectedVenues.length > 0) {
      await prisma.tournamentVenue.createMany({
        data: selectedVenues.map((vId) => ({ tournamentId: id, venueId: vId })),
      });
    }
  } else {
    const created = await prisma.tournament.create({
      data: {
        ...data,
        imageUrl: imageUpload ?? fOpt(formData, 'imageUrl'),
        imageDarkUrl: imageDarkUpload ?? fOpt(formData, 'imageDarkUrl'),
        bannerUrl: bannerUpload ?? fOpt(formData, 'bannerUrl'),
        organizers: {
          create: selectedOrganizers.map((orgId) => ({ organizerId: orgId })),
        },
        sponsors: {
          create: selectedSponsors.map((spId) => ({ sponsorId: spId })),
        },
        venues: {
          create: selectedVenues.map((vId) => ({ venueId: vId })),
        },
      },
    });
    tournamentId = created.id;
  }

  revalidatePath('/admin/tournaments');
  revalidatePath('/tournaments');
  redirect('/admin/tournaments');
}

async function deleteTournament(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    await prisma.tournament.delete({ where: { id } }).catch(() => null);
  }
  revalidatePath('/admin/tournaments');
  revalidatePath('/tournaments');
  redirect('/admin/tournaments');
}

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const { edit, error } = await searchParams;

  const [games, organizers, sponsors, venues, teams, tournaments] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: 'asc' } }),
    prisma.organizer.findMany({ orderBy: { name: 'asc' } }),
    prisma.sponsor.findMany({ orderBy: { name: 'asc' } }),
    prisma.venue.findMany({ orderBy: { name: 'asc' } }),
    prisma.team.findMany({ orderBy: { name: 'asc' } }),
    prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        game: { select: { name: true } },
        organizers: { include: { organizer: true } },
        sponsors: { include: { sponsor: true } },
        venues: { include: { venue: true } },
        matches: {
          include: {
            games: {
              include: {
                teamResults: {
                  include: { team: { select: { id: true, name: true, tag: true, logoUrl: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const editing = edit
    ? await prisma.tournament.findUnique({
        where: { id: edit },
        include: {
          organizers: true,
          sponsors: true,
          venues: true,
          matches: {
            include: {
              games: {
                include: {
                  teamResults: {
                    include: { team: { select: { id: true, name: true, tag: true, logoUrl: true } } },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  // Auto-calculated Standings for Winner and Runner Up
  let autoWinner = editing?.winner || '';
  let autoRunnerUp = editing?.runnerUp || '';
  if (editing && editing.matches.length > 0) {
    const allResults = editing.matches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
    const standings = calculateTournamentStandings(allResults);
    if (standings.length > 0) autoWinner = standings[0].teamName;
    if (standings.length > 1) autoRunnerUp = standings[1].teamName;
  }

  const selectedOrgIds = new Set(editing?.organizers.map((o) => o.organizerId) ?? []);
  const selectedSpIds = new Set(editing?.sponsors.map((s) => s.sponsorId) ?? []);
  const selectedVenueIds = new Set(editing?.venues.map((v) => v.venueId) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#0A5FC4]" /> Tournament Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure tournament metadata, series weights, tiers, multi-venues, sponsors, and prize pools.
          </p>
        </div>
        {editing && (
          <Link
            href="/admin/tournaments"
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            + New tournament instead
          </Link>
        )}
      </div>

      {error === 'required' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          Name, game and both start &amp; end dates are required.
        </p>
      )}

      {/* Create / Edit form */}
      <details open={Boolean(editing)}>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          {editing ? `Editing: ${editing.name}` : 'Create New Tournament'}
        </summary>

        <form
          action={saveTournament}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-6 space-y-6"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          {/* Section 1: Basic Tournament Identity */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4" /> 1. Tournament Identity &amp; Game
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Tournament Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={editing?.name ?? ''}
                  placeholder="Battlegrounds Mobile India Series 2026"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Slug (URL Key)</label>
                <input
                  name="slug"
                  defaultValue={editing?.slug ?? ''}
                  placeholder="bgis-2026 (auto if blank)"
                  className={inputCls}
                />
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
                <label className={labelCls}>Series (Blanket Series)</label>
                <input
                  name="series"
                  defaultValue={editing?.series ?? ''}
                  placeholder="e.g. BGIS / BMPS / PMGC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Season / Series Label</label>
                <input
                  name="season"
                  defaultValue={editing?.season ?? ''}
                  placeholder="e.g. 2026 Edition / Season 4"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Series Weight / Value</label>
                <input
                  type="number"
                  name="seriesValue"
                  defaultValue={editing?.seriesValue ?? 5}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Event Tier</label>
                <select name="tier" defaultValue={editing?.tier ?? 'S-Tier'} className={inputCls}>
                  {TOURNAMENT_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Event Type</label>
                <select name="eventType" defaultValue={editing?.eventType ?? 'LAN'} className={inputCls}>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Game Mode</label>
                <select name="gameMode" defaultValue={editing?.gameMode ?? 'Squads TPP'} className={inputCls}>
                  {GAME_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Device Platform</label>
                <input
                  name="device"
                  defaultValue={editing?.device ?? ''}
                  placeholder="e.g. Realme GT 7 Pro / Mobile / PC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <input
                  name="region"
                  defaultValue={editing?.region ?? ''}
                  placeholder="e.g. India / Global / APAC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select name="status" defaultValue={editing?.status ?? 'AUTO'} className={inputCls}>
                  <option value="AUTO">Auto (Derived from Start &amp; End Dates)</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ONGOING">ONGOING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Venues, Countries, Organizers & Sponsors */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> 2. Venues, Countries, Organizers &amp; Sponsors
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className={labelCls}>List of Countries (comma separated)</label>
                <input
                  name="countries"
                  defaultValue={
                    Array.isArray(editing?.countries)
                      ? (editing?.countries as string[]).join(', ')
                      : 'India'
                  }
                  placeholder="India, Saudi Arabia, Indonesia"
                  className={inputCls}
                />
              </div>

              {/* Venues Multi-Select */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/50">
                <label className={labelCls + ' mb-2'}>Stadiums / Venues</label>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                  {venues.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="venueIds"
                        value={v.id}
                        defaultChecked={selectedVenueIds.has(v.id)}
                        className="rounded text-[#0A5FC4]"
                      />
                      <span>
                        {v.name} {v.city ? `(${v.city})` : ''}
                      </span>
                    </label>
                  ))}
                  {venues.length === 0 && (
                    <p className="text-[11px] text-slate-400">
                      No venues yet.{' '}
                      <Link href="/admin/venues" className="text-blue-500 underline">
                        Add one
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              {/* Organizers Multi-Select */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/50">
                <label className={labelCls + ' mb-2'}>Organizers &amp; Broadcasters</label>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                  {organizers.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="organizerIds"
                        value={o.id}
                        defaultChecked={selectedOrgIds.has(o.id)}
                        className="rounded text-[#0A5FC4]"
                      />
                      <span>
                        {o.name} <span className="text-slate-400 text-[10px]">({o.type})</span>
                      </span>
                    </label>
                  ))}
                  {organizers.length === 0 && (
                    <p className="text-[11px] text-slate-400">
                      No organizers yet.{' '}
                      <Link href="/admin/organizers" className="text-blue-500 underline">
                        Add one
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              {/* Sponsors Multi-Select */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/50">
                <label className={labelCls + ' mb-2'}>Sponsors &amp; Partners</label>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                  {sponsors.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sponsorIds"
                        value={s.id}
                        defaultChecked={selectedSpIds.has(s.id)}
                        className="rounded text-[#0A5FC4]"
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                  {sponsors.length === 0 && (
                    <p className="text-[11px] text-slate-400">
                      No sponsors yet.{' '}
                      <Link href="/admin/sponsors" className="text-blue-500 underline">
                        Add one
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Prize Pool, Currency & Dates */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" /> 3. Prize Pool, Currency &amp; Schedule
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>Prize Pool Amount</label>
                <input
                  type="number"
                  name="prizePool"
                  defaultValue={editing?.prizePool ?? 40000000}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select name="currency" defaultValue={editing?.currency ?? 'INR'} className={inputCls}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>USD Conversion Rate</label>
                <input
                  type="number"
                  step="any"
                  name="usdRate"
                  defaultValue={editing?.usdRate ?? 0.01104}
                  placeholder="0.01104"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  defaultValue={editing ? editing.startDate.toISOString().slice(0, 10) : ''}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  required
                  defaultValue={editing ? editing.endDate.toISOString().slice(0, 10) : ''}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Winner Team {autoWinner && `(Auto: ${autoWinner})`}
                </label>
                <select name="winnerTeamId" defaultValue={editing?.winnerTeamId ?? ''} className={inputCls}>
                  <option value="">Select Champion…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="hidden"
                  name="winner"
                  value={editing?.winner || autoWinner}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Runner-Up Team {autoRunnerUp && `(Auto: ${autoRunnerUp})`}
                </label>
                <select
                  name="runnerUpTeamId"
                  defaultValue={editing?.runnerUpTeamId ?? ''}
                  className={inputCls}
                >
                  <option value="">Select Runner-Up…</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="hidden"
                  name="runnerUp"
                  value={editing?.runnerUp || autoRunnerUp}
                />
              </div>
              <div>
                <label className={labelCls}>Liquipedia URL</label>
                <input
                  name="liquipedia"
                  defaultValue={editing?.liquipedia ?? ''}
                  placeholder="https://liquipedia.net/…"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Prize Distribution JSON */}
            <div className="mt-3">
              <label className={labelCls}>
                Prize Distribution Matrix (JSON breakdown)
              </label>
              <textarea
                name="prizeDistribution"
                rows={3}
                defaultValue={
                  editing?.prizeDistribution
                    ? JSON.stringify(editing.prizeDistribution, null, 2)
                    : JSON.stringify(
                        [
                          { rank: '1st', percentage: 37.5, prize: 15000000 },
                          { rank: '2nd', percentage: 18.75, prize: 7500000 },
                          { rank: '3rd', percentage: 11.25, prize: 4500000 },
                          { rank: '4th', percentage: 7.5, prize: 3000000 },
                        ],
                        null,
                        2
                      )
                }
                className={inputCls + ' font-mono text-xs'}
              />
            </div>
          </div>

          {/* Section 4: Dual Logos & Banners */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              🖼️ 4. Branding, Logos &amp; Header Banner
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Light Theme Logo URL</label>
                <input name="imageUrl" defaultValue={editing?.imageUrl ?? ''} className={inputCls} />
                <label className={labelCls + ' mt-2'}>…or Upload Light Logo</label>
                <input
                  type="file"
                  name="imageFile"
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer"
                />
              </div>
              <div>
                <label className={labelCls}>Dark Theme Logo URL</label>
                <input
                  name="imageDarkUrl"
                  defaultValue={editing?.imageDarkUrl ?? ''}
                  className={inputCls}
                />
                <label className={labelCls + ' mt-2'}>…or Upload Dark Logo</label>
                <input
                  type="file"
                  name="imageDarkFile"
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer"
                />
              </div>
              <div>
                <label className={labelCls}>Banner Image URL</label>
                <input name="bannerUrl" defaultValue={editing?.bannerUrl ?? ''} className={inputCls} />
                <label className={labelCls + ' mt-2'}>…or Upload Banner</label>
                <input
                  type="file"
                  name="bannerFile"
                  accept="image/*"
                  className="w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Section 5: All Social Media Channels */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 mb-3 flex items-center gap-1.5">
              🔗 5. Social Media &amp; Broadcast Channels
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                'website',
                'instagram',
                'facebook',
                'twitter',
                'youtube',
                'kick',
                'twitch',
                'discord',
              ].map((key) => (
                <div key={key}>
                  <label className={labelCls}>{key}</label>
                  <input
                    name={key}
                    placeholder={`https://${key}.com/…`}
                    defaultValue={
                      editing &&
                      typeof editing.socialLinks === 'object' &&
                      editing.socialLinks !== null
                        ? String((editing.socialLinks as Record<string, unknown>)[key] ?? '')
                        : ''
                    }
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#0A5FC4] hover:bg-[#0850a3] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            {editing ? 'Update Tournament' : 'Create Tournament'}
          </button>
        </form>
      </details>

      {/* List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
              <th className="py-3 px-3 text-left">Tournament</th>
              <th className="py-3 px-3 text-left hidden md:table-cell">Tier &amp; Mode</th>
              <th className="py-3 px-3 text-left hidden sm:table-cell">Dates</th>
              <th className="py-3 px-3 text-left">Prize Pool</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {tournaments.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                <td className="py-3 px-3">
                  <span className="font-bold block max-w-[280px] truncate">{t.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {t.slug} · {t.game.name}
                  </span>
                </td>
                <td className="py-3 px-3 hidden md:table-cell">
                  <span className="text-xs font-bold block">{t.tier}</span>
                  <span className="text-[11px] text-slate-400">
                    {t.eventType} · {t.gameMode}
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-500 text-xs hidden sm:table-cell">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {t.startDate.toISOString().slice(0, 10)} → {t.endDate.toISOString().slice(0, 10)}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono font-bold text-xs">
                  {t.currency}{' '}
                  {t.prizePool ? (t.prizePool / 10000000 >= 1 ? `${(t.prizePool / 10000000).toFixed(1)} Cr` : t.prizePool.toLocaleString()) : '—'}
                </td>
                <td className="py-3 px-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      t.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : t.status === 'ONGOING'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/tournaments/${t.slug}`}
                      target="_blank"
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-500 transition-colors"
                      title="View Public Page"
                    >
                      ↗
                    </Link>
                    <Link
                      href={`/admin/tournaments?edit=${t.id}`}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#0A5FC4] transition-colors"
                      title="Edit Tournament"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <form action={deleteTournament}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Tournament"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                  No tournaments yet — create your first tournament above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
