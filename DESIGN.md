---
name: eSportsAmaze
description: High-performance esports statistics and tournament intelligence platform
colors:
  primary: "#2452c2"
  accent: "#cd2f7b"
  canvas: "#f5f7fa"
  surface: "#ffffff"
  sand: "#eaeef4"
  hairline: "#e0e6ee"
  ink: "#161a22"
  stone: "#64748b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "clamp(2rem, 5vw, 2.75rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
---

# Design System: eSportsAmaze

## Overview

**Creative North Star: "The Esports Press Room"**

eSportsAmaze is structured as a calm, authoritative sports journalism desk rather than a chaotic gaming portal or dark flashy dashboard. Inspired by the editorial restraint of premium publications and broadcast control rooms, the interface treats esports statistics with the dignity of top-flight athletics. Clean paper-tinted surfaces (`#f5f7fa` light / `#0f1216` dark) replace harsh pure whites and muddy darks; crisp slate ink (`#161a22` / `#e9edf3`) anchors long-form reading and dense tables; and one confident, high-clarity Press Cobalt (`#2452c2` / `#6f97e8`) commands interactive attention.

The visual atmosphere balances editorial breathing room with high tabular density. Data tables, standings matrices, and match scorecards are presented with razor-sharp micro-typography and hairline separation, completely eliminating fuzzy box shadows and neon glow effects. Broadcast energy is channeled selectively through pulse badges and Editorial Crimson (`#cd2f7b`) highlights on live tournaments.

**Key Characteristics:**
- **Editorial Paper Canvas**: Quiet, tinted backgrounds that allow dense data grids and team marks to stand out naturally.
- **Zero Drop Shadows**: Structural hierarchy and depth conveyed strictly via tonal paper contrast and crisp 1px hairline dividers.
- **Press Cobalt Focal Points**: The primary blue accent is guarded strictly for actionable controls, primary CTAs, and active navigation states.
- **Tabular Precision**: Monospace-aligned numerical figures (`tabular-nums`) paired with wide-tracked micro-labels (`tracking-wider`).
- **Tactile Soft Controls**: Distinctive pill-shaped buttons (16px radius) that introduce an approachable, human balance to rigid grid tables.

## Colors

A dignified editorial palette of cool paper, slate ink, and hairline dividers punctuated by a single authoritative press cobalt and selective broadcast crimson.

### Primary
- **Press Cobalt** (`#2452c2` in light / `#6f97e8` in dark): The principal action color. Used exclusively for primary CTA buttons, active navigation tab indicators, focused input borders, and primary link text. Never used as a full-page background or decorative surface tint.

### Secondary
- **Editorial Crimson** (`#cd2f7b` in light / `#e0518f` in dark): High-priority broadcast accent. Reserved for live tournament status indicators, urgent event alerts, elimination callouts, and key kicker accents.

### Neutral
- **Cool Paper Canvas** (`#f5f7fa` / `#0f1216`): The foundational background canvas of every page.
- **Pure Surface** (`#ffffff` / `#161b22`): Card bodies, dialogs, dropdowns, and data table rows that sit elevated upon the canvas.
- **Subtle Sand** (`#eaeef4` / `#1d242e`): Secondary panels, code blocks, quote containers, and table headers.
- **Hairline Divider** (`#e0e6ee` / `#2a3441`): Subtle 1px structural borders dividing cards, rows, columns, and section headers.
- **Slate Ink** (`#161a22` / `#e9edf3`): Primary high-contrast text for headlines, table figures, and long-form prose.
- **Slate Stone** (`#64748b` / `#94a3b8`): Secondary metadata, table column headers, helper labels, and inactive icons.

### Named Rules
**The Rare Blue Rule.** Press Cobalt is reserved for actionable touchpoints and active state indicators. It should cover less than 8% of any given viewport; its rarity is what makes the interface instantly scanable.

**The Tinted Neutral Rule.** Never introduce pure `#000000` or sterile `#ffffff` canvas backgrounds. Every neutral carries a minute slate or paper undertone to prevent harsh eye strain during extended match tracking.

## Typography

**Display Font:** Plus Jakarta Sans (`var(--font-jakarta)`, with sans-serif fallback)  
**Body Font:** Plus Jakarta Sans (`var(--font-jakarta)`, with sans-serif fallback)  
**Label/Mono Font:** UI Monospace (`ui-monospace`, `monospace` for code and telemetry strings)

**Character:** Modern geometric grotesque with crisp humanist apertures; legible at minute tabular sizes (10px) while commanding editorial weight when scaled up for tournament headlines.

### Hierarchy
- **Display** (800 weight, `clamp(2rem, 5vw, 2.75rem)`, line-height 1.15, letter-spacing `-0.02em`): Major tournament title headers and landing heroes.
- **Headline** (800 weight, `1.25rem–1.5rem`, line-height 1.25, letter-spacing `-0.01em`): Section headings, editorial article titles, and major card titles.
- **Title** (700 weight, `1rem–1.125rem`, line-height 1.35): Card headers, squad names, and standings table sections.
- **Body** (400 / 500 weight, `0.9375rem` / 15px, line-height 1.65): Article paragraphs, editorial commentary, and table cell contents. Max line length 65–75ch for prose.
- **Label / Kicker** (600 / 700 weight, `10px–11px`, line-height 1.2, letter-spacing `0.08em–0.18em`, uppercase): Table headers (`.ed-th`), category kickers (`.kicker`), badge labels, and metadata timestamps.

### Named Rules
**The Tabular Precision Rule.** All numerical points, finish tallies, match times, and rankings metrics must apply `tabular-nums font-semibold` (`font-variant-numeric: tabular-nums`). Non-tabular figures in data columns are strictly forbidden.

**The Editorial Kicker Rule.** Section titles and featured groupings should be preceded by an uppercase, wide-tracked micro-kicker in Slate Stone to establish immediate context before the primary headline.

## Layout

Built on an 8px base rhythm with a maximum page container width of 1320px (`--page-max-width: 1320px`).
- **Responsive Padding**: Fluid page gutters spanning 16px (`1rem`) on mobile to 32px (`2rem`) on desktop.
- **Horizontal Snap Rails**: On mobile viewports, multi-stage progression matrices, stage tabs, and circuit strips use horizontal scroll snap (`.rail`) with hidden scrollbars, ensuring the parent page never scrolls sideways.
- **Dense Data Grids**: Scorecards and standings tables utilize compact vertical cell padding (`6px–10px`) to maximize above-the-fold information density during live matches.

## Elevation & Depth

eSportsAmaze operates on a strict **flat tonal layering** system. No drop shadows (`box-shadow: none`) are used in rest states.

Depth is achieved through a 3-tier planar hierarchy:
1. **Tier 0 (Base Canvas)**: Cool Paper (`--ed-canvas`)
2. **Tier 1 (Surface Containers)**: Pure Surface (`--ed-surface`) bounded by 1px Hairline (`--ed-hair`)
3. **Tier 2 (Inlaid Accents & Plates)**: Subtle Sand (`--ed-sand`) for table headers, team plates, and quote callouts

### Named Rules
**The Zero-Shadow Rule.** Surfaces are completely flat at rest. Depth is established through tonal paper contrast and hairline boundaries. Avoid ambient drop shadows, blurred glows, and inset bevels.

## Shapes

Form language balances crisp architectural tables with soft, tactile interactive components.
- **Cards & Dialogs**: 12px radius (`rounded-xl`).
- **Buttons**: 16px radius (`rounded-2xl`). Soft and comfortable under the thumb.
- **Inputs & Chips**: 8px radius (`rounded-lg`). Compact and structured.
- **Badges & Indicators**: 9999px pill radius (`rounded-full`).
- **Hairlines**: Always exactly 1px solid (`border border-[var(--ed-hair)]`).

## Components

### Buttons
Tactile, pill-soft controls with confident presence.
- **Shape:** Rounded-2xl (16px radius).
- **Primary (`.ed-btn`):** Background Press Cobalt (`#2452c2`), text white, padding `10px 20px` (`px-5 py-2.5`), text `13px` font-medium.
- **Hover / Focus:** `hover:brightness-110`, smooth transition `color 0.2s, background 0.2s`.
- **Secondary / Ghost:** Transparent background, 1px Hairline border, Slate Ink text, hover background Subtle Sand.

### Cards / Containers
Flat, paper-crisp modules with distinct hairline headers.
- **Corner Style:** 12px radius (`rounded-xl`).
- **Background:** Pure Surface (`--ed-surface`).
- **Border:** 1px Hairline (`--ed-hair`).
- **Header (`.ed-card-head`):** Flex layout, bottom hairline divider, padding `10px 14px sm:16px`.
- **Shadow Strategy:** Zero shadow at rest.

### Chips / Micro-Badges
Compact 8px hairline tags for status and filters.
- **Style:** Background Pure Surface, 1px Hairline border, padding `2px 8px`, text `11px` font-medium Slate Ink.
- **State:** Active chip fills with Subtle Sand or Press Cobalt border.

### Inputs / Fields
Quiet, high-legibility inputs that illuminate with Press Cobalt on focus.
- **Style:** Background Pure Surface, 1px Hairline border, 8px radius, padding `10px 14px`, text `14px`.
- **Focus:** Border shifts to Press Cobalt (`#2452c2`), `outline: none`.
- **Placeholder:** Slate Stone (`#64748b`).

### Navigation & Tabs
Clean editorial header with persistent active underline.
- **Style:** Sticky top navigation with hairline bottom border.
- **Tabs (`.ed-tab`):** Inactive tabs in Slate Stone, 14px font-medium. Active tabs (`.ed-tab-active`) feature a 2px bottom border in Press Cobalt and text in Press Cobalt.

### Signature Component: Team Crest Plate
A neutral "light from above" gradient plate providing an elegant backdrop for team marks without per-team color noise.
- **Style (`.team-plate`):** Gradient from Subtle Sand (top-left 165deg) to Pure Surface (bottom-right). In dark mode: Pure Surface to Canvas.

## Do's and Don'ts

### Do:
- **Do** preserve the 1px hairline border strategy (`--ed-hair`) for all card, table, and header demarcations.
- **Do** use `tabular-nums` on all statistical columns, point tables, and match countdown timers.
- **Do** respect the 1320px maximum layout width (`--page-max-width`) across all public pages.
- **Do** reserve Press Cobalt for actionable links, primary buttons, and active tabs.
- **Do** use horizontal snap rails (`.rail`) on mobile screens to keep large data matrices accessible without causing full-page sideways scroll.

### Don'ts:
- **Don't** add heavy drop shadows, neon box-shadows, or blurred card glows.
- **Don't** use pure `#000000` or `#ffffff` backgrounds without the editorial cool-paper undertones.
- **Don't** saturate entire cards or section backgrounds in solid bright colors.
- **Don't** mix multiple conflicting accent colors in the same view; keep accents focused to Press Cobalt and occasional Editorial Crimson.
- **Don't** render non-tabular numbers in standings, scorecards, or rankings matrices.
