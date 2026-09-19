<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Verified facts about this deployment

Last verified against the live VPS: **2026-09-18**. Re-check before trusting; update this section when reality changes.

## Domain trap — read this before any find-and-replace

Two similar strings exist and they mean opposite things:

- `kraftonindiaesports.io` — **NOT ours.** A stale value from the template this project was adapted from. It survived in live nginx `server_name` and in a `media-storage.ts` comment. Verified 2026-09-18: the hostname does not resolve (`dig +short` returns nothing, `curl` fails), so the live `server_name` entry is **inert**. Harmless, not urgent; safe to remove whenever.
- `kraftonindiaesports.com` — **legitimate third-party data.** Krafton India Esports is an organizer this site covers. It appears in real DB rows (`Organizer.website`, social links, `Tournament.streamUrl`), in `tests/seo.test.ts` fixtures, and as admin input placeholders. **Do NOT remove it.**

Our domain is **esportsamaze.com**.

## How deploys actually gate — do not assume lint gates anything

`deploy/update.sh` runs, in order: `git pull` → `npm ci` → `npm audit` (non-blocking) → `prisma generate` → `pg_dump` backup → **`npm test`** → `prisma db push` → **`npm run build`** → `pm2 reload` → health probe.

**`npm run lint` is not in that pipeline and blocks nothing.** It currently reports ~439 messages (221 at `error` severity), which is why they accumulated. The two real gates are both green: `tsc --noEmit` exits 0 and `npm test` passes 347/347. There is no CI — no `.github/`, no `.gitlab-ci`.

## Lint triage — already done, do not redo it

`npx eslint .` reports ~439 messages (221 at `error`). **Every category has been triaged (2026-09-18).** None of it is in the deploy path — `npm run lint` is not called by `deploy/update.sh`, and there is no CI — so lint has never blocked a deploy. Both real gates are green (`tsc --noEmit` exits 0, `npm test` 347/347). Expect roughly 415 messages to remain even after any clean-up, because the two largest buckets are deliberately left alone. **Do not re-investigate the following; the verdicts are settled.**

| Rule | Count | Verdict |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 186 | **Not worth it — types don't run.** Concentrated in admin components. Several are deliberate escape hatches (e.g. `(prisma as any).siteSetting` guards an un-regenerated client, `parseWwcd(val: any)` is fed raw paste data). If ever done: annotation-only, file by file, and never add runtime guards in the same pass — the guards are the part that changes behaviour. |
| `@typescript-eslint/no-unused-vars` | 196 | **Mostly unused `lucide-react` icon imports** — harmless (154 of them sit in import lines). The only three with substance were `saveTeamResult` / `deleteTeamResult` / `deletePlayerStat` in `app/admin/(panel)/matches/page.tsx`, verified unreachable: superseded by `match-inline-scorecard-editor.tsx` (which calls `updateInline*` / `deleteInline*` from `matches/actions.ts`). **`savePlayerStat` (line 447) sits between them and IS live** — wired at `page.tsx:1075`. Never delete ranges 336–445 + 524–539 without keeping 447–522. |
| `react-hooks/set-state-in-effect` | 20 | **All correct-but-non-idiomatic.** None loops; none shows a wrong value in normal flow. Two investigated in depth: `multi-match-matrix-grid.tsx:277` is safe because its `killMultiplier` dep is a *number*, compared by value, so a re-created parent object cannot re-fire it; `tournament-schedule-calendar.tsx:503` only misfires if the parent re-identifies `matches` mid-session, and the selected day is a view preference, not data. |
| `react-hooks/preserve-manual-memoization` | 6 | **Hypothetical.** React Compiler is not enabled — these describe what the compiler *would* skip. |
| `react-hooks/refs` | 4 | **Deliberate and load-bearing.** `match-inline-scorecard-editor.tsx:166,168` reads its dirty-sets through refs on purpose so a parent `router.refresh()` cannot silently discard an admin's unsaved edits. Do not "fix". |
| `react-hooks/purity` | 3 | **False positives.** Two are async Server Components, where `Date.now()` during render is correct and avoids hydration mismatch; the third is inside an `onClick` handler. |
| `react-hooks/exhaustive-deps` | 4 | Benign, and one is actively protective: `multi-match-matrix-grid.tsx:279`'s *missing* `selectedTourney` dep is what stops the matrix being clobbered on a refresh. `tournament-schedule-calendar.tsx:354`'s unstable `activeMonth` only occurs when the months list is empty. |
| `@next/next/no-img-element` | 15 | **Deliberate.** 53 `<img>` total, 34 carrying explicit rationale. Media is same-origin `/api/media/…` (there is no CDN host), and nginx serves that path with `expires 30d, immutable` — converting to `next/image` would move delivery to `/_next/image` (30s micro-cache only) for no gain on 32–48px marks. |
| `@next/next/no-location-assign-relative-destination` | 1 | **Not a bug.** `players-manager-table.tsx:396` hard-navigates after a duplicate action, which deliberately guarantees fresh server data where `router.push()` would show a stale list. |
| `react/no-unescaped-entities` | 2 | Cosmetic — unescaped `"` in JSX text (`tournament-final-rankings-input.tsx:458`), renders identically. |
| Unused `eslint-disable` directives | 2 | Dead comments; safe to delete. One is in `searchable-select.tsx` (a newly added suppression the rule never needed). |

If lint is ever wired into CI, it will fail immediately. That is a deliberate trade, not an oversight.

## Scheduled jobs

Cron entries belong in **`/etc/cron.d/esportsamaze`** (that directory requires a user field), not the root crontab.

The nightly backup ran **never** until 2026-09-18. `setup.sh` used `(crontab -l | grep -v … ; echo …) | crontab -`, which under `set -euo pipefail` installs an *empty* crontab silently: `crontab -l | grep` exits non-zero, `pipefail` fails the pipeline, and `set -e` aborts the subshell before the `echo` runs — while `crontab -` still succeeds, so nothing reports an error. Confirmed on the live box: `systemctl is-active cron` was `active`, `bash deploy/backup-cron.sh` worked when run by hand and wrote a valid dump, but `crontab -l` was empty and no `db_*.sql.gz` had ever been created. `setup.sh` is now fixed — do not reintroduce the pipeline form.

Two backup layers exist and both are wanted:
- **Deploy-time** — `update.sh` dumps to `pre_update_*.sql.gz` on every deploy.
- **Nightly** — `backup-cron.sh` writes `db_*.sql.gz` + `uploads_*.tar.gz` with 14-day local retention.

There is **no offsite copy**: `rclone` is not installed, so `backup-cron.sh`'s optional R2 sync step is skipped and every backup lives on one disk. Hostinger VPS snapshots (weekly free) are a separate, coarser layer worth enabling too.

### Scheduled publishing — why that job is allowed to be lazy

`GET /api/cron/publish-scheduled` (guarded by `CRON_SECRET`, invoked from `/etc/cron.d/esportsamaze`) calls `syncScheduledArticles()`, which flips `SCHEDULED` articles whose time has passed to `PUBLISHED`.

**The public site does not depend on it.** Both `publishedVisibility()` (`lib/news-queries.ts`) and `isVisibleArticle()` (`lib/news.ts`) already treat a due `SCHEDULED` article as live. So lists, the home page, archives, search, the news API, sitemap and RSS are correct the moment the article's time arrives — and so is the article's own page. The only readers of the raw `status` column are `generateStaticParams` (build-time, so frequency is irrelevant) and the admin panel.

The job therefore exists to keep the stored status honest for the admin and for status-based reporting — not to make anything public. It deliberately runs **every 6 hours**; tightening it buys nothing. (A first pass at this job ran every 5 minutes on the incorrect assumption that the public site was waiting for the status flip. It never was.)


## Intentional decisions — do not "fix" these

- **Additive-only schema.** Columns and tables are only ever ADDED, never dropped. So `prisma db push --accept-data-loss` in `deploy/update.sh` is deliberate and safe: if nothing is ever deleted, there is no data loss. Do not re-flag `accept-data-loss`, `db push` versus `migrate deploy`, or migration drift as a risk. Migrations are written idempotent (`ADD COLUMN IF NOT EXISTS`) precisely because `db push` leaves `_prisma_migrations` behind the schema.
- **`CLOUDFLARE_R2_PUBLIC_URL` is deliberately unset in production.** R2 stores the objects (account id, keys and bucket are configured), but `lib/media-url.ts` then returns the root-relative `/api/media/<filename>`, served by this app's own route (local disk first, then R2). Media URLs are therefore same-origin, which also means `next/image` needs no `remotePatterns` entry for them. Do not reason about a media CDN host — there isn't one. Verified 2026-09-18 in the live DB: 112 of 117 stored image URLs are root-relative `/api/media/…`; the only absolute host is `images.unsplash.com` (5 rows), already in `remotePatterns`. `Player.avatarUrl` is entirely unused (0 rows).
- **Plain `<img>` is load-bearing in many places.** 53 occurrences, 34 carrying an explicit `eslint-disable` with a written rationale. Self-hosted SVG flags, 32–48px marks, and light/dark pairs are deliberate. Converting to `next/image` would also move delivery from `/api/media/` (which nginx serves with `expires 30d, immutable`) to `/_next/image?…` (which only gets the 30s micro-cache in `location /`) — treat that as a tradeoff to evaluate, not an obvious improvement.
- **Several `react-hooks` lint errors are deliberate patterns, not bugs.** `match-inline-scorecard-editor.tsx` reads its dirty-sets through refs on purpose so a parent `router.refresh()` cannot silently discard an admin's unsaved edits — removing that risks data loss. `prize-pool-badge.tsx`'s `setMounted(true)` is an SSR hydration guard for visitor-currency detection. React Compiler is **not enabled** (no `reactCompiler` config, no `babel-plugin-react-compiler` dependency), so every `react-hooks/preserve-manual-memoization` message is hypothetical.

## Environment parity

- **VPS:** Node 22.x, npm 10.x, PostgreSQL 16 in Docker as `esportsamaze_postgres` (port 5433), 3 PM2 cluster workers, nginx micro-cache in front.
- **Local dev:** Node 24.x with npm 11.x. Don't regenerate `package-lock.json` locally and commit it by accident — the VPS installs with npm 10.
- The VPS working tree tracks `origin/master` and is expected to be clean. Verify with `git status --short` before concluding that something is stale.

## How these facts were established

`tsc --noEmit`, `npm test`, `npx eslint .`, `prisma migrate status`, `pm2 list`, `ls /var/backups/esportsamaze`, `grep server_name /etc/nginx/sites-available/esportsamaze.com`, and `grep -oE '^[A-Za-z0-9_]+=' .env` (key names only — never dump values).
