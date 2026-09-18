// UNSET in production, on purpose — so publicUrlForFilename() falls through to the
// root-relative /api/media/<filename>. That keeps every stored media URL same-origin,
// which is also why `next/image` needs no remotePatterns entry for our own media.
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

/** URL served by this app's own media route, which reads local disk first, then R2. */
export function proxyUrlForFilename(filename: string): string {
  return `/api/media/${filename}`;
}

/**
 * The canonical public URL for a stored media file. Absolute R2/custom-domain URL
 * when one is configured, otherwise the app's own proxy route.
 *
 * Every surface that turns a filename into a URL (storeMedia, the media library API,
 * the media admin page) must go through this, so the same file never ends up stored
 * under two different strings.
 */
export function publicUrlForFilename(filename: string): string {
  const baseUrl = R2_PUBLIC_URL?.replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}/${filename}` : proxyUrlForFilename(filename);
}
