/**
 * One-off migration to the "rosters are membership, transfers are admin-only"
 * model, plus repair of the look-alike damage already in the database.
 *
 *   1. Import-created transfers are removed — they were never history, they were
 *      a side effect of importing rosters, and they fabricated origins.
 *   2. Each event roster is de-duplicated by player id (one player, one slot),
 *      and an entry labelled with a DIFFERENT player's IGN is relabelled to the
 *      player it is actually linked to.
 *   3. Scorecard rows whose team disagrees with the player's event roster are
 *      re-pointed at the roster's team ("beast04" was the 65th player in eight
 *      games because their row named someone else's team).
 *   4. `Player.currentTeamSince` is backfilled from each player's latest event, so
 *      importing an older event cannot move them back.
 *
 *   npx tsx scripts/migrate-transfer-model.ts --dry-run
 *   npx tsx scripts/migrate-transfer-model.ts
 */

import { prisma } from '../lib/prisma';

const dryRun = process.argv.includes('--dry-run');

interface RosterEntry {
  playerId?: string | null;
  ign?: string;
  [key: string]: unknown;
}

async function main() {
  /* 1. Import-created transfers are not history. */
  const importedTransfers = await prisma.transfer.findMany({
    where: { notes: { startsWith: 'Tournament roster entry' } },
    select: { id: true },
  });
  console.log(`import-created transfers to remove: ${importedTransfers.length}`);

  /* 2. De-duplicate rosters, relabel mislabelled slots, and index
        (player, event) -> team. */
  const allPlayers = await prisma.player.findMany({ select: { id: true, ign: true } });
  const ignOf = new Map(allPlayers.map((player) => [player.id, player.ign]));
  // Exact (case-sensitive) IGNs only: "SmoKeR" and "SmoKer" are different players,
  // and folding case here would relabel one of them onto the other.
  const idByIgn = new Map<string, string>();
  for (const player of allPlayers) {
    const key = player.ign.trim();
    if (key && !idByIgn.has(key)) idByIgn.set(key, player.id);
  }

  const squads = await prisma.tournamentTeam.findMany({
    select: {
      id: true,
      tournamentId: true,
      teamId: true,
      rosterJson: true,
      tournament: { select: { startDate: true } },
    },
  });

  const rosterTeamByPlayerEvent = new Map<string, string>();
  const latestEventByPlayer = new Map<string, Date>();
  const rosterFixes: { id: string; rosterJson: RosterEntry[] }[] = [];
  let relabelled = 0;

  for (const squad of squads) {
    if (!Array.isArray(squad.rosterJson)) continue;

    const seen = new Set<string>();
    const next: RosterEntry[] = [];
    let changed = false;

    for (const raw of squad.rosterJson as RosterEntry[]) {
      const playerId = raw && typeof raw === 'object' ? raw.playerId ?? null : null;
      if (!playerId) {
        next.push(raw);
        continue;
      }
      if (seen.has(playerId)) {
        changed = true;
        continue;
      }
      seen.add(playerId);

      // The label belongs to a different player than the slot is linked to:
      // that is the look-alike artefact itself ("Beast" pointing at Beastog).
      const ign = typeof raw.ign === 'string' ? raw.ign : null;
      const actual = ignOf.get(playerId);
      const claimed = ign ? idByIgn.get(ign.trim()) : undefined;
      if (ign && claimed && claimed !== playerId && actual && actual !== ign) {
        console.log(`  relabel: "${ign}" (another player's IGN) -> "${actual}" [playerId ${playerId}]`);
        next.push({ ...raw, ign: actual });
        relabelled += 1;
        changed = true;
      } else {
        next.push(raw);
      }

      const key = `${playerId}|${squad.tournamentId}`;
      if (!rosterTeamByPlayerEvent.has(key)) rosterTeamByPlayerEvent.set(key, squad.teamId);

      const previous = latestEventByPlayer.get(playerId);
      if (!previous || squad.tournament.startDate.getTime() > previous.getTime()) {
        latestEventByPlayer.set(playerId, squad.tournament.startDate);
      }
    }

    if (changed) rosterFixes.push({ id: squad.id, rosterJson: next });
  }
  console.log(`rosters to rewrite (duplicates + mislabels): ${rosterFixes.length} (${relabelled} relabelled)`);

  /* 3. Scorecard rows naming a team other than the player's event roster. */
  const statRows = await prisma.$queryRaw<
    { id: string; playerId: string; teamId: string | null; tournamentId: string }[]
  >`
    SELECT r.id, r."playerId", r."teamId", m."tournamentId"
    FROM "MatchPlayerStat" r
    JOIN "MatchGame" g ON g.id = r."matchGameId"
    JOIN "Match" m ON m.id = g."matchId"
  `;

  const mismatches = statRows
    .map((row) => {
      const rosterTeam = rosterTeamByPlayerEvent.get(`${row.playerId}|${row.tournamentId}`);
      return rosterTeam && rosterTeam !== row.teamId
        ? { id: row.id, playerId: row.playerId, from: row.teamId, to: rosterTeam }
        : null;
    })
    .filter((row): row is { id: string; playerId: string; from: string | null; to: string } => row !== null);

  console.log(`scorecard rows naming the wrong team: ${mismatches.length}`);

  if (mismatches.length > 0) {
    const teams = await prisma.team.findMany({
      where: { id: { in: [...new Set(mismatches.flatMap((m) => [m.from, m.to]).filter((id): id is string => Boolean(id)))] } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(teams.map((team) => [team.id, team.name]));
    const players = await prisma.player.findMany({
      where: { id: { in: [...new Set(mismatches.map((m) => m.playerId))] } },
      select: { id: true, ign: true },
    });
    const ignOf = new Map(players.map((player) => [player.id, player.ign]));
    for (const row of mismatches.slice(0, 20)) {
      console.log(
        `  ${ignOf.get(row.playerId) ?? row.playerId}: ${nameOf.get(row.from ?? '') ?? row.from ?? '(none)'} -> ${nameOf.get(row.to) ?? row.to}`,
      );
    }
    if (mismatches.length > 20) console.log(`  …and ${mismatches.length - 20} more`);
  }

  /* 4. Backfill currentTeamSince from the latest event appearance. */
  const players = await prisma.player.findMany({
    select: { id: true, ign: true, currentTeamId: true, currentTeamSince: true },
  });
  const sinceUpdates = players
    .filter((player) => player.currentTeamId && !player.currentTeamSince && latestEventByPlayer.has(player.id))
    .map((player) => ({ id: player.id, since: latestEventByPlayer.get(player.id)! }));
  console.log(`players whose currentTeamSince to backfill: ${sinceUpdates.length}`);

  if (dryRun) {
    console.log('\nDRY RUN — nothing written.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (importedTransfers.length > 0) {
      await tx.transfer.deleteMany({ where: { id: { in: importedTransfers.map((row) => row.id) } } });
    }
    for (const fix of rosterFixes) {
      await tx.tournamentTeam.update({ where: { id: fix.id }, data: { rosterJson: fix.rosterJson } });
    }
    for (const row of mismatches) {
      await tx.matchPlayerStat.update({ where: { id: row.id }, data: { teamId: row.to } });
    }
    for (const update of sinceUpdates) {
      await tx.player.update({ where: { id: update.id }, data: { currentTeamSince: update.since } });
    }
  });

  console.log(
    `\nApplied: -${importedTransfers.length} transfers, ${rosterFixes.length} rosters rewritten, ` +
      `${mismatches.length} scorecard rows re-pointed, ${sinceUpdates.length} players stamped.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
