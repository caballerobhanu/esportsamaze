import { prisma } from '../lib/prisma';

async function main() {
  const players = await prisma.player.findMany({
    select: { id: true, ign: true, currentTeamId: true },
  });
  let updatedCount = 0;

  for (const p of players) {
    const latest = await prisma.transfer.findFirst({
      where: { playerId: p.id },
      orderBy: { date: 'desc' },
      include: { team: { select: { name: true } } },
    });

    if (latest?.teamId && latest.teamId !== p.currentTeamId) {
      await prisma.player.update({
        where: { id: p.id },
        data: { currentTeamId: latest.teamId },
      });
      console.log(`Updated ${p.ign}: -> ${latest.team?.name}`);
      updatedCount++;
    }
  }

  console.log(`\nSync complete. Updated ${updatedCount} players.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
