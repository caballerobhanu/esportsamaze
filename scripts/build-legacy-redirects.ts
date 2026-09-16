/*
 * Generates the esportsamaze.in → esportsamaze.com redirect rules.
 *
 * The old domain is a MediaWiki whose data-shaped pages mirror this database, so
 * the rules are derived from the rows we actually have rather than hand-written.
 * A rule is emitted only where a real entity exists; everything else falls
 * through to a hub (never a blanket homepage hop where a better hub exists).
 *
 * Usage:
 *   npx tsx scripts/build-legacy-redirects.ts [--out <dir>] [--format htaccess|csv]
 *
 * The default output is .htaccess, installed into the esportsamaze.in document
 * root through Hostinger's File Manager. That is deliberately the cheap path:
 * no DNS move, no certificate, no VPS involvement, and deleting one file undoes
 * the whole thing.
 *
 * Caveat worth remembering: the redirect lives on the Hostinger hosting, so that
 * subscription (and the .in TLS certificate) has to stay active. If it is ever
 * cancelled, move this to Cloudflare edge redirects first — the CSV output is
 * shaped for exactly that.
 */
import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

const LEGACY_HOST = 'esportsamaze\\.in';
const LEGACY_HOSTS = 'esportsamaze.in www.esportsamaze.in';
const TARGET_ORIGIN = 'https://esportsamaze.com';

interface Rule {
  /** Legacy path, as a regular expression fragment. */
  pattern: string;
  /** Path on esportsamaze.com. */
  target: string;
}

/**
 * Wiki page titles that do NOT match the database name for the same event.
 *
 * The wiki was authored by hand and dropped "India" from this event's title, so
 * a name-derived rule alone misses the exact page that carried the traffic.
 * Kept as an explicit list rather than fuzzy matching, because a fuzzy match
 * would happily point an event at the wrong slug. Each entry is validated
 * against the database, so a stale alias reports itself instead of emitting a
 * rule to a page that does not exist.
 */
const LEGACY_TITLE_ALIASES: Array<{ wikiTitle: string; slug: string }> = [
  {
    wikiTitle: 'Battlegrounds_Mobile_Pro_Series_2026',
    slug: 'battlegrounds-mobile-india-pro-series-2026',
  },
];

/** MediaWiki titles use underscores for spaces. */
function wikiTitle(name: string): string {
  return name.trim().replace(/\s+/g, '_');
}

/** Escape everything a wiki title could legally contain that means something in a regex. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** MediaWiki treats the first character of a title case-insensitively. */
function wikiVariants(title: string): string[] {
  const lowerFirst = title.charAt(0).toLowerCase() + title.slice(1);
  return lowerFirst === title ? [title] : [title, lowerFirst];
}

function main() {
  const outArg = process.argv.indexOf('--out');
  const outDir = path.resolve(
    process.cwd(),
    outArg > -1 ? process.argv[outArg + 1] : 'deploy/redirects'
  );
  const formatArg = process.argv.indexOf('--format');
  const format = formatArg > -1 ? process.argv[formatArg + 1] : 'htaccess';

  Promise.all([
    prisma.tournament.findMany({ select: { slug: true, name: true, shortName: true } }),
    prisma.team.findMany({
      where: { slug: { not: null } },
      select: { slug: true, name: true, tag: true },
    }),
    prisma.player.findMany({
      where: { slug: { not: null } },
      select: { slug: true, ign: true },
    }),
  ])
    .then(([tournaments, teams, players]) => {
      // Static legacy hubs. Verified against the live wiki.
      const staticRules: Rule[] = [
        { pattern: '^Main_Page/?$', target: '/' },
        { pattern: '^BGMI/Krafton_Rankings/?$', target: '/rankings' },
      ];

      // Events: /BGMI/Tournaments/<Official Name>
      const tournamentRules: Rule[] = [];
      const slugs = new Set(tournaments.map((tournament) => tournament.slug));
      for (const tournament of tournaments) {
        const titles = new Set(
          [tournament.name, tournament.shortName].filter(Boolean) as string[]
        );
        for (const title of titles) {
          tournamentRules.push({
            pattern: `^BGMI/Tournaments/${escapeRegex(wikiTitle(title))}/?$`,
            target: `/tournaments/${tournament.slug}`,
          });
        }
      }

      // Wiki titles that differ from the database name for the same event.
      for (const alias of LEGACY_TITLE_ALIASES) {
        if (!slugs.has(alias.slug)) {
          console.warn(
            `⚠ Alias "${alias.wikiTitle}" points at slug "${alias.slug}", which is not in the database. ` +
              'Skipped — fix the alias or the event will fall through to a hub.'
          );
          continue;
        }
        tournamentRules.push({
          pattern: `^BGMI/Tournaments/${escapeRegex(alias.wikiTitle)}/?$`,
          target: `/tournaments/${alias.slug}`,
        });
      }

      // Every entity page, both first-letter spellings — this is the long tail
      // that the hubs below also cover. Used by the CSV only: a thousand rules
      // in .htaccess is needless weight when the hub answers the same intent.
      const entityRules: Rule[] = [];
      for (const team of teams) {
        if (!team.slug) continue;
        for (const title of new Set([team.name, team.tag].filter(Boolean) as string[])) {
          for (const variant of wikiVariants(wikiTitle(title))) {
            entityRules.push({
              pattern: `^${escapeRegex(variant)}$`,
              target: `/teams/${team.slug}`,
            });
          }
        }
      }
      for (const player of players) {
        if (!player.slug) continue;
        for (const variant of wikiVariants(wikiTitle(player.ign))) {
          entityRules.push({
            pattern: `^BGMI/Players/${escapeRegex(variant)}$`,
            target: `/players/${player.slug}`,
          });
        }
      }

      fs.mkdirSync(outDir, { recursive: true });

      if (format === 'csv') {
        const csvFile = path.join(outDir, 'esportsamaze-in.csv');
        fs.writeFileSync(
          csvFile,
          renderCsv([...staticRules, ...tournamentRules, ...entityRules]),
          'utf8'
        );
        console.log(`Wrote ${staticRules.length + tournamentRules.length + entityRules.length} rules`);
        console.log(`  ${path.relative(process.cwd(), csvFile)}`);
      } else {
        const file = path.join(outDir, '.htaccess');
        fs.writeFileSync(file, renderHtaccess(staticRules, tournamentRules), 'utf8');
        console.log(
          `Wrote ${staticRules.length + tournamentRules.length + 4} rules ` +
            `(${tournamentRules.length} event pages, the rest hubs)`
        );
        console.log(`  ${path.relative(process.cwd(), file)}`);
      }
    })
    .catch((error) => {
      console.error('Failed to build legacy redirects:', error);
      process.exitCode = 1;
    })
    .finally(() => process.exit(process.exitCode ?? 0));
}

/**
 * The wiki's own configuration, preserved verbatim.
 *
 * It MUST stay below the redirects: its final catch-all rewrites every path to
 * index.php, so above them it would swallow the whole redirect set. It is kept
 * because analytics.esportsamaze.in shares this document root and depends on
 * its own bypass rule, and because leaving it intact is what makes this file
 * reversible — restoring the original is deleting everything above this block.
 *
 * Copied from the document root, not derived from anything here.
 */
const PRESERVED_WIKI_RULES = `# 0. SUBDOMAIN BYPASS (Let Matomo work without MediaWiki interfering)
RewriteCond %{HTTP_HOST} ^analytics\\.esportsamaze\\.in$ [NC]
RewriteRule ^ - [L]

# 1. ROOT TRIGGER (Forces "esportsamaze.in" to load the Wiki)
RewriteRule ^$ index.php?title=Main_Page [L,QSA]

# 2. FILE PROTECTION (Don't break images/css/actual directories)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# 3. CLEAN URLS (Handles everything else)
RewriteRule ^(.*)$ index.php?title=$1 [PT,L,QSA]`;

/**
 * The redirect rules, plus the wiki's configuration preserved underneath them.
 *
 * Every generated rule is host-scoped and the pattern is anchored, which is what
 * keeps the sibling subdomains (forum., analytics.) out of it.
 */
function renderHtaccess(staticRules: Rule[], tournamentRules: Rule[]): string {
  const hostGuard = `RewriteCond %{HTTP_HOST} ^(www\\.)?${LEGACY_HOST}$ [NC]`;

  const exact = [...staticRules, ...tournamentRules]
    .map((rule) => `${hostGuard}\nRewriteRule ${rule.pattern} ${TARGET_ORIGIN}${rule.target} [R=301,L]`)
    .join('\n\n');

  return `# Redirects esportsamaze.in to esportsamaze.com, then keeps the wiki's own
# configuration underneath so the sibling subdomains carry on working.
#
# GENERATED by scripts/build-legacy-redirects.ts — regenerate rather than edit by
# hand, so the event rules keep matching what is actually in the database:
#   npx tsx scripts/build-legacy-redirects.ts
#
# Install: upload this file into the esportsamaze.in document root (hPanel →
# File Manager), keeping the name .htaccess. Keep a copy of the original first —
# everything above the "preserved" marker is the only part that changed.
#
# Three things to know once it is live:
#   1. Every rule is host-scoped and anchored, so forum.esportsamaze.in and
#      analytics.esportsamaze.in are untouched. Check both after installing.
#   2. Order matters: the wiki's catch-all sits below these rules on purpose.
#      Reordering them would stop the redirects working entirely.
#   3. The redirect lives here, so this hosting plan and the .in certificate must
#      stay active. If the plan is ever cancelled, move these rules to Cloudflare
#      edge redirects first (npx tsx scripts/build-legacy-redirects.ts --format csv).

<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /

# ── esportsamaze.in → esportsamaze.com ──────────────────────────────────────

${exact}

# ── Long-tail sections ─────────────────────────────────────────────────────
# The hub is the right destination for the sections that never earned traffic of
# their own, and it keeps this file readable instead of ~1200 rules.
${hostGuard}
RewriteRule ^BGMI/Players(/.*)?$ ${TARGET_ORIGIN}/players [R=301,L]

${hostGuard}
RewriteRule ^BGMI/Teams(/.*)?$ ${TARGET_ORIGIN}/teams [R=301,L]

${hostGuard}
RewriteRule ^BGMI/Tournaments(/.*)?$ ${TARGET_ORIGIN}/tournaments [R=301,L]

${hostGuard}
RewriteRule ^BGMI(/.*)?$ ${TARGET_ORIGIN}/tournaments [R=301,L]

# Everything else, including the old front page. A permanent redirect beats a
# 404, even though a many-to-one redirect passes little ranking signal.
${hostGuard}
RewriteRule ^.*$ ${TARGET_ORIGIN}/ [R=301,L]

# ── Preserved: the wiki's own configuration, unchanged ──────────────────────
# Must remain below the redirects — see the note above.

${PRESERVED_WIKI_RULES}

</IfModule>
`;
}

function renderCsv(rules: Rule[]): string {
  const rows = rules.map(
    (rule) =>
      `${LEGACY_HOSTS.split(' ')[0]}${regexToPath(rule.pattern)},${TARGET_ORIGIN}${rule.target},301`
  );
  return `source,target,status\n${rows.join('\n')}\n`;
}

/** Turns a generated pattern back into a concrete path for the CSV export. */
function regexToPath(pattern: string): string {
  return pattern
    .replace(/^\^/, '')
    .replace(/\?\$$/, '')
    .replace(/\$$/, '')
    .replace(/\\(.)/g, '$1');
}

main();
