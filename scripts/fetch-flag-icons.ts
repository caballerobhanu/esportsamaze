import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Vendors the Flag Icons 1x1 set for every country the site is able to render.
 *
 * Flags are committed into `public/flags/1x1` instead of installed as a package so the public
 * site serves them from its own origin (`img-src 'self'` in the CSP) with no postinstall step
 * and no runtime dependency. Re-run this after adding a country to COUNTRIES.
 *
 * The 1x1 format is square by design, which is what lets a flag fill the same square chip a
 * team crest uses. It is hand-tuned per flag rather than a blanket squash: striped flags are
 * stretched to the square, while flags carrying a round emblem are scaled uniformly and
 * cropped so circles stay circular.
 */
const FLAG_ICONS_TAG = 'v7.5.0';
const TARGET_DIR = join(process.cwd(), 'public', 'flags', '1x1');
const COUNTRIES_FILE = join(process.cwd(), 'lib', 'countries.ts');
const CONCURRENCY = 8;

/** Two-letter codes only, which is what skips COUNTRIES' `GLOBAL` grouping entry. */
async function codesToFetch(): Promise<string[]> {
  const source = await readFile(COUNTRIES_FILE, 'utf8');
  const codes = [...source.matchAll(/code:\s*'([A-Z]{2})'/g)].map((match) => match[1]);
  return [...new Set(codes)].sort();
}

async function fetchFlag(code: string): Promise<number> {
  const name = `${code.toLowerCase()}.svg`;
  const url = `https://raw.githubusercontent.com/lipis/flag-icons/${FLAG_ICONS_TAG}/flags/1x1/${name}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${code}: ${response.status} ${response.statusText} — ${url}`);
  }
  const svg = await response.text();
  await writeFile(join(TARGET_DIR, name), svg, 'utf8');
  return Buffer.byteLength(svg, 'utf8');
}

async function main() {
  const codes = await codesToFetch();

  console.log('🏳️  Flag Icons vendor — 1x1 set');
  console.log('==============================');
  console.log(`📦 ${codes.length} country code(s) in lib/countries.ts → public/flags/1x1`);
  console.log('------------------------------');

  await mkdir(TARGET_DIR, { recursive: true });

  let written = 0;
  let bytes = 0;

  for (let index = 0; index < codes.length; index += CONCURRENCY) {
    const chunk = codes.slice(index, index + CONCURRENCY);
    const sizes = await Promise.all(chunk.map(fetchFlag));
    bytes += sizes.reduce((total, size) => total + size, 0);
    written += chunk.length;
    console.log(`[${written}/${codes.length}] ${chunk.join(' ')}`);
  }

  console.log('==============================');
  console.log(`🎉 Wrote ${written} SVG(s), ${(bytes / 1024).toFixed(1)} KB total.`);
  console.log(`👉 Flag Icons ${FLAG_ICONS_TAG} (MIT) — commit public/flags/1x1 with the change.`);
}

main().catch((error) => {
  console.error('Fatal error vendoring flags:', error);
  process.exit(1);
});
