import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/**
 * Saves an uploaded image from a server-action FormData entry into /uploads
 * and returns the public URL (`/api/media/<file>`).
 * Returns null when no file was selected or the file is not a valid image.
 */
export async function saveUploadedFile(
  value: FormDataEntryValue | null,
  prefix: string
): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const ext = EXT_BY_MIME[value.type];
  if (!ext || value.size > MAX_SIZE) return null;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await value.arrayBuffer()));
  return `/api/media/${name}`;
}
