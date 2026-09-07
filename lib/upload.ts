import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export const ALLOWED_IMAGE_MIMES = Object.keys(EXT_BY_MIME).join(',');

/**
 * Validates file buffer magic bytes to ensure the content matches its claimed image type.
 */
function isValidImageBuffer(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;

  switch (ext) {
    case 'png':
      // PNG magic number: 89 50 4E 47 (0x89 'PNG')
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );

    case 'jpg':
    case 'jpeg':
      // JPEG magic number: FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case 'gif':
      // GIF magic number: GIF87a or GIF89a
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );

    case 'webp':
      // WebP magic: 'RIFF' .... 'WEBP'
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );

    case 'svg': {
      // SVG validation: must contain <svg and no executable scripts, event handlers, XXE, or embed tags
      const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 131072)).toLowerCase();
      if (!text.includes('<svg') && !text.includes('<?xml')) return false;

      // 1. XXE / Entity injection prevention
      if (text.includes('<!entity') || text.includes('<!doctype') || text.includes('system "') || text.includes("system '")) {
        return false;
      }

      // 2. Dangerous tags (script, foreignObject, iframe, embed, object, etc.)
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

      // 3. Dangerous URI schemes and base64 html payloads
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

      // 4. Any event handler (onload=, onerror=, onclick=, etc.)
      if (/\bon[a-z0-9_-]+\s*=/i.test(text)) {
        return false;
      }

      // 5. SVG animation script injection
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
 * Saves an uploaded image from a server-action FormData entry into /uploads
 * and returns the public URL (`/api/media/<file>`).
 * Returns null when no file was selected, file size exceeds limit, or magic bytes are invalid.
 */
export async function saveUploadedFile(
  value: FormDataEntryValue | null,
  prefix: string
): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const ext = EXT_BY_MIME[value.type];
  if (!ext || value.size > MAX_SIZE) return null;

  const buffer = Buffer.from(await value.arrayBuffer());
  if (!isValidImageBuffer(buffer, ext)) {
    return null;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const safePrefix = (prefix || 'upload').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'upload';
  const name = `${safePrefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buffer);

  // Register in the media library so uploads can be browsed/reused from the admin.
  await prisma.mediaAsset
    .upsert({
      where: { filename: name },
      create: {
        filename: name,
        originalName: value.name || null,
        mimeType: value.type,
        size: value.size,
      },
      update: {},
    })
    .catch(() => undefined);

  return `/api/media/${name}`;
}
