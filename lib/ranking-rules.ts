import prisma from '@/lib/prisma';
import { mergeTransferRules, type RosterTransferRules } from '@/lib/krafton-rankings';

/**
 * Point-transfer rules from the admin panel (RankingTransferRule), merged over the
 * built-in ROSTER_TRANSFERS defaults. Falls back to defaults if the DB is unreachable.
 */
export async function loadTransferRules(): Promise<RosterTransferRules> {
  try {
    const rows = await prisma.rankingTransferRule.findMany({
      include: {
        oldTeam: { select: { name: true } },
        newTeam: { select: { name: true } },
      },
    });
    const dbRules: RosterTransferRules = {};
    for (const r of rows) {
      const key = r.oldTeam.name.trim().toLowerCase();
      const newTeam = r.newTeam.name.trim();
      if (!key || !newTeam) continue;
      (dbRules[key] ??= []).push({ new: newTeam, before: r.before.toISOString().slice(0, 10) });
    }
    return mergeTransferRules(Object.keys(dbRules).length ? dbRules : undefined);
  } catch {
    return mergeTransferRules();
  }
}
