/*
 * One-line, data-derived lead for entity tab pages.
 *
 * Every tab of a team or player profile rendered the same masthead above a
 * different table, so Search Console treated them as near-duplicates and left
 * them "Crawled – currently not indexed". A factual sentence built from that
 * page's own numbers gives each tab something unique to index without inventing
 * anything.
 *
 * Every builder returns null when there is nothing real to say, so a thin page
 * is left bare rather than padded with boilerplate. All builders are pure.
 */

const num = (value: number): string => Math.round(value).toLocaleString('en-IN');

const plural = (count: number, one: string, many = `${one}s`): string =>
  count === 1 ? one : many;

export function teamStatsIntro(input: {
  name: string;
  matches: number;
  wins: number;
  topFive: number;
  events: number;
}): string | null {
  if (input.matches <= 0) return null;
  const events =
    input.events > 0 ? ` across ${num(input.events)} ${plural(input.events, 'event')}` : '';
  return `${input.name} have played ${num(input.matches)} recorded ${plural(
    input.matches,
    'match',
    'matches'
  )}${events}, winning ${num(input.wins)} and finishing in the top five ${num(
    input.topFive
  )} times.`;
}

export function teamTitlesIntro(input: {
  name: string;
  titles: number;
  runnerUps: number;
  awards: number;
}): string | null {
  const { name, titles, runnerUps, awards } = input;
  if (titles <= 0 && runnerUps <= 0 && awards <= 0) return null;

  const parts: string[] = [];
  if (titles > 0) parts.push(`${num(titles)} ${plural(titles, 'title')}`);
  if (runnerUps > 0)
    parts.push(`${num(runnerUps)} runner-up ${plural(runnerUps, 'finish', 'finishes')}`);
  if (awards > 0) parts.push(`${num(awards)} individual ${plural(awards, 'award')}`);

  return `${name} have ${parts.join(', ')} on record.`;
}

export function teamRosterIntro(input: {
  name: string;
  players: number;
  staff: number;
  events: number;
}): string | null {
  const { name, players, staff } = input;
  if (players <= 0 && staff <= 0) return null;

  const people: string[] = [];
  if (players > 0) people.push(`${num(players)} ${plural(players, 'player')}`);
  if (staff > 0) people.push(`${num(staff)} support ${plural(staff, 'member')}`);
  const events =
    input.events > 0
      ? ` across ${num(input.events)} recorded ${plural(input.events, 'event')}`
      : '';

  return `${people.join(' and ')} are on ${name}'s books${events}.`;
}

export function playerStatsIntro(input: {
  ign: string;
  matches: number;
  elims: number;
  events: number;
}): string | null {
  if (input.matches <= 0) return null;
  const events =
    input.events > 0 ? ` across ${num(input.events)} ${plural(input.events, 'event')}` : '';
  return `${input.ign} has ${num(input.matches)} recorded ${plural(
    input.matches,
    'match',
    'matches'
  )}${events}, with ${num(input.elims)} eliminations.`;
}

export function playerResultsIntro(input: {
  ign: string;
  events: number;
  reported: number;
}): string | null {
  if (input.events <= 0) return null;
  const source =
    input.reported > 0
      ? `, ${num(input.reported)} of them from reported totals rather than match scorecards`
      : '';
  return `${input.ign}'s recorded event history covers ${num(input.events)} ${plural(
    input.events,
    'event'
  )}${source}.`;
}

export function playerHonoursIntro(input: {
  ign: string;
  entries: number;
  events: number;
}): string | null {
  if (input.entries <= 0) return null;
  const events =
    input.events > 0 ? ` across ${num(input.events)} ${plural(input.events, 'event')}` : '';
  return `${input.ign} has ${num(input.entries)} recorded ${plural(
    input.entries,
    'prize or award',
    'prizes and awards'
  )}${events}.`;
}
