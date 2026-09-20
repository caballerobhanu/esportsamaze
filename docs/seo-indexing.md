# SEO indexing — what is intentional and what is not

Reference for the Search Console "Why pages aren't indexed" reasons. Written
2026-09-20 while fixing the reports; read this before "fixing" a reason that is
deliberate.

## Deliberately excluded — do not change

| Reason | Where | Why |
|---|---|---|
| Excluded by 'noindex' | filtered/search views via `directoryMetadata()` (`lib/seo.ts`), `/news?q=` and `/news?tag=`, `/compare?teamA=…`, admin-hidden tournament tabs, `/news/saved` | unbounded crawl space over the same content; `follow` still passes crawlers through the links |
| Page with redirect | `?tab=` → tab route 308s, `/tournaments/<slug>/preview` shim (`proxy.ts`) | legacy URL shapes kept working |
| Blocked by robots.txt | `/admin/`, `/api/` | private panel and JSON surfaces |
| Alternative page with proper canonical tag | slug / id / IGN / tag look-alikes | the entity routes resolve several keys and consolidate onto the stored slug (`lib/slug-history.ts`) — this reason *is* the consolidation working |
| Duplicate, Google chose a canonical | `/rankings` vs `/rankings?board=players` | two different datasets, each self-canonical and both in the sitemap |

`robots.txt` intentionally does **not** list the secret admin login path. It is
world-readable, so naming the path there would publish the very thing the
disguise hides. The login route carries its own `robots: { index: false }`
instead (`app/admin/login/page.tsx`, which also serves `/poorvith/login` via the
`proxy.ts` rewrite), and `/_next/` is deliberately left crawlable because Google
needs it to render the pages.

## Fixed on 2026-09-20

- **Homepage had no canonical.** `app/(public)/page.tsx` now sets `canonical('/')`.
- **Fabricated team URLs 404'd.** Links built as
  `name.toLowerCase().replace(/\s+/g, '-')` match none of a team's lookup keys
  (slug / tag / name / displayName / id). Entity links now go through
  `lib/entity-links.ts` (`teamHref` / `playerHref`), which pick a key the route
  actually resolves. Covered by `tests/entity-links.test.ts`.
- **Sitemap advertised ~1,839 thin tab URLs** (2,747 total). Team and player tab
  URLs are now listed only when the tab has data behind it, and only verified
  entities are listed at all (`app/sitemap.ts`).
- **Soft-404s.** Empty and out-of-range archive pages
  (`/news/tag|category|author`, and `/news?page=`) now `notFound()` instead of
  returning an empty 200.
- **`kraftonindiaesports.io` removed from nginx `server_name`** — inert template
  leftover (see AGENTS.md).

## Known issue — `notFound()` returns HTTP 200 (soft-404)

Verified 2026-09-20 against a production build (`next build` + `next start`):
every page that calls `notFound()` responds **200** with the not-found UI, not
404. Only unmatched router paths (`/nope`) return a real 404. Examples that
return 200: `/news/zzz-no-such-article`, `/teams/zzz-no-team`,
`/news/category/zzz`, `/news?page=999`.

The likely cause is the `loading.tsx` boundaries (`app/loading.tsx`,
`app/(public)/loading.tsx`, and the per-segment ones for players / teams /
tournaments / rankings): the Suspense shell streams — committing the 200 status
— before the page's data resolves, so a later `notFound()` cannot change the
status.

Mitigation in place: both `not-found.tsx` files now set
`robots: { index: false }`, so a 200 soft-404 is not indexable even though the
status is wrong. A true fix (real 404s) means revisiting the `loading.tsx`
streaming boundaries, which is a UX trade-off and was left out of this pass.

## Operational steps (outside the application)

- **Cloudflare — `www` → apex.** Add a Redirect Rule mapping
  `https://www.esportsamaze.com/*` → `https://esportsamaze.com/$1`, status 301,
  preserve query string. Do this in **one** layer only: do not also add an nginx
  www→apex redirect, or the two will loop. Leave
  `/.well-known/acme-challenge/*` exempt. Security-wise it is a plain host
  consolidation — no auth or data path, the cert covers www, and HSTS stays valid.
- **Cloudflare purge after deploy.** `/robots.txt`, `/sitemap.xml` and
  `/favicon.ico` are edge-cached for 24h (`nginx.conf` `.txt/.xml` rule), so a
  correct robots/sitemap change can look broken until the URL is purged.
- **Search Console.** Submit `https://esportsamaze.com/sitemap.xml`, then click
  "Validate fix" on each reason once the deploy is live. The discovered/crawled
  backlog shrinks on Google's schedule, not instantly.
- **Rotating the admin slug** (only if GSC shows `/poorvith` indexed): see the
  runbook in the remediation plan — three hardcoded references
  (`proxy.ts` matcher, `deploy/nginx.conf` cache/rate-limit regexes,
  `components/maintenance/maintenance-view.tsx`) must be updated first.
