import { defineConfig, env } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
    // Optional: only needed for local `migrate dev` / `migrate diff` runs.
    // Plain process.env (not env()) so every other command works without it.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
