import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { softDeleteExtension } from '@/lib/soft-delete';

// Fallback to load .env / .env.production when invoked from standalone scripts (outside Next.js)
if (!process.env.DATABASE_URL && typeof process !== 'undefined' && !process.env.NEXT_RUNTIME) {
  for (const file of ['.env.production', '.env.local', '.env']) {
    try {
      const p = path.resolve(/*turbopackIgnore: true*/ process.cwd(), file);
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const k = trimmed.slice(0, idx).trim();
            let v = trimmed.slice(idx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            if (!process.env[k]) process.env[k] = v;
          }
        }
      }
    } catch {}
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://postgres:${process.env.POSTGRES_PASSWORD || 'password123'}@localhost:${process.env.POSTGRES_PORT || '5433'}/esportsamaze?schema=public`;

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// One pool, reused across dev hot reloads. The extension below is a thin wrapper
// over this client, so rebuilding it costs nothing.
const base = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base;

/**
 * The client every read path should use: hides trashed tournaments, teams,
 * players and matches automatically (see lib/soft-delete.ts).
 *
 * Cast back to `PrismaClient` on purpose. Prisma types an extended client with
 * its own model delegates, which stop being assignable to `Prisma.TransactionClient`
 * — and helpers all over this codebase take a `tx`. Keeping the base type means
 * every existing call site (and `$transaction(async (tx) => …)`) still type-checks,
 * while the runtime filter is unchanged.
 */
export const prisma = base.$extends(softDeleteExtension) as unknown as PrismaClient;

/**
 * The raw client — sees trashed rows too. Only the trash/restore/purge layer, the
 * media-usage reference counter and the data-dump/repair scripts should use this.
 */
export const prismaUnfiltered = base;

export default prisma;
