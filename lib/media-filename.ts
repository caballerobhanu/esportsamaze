/**
 * Names a stored media file.
 *
 * The generated name is what editors search the library by and what appears in the public
 * URL, so it is built from the name they uploaded rather than being an opaque timestamp.
 * The trailing content hash is what makes the immutable Cache-Control on these URLs
 * correct: identical bytes always produce the identical name, and different bytes can
 * never reuse one.
 */

/** Upload names that carry no information — the field prefix says more. */
const GENERIC_STEMS = new Set([
  'image',
  'img',
  'photo',
  'picture',
  'pic',
  'screenshot',
  'screen-shot',
  'untitled',
  'download',
  'file',
  'asset',
  'media',
  'temp',
  'tmp',
  'new',
  'logo',
  'icon',
  'banner',
  'avatar',
  'cover',
  'default',
]);

const MAX_SLUG_LENGTH = 40;
const HASH_LENGTH = 12;
const MIN_SLUG_LENGTH = 3;

/** "SOUL Esports Logo.png" -> "soul-esports-logo". Returns '' when nothing survives. */
function slugifyStem(originalName: string): string {
  return (
    originalName
      .replace(/\.[a-z0-9]{1,5}$/i, '')
      .normalize('NFKD')
      // Drop the accent marks NFKD just separated out. Without this they would be treated
      // as separators, turning "Münster" into "mu-nster".
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_SLUG_LENGTH)
      .replace(/-+$/, '')
      .toLowerCase()
  );
}

/**
 * e.g. mediaFilename('team-logo', 'SOUL Esports.png', 'webp', hash)
 *        -> 'team-logo-soul-esports-a1b2c3d4e5f6.webp'
 *      mediaFilename('team-logo', 'image.png', 'webp', hash)
 *        -> 'team-logo-a1b2c3d4e5f6.webp'
 */
export function mediaFilename(
  prefix: string,
  originalName: string | null | undefined,
  ext: string,
  contentHash: string
): string {
  const safePrefix = (prefix || 'upload').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'upload';

  const slug = slugifyStem(originalName ?? '');
  const stem = slug.length >= MIN_SLUG_LENGTH && !GENERIC_STEMS.has(slug) ? `${safePrefix}-${slug}` : safePrefix;

  return `${stem}-${contentHash.slice(0, HASH_LENGTH)}.${ext}`;
}
