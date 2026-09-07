import { prisma } from '../lib/prisma';

async function main() {
  console.log('Seeding native News & Editorial articles...');

  // Find tournaments and teams for contextual links
  const [bgmsTournament, soulTeam, godlikeTeam] = await Promise.all([
    prisma.tournament.findFirst({ where: { slug: 'bgms-2026' } }),
    prisma.team.findFirst({ where: { name: { contains: 'Soul', mode: 'insensitive' } } }),
    prisma.team.findFirst({ where: { name: { contains: 'GodLike', mode: 'insensitive' } } }),
  ]);

  const articles = [
    {
      title: 'BGMS 2026: Road to Grand Finals Unveiled as Top 16 Contenders Collide',
      slug: 'bgms-2026-road-to-grand-finals-unveiled-top-16-contenders',
      category: 'TOURNAMENTS',
      tags: ['BGMS 2026', 'Grand Finals', 'Road to Finals', 'BGMI'],
      excerpt:
        'Following explosive Super Weekends and tense Playoffs, 16 elite battle royale squads have locked in their berths for the biggest championship trophy of the season.',
      content: `## The Final Stage Is Set

After weeks of high-octane rotations, clutch zone plays, and relentless firefights across Erangel and Miramar, the field has narrowed to the final 16 squads competing for glory in the **BGMS 2026 Grand Finals**.

The qualification journey tested every team's endurance:
- **Direct Super Weekend Qualifiers**: Squads that dominated early weeks secured their safety cushions, converting consistency into automatic spots.
- **Playoffs Grinders**: The remaining squads were forced to battle through sudden-death elimination lobbies where every single frag was worth its weight in gold.

### Strategic Shifts Heading into Finals
Coaches and analysts are already noting key meta evolutions ahead of Day 1:
1. **Vehicle Priority**: Teams are dedicating Zone 1 almost entirely to vehicle accumulation and compound fortification.
2. **Aggressive Split Pushes**: Rather than playing passive center-edge rotations, squads are aggressively cutting off eastern bridge chokepoints.

> "In the Grand Finals, momentum is everything. A single 20-point chicken dinner on Day 1 shifts the psychological pressure to the rest of the lobby."

Stay tuned to eSportsAmaze for round-by-round live scoring, fragger leaderboards, and MVP damage breakdowns.`,
      coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      authorName: 'Aarav Sharma',
      authorRole: 'Senior Esports Correspondent',
      featured: true,
      status: 'PUBLISHED',
      readTimeMinutes: 4,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      tournamentId: bgmsTournament?.id || null,
      teamId: soulTeam?.id || null,
    },
    {
      title: 'Transfer Spotlight: Mid-Season Roster Shuffles Reshape Competitive Hierarchy',
      slug: 'transfer-spotlight-mid-season-roster-shuffles-reshape-competitive-hierarchy',
      category: 'ROSTERS',
      tags: ['Transfers', 'Rosters', 'Roster Mania', 'BGMI'],
      excerpt:
        'A flurry of high-profile player signings and loan moves have sent shockwaves through the competitive circuit ahead of the upcoming S-Tier championship calendar.',
      content: `## Roster Mania Reaches Fever Pitch

The transfer window has officially closed, and organizations have pulled off some of the most calculated roster maneuvers in recent memory.

With synergy being the deciding factor in late-game circles, front offices were willing to invest heavily to bring proven In-Game Leaders (IGLs) and dedicated entry fraggers into their active tournament lineups.

### Biggest Takeaways from the Transfer Ledger
- **IGL Leadership Changes**: Multiple powerhouse teams restructured their communication hierarchies to eliminate hesitation during Zone 4 phase shifts.
- **Youth Talent Pipeline**: Several Tier-2 standout fraggers earned promotions to premier starting lineups following standout individual statistics in open qualifier stages.

> "Synergy doesn't develop overnight, but raw mechanical skill paired with clear zone calling gives teams an immediate ceiling boost."

Follow our dedicated Transfers portal to view full contract histories, career timelines, and historical team moves.`,
      coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      authorName: 'Rohan Mehra',
      authorRole: 'Roster & Contract Analyst',
      featured: false,
      status: 'PUBLISHED',
      readTimeMinutes: 3,
      publishedAt: new Date(Date.now() - 14 * 60 * 60 * 1000), // 14 hours ago
      tournamentId: null,
      teamId: godlikeTeam?.id || null,
    },
    {
      title: 'Krafton Ranking Deep-Dive: Decaying Points and the Battle for Seed #1',
      slug: 'krafton-ranking-deep-dive-decaying-points-battle-for-seed-1',
      category: 'ANALYSIS',
      tags: ['Krafton Rankings', 'Power Rankings', 'Statistics', 'Tiers'],
      excerpt:
        'An analytical breakdown of how tournament tier multipliers and mathematical decay curves dictate which squads earn direct invites to international qualifiers.',
      content: `## Demystifying the Official Ranking Formula

The **Krafton Rankings System** separates itself from subjective tier lists by operating on a rigorous mathematical foundation.

Points earned in S-Tier and A-Tier championships decay progressively across months:
- **0–6 Months**: 100% full weight.
- **6–12 Months**: 75% retention.
- **12–24 Months**: 40% retention.
- **36+ Months**: Decays to 0, ensuring only recent championship dominance dictates qualification seeds.

### Why Every Match Point Counts
Because finish points are multiplied by event tier multipliers, winning an S-Tier championship grants a massive points cushion, but consistent top-3 placements across multiple A-Tier tournaments can outpace a one-hit wonder.

Explore our interactive Rankings tab to inspect live points breakdowns, decay timelines, and transfer point calculations.`,
      coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      authorName: 'Vikram Sengupta',
      authorRole: 'Lead Data & Analytics Editor',
      featured: false,
      status: 'PUBLISHED',
      readTimeMinutes: 5,
      publishedAt: new Date(Date.now() - 28 * 60 * 60 * 1000), // yesterday
      tournamentId: null,
      teamId: null,
    },
    {
      title: 'Exclusive Interview: "We Prepared 60 Different Drop Spot Contingencies"',
      slug: 'exclusive-interview-prepared-60-different-drop-spot-contingencies',
      category: 'INTERVIEWS',
      tags: ['Interview', 'Coaching', 'Strategy', 'Mindset'],
      excerpt:
        'We sat down with the championship-winning coaching staff to discuss preparation, drop-clash protocols, and surviving Erangel zone shifts.',
      content: `## Behind the Strategy Board

In modern competitive battle royale, winning tournaments isn't decided by aiming alone — it's won in the review room days before the first parachute deploys.

In our exclusive sit-down, the head coach peeled back the curtain on how their squad adapted to contested drop spots throughout the regional qualifiers.

### Key Excerpts from the Conversation

**Q: When another squad contests your primary compound in Pochinki, what is the immediate protocol?**

> *"We never coin-flip our tournament life on 50/50 early loot RNG. We have three secondary car-spawns memorized. If they drop hot, we scout the road, secure transportation, and loot split-compounds with guaranteed vehicles."*

**Q: How do you maintain composure when three circles shift completely away from your position?**

> *"You have to accept that Erangel will test you. When the zone hard-shifts, good teams panic; great teams immediately pivot to third-party gatekeeping positions."*

Full video excerpts and tactical breakdowns will be released on our community media channels.`,
      coverImage: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
      authorName: 'Pooja Nair',
      authorRole: 'Interviews & Feature Writer',
      featured: false,
      status: 'PUBLISHED',
      readTimeMinutes: 4,
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      tournamentId: null,
      teamId: soulTeam?.id || null,
    },
    {
      title: 'Utility Mastery: How Grenades and Smokes Decide Modern Esports Finals',
      slug: 'utility-mastery-how-grenades-and-smokes-decide-modern-esports-finals',
      category: 'ANALYSIS',
      tags: ['Utilities', 'Granades', 'Smokes', 'Meta Analysis'],
      excerpt:
        'Advanced telemetry data reveals that teams with superior smoke wall timing and coordinated HE grenade volleys win over 72% of end-game circle engagements.',
      content: `## The Science of Circle 6

Gone are the days when gun skill alone could brute-force a victory through open fields. In today's competitive landscape, **utility management is the true kingmaker**.

Our telemetry data across over 140 competitive matches reveals startling statistical correlations:
- Squads carrying an average of 4+ smoke grenades into Zone 5 boast a **3.4x higher survival rate**.
- Coordinated 3-grenade airburst volleys account for **44% of squad wipe knockouts** in urban compounds.

### The Anatomy of an Unbreakable Smoke Path
A proper smoke path isn't just a straight line; it creates cross-fire cover angles that block vision from distant ridge campers while allowing clean line-of-sight to the nearest enemy cover.

Stay tuned for our upcoming Interactive Match Matrix feature where users can review utility telemetry per game.`,
      coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
      authorName: 'Vikram Sengupta',
      authorRole: 'Lead Data & Analytics Editor',
      featured: false,
      status: 'PUBLISHED',
      readTimeMinutes: 3,
      publishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
      tournamentId: bgmsTournament?.id || null,
      teamId: null,
    },
  ];

  for (const art of articles) {
    await prisma.article.upsert({
      where: { slug: art.slug },
      update: art,
      create: art,
    });
  }

  console.log(`✅ Successfully seeded ${articles.length} news & editorial articles!`);
}

main()
  .catch((e) => {
    console.error('Failed to seed news:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
