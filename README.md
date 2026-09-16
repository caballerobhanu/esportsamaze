# Esports Amaze

High-performance esports statistics platform — tournament database, KRAFTON rankings,
match scorecards, and rosters, focused on BGMI/Battle Royale esports. Built with a
mobile-first editorial design system (70% of the audience is on mobile).

## Stack

- **Next.js 16** (App Router, server actions, `proxy.ts` auth gate) · React 19
- **Prisma 7** + PostgreSQL (via `@prisma/adapter-pg`)
- **Tailwind CSS 4** with a single token system (`--ed-*` in `app/globals.css`, reference in `docs/design-dropbox.md`)
- Tests on the built-in Node test runner (`node:test`) executed through `tsx`

## Getting started

```bash
docker compose up -d          # Postgres 16 on localhost:5433
npm install
cp .env .env.local            # or create .env with the vars below
npx prisma generate
npm run db:seed               # restores the newest snapshot in prisma/backups/
npm run dev                   # http://localhost:3000
```

### Environment (`.env`, gitignored)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `ADMIN_PASSWORD` | Admin login password (required — no default in production) |
| `ADMIN_SESSION_SECRET` | Session-token secret; rotating it logs out all admins |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin used by sitemap/robots (defaults to localhost:3000) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (rankings math, standings math) |
| `npm run db:backup` | Dump the live DB to `prisma/backups/db-snapshot-<ts>.json` |
| `npm run db:seed` | **Restore** (not demo data): replays the newest snapshot exactly |

## Architecture notes

- **Admin panel** (`/admin`) is a session-gated CRUD suite. Auth lives in `lib/admin-auth.ts`
  (timing-safe password compare, per-IP login rate limit, derived session cookie) and is
  enforced twice: `proxy.ts` rejects unauthenticated `/admin/*` requests *before render*
  (a layout-level redirect alone leaks the page's RSC payload), and every server action
  re-checks `isAdmin()` fail-closed.
- **Rankings** (`lib/krafton-rankings.ts`) port the rolling decayed-points system; transfer
  rules are DB-owned (`RankingTransferRule`) and managed in the admin Rankings panel.
- **Player rosters** come from event participation. `Player.currentTeamId` is a stored roster
  slot set by event/scorecard imports and admin edits; `currentTeamSince` gates older events
  so a back-dated import (BGIS in January) cannot move a player back. The **Transfer ledger is
  admin-only history** — imports never write it — and its only derived value is each row's
  origin (`lib/player-transfer-rule.ts`). A profile's career history is built from event
  rosters (`lib/player-career.ts`), and player identity is matched by id, never by name.
  `scripts/migrate-transfer-model.ts` applied the one-off move to this model.
- **Standings/stats** math is shared: `lib/tournament-math.ts` (pure functions, unit-tested)
  and `lib/match-standings.ts` (DB aggregation) share the same tie-break comparators.
- **Uploads** are written to `uploads/` and served by `/api/media/[filename]` (SVGs are
  force-downloaded with a sandboxing CSP). Note: local-disk uploads need replacing with
  object storage (S3 etc.) before deploying to serverless platforms.
- Public pages live under `app/(public)/` (shared Navbar/Footer layout); API routes are
  read-only and return honest empty/error states — no demo fallbacks.

## Deploy checklist

- [ ] Set `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`
- [ ] Replace `uploads/` local disk with object storage
- [ ] `docker compose down` the local Redis (service removed from compose)
- [ ] Run `npm run db:backup` before any restore cycle
