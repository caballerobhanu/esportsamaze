import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  collectTeamAwards,
  describeAwardReward,
  isPlacementLabel,
  type AwardTournamentInput,
} from '../lib/team-awards';

const OUR_TEAM = 'team-apex';

const tournament = (
  overrides: Partial<AwardTournamentInput> & { tournamentId: string },
): AwardTournamentInput => ({
  name: overrides.tournamentId,
  shortName: null,
  slug: overrides.tournamentId,
  currency: 'INR',
  startedAtMs: 0,
  prizeDistribution: null,
  ...overrides,
});

describe('isPlacementLabel', () => {
  it('recognises the prize ladder, not the honours', () => {
    for (const label of ['1st Place', '21th Place', '3', 'Rank 4', '2nd position', '']) {
      assert.equal(isPlacementLabel(label), true, `${label} should read as a placement`);
    }
    for (const label of [
      'Best IGL',
      'MVP Event',
      'The Eliminator',
      'TVS Most Wicked Player',
      "Fan's Favourite Team",
    ]) {
      assert.equal(isPlacementLabel(label), false, `${label} should read as an award`);
    }
  });
});

describe('collectTeamAwards', () => {
  it('skips the placement ladder and keeps the awards', () => {
    const { awards } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          prizeDistribution: [
            { rank: '1st Place', prize: 4000000, recipientType: 'TEAM', teamId: OUR_TEAM },
            { rank: '5th Place', prize: 350000, recipientType: 'TEAM', teamId: OUR_TEAM },
            { rank: 'Best IGL', prize: 250000, recipientType: 'TEAM', teamId: OUR_TEAM },
          ],
        }),
      ],
      roster: [],
      transfers: [],
    });

    assert.deepEqual(
      awards.map((award) => award.label),
      ['Best IGL'],
    );
  });

  it('resolves a player award from the event roster by player id', () => {
    const { awards, unresolved } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          rosterJson: [{ playerId: 'p-jonathan', ign: 'Jonathan', captain: true }],
          prizeDistribution: [
            {
              rank: 'The Eliminator',
              prize: 0,
              rewardType: 'TITLE',
              recipientType: 'PLAYER',
              playerId: 'p-jonathan',
              playerName: 'Jonathan',
            },
          ],
        }),
      ],
      roster: [{ id: 'p-jonathan', ign: 'Jonathan', slug: 'jonathan' }],
      transfers: [],
    });

    assert.equal(unresolved.length, 0);
    assert.equal(awards.length, 1);
    assert.equal(awards[0].recipientKind, 'PLAYER');
    assert.equal(awards[0].playerName, 'Jonathan');
    assert.equal(awards[0].playerSlug, 'jonathan');
    assert.equal(awards[0].resolvedBy, 'roster');
    assert.deepEqual(describeAwardReward(awards[0]), {
      kind: 'REWARD',
      text: 'The Eliminator',
      rewardType: 'TITLE',
    });
  });

  it('falls back to the transfer ledger for a player who has since left', () => {
    const { awards, unresolved } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          // The event roster no longer lists the player (or was never recorded).
          rosterJson: [],
          prizeDistribution: [
            {
              rank: 'MVP Finals',
              prize: 200000,
              rewardType: 'MONEY',
              recipientType: 'PLAYER',
              playerId: 'p-left',
              playerName: 'Slug',
            },
          ],
        }),
      ],
      roster: [],
      transfers: [{ id: 'p-left', ign: 'Slug', slug: 'slug' }],
    });

    assert.equal(unresolved.length, 0);
    assert.equal(awards.length, 1);
    assert.equal(awards[0].resolvedBy, 'ledger');
    assert.equal(awards[0].playerSlug, 'slug');
  });

  it('matches a roster entry that recorded a slug but no player id', () => {
    const { awards } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          rosterJson: [{ ign: 'HunterZ', slug: 'hunter-z' }],
          prizeDistribution: [
            {
              rank: 'TVS Most Wicked Player',
              prize: 0,
              rewardType: 'ITEM',
              customReward: 'TVS Raider Bike',
              recipientType: 'PLAYER',
              playerId: 'p-hunter',
              playerName: 'HunterZ',
            },
          ],
        }),
      ],
      roster: [{ id: 'p-hunter', ign: 'HunterZ', slug: 'hunter-z' }],
      transfers: [],
    });

    assert.equal(awards.length, 1);
    assert.equal(awards[0].resolvedBy, 'roster');
    assert.deepEqual(describeAwardReward(awards[0]), {
      kind: 'REWARD',
      text: 'TVS Raider Bike',
      rewardType: 'ITEM',
    });
  });

  it('ignores another team\'s award without reporting it as unresolved', () => {
    const { awards, unresolved } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          prizeDistribution: [
            { rank: 'Best IGL', prize: 250000, recipientType: 'TEAM', teamId: 'someone-else' },
            { rank: 'Finale MVP', prize: 0, rewardType: 'ITEM', recipientType: 'PLAYER', playerId: 'p-x', playerName: 'Knowme' },
          ],
        }),
      ],
      roster: [],
      transfers: [],
    });

    assert.equal(awards.length, 0);
    // The first is resolved (to another team); only the second is unattributable.
    assert.equal(unresolved.length, 1);
    assert.equal(unresolved[0].label, 'Finale MVP');
    assert.match(unresolved[0].reason, /not in this event roster/);
  });

  it('reports a team honour with no team recorded instead of guessing', () => {
    const { awards, unresolved } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          prizeDistribution: [{ rank: 'Fan Favourite Team', prize: 50000, recipientType: 'TEAM' }],
        }),
      ],
      roster: [],
      transfers: [],
    });

    assert.equal(awards.length, 0);
    assert.equal(unresolved.length, 1);
    assert.match(unresolved[0].reason, /no team recorded/);
  });

  it('prefers the award row\'s own teamId over the roster', () => {
    const { awards } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          rosterJson: [],
          prizeDistribution: [
            {
              rank: 'MVP Event',
              prize: 400000,
              recipientType: 'PLAYER',
              teamId: OUR_TEAM,
              playerId: 'p-mvp',
              playerName: 'ScarryJod',
            },
          ],
        }),
      ],
      roster: [],
      transfers: [],
    });

    assert.equal(awards.length, 1);
    assert.equal(awards[0].resolvedBy, 'award-team');
  });

  it('orders awards newest event first and keeps cash tickets as amounts', () => {
    const { awards } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'older',
          startedAtMs: 1000,
          prizeDistribution: [{ rank: 'Best IGL', prize: 250000, recipientType: 'TEAM', teamId: OUR_TEAM }],
        }),
        tournament({
          tournamentId: 'newer',
          startedAtMs: 2000,
          prizeDistribution: [{ rank: 'Best Clutch', prize: 100000, recipientType: 'TEAM', teamId: OUR_TEAM }],
        }),
      ],
      roster: [],
      transfers: [],
    });

    assert.deepEqual(
      awards.map((award) => award.tournamentId),
      ['newer', 'older'],
    );
    assert.deepEqual(describeAwardReward(awards[0]), {
      kind: 'MONEY',
      amount: 100000,
      currency: 'INR',
    });
  });

  it('shows nothing for a money honour that carries no amount', () => {
    const { awards } = collectTeamAwards({
      teamId: OUR_TEAM,
      tournaments: [
        tournament({
          tournamentId: 'bgms',
          prizeDistribution: [{ rank: 'Spirit Award', prize: 0, recipientType: 'TEAM', teamId: OUR_TEAM }],
        }),
      ],
      roster: [],
      transfers: [],
    });

    assert.deepEqual(describeAwardReward(awards[0]), { kind: 'NONE' });
  });
});
