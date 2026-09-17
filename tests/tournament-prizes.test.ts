import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrizeResults, parseBerths, placementTotalsByTeam } from '../lib/tournament-prizes';

/* ── Berths ─────────────────────────────────────────────────────────────── */

test('parseBerths keeps both linked and free-text berths', () => {
  const berths = parseBerths([
    { name: 'PMGC 2026', tournamentId: 't1', tournamentSlug: 'pmgc-2026' },
    { name: 'EWC 2026' },
  ]);
  assert.equal(berths.length, 2);
  assert.deepEqual(berths[0], { name: 'PMGC 2026', tournamentId: 't1', tournamentSlug: 'pmgc-2026' });
  // A target event that is not in the DB yet stays name-only, never a dead link.
  assert.deepEqual(berths[1], { name: 'EWC 2026', tournamentId: null, tournamentSlug: null });
});

test('parseBerths accepts a legacy plain string entry', () => {
  // Normalised to the same shape as an object entry, so stored berths are uniform.
  assert.deepEqual(parseBerths(['PMGC 2025']), [
    { name: 'PMGC 2025', tournamentId: null, tournamentSlug: null },
  ]);
});

test('parseBerths drops anything without a name instead of rendering a blank chip', () => {
  const berths = parseBerths([
    { name: '   ' },
    { tournamentSlug: 'orphaned' },
    null,
    42,
    '',
    { name: 'Valid' },
  ]);
  assert.deepEqual(berths, [{ name: 'Valid', tournamentId: null, tournamentSlug: null }]);
});

test('parseBerths returns nothing for a non-array column', () => {
  // The column is nullable JSON, so these are all real stored states.
  assert.deepEqual(parseBerths(null), []);
  assert.deepEqual(parseBerths(undefined), []);
  assert.deepEqual(parseBerths({ name: 'not-an-array' }), []);
});

/* ── Placement totals across stages ─────────────────────────────────────── */

/** Team SouL at bgms-2026, which is where the drift was spotted. */
const SOUL_DISTRIBUTION = {
  stages: [
    {
      stageName: 'Event Rankings',
      ranks: [{ rank: '8th Place', prize: 230000, teamId: 'soul', recipientType: 'TEAM' }],
    },
    {
      stageName: 'Bounty Weekend',
      ranks: [{ rank: 'Bounty', prize: 10000, teamId: 'soul', recipientType: 'TEAM' }],
    },
    {
      stageName: 'Quarter Finals',
      ranks: [{ rank: '1st', prize: 10000, teamId: 'soul', recipientType: 'TEAM' }],
    },
  ],
};

test('placementTotalsByTeam sums placements across every stage', () => {
  const totals = placementTotalsByTeam(SOUL_DISTRIBUTION);
  // Event Rankings 230,000 + Quarter Finals 10,000.
  assert.equal(totals.get('soul'), 240000);
});

test('placementTotalsByTeam excludes an award from the same team', () => {
  // "Bounty" is not a finishing position, so it is an honour, not prize money —
  // including it would have produced 250,000.
  const totals = placementTotalsByTeam(SOUL_DISTRIBUTION);
  assert.notEqual(totals.get('soul'), 250000);
});

test('placementTotalsByTeam ignores rows with no team or no money', () => {
  const totals = placementTotalsByTeam({
    stages: [
      {
        stageName: 'Finals',
        ranks: [
          { rank: '1st', prize: 5000 },
          { rank: '2nd', prize: 0, teamId: 'unpaid' },
          { rank: '3rd', prize: 1000, teamId: 'paid' },
        ],
      },
    ],
  });
  assert.deepEqual([...totals.entries()], [['paid', 1000]]);
});

test('buildPrizeResults pays the ladder total, not the stored column', () => {
  // The column said 230,000 while the ladder said 240,000 — the page must follow
  // the ladder, which is what it was built from.
  const rows = buildPrizeResults(
    [team({ teamId: 'soul', finalRank: 8, prizeWon: 230000 })],
    placementTotalsByTeam(SOUL_DISTRIBUTION)
  );
  assert.equal(rows[0].prizeWon, 240000);
});

test('buildPrizeResults falls back to the stored column for a team with no ladder rows', () => {
  const rows = buildPrizeResults(
    [team({ teamId: 'manual', finalRank: 5, prizeWon: 75000 })],
    placementTotalsByTeam(SOUL_DISTRIBUTION)
  );
  assert.equal(rows[0].prizeWon, 75000);
});

/* ── Results ────────────────────────────────────────────────────────────── */

const team = (over: Partial<Parameters<typeof buildPrizeResults>[0][number]> = {}) => ({
  teamId: 'team-1',
  finalRank: 1,
  prizeWon: 100,
  team: { name: 'GodLike Esports', tag: 'GODL', slug: 'godlike-esports' },
  ...over,
});

test('buildPrizeResults orders by rank and leaves unranked rows last', () => {
  const rows = buildPrizeResults([
    team({ teamId: 'third', finalRank: 3, team: { name: 'Third' } }),
    team({ teamId: 'first', finalRank: 1, team: { name: 'First' } }),
    // A prize with no placement recorded has no rank to sort on.
    team({ teamId: 'unranked', finalRank: null, prizeWon: 5000, team: { name: 'Zeta' } }),
    team({ teamId: 'second', finalRank: 2, team: { name: 'Second' } }),
  ]);
  assert.deepEqual(
    rows.map((r) => r.teamId),
    ['first', 'second', 'third', 'unranked']
  );
  assert.equal(rows[3].rank, null);
});

test('buildPrizeResults leaves out a squad with neither a rank nor a prize', () => {
  const rows = buildPrizeResults([
    team({ teamId: 'placed', finalRank: 4, prizeWon: 0 }),
    team({ teamId: 'ignored', finalRank: null, prizeWon: null }),
  ]);
  assert.deepEqual(
    rows.map((r) => r.teamId),
    ['placed']
  );
  // Placed but unpaid (a title-only finish) is still a real result.
  assert.equal(rows[0].prizeWon, 0);
});

test('buildPrizeResults prefers the event-specific overrides over the team record', () => {
  const [row] = buildPrizeResults([
    team({
      displayName: 'Sponsor Billed Name',
      shortName: 'SPN',
      logoUrl: '/uploads/event-logo.png',
      team: {
        name: 'GodLike Esports',
        displayName: 'GodLike',
        tag: 'GODL',
        slug: 'godlike-esports',
        logoUrl: '/uploads/org-logo.png',
        imageDarkUrl: '/uploads/org-dark.png',
      },
    }),
  ]);
  assert.equal(row.name, 'Sponsor Billed Name');
  assert.equal(row.tag, 'SPN');
  assert.equal(row.logoUrl, '/uploads/event-logo.png');
  // The dark override falls back to the team's own logo.
  assert.equal(row.logoDarkUrl, '/uploads/org-dark.png');
});

test('buildPrizeResults falls back to the team record when there is no override', () => {
  const [row] = buildPrizeResults([
    team({ team: { name: 'Team SouL', displayName: 'Team SouL', tag: 'SOUL', slug: null } }),
  ]);
  assert.equal(row.name, 'Team SouL');
  assert.equal(row.tag, 'SOUL');
  assert.equal(row.slug, null);
  assert.deepEqual(row.berths, []);
});
