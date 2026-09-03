/**
 * ONE-TIME import of the legacy MediaWiki {{RankingEvent}} team-ranking blocks
 * into the TeamRanking table (KRAFTON rankings).
 *
 * - Teams are matched case-insensitively by name; missing orgs are created
 *   with a unique slug so every ranking row has a real Team record.
 * - Tournaments are linked by case-insensitive name when they exist in the DB;
 *   otherwise the row is stored unlinked (manual entry — still counts).
 * - Idempotent: rows whose (teamId, endDate, tier) already exist are skipped.
 *
 * Run: npx tsx scripts/import-ranking-events.ts
 */
import prisma from '../lib/prisma';
import { slugify } from '../lib/utils';

const WIKITEXT = `
{{RankingEvent
| type = team
| tournament = Battlegrounds Mobile India Series 2024
| tier = Publisher
| end_date = 2024-06-30
| 1 = team=Revenant XSpark, rank=1
| 2 = team=Global Esports, rank=2
| 3 = team=Reckoning Esports, rank=3
| 4 = team=Team SouL, rank=4
| 5 = team=Chemin x Venom, rank=5
| 6 = team=Team Limra Esports, rank=6
| 7 = team=8Bit, rank=7
| 8 = team=Team Tamilas, rank=8
| 9 = team=Raven Esports, rank=9
| 10 = team=FS Esports, rank=10
| 11 = team=Team Insane Esports, rank=11
| 12 = team=Team Aaru, rank=12
| 13 = team=Vasista Esports, rank=13
| 14 = team=Mogo Esports, rank=14
| 15 = team=Carnival Gaming, rank=15
| 16 = team=Inferno Squad, rank=16
| 17 = team=Rivalry Esports, rank=17
| 18 = team=Galaxy Esports, rank=18
| 19 = team=Hyderabad Hyras, rank=19
| 20 = team=RTG x IND, rank=20
| 21 = team=THW Esports, rank=21
| 22 = team=Entity, rank=22
| 23 = team=GodLike Esports, rank=23
| 24 = team=Voltx Gaming, rank=24
| 25 = team=Magnet Esports, rank=25
| 26 = team=Livecraft Esports, rank=26
| 27 = team=7Shore Esports, rank=27
| 28 = team=LOC Esports, rank=28
| 29 = team=Inspiration eSports, rank=29
| 30 = team=NiY Esports, rank=30
| 31 = team=Prime Esports, rank=31
| 32 = team=Chemin Esports, rank=32
| 33 = team=Zero Recoil, rank=33
| 34 = team=Team Forever, rank=34
| 35 = team=ESCN Esports, rank=35
| 36 = team=Medal Esports, rank=36
| 37 = team=Infected Mushrooms, rank=37
| 38 = team=Big Brother Esports, rank=38
| 39 = team=Seven Hours, rank=39
| 40 = team=PL Dominators, rank=40
| 41 = team=Blind Esports, rank=41
| 42 = team=TMG Gaming, rank=42
| 43 = team=K9 Esports, rank=43
| 44 = team=Glitch x Reborn, rank=44
| 45 = team=WSB Gaming, rank=45
| 46 = team=R4W Official, rank=46
| 47 = team=Jux Esports, rank=47
| 48 = team=RVNC Esports, rank=48
}}

{{RankingEvent
| type = team
| tournament = Battlegrounds Mobile Pro Series 2024
| tier = Publisher
| end_date = 2024-09-29
| 1 = team=Revenant XSpark, rank=1
| 2 = team=Team Forever, rank=2
| 3 = team=GodLike Esports, rank=3
| 4 = team=TWOB, rank=4
| 5 = team=Reckoning Esports, rank=5
| 6 = team=Orangutan, rank=6
| 7 = team=Team Limra Esports, rank=7
| 8 = team=Team Versatile, rank=8
| 9 = team=Phoenix Esports, rank=9
| 10 = team=Team Bliss, rank=10
| 11 = team=Inferno Squad, rank=11
| 12 = team=Hyderabad Hyras, rank=12
| 13 = team=Silly Esports, rank=13
| 14 = team=Medal Esports, rank=14
| 15 = team=8Bit, rank=15
| 16 = team=Ignite Gaming, rank=16
| 17 = team=Windgod Esports, rank=17
| 18 = team=Mogo Esports, rank=18
| 19 = team=Sarkar Gaming, rank=19
| 20 = team=Gods Reign, rank=20
| 21 = team=Blind Esports, rank=21
| 22 = team=RTG x IND, rank=22
| 23 = team=Team Dragons, rank=23
| 24 = team=Carpediem, rank=24
| 25 = team=Gujarat Tigers, rank=25
| 26 = team=Team SouL, rank=26
| 27 = team=THW Esports, rank=27
| 28 = team=Team Crow, rank=28
| 29 = team=4merical Esports, rank=29
| 30 = team=Honoured Rivalz, rank=30
| 31 = team=Carnival Gaming, rank=31
| 32 = team=Global Esports, rank=32
| 33 = team=WSB Gaming, rank=33
| 34 = team=Team Insane Esports, rank=34
| 35 = team=Team Lolzzz, rank=35
| 36 = team=FS Esports, rank=36
| 37 = team=R4W Official, rank=37
| 38 = team=Kalinga Esports, rank=38
| 39 = team=Rivals Ape X, rank=39
| 40 = team=Legacy Esports, rank=40
| 41 = team=TCW x EMP, rank=41
| 42 = team=Team Cosmic, rank=42
| 43 = team=GENxFM Esports, rank=43
| 44 = team=Do or Die, rank=44
| 45 = team=Glitch x Reborn, rank=45
| 46 = team=Autobotz Esports, rank=46
| 47 = team=TMG Gaming, rank=47
| 48 = team=Imprnt Esports, rank=48
}}

{{RankingEvent
| type = team
| tournament = Battlegrounds Mobile India Series 2025
| tier = Publisher
| end_date = 2025-04-27
| 1 = team=Team Versatile, rank=1
| 2 = team=GodLike Esports, rank=2
| 3 = team=Orangutan, rank=3
| 4 = team=Reckoning Esports, rank=4
| 5 = team=True Rippers, rank=5
| 6 = team=SOA Esports, rank=6
| 7 = team=Cincinnati Kids, rank=7
| 8 = team=Medal Esports, rank=8
| 9 = team=FS Esports, rank=9
| 10 = team=BotArmyEsports, rank=10
| 11 = team=4Ever x RedxRoss, rank=11
| 12 = team=Genesis Esports, rank=12
| 13 = team=Rivalry Esports, rank=13
| 14 = team=THW Esports, rank=14
| 15 = team=Team SouL, rank=15
| 16 = team=Teams Hades x H4K, rank=16
| 17 = team=Phoenix Esports, rank=17
| 18 = team=Vasista Esports, rank=18
| 19 = team=Rider Esport, rank=19
| 20 = team=Wobble Gaming, rank=20
| 21 = team=Hail Inferno Squad, rank=21
| 22 = team=Team Altitude, rank=22
| 23 = team=Likitha Esports, rank=23
| 24 = team=Revenant XSpark, rank=24
| 25 = team=8Bit, rank=25
| 26 = team=Hyderabad Hyras, rank=26
| 27 = team=Team Tamilas, rank=27
| 28 = team=Glitch x Reborn, rank=28
| 29 = team=TWOB, rank=29
| 30 = team=Diesel Esports, rank=30
| 31 = team=Troy Tamilan Esports, rank=31
| 32 = team=Mastermind Mavericks, rank=32
| 33 = team=Team Eggy x 4AM, rank=33
| 34 = team=Royal Emperor, rank=34
| 35 = team=K9 Esports, rank=35
| 36 = team=Rivals Ape X, rank=36
| 37 = team=Windgod Esports, rank=37
| 38 = team=New Version, rank=38
| 39 = team=Gods Reign, rank=39
| 40 = team=Raven Esports, rank=40
| 41 = team=Naqsh x Mysterious4 Esports, rank=41
| 42 = team=4TR Official, rank=42
| 43 = team=Raka x SaS Esports, rank=43
| 44 = team=4merical Esports, rank=44
| 45 = team=Do or Die, rank=45
| 46 = team=Gujarat Tigers, rank=46
| 47 = team=IIT Gaming x TCW, rank=47
| 48 = team=Team Shockwave, rank=48
}}

{{RankingEvent
| type = team
| tournament = Battlegrounds Mobile Pro Series 2025
| tier = Publisher
| end_date = 2025-07-06
| 1 = team=Team AX, rank=1
| 2 = team=NonX Esports, rank=2
| 3 = team=Los hermanos, rank=3
| 4 = team=4merical Esports, rank=4
| 5 = team=8Bit, rank=5
| 6 = team=Gods Omen, rank=6
| 7 = team=4TR Official, rank=7
| 8 = team=TWOB, rank=8
| 9 = team=Gods Reign, rank=9
| 10 = team=K9 Esports, rank=10
| 11 = team=Team Forever, rank=11
| 12 = team=Inferno Squad, rank=12
| 13 = team=Genesis Esports, rank=13
| 14 = team=Team Eggy x 4AM, rank=14
| 15 = team=Team Insane Esports, rank=15
| 16 = team=2oP Official, rank=16
| 17 = team=Alibaba Raiders, rank=17
| 18 = team=Hyderabad Hyras, rank=18
| 19 = team=Reckoning Esports, rank=19
| 20 = team=Orangutan, rank=20
| 21 = team=True Rippers, rank=21
| 22 = team=Naqsh x Mysterious4 Esports, rank=22
| 23 = team=Troy Tamilan Esports, rank=23
| 24 = team=GodLike Esports, rank=24
| 25 = team=Volcano Esports, rank=25
| 26 = team=Team LEFP, rank=26
| 27 = team=Wyld Fangs, rank=27
| 28 = team=Brotherof7Sisters, rank=28
| 29 = team=Team SouL, rank=29
| 30 = team=Jux Esports, rank=30
| 31 = team=Do or Die, rank=31
| 32 = team=Team Shockwave, rank=32
| 33 = team=Autobotz Esports, rank=33
| 34 = team=Aerobotz Esports, rank=34
| 35 = team=Vasista Esports, rank=35
| 36 = team=Cincinnati Kids, rank=36
| 37 = team=Medal Esports, rank=37
| 38 = team=Wobble Gaming, rank=38
| 39 = team=Rider Esport, rank=39
| 40 = team=Team Tamilas, rank=40
| 41 = team=FS Esports, rank=41
| 42 = team=Xotic Signature, rank=42
| 43 = team=Mastermind Mavericks, rank=43
| 44 = team=Zenin Esports, rank=44
| 45 = team=Teams Hades x H4K, rank=45
| 46 = team=Apecity, rank=46
| 47 = team=Team Cosmic, rank=47
| 48 = team=Dragon Claw Esports, rank=48
}}

{{RankingEvent
| type = team
| tournament = Battlegrounds Mobile Showdown 2025
| tier = Publisher
| end_date = 2025-10-12
| 1 = team=Orangutan, rank=1
| 2 = team=K9 Esports, rank=2
| 3 = team=Team SouL, rank=3
| 4 = team=True Rippers, rank=4
| 5 = team=Nebula Esports, rank=5
| 6 = team=Gods Reign, rank=6
| 7 = team=Naqsh x Mysterious4 Esports, rank=7
| 8 = team=MadKings, rank=8
| 9 = team=FS Esports, rank=9
| 10 = team=8Bit, rank=10
| 11 = team=Team AX, rank=11
| 12 = team=Victores Sumus, rank=12
| 13 = team=GodLike Esports, rank=13
| 14 = team=Cincinnati Kids, rank=14
| 15 = team=White Walkers, rank=15
| 16 = team=Vasista Esports, rank=16
| 17 = team=Blitz Esports, rank=17
| 18 = team=Phoenix Esports, rank=18
| 19 = team=Autobotz Esports, rank=19
| 20 = team=Genesis Esports, rank=20
| 21 = team=Likitha Esports, rank=21
| 22 = team=Meta Ninza, rank=22
| 23 = team=Los hermanos, rank=23
| 24 = team=First Curiosity, rank=24
| 25 = team=Revenant XSpark, rank=25
| 26 = team=Sinewy Esports, rank=26
| 27 = team=Wyld Fangs, rank=27
| 28 = team=4TR Official, rank=28
| 29 = team=Medal Esports, rank=29
| 30 = team=Troy Tamilan Esports, rank=30
| 31 = team=NonX Esports, rank=31
| 32 = team=BotArmyEsports, rank=32
| 33 = team=Marcos Gaming, rank=33
| 34 = team=Reckoning Esports, rank=34
| 35 = team=Gods Omen, rank=35
| 36 = team=EvoX Esports, rank=36
| 37 = team=Team Tamilas, rank=37
| 38 = team=Gravity Esports, rank=38
| 39 = team=GENxFM Esports, rank=39
| 40 = team=Team Versatile, rank=40
| 41 = team=Rider Esport, rank=41
| 42 = team=2oP Official, rank=42
| 43 = team=Glitch x Reborn, rank=43
| 44 = team=StreamO, rank=44
| 45 = team=Team Altitude, rank=45
| 46 = team=Team Insane Esports, rank=46
| 47 = team=Alibaba Raiders, rank=47
| 48 = team=TWOB, rank=48
}}

{{RankingEvent
| type = team
| tournament = Battlegrounds Mobile India Series 2026
| tier = Publisher
| end_date = 2026-03-29
| 1 = team=Team SouL, rank=1
| 2 = team=Genesis Esports, rank=2
| 3 = team=Orangutan, rank=3
| 4 = team=Victores Sumus, rank=4
| 5 = team=GodLike Esports, rank=5
| 6 = team=K9 Esports, rank=6
| 7 = team=Revenant XSpark, rank=7
| 8 = team=Wyld Fangs, rank=8
| 9 = team=Vasista Esports, rank=9
| 10 = team=Nebula Esports, rank=10
| 11 = team=Team LEFP, rank=11
| 12 = team=Meta Ninza, rank=12
| 13 = team=Myth Official, rank=13
| 14 = team=Reckoning Esports, rank=14
| 15 = team=Team Tamilas, rank=15
| 16 = team=Welt Esports, rank=16
| 17 = team=EvoX Esports, rank=17
| 18 = team=NonX Esports, rank=18
| 19 = team=Sinewy Esports, rank=19
| 20 = team=Phoenix Esports, rank=20
| 21 = team=Troy Tamilan Esports, rank=21
| 22 = team=4 Wolf x DOD, rank=22
| 23 = team=MadKings, rank=23
| 24 = team=Team Vanguard, rank=24
| 25 = team=Inimicals Esports, rank=25
| 26 = team=Kalinga Esports, rank=26
| 27 = team=ORB Esports, rank=27
| 28 = team=RedForce Esports, rank=28
| 29 = team=Frostrex Esports, rank=29
| 30 = team=True Rippers, rank=30
| 31 = team=Blind Rippers, rank=31
| 32 = team=Windgod Esports, rank=32
| 33 = team=RiotNationZ, rank=33
| 34 = team=Gods for Reason, rank=34
| 35 = team=Naqsh x Mysterious4 Esports, rank=35
| 36 = team=Tenzen Esports, rank=36
| 37 = team=Higg Boson Esports, rank=37
| 38 = team=GENxFM Esports, rank=38
| 39 = team=T7 Esports, rank=39
| 40 = team=7Aces Esports, rank=40
| 41 = team=Teams Hades x H4K, rank=41
| 42 = team=Lastade Esports, rank=42
| 43 = team=Team Alpha, rank=43
| 44 = team=Rising Esports, rank=44
| 45 = team=Godz Official, rank=45
| 46 = team=Rapid Chaos Esports, rank=46
| 47 = team=Sovereign Esports, rank=47
| 48 = team=4TR Official, rank=48
}}

{{RankingEvent
| type = team
| tournament = Battlegrounds Mobile Pro Series 2026
| tier = Publisher
| end_date = 2026-06-21
| 1 = team=GodLike Esports, rank=1
| 2 = team=Divine Gaming, rank=2
| 3 = team=Victores Sumus, rank=3
| 4 = team=Gods Reign, rank=4
| 5 = team=Team Apex Gaming, rank=5
| 6 = team=Orangutan, rank=6
| 7 = team=Team Tamilas, rank=7
| 8 = team=Vasista Esports, rank=8
| 9 = team=Reckoning Esports, rank=9
| 10 = team=Nebula Esports, rank=10
| 11 = team=8Bit, rank=11
| 12 = team=Genesis Esports, rank=12
| 13 = team=Team SouL, rank=13
| 14 = team=7Gods Esports, rank=14
| 15 = team=Revenant XSpark, rank=15
| 16 = team=Myth Official, rank=16
| 17 = team=Zero Ark Official, rank=17
| 18 = team=Autobotz Esports, rank=18
| 19 = team=Rapid Chaos Esports, rank=19
| 20 = team=Windgod Esports, rank=20
| 21 = team=Lastade Esports, rank=21
| 22 = team=4TR Official, rank=22
| 23 = team=Higg Boson Esports, rank=23
| 24 = team=Meta Ninza, rank=24
| 25 = team=True Rippers, rank=25
| 26 = team=Welt Esports, rank=26
| 27 = team=Wyld Fangs, rank=27
| 28 = team=Team AX, rank=28
| 29 = team=Mysterious4 Esports, rank=29
| 30 = team=Rising Esports, rank=30
| 31 = team=Team Versatile, rank=31
| 32 = team=White Walkers, rank=32
| 33 = team=MadKings, rank=33
| 34 = team=GENxFM Esports, rank=34
| 35 = team=K9 Esports, rank=35
| 36 = team=Esport Social, rank=36
| 37 = team=Team LEFP, rank=37
| 38 = team=Troy Tamilan Esports, rank=38
| 39 = team=DC x SCR Esports, rank=39
| 40 = team=H4K Esports, rank=40
| 41 = team=Santa Esp, rank=41
| 42 = team=Team RedXross, rank=42
| 43 = team=Ares Esport, rank=43
| 44 = team=Quantum Sparks, rank=44
| 45 = team=Aura X Esports, rank=45
| 46 = team=T7 x Orion Esports, rank=46
| 47 = team=NonX Esports, rank=47
| 48 = team=Godsent Esports, rank=48
}}
`;

interface ParsedEntry {
  team: string;
  rank: number;
}

interface ParsedEvent {
  tournament: string;
  tier: string;
  endDate: string;
  entries: ParsedEntry[];
}

function parseWikitext(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = text.match(/\{\{RankingEvent[\s\S]*?\}\}/g) ?? [];

  for (const block of blocks) {
    let tournament = '';
    let tier = '';
    let endDate = '';
    const entries: ParsedEntry[] = [];

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('|')) continue;
      const body = line.slice(1).trim();

      const header = body.match(/^(type|tournament|tier|end_date)\s*=\s*(.+)$/i);
      if (header) {
        const key = header[1].toLowerCase();
        const value = header[2].trim();
        if (key === 'tournament') tournament = value;
        else if (key === 'tier') tier = value;
        else if (key === 'end_date') endDate = value;
        continue;
      }

      const rankLine = body.match(/^(\d+)\s*=\s*team\s*=\s*(.+?)\s*,\s*rank\s*=\s*(\d+)\s*$/i);
      if (rankLine) {
        entries.push({ team: rankLine[2].trim(), rank: Number(rankLine[3]) });
      }
    }

    if (tournament && endDate && entries.length > 0) {
      events.push({ tournament, tier, endDate, entries });
    }
  }
  return events;
}

async function main() {
  const events = parseWikitext(WIKITEXT);
  console.log(`Parsed ${events.length} events, ${events.reduce((s, e) => s + e.entries.length, 0)} entries.`);

  const [existingTeams, existingTournaments, existingRankingRows] = await Promise.all([
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.tournament.findMany({ select: { id: true, name: true } }),
    prisma.teamRanking.findMany({ select: { teamId: true, endDate: true, tier: true } }),
  ]);

  const teamByName = new Map(existingTeams.map((t) => [t.name.trim().toLowerCase(), t.id]));
  const tournamentByName = new Map(existingTournaments.map((t) => [t.name.trim().toLowerCase(), t.id]));
  const rowKey = (teamId: string, endDate: Date, tier: string) => `${teamId}|${endDate.toISOString().slice(0, 10)}|${tier}`;
  const existingRowKeys = new Set(existingRankingRows.map((r) => rowKey(r.teamId, r.endDate, r.tier)));

  let teamsCreated = 0;
  let rowsCreated = 0;
  let rowsSkipped = 0;
  let tournamentsLinked = 0;
  let tournamentsUnlinked = 0;

  for (const event of events) {
    const end = new Date(`${event.endDate}T12:00:00Z`);
    if (isNaN(end.getTime())) {
      console.warn(`!! Bad end_date for "${event.tournament}" — skipped event.`);
      rowsSkipped += event.entries.length;
      continue;
    }

    const tournamentId = tournamentByName.get(event.tournament.trim().toLowerCase()) ?? null;
    if (tournamentId) tournamentsLinked += 1;
    else tournamentsUnlinked += 1;

    for (const entry of event.entries) {
      const key = entry.team.trim().toLowerCase();
      let teamId = teamByName.get(key);
      if (!teamId) {
        const base = slugify(entry.team) || `team-${Date.now()}`;
        let slug = base;
        let i = 2;
        while (await prisma.team.findFirst({ where: { slug }, select: { id: true } })) {
          slug = `${base}-${i++}`;
        }
        const created = await prisma.team.create({ data: { name: entry.team, slug } });
        teamByName.set(key, created.id);
        teamId = created.id;
        teamsCreated += 1;
      }

      const dedupeKey = rowKey(teamId, end, event.tier);
      if (existingRowKeys.has(dedupeKey)) {
        rowsSkipped += 1;
        continue;
      }

      await prisma.teamRanking.create({
        data: {
          tournamentId,
          tier: event.tier,
          endDate: end,
          teamId,
          rank: entry.rank,
        },
      });
      existingRowKeys.add(dedupeKey);
      rowsCreated += 1;
    }
    console.log(`✓ ${event.tournament} (${event.tier}, ${event.endDate}) — ${event.entries.length} entries`);
  }

  console.log('---');
  console.log(`Rows created: ${rowsCreated}`);
  console.log(`Rows skipped (duplicates): ${rowsSkipped}`);
  console.log(`Teams created: ${teamsCreated}`);
  console.log(`Events linked to a tournament: ${tournamentsLinked}`);
  console.log(`Events stored unlinked (no matching tournament name): ${tournamentsUnlinked}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});
