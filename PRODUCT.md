# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Esports Fans & Followers**: Tracking live tournament stages, match scorecards, team progression, and player eliminations during and after BGMI events.
- **Analysts & Content Creators**: Reviewing detailed head-to-head metrics, finishes, average eliminations, and historical player career stats.
- **Competitive Players & Team Managers**: Checking tournament standings, roster movements, and official stage progression.
- **Tournament Organizers & Admins**: Managing tournament fixtures, inputting match results (table paste, OCR, inline editors), tracking prize distribution, and publishing editorial updates.

## Product Purpose

eSportsAmaze is a high-performance esports statistics and tournament intelligence platform covering competitive Battlegrounds Mobile India (BGMI) and the wider Indian esports circuit (with clean architectural readiness to expand into global mobile esports). It exists to build the most accurate, real-time, and comprehensive open database for fans, analysts, and organizers, turning fragmented tournament streams and organizer sheets into verified, structured data. Success means fast, reliable data presentation during active events and authoritative historical records.

## Positioning

Unlike general gaming news portals or generic tournament brackets, eSportsAmaze combines live broadcast-level match data ingestion (OCR scorecard import, multi-match matrix grids, paste parsers) with proprietary decay-adjusted KRAFTON Power Rankings and granular player combat metrics tailored specifically to mobile battle royale esports.

## Operating Context

- High-traffic spikes during live tournament broadcasts (weekends and evenings).
- Admins enter match data in real-time or post-match using specialized tools (matrix editors, OCR scorecards, Tiptap news editor).
- Public users access predominantly via mobile web and desktop browsers to quickly inspect standings, live match results, or compare players.
- Production environment: Next.js 16 App Router on Node 22/24, PostgreSQL via Prisma, PM2 cluster, Nginx micro-cache, same-origin `/api/media/` delivery backed by Cloudflare R2.

## Capabilities and Constraints

- **Live & Historical Tournament Tracking**: Multi-stage, multi-group structures with points systems, WWCD tracking, tiebreak zones, and prize pool breakdowns.
- **Player & Team Intelligence**: Career statistics, finishes, head-to-head comparison tool, transfer histories, and roster movements.
- **Power Rankings**: Rolling points system with time decay algorithms.
- **News Desk**: Tiptap-powered rich article editor with scheduled publishing and entity tagging (teams/players/tournaments).
- **Additive-Only Schema**: Database schema is strictly additive; existing columns and tables are never dropped.
- **Same-Origin Media Architecture**: Images are served locally via `/api/media/<filename>` backed by Cloudflare R2, cached by Nginx (`expires 30d, immutable`). No external media CDN host.
- **Strict Verification Gates**: Automated test suite (`npm test`) and TypeScript check (`tsc --noEmit`) gate deployment.

## Brand Commitments

- **Name**: eSportsAmaze (Domain: `esportsamaze.com`).
- **Identity**: Independent esports initiative founded by Bhanu Pratap; not officially affiliated with KRAFTON or Tencent.
- **Tone & Voice**: Authoritative, analytical, esports-native, high-energy yet precise, statistics-driven.

## Evidence on Hand

- Production database schema (`prisma/schema.prisma`) modeling tournaments, matches, teams, players, statistics, and articles.
- Comprehensive test fixtures in `tests/` validating tournament math, standings rules, OCR paste parsing, and ranking algorithms.
- Working UI with custom public layout (`app/(public)`) and administrative management tools (`app/admin`).
- Verified historical and active tournament records for Indian BGMI circuits.

## Product Principles

1. **Accuracy Over Haste**: Match and player numbers reflect verified broadcast or organizer data; discrepancies are transparently noted.
2. **Speed & Scanability**: Tournament tables, group standings, and match results must be readable at a glance on any screen size.
3. **Data Integrity & Continuity**: Career records, roster transfers, and tournament progressions preserve long-term history without destructive data loss.
4. **Focused Depth First**: Master the Indian BGMI ecosystem with deep tactical precision before expanding coverage to neighboring titles or regions.
