import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  absoluteUrl,
  baseUrl,
  breadcrumbJsonLd,
  canonical,
  directoryMetadata,
  mediaUrl,
  personJsonLd,
  rankedItemListJsonLd,
  serializeJsonLd,
  sportsEventJsonLd,
  sportsTeamJsonLd,
} from '../lib/seo';
import {
  PLAYER_TAB_ROUTES,
  TEAM_TAB_ROUTES,
  tournamentTabTitle,
  teamTabTitle,
  playerTabTitle,
} from '../lib/seo-titles';
import type { TournamentTabId } from '../lib/standings-config';

/* ── URL helpers ────────────────────────────────────────────────────────── */

test('baseUrl strips a trailing slash from NEXT_PUBLIC_SITE_URL', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/';
  try {
    assert.equal(baseUrl(), 'https://example.com');
    assert.equal(absoluteUrl('/teams/x'), 'https://example.com/teams/x');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test('absoluteUrl adds the leading slash it is given without one', () => {
  assert.ok(absoluteUrl('teams/x').endsWith('/teams/x'));
});

test('mediaUrl leaves absolute CDN URLs alone and absolutises local paths', () => {
  assert.equal(mediaUrl('https://media.example.com/logo.png'), 'https://media.example.com/logo.png');
  assert.equal(mediaUrl('http://cdn.example.com/logo.png'), 'http://cdn.example.com/logo.png');
  assert.ok(mediaUrl('/uploads/logo.png').startsWith('http'));
  assert.ok(mediaUrl('/uploads/logo.png').endsWith('/uploads/logo.png'));
});

test('canonical is a self-referencing relative path', () => {
  assert.deepEqual(canonical('/teams/godlike'), {
    alternates: { canonical: '/teams/godlike' },
  });
});

/* ── Directory pages: filters, pagination, sorting ──────────────────────── */

const TEAM_FILTERS = {
  path: '/teams',
  filterKeys: ['q', 'status', 'game', 'letter'],
  defaults: { status: 'ALL', game: 'ALL', letter: 'ALL' },
};

test('directoryMetadata canonicalises an unfiltered listing to its own path', () => {
  const meta = directoryMetadata({ ...TEAM_FILTERS, params: {} });
  assert.deepEqual(meta.alternates, { canonical: '/teams' });
  assert.equal('robots' in meta, false);
});

test('directoryMetadata keeps pagination as its own page rather than collapsing it', () => {
  // Collapsing page 2 onto page 1 would hide a real page of the listing.
  assert.deepEqual(directoryMetadata({ ...TEAM_FILTERS, params: { page: '2' } }).alternates, {
    canonical: '/teams?page=2',
  });
  // page=1 is the same page as no page at all.
  assert.deepEqual(directoryMetadata({ ...TEAM_FILTERS, params: { page: '1' } }).alternates, {
    canonical: '/teams',
  });
});

test('directoryMetadata noindexes a filtered or searched view but still follows it', () => {
  for (const params of [{ q: 'soul' }, { status: 'ACTIVE' }, { letter: 'G' }, { game: 'bgmi' }]) {
    const meta = directoryMetadata({ ...TEAM_FILTERS, params });
    assert.deepEqual(meta.robots, { index: false, follow: true }, `not noindexed: ${JSON.stringify(params)}`);
  }
});

test('directoryMetadata treats an explicit default value as unfiltered', () => {
  const meta = directoryMetadata({
    ...TEAM_FILTERS,
    params: { status: 'ALL', game: 'ALL', letter: 'ALL' },
  });
  assert.equal('robots' in meta, false);
  assert.deepEqual(meta.alternates, { canonical: '/teams' });
});

test('directoryMetadata drops sorting from the canonical but keeps the page', () => {
  // Sorting returns the same set in a different order, so it is view state —
  // but page 2 of a sorted list is still page 2.
  assert.deepEqual(
    directoryMetadata({ ...TEAM_FILTERS, params: { sort: 'titles', page: '2' } }).alternates,
    { canonical: '/teams?page=2' }
  );
});

test('serializeJsonLd escapes < so a title cannot break out of the script tag', () => {
  const payload = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
  assert.ok(!payload.includes('</script>'));
  assert.ok(payload.includes('\\u003c'));
});

/* ── Breadcrumbs ────────────────────────────────────────────────────────── */

test('breadcrumbJsonLd numbers items from 1 and omits item for a path-less entry', () => {
  const crumbs = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Teams' }]);
  const [first, second] = crumbs.itemListElement;
  assert.equal(crumbs.itemListElement.length, 2);
  assert.equal(first.position, 1);
  assert.equal(second.position, 2);
  assert.ok(first.item);
  assert.ok(first.item.endsWith('/'));
  assert.equal('item' in second, false);
});

/* ── SportsEvent ────────────────────────────────────────────────────────── */

test('sportsEventJsonLd maps the event status and attendance mode', () => {
  const event = sportsEventJsonLd({
    name: 'Battlegrounds Mobile India Series 2026',
    slug: 'bgis-2026',
    status: 'CANCELED',
    eventType: 'LAN',
  });
  assert.equal(event['@type'], 'SportsEvent');
  assert.equal(event.eventStatus, 'https://schema.org/EventCancelled');
  assert.equal(event.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode');
  assert.equal(event.sport, 'Esports');
});

test('sportsEventJsonLd treats online and hybrid formats distinctly', () => {
  const online = sportsEventJsonLd({ name: 'A', slug: 'a', eventType: 'Online' });
  const hybrid = sportsEventJsonLd({ name: 'B', slug: 'b', eventType: 'Hybrid' });
  assert.equal(online.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode');
  assert.equal(hybrid.eventAttendanceMode, 'https://schema.org/MixedEventAttendanceMode');
});

test('sportsEventJsonLd omits location rather than inventing a venue', () => {
  const withoutVenue = sportsEventJsonLd({ name: 'A', slug: 'a', eventType: 'LAN' });
  assert.equal('location' in withoutVenue, false);

  const withVenue = sportsEventJsonLd({ name: 'A', slug: 'a', venueLocation: 'NSCI Dome, Mumbai' });
  assert.deepEqual(withVenue.location, { '@type': 'Place', name: 'NSCI Dome, Mumbai' });
});

test('sportsEventJsonLd emits ISO dates and one organizer per name', () => {
  const event = sportsEventJsonLd({
    name: 'A',
    slug: 'a',
    startDate: new Date('2026-01-02T00:00:00.000Z'),
    endDate: new Date('2026-01-12T00:00:00.000Z'),
    organizerNames: ['Krafton India', 'Nodwin Gaming'],
    competitors: ['GodLike Esports', 'Team SouL'],
  });
  assert.equal(event.startDate, '2026-01-02T00:00:00.000Z');
  assert.equal(event.endDate, '2026-01-12T00:00:00.000Z');
  assert.ok(event.organizer);
  assert.ok(event.competitor);
  assert.equal(event.organizer.length, 2);
  assert.equal(event.organizer[0].name, 'Krafton India');
  assert.equal(event.competitor.length, 2);
  assert.equal(event.competitor[0]['@type'], 'SportsTeam');
});

test('sportsEventJsonLd drops empty collections instead of emitting them', () => {
  const event = sportsEventJsonLd({ name: 'A', slug: 'a', organizerNames: [], competitors: [] });
  assert.equal('organizer' in event, false);
  assert.equal('competitor' in event, false);
});

/* ── SportsTeam ─────────────────────────────────────────────────────────── */

test('sportsTeamJsonLd nests the roster as members and keeps the tag as alternateName', () => {
  const team = sportsTeamJsonLd({
    name: 'GodLike Esports',
    slug: 'godlike-esports',
    tag: 'GODL',
    logoUrl: '/uploads/godl.png',
    region: 'India',
    foundedYear: 2019,
    members: [
      { name: 'Jonathan', slug: 'jonathan', role: 'Assaulter' },
      { name: 'Unlinked', slug: null },
    ],
    sameAs: ['https://x.com/godlike'],
  });

  assert.equal(team['@type'], 'SportsTeam');
  assert.equal(team.alternateName, 'GODL');
  assert.equal(team.areaServed, 'India');
  assert.equal(team.foundingDate, '2019');
  assert.ok(team.logo);
  assert.ok(team.member);
  assert.ok(team.logo.endsWith('/uploads/godl.png'));
  assert.equal(team.member.length, 2);
  assert.equal(team.member[0].jobTitle, 'Assaulter');
  // A member with no profile slug must not get a fabricated URL.
  assert.equal('url' in team.member[1], false);
  assert.deepEqual(team.sameAs, ['https://x.com/godlike']);
});

test('sportsTeamJsonLd omits url when the team has no slug', () => {
  const team = sportsTeamJsonLd({ name: 'No Slug FC', slug: null });
  assert.equal('url' in team, false);
  assert.equal('sameAs' in team, false);
});

/* ── Person ─────────────────────────────────────────────────────────────── */

test('personJsonLd uses the IGN as the name and the real name as the alternate', () => {
  const person = personJsonLd({
    ign: 'Jonathan',
    slug: 'jonathan',
    firstName: 'Jonathan',
    lastName: 'Amaral',
    avatarUrl: 'https://media.example.com/j.png',
    nationality: 'India',
    role: 'Assaulter',
    teamName: 'GodLike Esports',
    teamSlug: 'godlike-esports',
    sameAs: ['https://instagram.com/j', ''],
  });

  assert.equal(person['@type'], 'Person');
  assert.equal(person.name, 'Jonathan');
  assert.equal(person.alternateName, 'Jonathan Amaral');
  assert.deepEqual(person.nationality, { '@type': 'Country', name: 'India' });
  assert.equal(person.jobTitle, 'Assaulter');
  assert.ok(person.memberOf);
  assert.equal(person.memberOf['@type'], 'SportsTeam');
  assert.ok(person.memberOf.url);
  assert.ok(person.memberOf.url.endsWith('/teams/godlike-esports'));
  // Blank social entries are dropped rather than emitted as empty strings.
  assert.deepEqual(person.sameAs, ['https://instagram.com/j']);
});

test('personJsonLd writes birthDate as a date without a time component', () => {
  const person = personJsonLd({
    ign: 'X',
    slug: 'x',
    birthDate: new Date('2001-07-04T00:00:00.000Z'),
  });
  assert.equal(person.birthDate, '2001-07-04');
});

test('personJsonLd stays minimal for a player with no relations', () => {
  const person = personJsonLd({ ign: 'Solo', slug: 'solo' });
  assert.equal(person.name, 'Solo');
  assert.equal('alternateName' in person, false);
  assert.equal('memberOf' in person, false);
  assert.equal('nationality' in person, false);
});

/* ── Ranked ItemList ────────────────────────────────────────────────────── */

test('rankedItemListJsonLd returns null for an empty board', () => {
  assert.equal(rankedItemListJsonLd([], 'KRAFTON team rankings'), null);
});

test('rankedItemListJsonLd numbers a leaderboard from 1 and keeps the order given', () => {
  const list = rankedItemListJsonLd(
    [
      { name: 'GodLike Esports', type: 'SportsTeam', url: 'https://example.com/rankings/team/godl' },
      { name: 'Team SouL', type: 'SportsTeam', url: null },
    ],
    'KRAFTON team rankings'
  );
  assert.ok(list);
  assert.equal(list['@type'], 'ItemList');
  assert.equal(list.numberOfItems, 2);
  assert.equal(list.itemListElement[0].position, 1);
  assert.equal(list.itemListElement[0].item.name, 'GodLike Esports');
  assert.equal(list.itemListElement[1].position, 2);
  // An entity with no linked profile stays name-only.
  assert.equal('url' in list.itemListElement[1].item, false);
});

/* ── Title rules ────────────────────────────────────────────────────────── */

/** Google truncates near 580px; ~65 characters is the practical ceiling. */
const TITLE_BUDGET = 65;

const tournamentTabs: TournamentTabId[] = [
  'overview',
  'standings',
  'matches',
  'progression',
  'format',
  'teams',
  'prizepool',
  'statistics',
];

test('every tournament tab title fits the SERP budget and carries the brand', () => {
  for (const status of ['ONGOING', 'COMPLETED', 'UPCOMING']) {
    for (const tab of tournamentTabs) {
      const title = tournamentTabTitle(tab, 'BMPS 2026', status);
      assert.ok(title.length <= TITLE_BUDGET, `${tab}/${status} is ${title.length} chars: ${title}`);
      assert.ok(title.includes('eSportsAmaze'), `${tab}/${status} is missing the brand`);
      assert.ok(title.startsWith('BMPS 2026'), `${tab}/${status} must lead with the event`);
    }
  }
});

test('the standings tab switches between live and final wording', () => {
  const live = tournamentTabTitle('standings', 'BMPS 2026', 'ONGOING');
  const done = tournamentTabTitle('standings', 'BMPS 2026', 'COMPLETED');
  assert.ok(live.includes('Live Standings'));
  assert.ok(live.includes('Points Table'));
  assert.ok(done.includes('Points Table'));
  assert.ok(done.includes('Final'));
  assert.notEqual(live, done);
});

test('tournament tabs do not cannibalise each other — each targets its own query', () => {
  const titles = tournamentTabs.map((tab) => tournamentTabTitle(tab, 'BMPS 2026', 'COMPLETED'));
  assert.equal(new Set(titles).size, titles.length, 'two tabs produced the same title');

  // The overview must not claim the points table: that is the standings tab's
  // query, and two pages targeting it compete with each other.
  const overview = tournamentTabTitle('overview', 'BMPS 2026', 'COMPLETED');
  assert.ok(!overview.toLowerCase().includes('points table'));
  assert.ok(!overview.toLowerCase().includes('standings'));
});

test('the overview title adapts to an upcoming event instead of claiming a winner', () => {
  const upcoming = tournamentTabTitle('overview', 'BMPS 2026', 'UPCOMING');
  const completed = tournamentTabTitle('overview', 'BMPS 2026', 'COMPLETED');
  assert.ok(!upcoming.toLowerCase().includes('winner'));
  assert.ok(completed.toLowerCase().includes('winner'));
});

/*
 * Names in this database reach 33 characters for teams, 10 for player IGNs and
 * 9 for event short names. Titles are tuned so a name at the upper end of the
 * *common* range fits Google's ~65-character display budget. A rare very long
 * team name overflows and truncates in the SERP — that costs the brand suffix
 * but not the ranking, so the tail stays informative rather than terse.
 */
const TYPICAL_TEAM_NAME = 'GodLike Esports';
const LONGEST_PLAYER_IGN = 'PAINisLIVE';

test('team and player tab titles fit the budget for a real name', () => {
  const teamTitles = [
    teamTabTitle('overview', TYPICAL_TEAM_NAME),
    ...TEAM_TAB_ROUTES.map((tab) => teamTabTitle(tab, TYPICAL_TEAM_NAME)),
  ];
  const playerTitles = [
    playerTabTitle('overview', LONGEST_PLAYER_IGN, 'BGMI'),
    ...PLAYER_TAB_ROUTES.map((tab) => playerTabTitle(tab, LONGEST_PLAYER_IGN, 'BGMI')),
  ];

  for (const title of [...teamTitles, ...playerTitles]) {
    assert.ok(title.length <= TITLE_BUDGET, `${title.length} chars: ${title}`);
  }
  assert.equal(new Set(teamTitles).size, teamTitles.length);
  assert.equal(new Set(playerTitles).size, playerTitles.length);
});

test('title tails are bounded, so only a long name can overflow the budget', () => {
  const tails = (titles: string[], name: string) =>
    titles.map((title) => title.slice(name.length).length);

  const maxTeamTail = Math.max(
    ...tails(
      [
        teamTabTitle('overview', TYPICAL_TEAM_NAME),
        ...TEAM_TAB_ROUTES.map((tab) => teamTabTitle(tab, TYPICAL_TEAM_NAME)),
      ],
      TYPICAL_TEAM_NAME
    )
  );
  const maxPlayerTail = Math.max(
    ...tails(
      [
        playerTabTitle('overview', LONGEST_PLAYER_IGN, 'BGMI'),
        ...PLAYER_TAB_ROUTES.map((tab) => playerTabTitle(tab, LONGEST_PLAYER_IGN, 'BGMI')),
      ],
      LONGEST_PLAYER_IGN
    )
  );

  // The design guarantee: a team name up to 24 characters and a player IGN up
  // to 15 both still fit the display budget once the tail is added.
  const teamNameBudget = 24;
  const playerIgnBudget = 15;
  assert.ok(
    maxTeamTail <= TITLE_BUDGET - teamNameBudget,
    `team tail grew to ${maxTeamTail}; a ${teamNameBudget}-char team name would no longer fit`
  );
  assert.ok(
    maxPlayerTail <= TITLE_BUDGET - playerIgnBudget,
    `player tail grew to ${maxPlayerTail}; a ${playerIgnBudget}-char IGN would no longer fit`
  );
});

test('player titles carry the game label when one is known', () => {
  assert.ok(playerTabTitle('overview', 'Jonathan', 'BGMI').includes('BGMI'));
  const withoutGame = playerTabTitle('overview', 'Jonathan', null);
  assert.ok(!withoutGame.includes('null'));
  assert.ok(withoutGame.includes('Jonathan'));
});
