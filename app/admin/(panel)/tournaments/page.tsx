import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Pencil, Trash2, Plus, Trophy, Award, Calendar, DollarSign, Globe, Save, Copy } from 'lucide-react';
import { Combobox } from '@/components/admin/combobox';
import { MediaField } from '@/components/admin/media-field';
import prisma from '@/lib/prisma';
import { revalidateTournamentPages } from '@/lib/revalidate-tournament';
import { applyRosterMembership } from '@/lib/player-transfers';
import type { Prisma } from '@prisma/client';
import { isAdmin } from '@/lib/admin-auth';
import { fStr, fOpt, fDate, fNum, fSocials, uniqueSlug, fTournamentStatus, fUrl } from '@/lib/admin-forms';
import { saveUploadedFile } from '@/lib/upload';
import {
  TOURNAMENT_TIERS,
  EVENT_TYPES,
  GAME_MODES,
  TOURNAMENT_PLATFORMS,
  CURRENCIES,
  getCurrencyUsdRate,
  deriveTournamentStatus,
  calculateTournamentStandings,
} from '@/lib/tournament-math';

import {
  TournamentVenuesInput,
  TournamentRegionInput,
  TournamentCountriesInput,
} from '@/components/admin/tournament-venue-region-inputs';
import { TournamentOrganizersInput } from '@/components/admin/tournament-organizers-input';
import { TournamentSponsorsInput } from '@/components/admin/tournament-sponsors-input';
import { TournamentQualificationsInput } from '@/components/admin/tournament-qualifications-input';
import { parseBerths } from '@/lib/tournament-prizes';
import { TournamentPrizeDistributionInput } from '@/components/admin/tournament-prize-distribution-input';
import { TournamentFinalRankingsInput } from '@/components/admin/tournament-final-rankings-input';
import { TournamentPointsSystemInput } from '@/components/admin/tournament-points-system-input';
import { TournamentStagesFormatInput, type GroupCandidate } from '@/components/admin/tournament-stages-format-input';
import { FormTabs, FormPanel } from '@/components/admin/form-tabs';
import { TournamentSquadsInput, type SquadRow } from '@/components/admin/tournament-squads-input';
import { TournamentStandingsConfigInput } from '@/components/admin/tournament-standings-config-input';
import { TournamentCloneDialog } from '@/components/admin/tournament-clone-dialog';
import { matchStageLabel } from '@/lib/standings-config';
import { getExchangeRatesForDate, resolveCurrencyUsdRate } from '@/lib/currency';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

/**
 * The editor's sections, grouped into tabs. The panel grouping lives with the markup — a
 * tab holds whichever sections belong together, in the order they already appear.
 */
const TOURNAMENT_FORM_TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'format', label: 'Format' },
  { id: 'squads', label: 'Squads' },
  { id: 'prizes', label: 'Prizes & Results' },
  { id: 'standings', label: 'Standings' },
  { id: 'branding', label: 'Branding' },
];

/**
 * Which tab owns a structured field that failed to parse — `?error=json&field=…`. Without
 * this the banner would name a field sitting in a hidden tab, where no control is visible.
 */
const TAB_BY_JSON_FIELD: Record<string, string> = {
  'stages format': 'format',
  'points system': 'format',
  squads: 'squads',
  'prize distribution': 'prizes',
  qualifications: 'prizes',
  'final rankings': 'prizes',
  'standings config': 'standings',
};

type StandingsInputRow = Parameters<typeof calculateTournamentStandings>[0][number];

/**
 * `calculateTournamentStandings` declares its detail stats as `number |
 * undefined`, but the columns are NULLABLE in the database. Carry only the
 * fields the aggregator accepts, and map a NULL to `undefined` ("not provided")
 * so a blank telemetry column never lands in a total as a real 0.
 */
const STANDINGS_DETAIL_KEYS = [
  'damage',
  'healing',
  'damageReceived',
  'headshots',
  'assists',
  'knockouts',
  'longestElim',
  'vehicleElims',
  'grenadeElims',
  'utilitiesTotal',
  'rescues',
] as const;

function toStandingsRow<T extends object>(row: T): StandingsInputRow {
  const source = row as Record<string, any>;
  const mapped: StandingsInputRow = {
    teamId: source.teamId,
    team: source.team,
    rank: source.rank,
    wwcd: source.wwcd,
    placePoints: source.placePoints,
    elimsPoints: source.elimsPoints,
    bonusPoints: source.bonusPoints,
    totalPoints: source.totalPoints,
  };
  for (const key of STANDINGS_DETAIL_KEYS) {
    const value = source[key];
    if (typeof value === 'number') mapped[key] = value;
  }
  return mapped;
}

/**
 * Parse a JSON form field. A malformed payload aborts the whole save with a
 * visible error — silently dropping admin-entered data (or, worse, feeding an
 * empty parsed list into the squads delete sweep) is never acceptable.
 */
function parseJsonField<T>(raw: string | null | undefined, field: string): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    redirect(`/admin/tournaments?error=json&field=${encodeURIComponent(field)}`);
  }
}

/**
 * A squad row is worth keeping — and worth loading back into the form — when it
 * says anything at all. The form and the save must agree on this, or a row can
 * be displayed and then silently dropped on save.
 */
function squadHasContent(squad: {
  teamId?: string | null;
  seedLabel?: string | null;
  seed?: number | null;
  seedTournamentId?: string | null;
  region?: string | null;
  country?: string | null;
}): boolean {
  return Boolean(
    squad.teamId ||
      squad.seedLabel?.trim() ||
      squad.seedTournamentId ||
      squad.region?.trim() ||
      squad.country?.trim() ||
      squad.seed != null
  );
}

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

  // Derived or selected status (validated against Prisma TournamentStatus enum)
  const manualStatus = fTournamentStatus(formData, 'status');
  const status = manualStatus ?? deriveTournamentStatus(startDate, endDate);

  // Multi-countries parsing
  const countriesInput = fStr(formData, 'countries');

  // How many seats the teams tab presents. Blank means "only what is recorded".
  const teamsToShowRaw = fStr(formData, 'teamsToShow').trim();
  const teamsToShow = teamsToShowRaw
    ? Math.max(0, Math.trunc(Number(teamsToShowRaw) || 0))
    : null;
  const countries = countriesInput
    ? countriesInput.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  // Prize pool distribution JSON (multi-stage or flat)
  const prizeDistribution = parseJsonField<any>(fStr(formData, 'prizeDistribution'), 'prize distribution');

  // Qualifications / Seeded Events JSON
  const qualifications = parseJsonField<any>(fStr(formData, 'qualificationsJson'), 'qualifications');

  // Team Final Rankings JSON
  const teamRankingsList = parseJsonField<
    Array<{
      teamId: string;
      rank: number;
      prizeWon?: number;
      berths?: unknown;
    }>
  >(fStr(formData, 'teamRankingsJson'), 'final rankings') ?? [];

  // Format details JSON (points system, placement points, kill points multiplier, featured stage, custom backdrop watermark)
  const formatDetailsRaw = fStr(formData, 'formatDetailsJson') || fStr(formData, 'formatDetails');
  let formatDetails = parseJsonField<any>(formatDetailsRaw, 'points system');

  const featuredStage = fStr(formData, 'featuredStage')?.trim() || null;
  const hasBackdropField = formData.has('backdropText');
  const backdropText = hasBackdropField ? (fStr(formData, 'backdropText')?.trim() || null) : undefined;

  if (featuredStage || hasBackdropField || formatDetails) {
    formatDetails = {
      ...(formatDetails || {}),
      featuredStage,
      ...(hasBackdropField ? { backdropText } : {}),
    };
  }

  // Stages & format configuration JSON (headerCards, stageFormats, stages, tiebreakerTiers)
  const stagesFormatRaw = fStr(formData, 'stagesFormatJson');
  const stagesFormat = parseJsonField<any>(stagesFormatRaw, 'stages format');

  if (stagesFormat) {
    formatDetails = {
      ...(formatDetails || {}),
      ...(stagesFormat.headerCards ? { headerCards: stagesFormat.headerCards } : {}),
      ...(stagesFormat.stageFormats ? { stageFormats: stagesFormat.stageFormats } : {}),
      ...(stagesFormat.stages ? { stages: stagesFormat.stages } : {}),
      ...(stagesFormat.tiebreakerTiers ? { tiebreakerTiers: stagesFormat.tiebreakerTiers } : {}),
      ...(typeof stagesFormat.showCalendarWidget === 'boolean'
        ? { showCalendarWidget: stagesFormat.showCalendarWidget }
        : {}),
      ...(stagesFormat.calendarPhases ? { calendarPhases: stagesFormat.calendarPhases } : {}),
      ...(stagesFormat.availableFormatTypes ? { availableFormatTypes: stagesFormat.availableFormatTypes } : {}),
      ...(stagesFormat.availableStructureTypes ? { availableStructureTypes: stagesFormat.availableStructureTypes } : {}),
    };
  }

  // Standings display configuration (logo mode, overall tab, filters, columns, zones, per-stage)
  const standingsConfig = parseJsonField<any>(fStr(formData, 'standingsConfigJson'), 'standings config');

  // Participating squads (seeds, rosters, event logo overrides)
  const squadsRaw = fStr(formData, 'squadsJson');
  const squadsSubmitted = Boolean(squadsRaw);
  const squadsList = parseJsonField<
    Array<{
      teamId: string;
      seed?: number | null;
      seedLabel?: string | null;
      seedTournamentId?: string | null;
      roster?: Array<{
        playerId?: string | null;
        ign: string;
        role?: string | null;
        captain?: boolean;
        isStaff?: boolean;
        staffRole?: string | null;
        statusTag?: string | null;
      }>;
      eventLogoUrl?: string | null;
      eventLogoDarkUrl?: string | null;
      shortName?: string | null;
      displayName?: string | null;
      country?: string | null;
      region?: string | null;
    }>
  >(squadsRaw, 'squads') ?? [];

  // Parse Sponsors from sponsorsJson (with typeahead and customizable tier labels)
  let sponsorLinks: Array<{ sponsorId: string; tier: string | null }> = [];
  const sponsorsJsonRaw = fStr(formData, 'sponsorsJson');
  if (sponsorsJsonRaw) {
    try {
      const parsedSponsors = JSON.parse(sponsorsJsonRaw) as Array<{
        id?: string;
        name: string;
        tier?: string;
      }>;

      const seenSponsorIds = new Set<string>();

      for (const sp of parsedSponsors) {
        if (!sp.name || !sp.name.trim()) continue;
        const spName = sp.name.trim();
        const tierLabel = sp.tier?.trim() || 'Associate Sponsor';

        // Check if sponsor already exists by id or matching name (case-insensitive)
        let existingSponsor = sp.id
          ? await prisma.sponsor.findUnique({ where: { id: sp.id } })
          : null;

        if (!existingSponsor) {
          existingSponsor = await prisma.sponsor.findFirst({
            where: { name: { equals: spName, mode: 'insensitive' } },
          });
        }

        let targetSponsorId = existingSponsor?.id;

        if (!targetSponsorId) {
          // Auto-create new sponsor
          const spSlug = await uniqueSlug(spName, async (s) => {
            const clash = await prisma.sponsor.findFirst({
              where: { slug: s },
              select: { id: true },
            });
            return Boolean(clash);
          });

          const createdSponsor = await prisma.sponsor.create({
            data: {
              name: spName,
              slug: spSlug,
              category: tierLabel,
            },
          });
          targetSponsorId = createdSponsor.id;
        }

        if (targetSponsorId && !seenSponsorIds.has(targetSponsorId)) {
          seenSponsorIds.add(targetSponsorId);
          sponsorLinks.push({
            sponsorId: targetSponsorId,
            tier: tierLabel,
          });
        }
      }
    } catch (err) {
      console.error('Error parsing sponsorsJson:', err);
    }
  }

  // Fallback to legacy sponsorIds checkboxes if sponsorsJson was empty
  if (sponsorLinks.length === 0) {
    const legacySpIds = formData.getAll('sponsorIds').map(String).filter(Boolean);
    sponsorLinks = legacySpIds.map((spId) => ({ sponsorId: spId, tier: 'Associate Sponsor' }));
  }

  // Parse Organizers from organizersJson (with typeahead and custom role labels)
  let organizerLinks: Array<{ organizerId: string; role: string | null }> = [];
  const organizersJsonRaw = fStr(formData, 'organizersJson');
  if (organizersJsonRaw) {
    try {
      const parsedOrganizers = JSON.parse(organizersJsonRaw) as Array<{
        id?: string;
        name: string;
        role?: string;
      }>;

      const seenOrgIds = new Set<string>();

      for (const org of parsedOrganizers) {
        if (!org.name || !org.name.trim()) continue;
        const orgName = org.name.trim();
        const roleLabel = org.role?.trim() || 'Primary Organizer';

        // Check if organizer already exists by id or matching name (case-insensitive)
        let existingOrg = org.id
          ? await prisma.organizer.findUnique({ where: { id: org.id } })
          : null;

        if (!existingOrg) {
          existingOrg = await prisma.organizer.findFirst({
            where: { name: { equals: orgName, mode: 'insensitive' } },
          });
        }

        let targetOrgId = existingOrg?.id;

        if (!targetOrgId) {
          // Auto-create new organizer
          const orgSlug = await uniqueSlug(orgName, async (s) => {
            const clash = await prisma.organizer.findFirst({
              where: { slug: s },
              select: { id: true },
            });
            return Boolean(clash);
          });

          const createdOrg = await prisma.organizer.create({
            data: {
              name: orgName,
              slug: orgSlug,
              type: roleLabel,
            },
          });
          targetOrgId = createdOrg.id;
        }

        if (targetOrgId && !seenOrgIds.has(targetOrgId)) {
          seenOrgIds.add(targetOrgId);
          organizerLinks.push({
            organizerId: targetOrgId,
            role: roleLabel,
          });
        }
      }
    } catch (err) {
      console.error('Error parsing organizersJson:', err);
    }
  }

  // Fallback to legacy organizerIds checkboxes if organizersJson was empty
  if (organizerLinks.length === 0) {
    const legacyOrgIds = formData.getAll('organizerIds').map(String).filter(Boolean);
    organizerLinks = legacyOrgIds.map((oId) => ({ organizerId: oId, role: 'Primary Organizer' }));
  }

  // Parse venues from venuesJson (dynamic list with stadium, city, country, stage identifier)
  let venueLinks: Array<{ venueId: string; stageName: string | null }> = [];
  const venuesJsonRaw = fStr(formData, 'venuesJson');
  if (venuesJsonRaw) {
    try {
      const parsedVenues = JSON.parse(venuesJsonRaw) as Array<{
        id?: string;
        stageName?: string;
        name: string;
        city?: string;
        country?: string;
      }>;

      const seenVenueIds = new Set<string>();

      for (const v of parsedVenues) {
        if (!v.name || !v.name.trim()) continue;
        const venueName = v.name.trim();

        // Check if venue already exists by id or matching name (case-insensitive)
        let existingVenue = v.id
          ? await prisma.venue.findUnique({ where: { id: v.id } })
          : null;

        if (!existingVenue) {
          existingVenue = await prisma.venue.findFirst({
            where: { name: { equals: venueName, mode: 'insensitive' } },
          });
        }

        let targetVenueId = existingVenue?.id;

        if (!targetVenueId) {
          // Auto-create new venue
          const venueSlug = await uniqueSlug(venueName, async (s) => {
            const clash = await prisma.venue.findFirst({
              where: { slug: s },
              select: { id: true },
            });
            return Boolean(clash);
          });

          const createdVenue = await prisma.venue.create({
            data: {
              name: venueName,
              slug: venueSlug,
              city: v.city?.trim() || null,
              country: v.country?.trim() || null,
            },
          });
          targetVenueId = createdVenue.id;
        } else if (v.city || v.country) {
          // Update city or country if provided
          await prisma.venue.update({
            where: { id: targetVenueId },
            data: {
              ...(v.city ? { city: v.city.trim() } : {}),
              ...(v.country ? { country: v.country.trim() } : {}),
            },
          });
        }

        if (targetVenueId && !seenVenueIds.has(targetVenueId)) {
          seenVenueIds.add(targetVenueId);
          venueLinks.push({
            venueId: targetVenueId,
            stageName: v.stageName?.trim() || null,
          });
        }
      }
    } catch (err) {
      console.error('Error parsing venuesJson:', err);
    }
  }

  // Fallback to legacy checkboxes if venuesJson was empty
  if (venueLinks.length === 0) {
    const legacyVenueIds = formData.getAll('venueIds').map(String).filter(Boolean);
    venueLinks = legacyVenueIds.map((vId) => ({ venueId: vId, stageName: null }));
  }

  const currency = fStr(formData, 'currency') || 'INR';
  const rates = await getExchangeRatesForDate(startDate);
  const usdRate = resolveCurrencyUsdRate(currency, rates);

  const winnerTeamId = fOpt(formData, 'winnerTeamId');
  const runnerUpTeamId = fOpt(formData, 'runnerUpTeamId');
  let winner: string | null = null;
  let runnerUp: string | null = null;

  if (winnerTeamId) {
    const wTeam = await prisma.team.findUnique({ where: { id: winnerTeamId } });
    winner = wTeam?.name || null;
  }
  if (runnerUpTeamId) {
    const ruTeam = await prisma.team.findUnique({ where: { id: runnerUpTeamId } });
    runnerUp = ruTeam?.name || null;
  }

  const commonData = {
    name,
    slug,
    shortName: fOpt(formData, 'shortName'),
    series: fOpt(formData, 'series'),
    season: fOpt(formData, 'season'),
    seriesValue: fNum(formData, 'seriesValue'),
    teamsToShow,
    tier: fStr(formData, 'tier') || 'A-Tier',
    // KRAFTON inclusion/exclusion moved to the standalone rankings system —
    // every tournament is treated as included for the legacy engine.
    rankingIncluded: true,
    status,
    eventType: fStr(formData, 'eventType') || 'LAN',
    gameMode: fStr(formData, 'gameMode') || 'Squads TPP',
    platform: fStr(formData, 'platform') || 'Mobile',
    device: fOpt(formData, 'device'),
    region: fOpt(formData, 'region'),
    countries,
    prizePool: fNum(formData, 'prizePool'),
    currency,
    usdRate,
    prizeDistribution,
    qualifications,
    startDate,
    endDate,
    winner,
    runnerUp,
    liquipedia: fUrl(formData, 'liquipedia'),
    socialLinks: fSocials(formData),
    formatDetails,
    standingsConfig,
  };

  let tournamentId = id;

  // The save touches the tournament row plus organizers, sponsors, venues,
  // squads and final rankings. Run it as one transaction so a mid-way failure
  // can never leave a half-updated tournament (or wiped relations) behind.
  await prisma.$transaction(
    async (tx) => {
      if (id) {
        const existing = await tx.tournament.findUnique({
          where: { id },
          select: { imageUrl: true, imageDarkUrl: true, bannerUrl: true },
        });

        await tx.tournament.update({
          where: { id },
          data: {
            ...commonData,
            game: { connect: { id: gameId } },
            winnerTeam: winnerTeamId ? { connect: { id: winnerTeamId } } : { disconnect: true },
            runnerUpTeam: runnerUpTeamId ? { connect: { id: runnerUpTeamId } } : { disconnect: true },
            imageUrl: imageUpload ?? fOpt(formData, 'imageUrl') ?? existing?.imageUrl ?? null,
            imageDarkUrl: imageDarkUpload ?? fOpt(formData, 'imageDarkUrl') ?? existing?.imageDarkUrl ?? null,
            bannerUrl: bannerUpload ?? fOpt(formData, 'bannerUrl') ?? existing?.bannerUrl ?? null,
          },
        });

        // Update relations
        await tx.tournamentOrganizer.deleteMany({ where: { tournamentId: id } });
        if (organizerLinks.length > 0) {
          await tx.tournamentOrganizer.createMany({
            data: organizerLinks.map((ol) => ({
              tournamentId: id,
              organizerId: ol.organizerId,
              role: ol.role,
            })),
          });
        }

        await tx.tournamentSponsor.deleteMany({ where: { tournamentId: id } });
        if (sponsorLinks.length > 0) {
          await tx.tournamentSponsor.createMany({
            data: sponsorLinks.map((sl) => ({
              tournamentId: id,
              sponsorId: sl.sponsorId,
              tier: sl.tier,
            })),
          });
        }

        await tx.tournamentVenue.deleteMany({ where: { tournamentId: id } });
        if (venueLinks.length > 0) {
          await tx.tournamentVenue.createMany({
            data: venueLinks.map((vl) => ({
              tournamentId: id,
              venueId: vl.venueId,
              stageName: vl.stageName,
            })),
          });
        }
      } else {
        const created = await tx.tournament.create({
          data: {
            ...commonData,
            game: { connect: { id: gameId } },
            ...(winnerTeamId ? { winnerTeam: { connect: { id: winnerTeamId } } } : {}),
            ...(runnerUpTeamId ? { runnerUpTeam: { connect: { id: runnerUpTeamId } } } : {}),
            imageUrl: imageUpload ?? fOpt(formData, 'imageUrl'),
            imageDarkUrl: imageDarkUpload ?? fOpt(formData, 'imageDarkUrl'),
            bannerUrl: bannerUpload ?? fOpt(formData, 'bannerUrl'),
            organizers: {
              create: organizerLinks.map((ol) => ({
                organizerId: ol.organizerId,
                role: ol.role,
              })),
            },
            sponsors: {
              create: sponsorLinks.map((sl) => ({
                sponsorId: sl.sponsorId,
                tier: sl.tier,
              })),
            },
            venues: {
              create: venueLinks.map((vl) => ({ venueId: vl.venueId, stageName: vl.stageName })),
            },
          },
        });
        tournamentId = created.id;
      }

      // Participating squads — filled teams and unfilled seats alike. The submitted
      // list is the whole field, so it replaces what is stored: an upsert keyed on
      // (tournament, team) cannot address a seat, which has no team by definition.
      if (squadsSubmitted && tournamentId) {
        const fieldRows: Prisma.TournamentTeamCreateManyInput[] = [];

        for (let i = 0; i < squadsList.length; i++) {
          const squad = squadsList[i];
          if (!squad) continue;

          // A row with nothing on it at all is not a place.
          if (!squadHasContent(squad)) continue;

          fieldRows.push({
            tournamentId,
            teamId: squad.teamId || null,
            seed: squad.seed ?? null,
            seedLabel: squad.seedLabel ?? null,
            seedTournamentId: squad.seedTournamentId ?? null,
            // One entry per linked player: a player cannot hold two roster slots
            // in the same team (duplicates are what made "Beast"/"Beastog" collide).
            rosterJson: (() => {
              const seen = new Set<string>();
              return (Array.isArray(squad.roster) ? squad.roster : [])
                .map((p: any) => ({
                  playerId: p.playerId ?? null,
                  ign: String(p.ign ?? ''),
                  role: p.role ?? null,
                  captain: !!p.captain,
                  isStaff: !!p.isStaff,
                  staffRole: p.staffRole ?? (p.isStaff ? p.role ?? 'Coach' : null),
                  statusTag: p.statusTag ?? null,
                }))
                .filter((entry) => {
                  if (!entry.playerId) return true;
                  if (seen.has(entry.playerId)) return false;
                  seen.add(entry.playerId);
                  return true;
                });
            })(),
            logoUrl: squad.eventLogoUrl || null,
            logoDarkUrl: squad.eventLogoDarkUrl || null,
            shortName: squad.shortName ?? null,
            displayName: squad.displayName ?? null,
            country: squad.country ?? null,
            region: squad.region ?? null,
          });
        }

        await tx.tournamentTeam.deleteMany({ where: { tournamentId } });
        if (fieldRows.length > 0) await tx.tournamentTeam.createMany({ data: fieldRows });

        // A region typed for the first time joins the list, so the suggestions grow
        // out of what has actually been used rather than being maintained by hand.
        const typedRegions = Array.from(
          new Set(
            fieldRows
              .map((row) => row.region?.trim())
              .filter((region): region is string => Boolean(region))
          )
        );
        for (const name of typedRegions) {
          const known = await tx.region.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
            select: { id: true },
          });
          if (known) continue;

          const base =
            name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'region';
          const slugTaken = await tx.region.findFirst({ where: { slug: base }, select: { id: true } });
          await tx.region.create({
            data: {
              name,
              slug: slugTaken ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base,
            },
          });
        }

        // Roster membership only. The Transfer ledger is admin-only history, so an
        // import records NO transfer — adding an older event (BGIS in January)
        // can therefore never invent a move or an origin. One player, one team per
        // event: the first squad that claims a player wins.
        const eventDate = startDate || new Date();
        const explicitPlayerIds = Array.from(
          new Set(
            squadsList
              .filter((s) => Boolean(s?.teamId))
              .flatMap((s) => s.roster || [])
              .map((p) => p.playerId)
              .filter((id): id is string => Boolean(id))
          )
        );

        const playersById =
          explicitPlayerIds.length > 0
            ? await tx.player.findMany({
                where: { id: { in: explicitPlayerIds } },
                select: { id: true },
              })
            : [];

        const knownPlayerIds = new Set(playersById.map((player) => player.id));
        const claimedTeamByPlayer = new Map<string, string>();

        for (const squad of squadsList) {
          if (!squad?.teamId) continue;
          const roster = Array.isArray(squad.roster) ? squad.roster : [];
          for (const p of roster) {
            const playerId = p?.playerId;
            if (!playerId || !knownPlayerIds.has(playerId)) continue;
            if (claimedTeamByPlayer.has(playerId)) continue;
            claimedTeamByPlayer.set(playerId, squad.teamId);
            await applyRosterMembership(tx, playerId, squad.teamId, eventDate);
          }
        }
      }

      // Update or insert TournamentTeam records for final event rankings
      if (teamRankingsList.length > 0 && tournamentId) {
        for (const r of teamRankingsList) {
          if (!r.teamId) continue;
          await tx.tournamentTeam.upsert({
            where: {
              tournamentId_teamId: { tournamentId, teamId: r.teamId },
            },
            update: { finalRank: r.rank, prizeWon: r.prizeWon || 0, berths: parseBerths(r.berths) },
            create: {
              tournamentId,
              teamId: r.teamId,
              finalRank: r.rank,
              prizeWon: r.prizeWon || 0,
              berths: parseBerths(r.berths),
              rosterJson: [],
            },
          });
        }
      }

      // Sync TournamentStage records if stages are configured
      if (stagesFormat?.stages && Array.isArray(stagesFormat.stages) && tournamentId) {
        const existingStages = await tx.tournamentStage.findMany({
          where: { tournamentId },
        });

        for (let idx = 0; idx < stagesFormat.stages.length; idx++) {
          const st = stagesFormat.stages[idx];
          if (!st.name || !st.name.trim()) continue;
          const stageName = st.name.trim();

          const matchExisting = existingStages.find(
            (es) => es.id === st.id || es.name.toLowerCase() === stageName.toLowerCase()
          );

          if (matchExisting) {
            await tx.tournamentStage.update({
              where: { id: matchExisting.id },
              data: {
                name: stageName,
                sequence: idx + 1,
                formatType: st.formatType || 'Battle Royale Points Table',
                stageType: st.stageType || 'GROUPS_WISE',
              },
            });
          } else {
            await tx.tournamentStage.create({
              data: {
                tournamentId,
                name: stageName,
                sequence: idx + 1,
                formatType: st.formatType || 'Battle Royale Points Table',
                stageType: st.stageType || 'GROUPS_WISE',
              },
            });
          }
        }
      }
    },
    {
      timeout: 60000,
      maxWait: 15000,
    }
  );

  revalidatePath('/');
  revalidatePath('/admin/tournaments');
  revalidatePath('/admin/tournaments', 'page');
  revalidatePath('/admin/tournaments', 'layout');
  revalidatePath('/admin/rankings');
  revalidatePath('/admin/rankings', 'page');
  revalidatePath('/rankings');
  revalidateTournamentPages();
  revalidatePath('/admin/players');
  revalidatePath('/players');
  revalidatePath('/teams');
  redirect('/admin/tournaments');
}

async function deleteTournament(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (id) {
    try {
      await prisma.tournament.delete({ where: { id } });
    } catch {
      redirect('/admin/tournaments?error=delete-failed');
    }
  }
  revalidatePath('/');
  revalidatePath('/admin/tournaments');
  revalidateTournamentPages();
  redirect('/admin/tournaments');
}

async function duplicateTournament(formData: FormData) {
  'use server';
  if (!(await isAdmin())) redirect('/admin/login');
  const id = fStr(formData, 'id');
  if (!id) redirect('/admin/tournaments');

  const source = await prisma.tournament.findUnique({
    where: { id },
    include: {
      organizers: true,
      sponsors: true,
      venues: true,
      stages: { include: { groups: true } },
      teams: true,
    },
  });
  if (!source) redirect('/admin/tournaments');

  const customName = fStr(formData, 'name');
  const newName = customName || `${source.name} (Copy)`;

  const slug = await uniqueSlug(fStr(formData, 'slug') || newName, async (s) => {
    const clash = await prisma.tournament.findFirst({ where: { slug: s }, select: { id: true } });
    return Boolean(clash);
  });

  const includeStages = formData.has('includeStages') ? formData.get('includeStages') === 'true' : true;
  const includeTeams = formData.has('includeTeams') ? formData.get('includeTeams') === 'true' : true;

  const created = await prisma.tournament.create({
    data: {
      gameId: source.gameId,
      name: newName,
      slug,
      series: source.series,
      season: source.season,
      seriesValue: source.seriesValue,
      tier: source.tier,
      rankingIncluded: source.rankingIncluded,
      status: 'UPCOMING',
      eventType: source.eventType,
      gameMode: source.gameMode,
      platform: source.platform,
      device: source.device,
      region: source.region,
      countries: source.countries ?? undefined,
      prizePool: source.prizePool,
      currency: source.currency,
      usdRate: source.usdRate,
      prizeDistribution: source.prizeDistribution ?? undefined,
      qualifications: source.qualifications ?? undefined,
      startDate: source.startDate,
      endDate: source.endDate,
      imageUrl: source.imageUrl,
      imageDarkUrl: source.imageDarkUrl,
      bannerUrl: source.bannerUrl,
      liquipedia: source.liquipedia,
      socialLinks: source.socialLinks ?? undefined,
      formatDetails: source.formatDetails ?? undefined,
      standingsConfig: source.standingsConfig ?? undefined,
      organizers: { create: source.organizers.map((o) => ({ organizerId: o.organizerId, role: o.role })) },
      sponsors: { create: source.sponsors.map((s) => ({ sponsorId: s.sponsorId, tier: s.tier })) },
      venues: { create: source.venues.map((v) => ({ venueId: v.venueId, stageName: v.stageName })) },
      ...(includeStages
        ? {
            stages: {
              create: source.stages.map((s) => ({
                name: s.name,
                sequence: s.sequence,
                formatType: s.formatType,
                stageType: s.stageType,
                groups: { create: s.groups.map((g) => ({ name: g.name })) },
              })),
            },
          }
        : {}),
      ...(includeTeams
        ? {
            teams: {
              create: source.teams.map((tt) => ({
                team: { connect: { id: tt.teamId } },
                seed: tt.seed,
                seedLabel: tt.seedLabel,
                seedTournamentId: tt.seedTournamentId,
                rosterJson: tt.rosterJson as Prisma.InputJsonValue,
                logoUrl: tt.logoUrl,
                logoDarkUrl: tt.logoDarkUrl,
                shortName: tt.shortName,
                displayName: tt.displayName,
                country: tt.country,
              })),
            },
          }
        : {}),
    },
  });

  revalidatePath('/');
  revalidatePath('/admin/tournaments');
  revalidateTournamentPages();
  redirect(`/admin/tournaments?edit=${created.id}#tournament-editor`);
}

export default async function AdminTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string; field?: string }>;
}) {
  const { edit, error, field } = await searchParams;

  // Open the tab that owns a field that failed to parse, so the banner never names a
  // control the admin cannot see. `required` covers name and game (Basics) plus the dates
  // (Prizes & Results); the banner names all four, so Basics is the better first guess.
  const initialTab =
    error === 'json' ? TAB_BY_JSON_FIELD[field ?? ''] ?? 'basics' : 'basics';

  const [games, organizers, sponsors, venues, teams, tournaments, players] = await Promise.all([
    prisma.game.findMany({ orderBy: { name: 'asc' } }),
    prisma.organizer.findMany({ orderBy: { name: 'asc' } }),
    prisma.sponsor.findMany({ orderBy: { name: 'asc' } }),
    prisma.venue.findMany({ orderBy: { name: 'asc' } }),
    prisma.team.findMany({
      orderBy: { name: 'asc' },
      // Pickers only render id/name/tag (+logo in final rankings)
      select: { id: true, name: true, tag: true, logoUrl: true },
    }),
    prisma.tournament.findMany({
      take: 100,
      orderBy: { startDate: 'desc' },
      // The list rows and importer pickers only need identity + summary fields;
      // the full match/team graph is fetched per-tournament in the `edit` query below.
      select: {
        id: true,
        name: true,
        slug: true,
        shortName: true,
        tier: true,
        region: true,
        status: true,
        eventType: true,
        gameMode: true,
        startDate: true,
        endDate: true,
        prizePool: true,
        currency: true,
        rankingIncluded: true,
        game: { select: { name: true } },
        _count: {
          select: {
            stages: true,
            teams: true,
          },
        },
      },
    }),
    prisma.player.findMany({
      orderBy: { ign: 'asc' },
      select: {
        id: true,
        ign: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        currentTeam: { select: { id: true, name: true, tag: true } },
        // Read by the squads input to import a team's active roster: which members compete,
        // which are staff, and at what role. Without these the client can only see that a
        // player belongs to a team, and would have to invent roles.
        isPlayer: true,
        role: true,
        staffRole: true,
        status: true,
      },
    }),
  ]);

  const editing = edit
    ? await prisma.tournament.findUnique({
        where: { id: edit },
        include: {
          stages: { orderBy: { sequence: 'asc' } },
          organizers: { include: { organizer: true } },
          sponsors: { include: { sponsor: true } },
          venues: { include: { venue: true } },
          teams: {
            include: { team: true, seedTournament: { select: { id: true, name: true, slug: true } } },
            orderBy: { finalRank: 'asc' },
          },
          matches: {
            include: {
              stage: true,
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


  const initialOrganizers =
    editing?.organizers.map((to) => ({
      id: to.organizer.id,
      name: to.organizer.name,
      role: to.role || 'Primary Organizer',
    })) || [];

  const initialSponsors =
    editing?.sponsors.map((ts) => ({
      id: ts.sponsor.id,
      name: ts.sponsor.name,
      tier: ts.tier || 'Associate Sponsor',
    })) || [];

  const initialVenues =
    editing?.venues.map((tv) => ({
      id: tv.venue.id,
      stageName: tv.stageName ?? '',
      name: tv.venue.name,
      city: tv.venue.city || '',
      country: tv.venue.country || 'India',
    })) || [];

  const initialRankings =
    editing?.teams
      .filter((tt): tt is typeof tt & { teamId: string; team: NonNullable<typeof tt.team> } =>
        tt.finalRank != null && tt.teamId !== null && tt.team !== null
      )
      .map((tt) => ({
        teamId: tt.teamId,
        teamName: tt.team.name,
        tag: tt.team.tag || undefined,
        logoUrl: tt.team.logoUrl,
        rank: tt.finalRank || 1,
        prizeWon: tt.prizeWon || 0,
        berths: parseBerths(tt.berths),
      })) || [];

  // Seats load back too. Filtering them out here would not merely hide them: the
  // save replaces the field wholesale, so a seat missing from the form would be
  // deleted by the next save.
  const initialSquads: SquadRow[] =
    editing?.teams
      // Same rule the save uses, so what loads and what is stored cannot disagree.
      .filter((tt) =>
        squadHasContent({
          teamId: tt.teamId,
          seedLabel: tt.seedLabel,
          seed: tt.seed,
          seedTournamentId: tt.seedTournamentId,
          region: tt.region,
          country: tt.country,
        })
      )
      .map((tt) => ({
        teamId: tt.teamId,
        teamName: tt.team?.name ?? '',
        tag: tt.team?.tag ?? null,
        seed: tt.seed,
        seedLabel: tt.seedLabel,
        seedTournamentId: tt.seedTournamentId,
        roster: (Array.isArray(tt.rosterJson) ? (tt.rosterJson as unknown[]) : []).map((entry) =>
          typeof entry === 'string'
            ? { ign: entry }
            : {
                playerId: (entry as { playerId?: string | null }).playerId ?? null,
                ign: String((entry as { ign?: string }).ign ?? ''),
                role: (entry as { role?: string | null }).role ?? null,
                captain: !!((entry as { captain?: boolean }).captain ?? false),
                isStaff: !!((entry as { isStaff?: boolean }).isStaff ?? false),
                staffRole: (entry as { staffRole?: string | null }).staffRole ?? null,
                statusTag: (entry as { statusTag?: any }).statusTag ?? null,
              }
        ),
        eventLogoUrl: tt.logoUrl,
        eventLogoDarkUrl: tt.logoDarkUrl,
        shortName: tt.shortName,
        displayName: tt.displayName,
        country: tt.country,
        region: tt.region,
      })) || [];

  // The same seats, enriched with the team fields the public group card renders. A seat
  // with no team keeps only what the draw records, so it stays publishable before the
  // field is confirmed.
  const teamBySlot = new Map((editing?.teams || []).map((tt) => [tt.teamId ?? '', tt.team]));
  const groupCandidates: GroupCandidate[] = initialSquads.map((squad) => {
    const team = squad.teamId ? teamBySlot.get(squad.teamId) : null;
    return {
      teamId: squad.teamId,
      teamName: squad.teamName,
      displayName: squad.displayName ?? null,
      tag: squad.tag ?? null,
      slug: team?.slug ?? null,
      logoUrl: squad.eventLogoUrl ?? team?.logoUrl ?? null,
      logoDarkUrl: squad.eventLogoDarkUrl ?? team?.imageDarkUrl ?? null,
      seed: squad.seed ?? null,
      seedLabel: squad.seedLabel ?? null,
      country: squad.country ?? null,
      roster: squad.roster.map((entry) => ({
        ign: entry.ign,
        role: entry.role ?? null,
        captain: Boolean(entry.captain),
        slug: null,
        playerId: entry.playerId ?? null,
      })),
    };
  });

  const stagesFromDb = editing?.stages?.map((s) => s.name.trim()) || [];
  const stagesFromMatches = editing?.matches?.map((m) => matchStageLabel(m)) || [];
  const stageNames = Array.from(new Set([...stagesFromDb, ...stagesFromMatches].filter(Boolean)));

  const stagesInfo = stageNames.map((sName) => {
    const matchingMatches = (editing?.matches || []).filter(
      (m) => matchStageLabel(m).toLowerCase() === sName.toLowerCase()
    );
    const stageGroups = Array.from(
      new Set(matchingMatches.map((m) => m.groupName?.trim()).filter((g): g is string => Boolean(g)))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return {
      name: sName,
      matchCount: matchingMatches.length,
      groups: stageGroups,
      matches: matchingMatches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        overallMatchNumber: m.overallMatchNumber,
        mapName: m.mapName || 'Erangel',
        format: m.format,
        groupName: m.groupName || null,
      })),
    };
  });

  // Stage name → the group names its matches carry. Those groups win on the public page, so
  // the draw editor warns instead of silently doing nothing, and offers them as the sources
  // a pending slot can come out of.
  const stageMatchGroups: Record<string, string[]> = {};
  for (const stage of stagesInfo) {
    if (stage.groups.length > 0) stageMatchGroups[stage.name] = stage.groups;
  }

  const existingRegions = Array.from(
    new Set(tournaments.map((t) => t.region).filter((r): r is string => Boolean(r)))
  );

  // Regions defined in /admin/regions, so a place's region and country are picked
  // from the real groupings rather than typed from memory.
  const regionRecords = await prisma.region.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { name: true },
  });
  const regionOptions = regionRecords.map((region) => ({ name: region.name }));

  const teamComboboxOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
    keywords: t.tag || undefined,
  }));

  // Group matches by stage and compute Stage-Aware Standings
  const stageStandingsMap: Record<
    string,
    Array<{ teamId: string; teamName: string; tag?: string; rank: number; points: number }>
  > = {};

  if (editing && editing.matches.length > 0) {
    const matchesByStage: Record<string, typeof editing.matches> = {};

    for (const match of editing.matches) {
      const stName = matchStageLabel(match);
      if (!matchesByStage[stName]) matchesByStage[stName] = [];
      matchesByStage[stName].push(match);
    }

    for (const [stName, stMatches] of Object.entries(matchesByStage)) {
      const stResults = stMatches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
      if (stResults.length > 0) {
        const standings = calculateTournamentStandings(stResults.map(toStandingsRow));
        stageStandingsMap[stName] = standings.map((s, idx) => ({
          teamId: s.teamId,
          teamName: s.teamName,
          tag: s.tag,
          rank: idx + 1,
          points: s.totalPoints,
        }));
      }
    }
  }

  const selectedOrgIds = new Set(editing?.organizers.map((o) => o.organizerId) ?? []);
  const selectedSpIds = new Set(editing?.sponsors.map((s) => s.sponsorId) ?? []);

  // Seed pickers search the database live — these are just the already-linked
  // qualifier events so the current selections render their labels.
  const linkedSeedOptions = Array.from(
    new Map(
      ((editing?.teams ?? []) as Array<{ seedTournament?: { id: string; name: string; slug: string } | null }>)
        .map((tt) => tt.seedTournament)
        .filter(Boolean)
        .map((st) => [st!.id, { id: st!.id, name: st!.name, slug: st!.slug ?? '' }])
    ).values()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-(--ed-blue)" /> Tournament Management
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
      {error === 'delete-failed' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          The tournament could not be deleted — it is still referenced by other records.
        </p>
      )}
      {error === 'json' && (
        <p className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
          A structured field ({field || 'JSON payload'}) could not be parsed, so nothing was saved.
          Re-open the editor and re-submit that section.
        </p>
      )}

      {/* Create / Edit form */}
      <details
        id="tournament-editor"
        key={editing ? `${editing.id}-${editing.updatedAt.getTime()}` : 'collapsed-mode'}
        open={Boolean(editing)}
        className="group scroll-mt-6"
      >
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 rounded-lg bg-(--ed-blue) hover:brightness-110 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          {editing ? `Editing: ${editing.name}` : 'Create New Tournament'}
        </summary>

        <form
          key={editing ? `${editing.id}-${editing.updatedAt.getTime()}-${editing.rankingIncluded}` : 'new'}
          action={saveTournament}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm p-6 space-y-6"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <FormTabs tabs={TOURNAMENT_FORM_TABS} initialTab={initialTab}>
          <FormPanel tab="basics">
          {/* Section 1: Basic Tournament Identity */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
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
                <label className={labelCls}>Custom Short Name (e.g. for badges &amp; cards)</label>
                <input
                  name="shortName"
                  defaultValue={editing?.shortName ?? ''}
                  placeholder="e.g. BGMS 2026, BGIS 2024"
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
                <label className={labelCls}>Platform</label>
                <select name="platform" defaultValue={editing?.platform ?? 'Mobile'} className={inputCls}>
                  {TOURNAMENT_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Official / Sponsored Device</label>
                <input
                  name="device"
                  defaultValue={editing?.device ?? ''}
                  placeholder="e.g. Realme GT 7 Pro, Infinix GT 20 Pro"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Region</label>
                <TournamentRegionInput
                  initialValue={editing?.region ?? ''}
                  existingRegions={existingRegions}
                />
              </div>
              <div>
                <label className={labelCls}>Featured Stage on Overview</label>
                <input
                  name="featuredStage"
                  defaultValue={(editing?.formatDetails as any)?.featuredStage ?? ''}
                  placeholder="Auto (Most recent stage) or e.g. Grand Finals"
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Leave blank to auto-display the most recent stage by match date.
                </p>
              </div>
              <div>
                <label className={labelCls}>Backdrop Watermark</label>
                <input
                  name="backdropText"
                  defaultValue={(editing?.formatDetails as any)?.backdropText ?? ''}
                  placeholder={`Auto: ${editing?.series || 'Series Name (e.g. BGMS)'}`}
                  className={inputCls}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Hero background watermark. Leave blank for Series Name ({editing?.series || 'e.g. BGMS'}), or type &quot;NONE&quot; to hide.
                </p>
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
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
              <Globe className="w-4 h-4" /> 2. Venues, Countries, Organizers &amp; Sponsors
            </h2>

            {/* Stadiums & Venues with Dynamic Stages & Autocomplete */}
            <div className="mb-5">
              <label className={labelCls + ' mb-2'}>
                Physical Stadiums &amp; LAN Venues (with Stage / Identifier Label)
              </label>
              <TournamentVenuesInput
                initialVenues={initialVenues}
                existingVenues={venues}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className={labelCls}>Participating Countries</label>
                <TournamentCountriesInput
                  initialCountries={
                    Array.isArray(editing?.countries) && (editing?.countries as string[]).length > 0
                      ? (editing?.countries as string[])
                      : ['India']
                  }
                />
              </div>

              {/* Organizers & Broadcasters with Customizable Roles & Typeahead */}
              <div className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
                <label className={labelCls + ' mb-2'}>
                  Organizers &amp; Broadcasters (Type, comma-separate, and set custom role for each)
                </label>
                <TournamentOrganizersInput
                  initialOrganizers={initialOrganizers}
                  existingOrganizers={organizers}
                />
              </div>

              {/* Sponsors & Partners with Customizable Labels & Typeahead */}
              <div className="sm:col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
                <label className={labelCls + ' mb-2'}>
                  Sponsors &amp; Partners (Type, comma-separate, and set custom label/tier for each)
                </label>
                <TournamentSponsorsInput
                  initialSponsors={initialSponsors}
                  existingSponsors={sponsors}
                />
              </div>
            </div>
          </div>

          </FormPanel>

          <FormPanel tab="prizes">
          {/* Section 3: Prize Pool, Currency & Dates */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
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
                  placeholder="e.g. 40000000"
                />
              </div>
              <div>
                <label className={labelCls}>Currency (All World Currencies)</label>
                <select name="currency" defaultValue={editing?.currency ?? 'INR'} className={inputCls}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
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
                <label className={labelCls}>Winner Team (Champion)</label>
                <Combobox
                  name="winnerTeamId"
                  options={teamComboboxOptions}
                  defaultValue={editing?.winnerTeamId ?? ''}
                  emptyOptionLabel="— tournament not decided yet —"
                  placeholder="Type to search champion team…"
                  ariaLabel="Winner Team"
                />
              </div>
              <div>
                <label className={labelCls}>Runner-Up Team</label>
                <Combobox
                  name="runnerUpTeamId"
                  options={teamComboboxOptions}
                  defaultValue={editing?.runnerUpTeamId ?? ''}
                  emptyOptionLabel="— tournament not decided yet —"
                  placeholder="Type to search runner-up team…"
                  ariaLabel="Runner-Up Team"
                />
              </div>
              <div>
                <label className={labelCls}>Official Event Page URL (Optional)</label>
                <input
                  name="liquipedia"
                  defaultValue={editing?.liquipedia ?? ''}
                  placeholder="https://kraftonindiaesports.com/bgis-2026"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Stage-Wise & Category Prize Distribution */}
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
              <label className={labelCls + ' mb-2'}>
                Stage-Wise Prize Distribution (Grand Finals, Semis, MVP &amp; Special Awards)
              </label>
              <TournamentPrizeDistributionInput
                initialDistribution={editing?.prizeDistribution}
                totalPrizePool={editing?.prizePool ?? 40000000}
                currency={editing?.currency ?? 'INR'}
                allTeams={teams}
                allPlayers={players}
              />
            </div>

            {/* Multi-Event Qualification Seeds */}
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
              <label className={labelCls + ' mb-2'}>
                Tournament Seeds &amp; Qualification Slots (Direct DB Link &amp; Multi-Event Seeding)
              </label>
              <TournamentQualificationsInput
                initialQualifications={
                  Array.isArray(editing?.qualifications)
                    ? (editing?.qualifications as any)
                    : undefined
                }
                allTournaments={tournaments.map((t) => ({ id: t.id, name: t.name, slug: t.slug, tier: t.tier }))}
              />
            </div>
          </div>

          </FormPanel>

          <FormPanel tab="format">
          {/* Section 4: Format Architecture, Stages & Scoring Matrix */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-5">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
                📐 4A. Stages Architecture, Schedule &amp; Format Rules
              </h2>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
                <TournamentStagesFormatInput
                  initialFormatDetails={editing?.formatDetails}
                  initialStages={editing?.stages}
                  groupCandidates={groupCandidates}
                  stageMatchGroups={stageMatchGroups}
                />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
                🎯 4B. Event-Wide Points &amp; Scoring Matrix
              </h2>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
                <TournamentPointsSystemInput
                  initialFormatDetails={editing?.formatDetails}
                />
              </div>
            </div>
          </div>

          </FormPanel>

          <FormPanel tab="squads">
          {/* Section 5: Participating Squads & Rosters */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
              👥 5. Participating Squads &amp; Rosters (Seeds, Event Logos, Players)
            </h2>
            <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="w-32">
                <label className={labelCls}>Teams to show</label>
                <input
                  type="number"
                  min={0}
                  name="teamsToShow"
                  defaultValue={editing?.teamsToShow ?? ''}
                  placeholder="e.g. 16"
                  className={inputCls}
                />
              </div>
              <p className="flex-1 pb-2 text-[11px] font-semibold text-slate-400">
                How many places the teams tab presents. Fill a place with a team, or leave it open
                and give it an entry label (&ldquo;Korean League&rdquo;) plus a region.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
              <TournamentSquadsInput
                initialSquads={initialSquads}
                allTeams={teams}
                allPlayers={players}
                allTournaments={tournaments.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
                allRegions={regionOptions}
              />
            </div>
          </div>

          </FormPanel>

          <FormPanel tab="prizes">
          {/* Section 6: Final Team Rankings */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
              🏆 6. Final Event Team Rankings (Winner, Runner-Up &amp; Placements)
            </h2>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
              <TournamentFinalRankingsInput
                initialRankings={initialRankings}
                allTeams={teams}
                stageStandingsMap={stageStandingsMap}
                prizeDistribution={editing?.prizeDistribution}
                totalPrizePool={editing?.prizePool ?? 40000000}
                currency={editing?.currency ?? 'INR'}
                allTournaments={tournaments.map((t) => ({ id: t.id, name: t.name, slug: t.slug, tier: t.tier }))}
              />
            </div>
          </div>

          </FormPanel>

          <FormPanel tab="standings">
          {/* Section 7: Standings Display & Filters */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
              📊 7. Standings Display, Filters &amp; Qualification Zones
            </h2>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/50">
              <TournamentStandingsConfigInput
                initialConfig={editing?.standingsConfig}
                stageNames={stageNames}
                stagesInfo={stagesInfo}
              />
            </div>
          </div>

          </FormPanel>

          <FormPanel tab="branding">
          {/* Section 8: Dual Logos & Banners */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-3 flex items-center gap-1.5">
              🖼️ 8. Branding, Logos &amp; Header Banner
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <MediaField
                label="Light Theme Logo URL"
                name="imageUrl"
                fileField="imageFile"
                prefix="tournament-logo-light"
                defaultValue={editing?.imageUrl ?? ''}
                inputClassName={inputCls}
              />
              <MediaField
                label="Dark Theme Logo URL"
                name="imageDarkUrl"
                fileField="imageDarkFile"
                prefix="tournament-logo-dark"
                defaultValue={editing?.imageDarkUrl ?? ''}
                inputClassName={inputCls}
              />
              <MediaField
                label="Banner Image URL"
                name="bannerUrl"
                fileField="bannerFile"
                prefix="tournament-banner"
                defaultValue={editing?.bannerUrl ?? ''}
                inputClassName={inputCls}
              />
            </div>
          </div>

          </FormPanel>

          <FormPanel tab="basics">
          {/* Section 9: All Social Media Channels */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-400 mb-1 flex items-center gap-1.5">
              🔗 9. Official Event Website &amp; Social Channels
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Only channels with valid URLs will display icons on the public tournament page. Unused channels will remain hidden.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: 'website', label: 'Official Event Website', placeholder: 'https://kraftonindiaesports.com/bgis' },
                { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
                { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
                { key: 'twitter', label: 'X / Twitter', placeholder: 'https://twitter.com/…' },
                { key: 'youtube', label: 'YouTube Broadcast', placeholder: 'https://youtube.com/@…' },
                { key: 'kick', label: 'Kick Stream', placeholder: 'https://kick.com/…' },
                { key: 'twitch', label: 'Twitch Stream', placeholder: 'https://twitch.tv/…' },
                { key: 'discord', label: 'Discord Community', placeholder: 'https://discord.gg/…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input
                    name={key}
                    placeholder={placeholder}
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

          </FormPanel>
          </FormTabs>

          {/* Floating Sticky Action Dock */}
          <div className="sticky bottom-4 z-40 p-3 rounded-2xl bg-white/95 dark:bg-[#0b101c]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {editing ? `Editing: ${editing.name}` : 'New Tournament Draft'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Click save anytime without scrolling
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {editing && (
                <Link
                  href="/admin/tournaments"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </Link>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-(--ed-blue) hover:brightness-110 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-(--ed-blue)/25 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editing ? 'Update Tournament' : 'Create Tournament'}</span>
              </button>
            </div>
          </div>
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold block max-w-[280px] truncate">{t.name}</span>
                    {t.shortName && (
                      <span className="px-1.5 py-0.5 rounded bg-[#0A5FC4]/10 text-[#0A5FC4] text-[10px] font-black uppercase">
                        {t.shortName}
                      </span>
                    )}
                  </div>
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
                      href={`/admin/tournaments?edit=${t.id}#tournament-editor`}
                      prefetch={false}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-(--ed-blue) transition-colors"
                      title="Edit Tournament"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <TournamentCloneDialog
                      tournament={{
                        id: t.id,
                        name: t.name,
                        stageCount: (t as any)._count?.stages,
                        squadCount: (t as any)._count?.teams,
                      }}
                      duplicateTournamentAction={duplicateTournament}
                    />
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
