/**
 * Repairs `Match.scheduledAt` so it agrees with the match's own `matchTime`.
 *
 * The bulk importer used to read a colon-less time ("1600") only when it had a
 * colon, so a spreadsheet paste stored the parser's fallback slot (17:30 IST) for
 * every such row. The page looked right because the panels render the `matchTime`
 * TEXT ("16:00 IST"), while the timestamp behind the ordering, the day grouping
 * and the schedule calendar sat at 17:30 — which is how 150 BGMS matches came to
 * share one time.
 *
 * This rebuilds the instant from the match's OWN date and time: the wall-clock
 * date is read in the match's stated timezone, then combined with the parsed time
 * and converted back to UTC. It uses the same parser and the same offset table as
 * the importer (`lib/match-time.ts`), so the two cannot disagree.
 *
 * A match whose `matchTime` carries no readable time is left alone — this script
 * corrects a time of day, it does not invent one. Re-running it after it has run
 * changes nothing.
 *
 * Dry run — prints every difference and writes nothing:
 *   npx tsx scripts/repair-match-times.ts
 * Apply:
 *   npx tsx scripts/repair-match-times.ts --apply
 */
import prisma from '../lib/prisma';
import { parseTimeTo24h, timezoneCodeFromMatchTime, timezoneOffsetMinutes } from '../lib/match-time';

interface PendingChange {
  id: string;
  slug: string;
  matchNumber: number;
  overallMatchNumber: number | null;
  day: string;
  from: string;
  to: string;
  desired: Date;
}

const wallClock = (instant: Date, offsetMinutes: number) =>
  new Date(instant.getTime() + offsetMinutes * 60 * 1000);

const hhmm = (date: Date) =>
  `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;

const dayLabel = (date: Date) =>
  `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;

/** The instant a match's own date + time actually means, in its stated timezone. */
function scheduledAtFromMatchTime(scheduledAt: Date, matchTime: string): Date | null {
  const parsed = parseTimeTo24h(matchTime);
  if (!parsed) return null;

  const offset = timezoneOffsetMinutes(timezoneCodeFromMatchTime(matchTime));
  const wall = wallClock(scheduledAt, offset);

  return new Date(
    Date.UTC(
      wall.getUTCFullYear(),
      wall.getUTCMonth(),
      wall.getUTCDate(),
      Number(parsed.slice(0, 2)),
      Number(parsed.slice(3, 5))
    ) -
      offset * 60 * 1000
  );
}

async function main() {
  const apply = process.argv.includes('--apply');

  const matches = await prisma.match.findMany({
    where: { matchTime: { not: null } },
    select: {
      id: true,
      matchNumber: true,
      overallMatchNumber: true,
      matchTime: true,
      scheduledAt: true,
      tournament: { select: { slug: true } },
    },
    orderBy: [{ scheduledAt: 'asc' }, { matchNumber: 'asc' }],
  });

  const changes: PendingChange[] = [];
  let unreadable = 0;
  let alreadyCorrect = 0;

  for (const m of matches) {
    const raw = (m.matchTime || '').trim();
    const desired = scheduledAtFromMatchTime(m.scheduledAt, raw);
    if (!desired) {
      unreadable += 1;
      continue;
    }
    if (desired.getTime() === m.scheduledAt.getTime()) {
      alreadyCorrect += 1;
      continue;
    }

    const offset = timezoneOffsetMinutes(timezoneCodeFromMatchTime(raw));
    changes.push({
      id: m.id,
      slug: m.tournament?.slug || '(none)',
      matchNumber: m.matchNumber,
      overallMatchNumber: m.overallMatchNumber,
      day: dayLabel(wallClock(m.scheduledAt, offset)),
      from: hhmm(wallClock(m.scheduledAt, offset)),
      to: hhmm(wallClock(desired, offset)),
      desired,
    });
  }

  console.log(`matches with a matchTime: ${matches.length}`);
  console.log(`already correct: ${alreadyCorrect}`);
  console.log(`matchTime with no readable time (left alone): ${unreadable}`);
  console.log(`to correct: ${changes.length}\n`);

  for (const c of changes) {
    console.log(
      `${c.slug} #${c.matchNumber} O#${c.overallMatchNumber ?? '-'} | ${c.day} | ${c.from} -> ${c.to}`
    );
  }

  if (changes.length === 0) {
    console.log('\nNothing to do.');
    return;
  }

  if (!apply) {
    console.log(`\nDry run — nothing written. Re-run with --apply to correct ${changes.length} row(s).`);
    return;
  }

  await prisma.$transaction(
    changes.map((c) =>
      prisma.match.update({ where: { id: c.id }, data: { scheduledAt: c.desired } })
    )
  );
  console.log(`\nCorrected ${changes.length} row(s).`);
}

main().finally(() => prisma.$disconnect());
