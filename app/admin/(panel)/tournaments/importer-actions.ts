'use server';

import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { uniqueSlug } from '@/lib/admin-forms';
import { updateTag, revalidatePath } from 'next/cache';
import {
  fetchLiquipediaTournament,
  parseLiquipediaTournamentWikitext,
  type ParsedLiquipediaTournament,
  type ParsedSquad,
} from '@/lib/liquipedia-tournament-parser';

export interface TournamentImportPreviewResult {
  success: boolean;
  message: string;
  tournament?: ParsedLiquipediaTournament;
  rawWikitext?: string;
  stats?: {
    totalSquads: number;
    matchedCount: number;
    newCount: number;
  };
}

export interface CreateTournamentFromImportPayload {
  tournament: ParsedLiquipediaTournament;
  gameId: string;
  autoCreateMissingTeams?: boolean;
}

/**
 * Fetches and parses tournament data from Liquipedia URL or wikitext,
 * cross-referencing squads against existing database teams.
 */
export async function fetchTournamentFromLiquipediaAction(
  urlOrText: string
): Promise<TournamentImportPreviewResult> {
  if (!(await isAdmin())) {
    return { success: false, message: 'Unauthorized. Admin session required.' };
  }

  const input = (urlOrText || '').trim();
  if (!input) {
    return { success: false, message: 'Please provide a Liquipedia URL or paste wikitext.' };
  }

  let tournament: ParsedLiquipediaTournament;
  let rawWikitext: string | undefined;

  if (input.startsWith('http://') || input.startsWith('https://')) {
    const fetchRes = await fetchLiquipediaTournament(input);
    if (!fetchRes.success || !fetchRes.tournament) {
      return {
        success: false,
        message: fetchRes.message || 'Failed to fetch tournament from Liquipedia.',
        rawWikitext: fetchRes.rawWikitext,
      };
    }
    tournament = fetchRes.tournament;
    rawWikitext = fetchRes.rawWikitext;
  } else {
    // Plain wikitext input
    tournament = parseLiquipediaTournamentWikitext(input);
    rawWikitext = input;
  }

  if (!tournament.name || tournament.name === 'Untitled Tournament') {
    return {
      success: false,
      message: 'Could not detect tournament name. Please verify the URL or wikitext.',
      rawWikitext,
    };
  }

  // Cross-reference squads against all database teams
  const allTeams = await prisma.team.findMany({
    select: { id: true, name: true, tag: true },
  });

  let matchedCount = 0;
  for (const squad of tournament.squads) {
    const clean = squad.teamName.trim().toLowerCase();
    const cleanTag = (squad.tag || '').trim().toLowerCase();

    // 1. Exact name match
    let matched = allTeams.find((t) => t.name.toLowerCase() === clean);

    // 2. Exact tag match
    if (!matched && cleanTag) {
      matched = allTeams.find((t) => (t.tag || '').toLowerCase() === cleanTag);
    }

    // 3. Substring match — only when exactly one candidate fits. Two teams
    //    both containing the name (e.g. "Team X" and "Team X Junior") must
    //    stay unmatched so the admin decides, instead of silently linking
    //    squads to whichever row comes first.
    if (!matched) {
      const candidates = allTeams.filter((t) => {
        const tName = t.name.toLowerCase();
        return tName.includes(clean) || clean.includes(tName);
      });
      if (candidates.length === 1) matched = candidates[0];
    }

    if (matched) {
      squad.matchedTeamId = matched.id;
      squad.isMatched = true;
      matchedCount++;
    } else {
      squad.matchedTeamId = null;
      squad.isMatched = false;
    }
  }

  return {
    success: true,
    message: `Extracted ${tournament.name} (${tournament.squads.length} teams, ${matchedCount} matched).`,
    tournament,
    rawWikitext,
    stats: {
      totalSquads: tournament.squads.length,
      matchedCount,
      newCount: tournament.squads.length - matchedCount,
    },
  };
}

/**
 * Creates the tournament, auto-creates any missing teams if selected,
 * and sets up organizers, squads, and prize distribution.
 */
export async function createTournamentFromImportAction(
  payload: CreateTournamentFromImportPayload
): Promise<{ success: boolean; message: string; tournamentId?: string; slug?: string }> {
  if (!(await isAdmin())) {
    return { success: false, message: 'Unauthorized. Admin session required.' };
  }

  const { tournament, gameId, autoCreateMissingTeams = true } = payload;
  if (!tournament || !tournament.name) {
    return { success: false, message: 'Invalid tournament data.' };
  }

  // 1. Resolve Game
  let targetGameId = gameId;
  if (!targetGameId) {
    const defaultGame = await prisma.game.findFirst({ select: { id: true } });
    if (!defaultGame) {
      return { success: false, message: 'No games exist in the database to link this tournament.' };
    }
    targetGameId = defaultGame.id;
  }

  // 2. Resolve Tournament Slug
  const slug = await uniqueSlug(tournament.slug || tournament.name, async (s) => {
    const clash = await prisma.tournament.findFirst({
      where: { slug: s },
      select: { id: true },
    });
    return Boolean(clash);
  });

  // 3. Auto-Create Missing Teams if requested
  const teamIdMap: Record<string, string> = {};

  for (const squad of tournament.squads) {
    if (squad.matchedTeamId) {
      teamIdMap[squad.teamName] = squad.matchedTeamId;
      continue;
    }

    if (autoCreateMissingTeams) {
      // Check if team was just created or exists by exact name
      const existing = await prisma.team.findFirst({
        where: { name: { equals: squad.teamName, mode: 'insensitive' } },
        select: { id: true },
      });

      if (existing) {
        teamIdMap[squad.teamName] = existing.id;
      } else {
        const teamSlug = await uniqueSlug(squad.teamName, async (s) => {
          const clash = await prisma.team.findFirst({
            where: { slug: s },
            select: { id: true },
          });
          return Boolean(clash);
        });

        const createdTeam = await prisma.team.create({
          data: {
            name: squad.teamName,
            slug: teamSlug,
            tag: squad.tag || squad.teamName.slice(0, 4).toUpperCase(),
          },
        });
        teamIdMap[squad.teamName] = createdTeam.id;
      }
    }
  }

  // 4. Resolve Organizers
  const organizerLinks: Array<{ organizerId: string; role: string | null }> = [];
  for (const orgName of tournament.organizers) {
    if (!orgName || !orgName.trim()) continue;
    const cleanOrg = orgName.trim();

    let existingOrg = await prisma.organizer.findFirst({
      where: { name: { equals: cleanOrg, mode: 'insensitive' } },
      select: { id: true },
    });

    if (!existingOrg) {
      const orgSlug = await uniqueSlug(cleanOrg, async (s) => {
        const clash = await prisma.organizer.findFirst({
          where: { slug: s },
          select: { id: true },
        });
        return Boolean(clash);
      });

      existingOrg = await prisma.organizer.create({
        data: {
          name: cleanOrg,
          slug: orgSlug,
          type: 'Publisher / Operator',
        },
      });
    }

    if (existingOrg && !organizerLinks.some((l) => l.organizerId === existingOrg!.id)) {
      organizerLinks.push({
        organizerId: existingOrg.id,
        role: 'Primary Organizer',
      });
    }
  }

  // 5. Build Squads/TournamentTeam Rows
  const squadsToCreate: Array<{
    teamId: string;
    seedLabel?: string | null;
    rosterJson: any;
  }> = [];

  for (const squad of tournament.squads) {
    const finalTeamId = squad.matchedTeamId || teamIdMap[squad.teamName];
    if (!finalTeamId) continue;

    squadsToCreate.push({
      teamId: finalTeamId,
      seedLabel: squad.seedLabel || null,
      rosterJson: squad.roster.map((r) => ({
        ign: r.ign,
        role: r.role || null,
        captain: Boolean(r.captain),
        isStaff: Boolean(r.isStaff),
      })),
    });
  }

  // 6. Dates
  const startDate = tournament.startDate ? new Date(tournament.startDate) : new Date();
  const endDate = tournament.endDate ? new Date(tournament.endDate) : new Date(startDate.getTime() + 10 * 86400000);

  // 7. Create Tournament in PostgreSQL
  try {
    // Deduplicate by teamId to satisfy @@unique([tournamentId, teamId])
    const seenTeams = new Set<string>();
    const uniqueSquadsToCreate = squadsToCreate.filter((st) => {
      if (seenTeams.has(st.teamId)) return false;
      seenTeams.add(st.teamId);
      return true;
    });

    const created = await prisma.tournament.create({
      data: {
        name: tournament.name,
        slug,
        gameId: targetGameId,
        series: tournament.series || null,
        season: tournament.season || null,
        tier: tournament.tier,
        eventType: tournament.eventType,
        startDate,
        endDate,
        status: 'UPCOMING',
        region: tournament.location || tournament.country || null,
        countries: tournament.country ? [tournament.country] : [],
        prizePool: tournament.prizePool || 0,
        currency: tournament.currency || 'USD',
        prizeDistribution: tournament.prizeDistribution || {},
        rankingIncluded: true,
        organizers: {
          create: organizerLinks.map((ol) => ({
            organizerId: ol.organizerId,
            role: ol.role,
          })),
        },
        teams: {
          create: uniqueSquadsToCreate.map((st) => ({
            teamId: st.teamId,
            seedLabel: st.seedLabel,
            rosterJson: st.rosterJson,
          })),
        },
      },
      select: { id: true, slug: true, name: true },
    });

    // Revalidate public tags and paths
    updateTag('tournaments-list');
    revalidatePath('/api/tournaments');
    revalidatePath('/');
    revalidatePath('/admin/tournaments');
    revalidatePath('/tournaments');

    return {
      success: true,
      message: `Successfully created tournament "${created.name}" with ${squadsToCreate.length} participating teams!`,
      tournamentId: created.id,
      slug: created.slug,
    };
  } catch (err: any) {
    console.error('Error creating tournament from Liquipedia import:', err);
    return {
      success: false,
      message: `Database error creating tournament: ${err.message || String(err)}`,
    };
  }
}
