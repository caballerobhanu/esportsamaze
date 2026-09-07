import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLiquipediaTournamentWikitext } from '../lib/liquipedia-tournament-parser';

test('parseLiquipediaTournamentWikitext extracts full tournament metadata, tier, prize pool and squads', () => {
  const sampleWikitext = `
{{DISPLAYTITLE:PUBG Mobile World Cup 2026}}
{{Infobox league
|liquipediatier=1
|name=PUBG Mobile World Cup 2026
|tickername=PMWC 2026
|series=PUBG Mobile World Cup
|abbreviation=PMWC
|organizer=KRAFTON
|organizer2=Level Infinite
|mode=squads
|type=Offline
|country=France |city=Paris
|venue=Paris Expo Porte de Versailles
|sdate=2026-08-06 |edate=2026-08-16
|prizepoolusd=3,025,000
}}

==Prize Pool==
{{TeamPrizePool
|{{Slot|usdprize=555,000|{{Opponent|S2G Esports}} }}
|{{Slot|usdprize=293,000|{{Opponent|Nongshim RedForce}} }}
|{{Slot|usdprize=210,000|{{Opponent|Aurora Gaming}} }}
}}

==Participants==
{{TeamParticipants
	|{{Opponent|Team Soul
		|players={{Persons
			|{{Person|Mortal|role=Captain}}
			|{{Person|Joker|role=Assaulter}}
			|{{Person|Amit|role=Coach|type=staff}}
		}}
		|qualification={{Qualification|text=India Points|placement=1}}
	}}
	|{{Opponent|GodLike Esports
		|players={{Persons
			|{{Person|Jonathan|role=Captain}}
			|{{Person|Zgod}}
		}}
		|qualification={{Qualification|text=Invited}}
	}}
}}
`;

  const res = parseLiquipediaTournamentWikitext(sampleWikitext);

  assert.equal(res.name, 'PUBG Mobile World Cup 2026');
  assert.equal(res.slug, 'pubg-mobile-world-cup-2026');
  assert.equal(res.series, 'PUBG Mobile World Cup');
  assert.equal(res.tier, 'S-Tier');
  assert.equal(res.eventType, 'LAN');
  assert.equal(res.startDate, '2026-08-06');
  assert.equal(res.endDate, '2026-08-16');
  assert.equal(res.location, 'Paris, France');
  assert.equal(res.venue, 'Paris Expo Porte de Versailles');
  assert.deepEqual(res.organizers, ['KRAFTON', 'Level Infinite']);
  assert.equal(res.prizePool, 3025000);
  assert.equal(res.currency, 'USD');

  // Prize distribution
  assert.equal(res.prizeDistribution['1'], 555000);
  assert.equal(res.prizeDistribution['2'], 293000);
  assert.equal(res.prizeDistribution['3'], 210000);

  // Squads
  assert.equal(res.squads.length, 2);
  const soul = res.squads[0];
  assert.equal(soul.teamName, 'Team Soul');
  assert.equal(soul.seedLabel, 'India Points');
  assert.equal(soul.roster.length, 3);
  assert.equal(soul.roster[0].ign, 'Mortal');
  assert.equal(soul.roster[0].captain, true);
  assert.equal(soul.roster[2].isStaff, true);

  const godlike = res.squads[1];
  assert.equal(godlike.teamName, 'GodLike Esports');
  assert.equal(godlike.seedLabel, 'Invited');
  assert.equal(godlike.roster.length, 2);
});

test('fetchLiquipediaTournament rejects spoofed domains, invalid protocols, and malformed paths', async () => {
  const { fetchLiquipediaTournament } = await import('../lib/liquipedia-tournament-parser');

  // Spoofed domains
  const spoof1 = await fetchLiquipediaTournament('https://evil-liquipedia.net/pubgmobile/Tournament');
  assert.equal(spoof1.success, false);

  const spoof2 = await fetchLiquipediaTournament('https://liquipedia.net.attacker.com/pubgmobile/Tournament');
  assert.equal(spoof2.success, false);

  // Dangerous protocols
  const scheme1 = await fetchLiquipediaTournament('javascript:alert(1)');
  assert.equal(scheme1.success, false);

  // Malformed wiki path
  const traversal = await fetchLiquipediaTournament('https://liquipedia.net/../Tournament');
  assert.equal(traversal.success, false);
});

test('fetchLiquipediaMatchUrl rejects spoofed domains and invalid protocols', async () => {
  const { fetchLiquipediaMatchUrl } = await import('../lib/liquipedia-parser');

  const spoof = await fetchLiquipediaMatchUrl('https://evil-liquipedia.net/pubgmobile/Tournament');
  assert.equal(spoof.success, false);

  const scheme = await fetchLiquipediaMatchUrl('javascript:alert(1)');
  assert.equal(scheme.success, false);
});
