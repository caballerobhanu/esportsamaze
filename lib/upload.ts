import crypto from 'crypto';
import sharp from 'sharp';
import prisma from '@/lib/prisma';
import { storeMedia } from '@/lib/media-storage';
import { publicUrlForFilename } from '@/lib/media-url';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB raw upload ceiling

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
};

export const ALLOWED_IMAGE_MIMES = Object.keys(EXT_BY_MIME).join(',');

/**
 * Validates file buffer magic bytes to ensure the content matches its claimed image type.
 */
function isValidImageBuffer(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;

  switch (ext) {
    case 'ico':
      return (
        buffer[0] === 0x00 &&
        buffer[1] === 0x00 &&
        buffer[2] === 0x01 &&
        buffer[3] === 0x00
      );

    case 'png':
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );

    case 'jpg':
    case 'jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case 'gif':
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );

    case 'webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );

    case 'svg': {
      const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 131072)).toLowerCase();
      if (!text.includes('<svg') && !text.includes('<?xml')) return false;

      if (text.includes('<!entity') || text.includes('<!doctype') || text.includes('system "') || text.includes("system '")) {
        return false;
      }

      const dangerousTags = [
        '<script',
        '<foreignobject',
        '<iframe',
        '<embed',
        '<object',
        '<applet',
        '<meta',
        '<link',
        '<base',
      ];
      if (dangerousTags.some((tag) => text.includes(tag))) {
        return false;
      }

      const dangerousSchemes = [
        'javascript:',
        'vbscript:',
        'data:text/html',
        'data:text/xml',
        'data:image/svg+xml',
      ];
      if (dangerousSchemes.some((scheme) => text.includes(scheme))) {
        return false;
      }

      if (/\bon[a-z0-9_-]+\s*=/i.test(text)) {
        return false;
      }

      if (/<(animate|set)\b[^>]*\b(to|from|values)\s*=\s*["'][^"']*javascript:/i.test(text)) {
        return false;
      }

      return true;
    }

    default:
      return false;
  }
}

/**
 * Optimizes an image buffer into WebP with dimension limits and strips EXIF metadata.
 * SVGs are preserved as vector.
 */
async function optimizeImage(
  buffer: Buffer,
  ext: string,
  prefix: string
): Promise<{ buffer: Buffer; finalExt: string; mimeType: string }> {
  // SVGs and ICOs are preserved as-is
  if (ext === 'svg') {
    return { buffer, finalExt: 'svg', mimeType: 'image/svg+xml' };
  }
  if (ext === 'ico') {
    return { buffer, finalExt: 'ico', mimeType: 'image/x-icon' };
  }

  const p = prefix.toLowerCase();
  let maxWidth = 1200;
  let maxHeight = 1200;
  let quality = 85;

  if (p.includes('logo') || p.includes('avatar') || p.includes('badge') || p.includes('icon')) {
    maxWidth = 512;
    maxHeight = 512;
    quality = 85;
  } else if (p.includes('banner') || p.includes('news') || p.includes('cover') || p.includes('hero')) {
    maxWidth = 1920;
    maxHeight = 1080;
    quality = 82;
  }

  const optimized = await sharp(buffer)
    .rotate() // Automatically orient phone pictures from EXIF
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();

  return {
    buffer: optimized,
    finalExt: 'webp',
    mimeType: 'image/webp',
  };
}

/**
 * Saves an uploaded image:
 * 1. Validates magic bytes & security
 * 2. Compresses & converts to WebP with sharp (reducing size by up to 90%)
 * 3. Returns the existing asset when identical bytes are already in the library
 * 4. Registers the file in the media library
 * 5. Uploads to Cloudflare R2 (or local /uploads fallback)
 */
export async function saveUploadedFile(
  value: FormDataEntryValue | null,
  prefix: string,
  alt?: string | null
): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const ext = EXT_BY_MIME[value.type];
  if (!ext || value.size > MAX_SIZE) return null;

  const rawBuffer = Buffer.from(await value.arrayBuffer());
  if (!isValidImageBuffer(rawBuffer, ext)) {
    return null;
  }

  try {
    const { buffer, finalExt, mimeType } = await optimizeImage(rawBuffer, ext, prefix);

    // Hash the bytes we would actually store, so re-uploading an image that is already
    // served from R2 resolves to the existing asset rather than creating a duplicate.
    // The prefix picks the resize (logo/avatar/badge/icon -> 512², banner/news/cover/hero
    // -> 1920x1080, else 1200²), so the same source under two prefixes is genuinely two
    // different files and will not dedupe — that is intended.
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Claim the hash atomically. The entity forms upload their light and dark logos with
    // Promise.all, so two identical images land here concurrently — without the lock both
    // checks below miss and both write a row and an object, which is precisely the
    // duplicate this is meant to prevent.
    let claim: { existingFilename: string } | { newFilename: string };
    try {
      claim = await prisma.$transaction(async (tx) => {
        // $executeRaw, not $queryRaw: the lock function returns void, which Prisma cannot
        // deserialize into a column value.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${contentHash}))`;

        const existing = await tx.mediaAsset.findFirst({
          where: { contentHash },
          select: { filename: true },
        });
        if (existing) return { existingFilename: existing.filename };

        const safePrefix = (prefix || 'upload').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'upload';
        const filename = `${safePrefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${finalExt}`;

        // Claimed before storing, so a failure here cannot leave an object in the bucket
        // that no row points at.
        await tx.mediaAsset.create({
          data: {
            filename,
            contentHash,
            originalName: value.name || null,
            mimeType,
            size: buffer.length,
            alt: alt || null,
          },
        });

        return { newFilename: filename };
      });
    } catch (err) {
      console.error('Failed to register media asset:', err);
      return null;
    }

    // Another upload of the same bytes won the race — reuse its asset and store nothing.
    if ('existingFilename' in claim) return publicUrlForFilename(claim.existingFilename);

    try {
      return await storeMedia(claim.newFilename, buffer, mimeType);
    } catch (err) {
      await prisma.mediaAsset.delete({ where: { filename: claim.newFilename } }).catch(() => undefined);
      console.error('Failed to store media:', err);
      return null;
    }
  } catch (err) {
    console.error('Image optimization or save failed:', err);
    return null;
  }
}
