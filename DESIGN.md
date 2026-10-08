---
name: eSportsAmaze
description: High-performance esports statistics and tournament intelligence platform
colors:
  primary: "#0A5FC4"
  primary-deep: "#0B4FA6"
  canvas: "#f5f7fa"
  surface: "#ffffff"
  surface-dark: "#0b1220"
  sand: "#eaeef4"
  hairline: "#e0e6ee"
  ink: "#161a22"
  stone: "#64748b"
  champion-amber: "#f59e0b"
  live-rose: "#f43f5e"
  active-emerald: "#10b981"
  special-indigo: "#6366f1"
  editorial-blue: "#2452c2"
  editorial-magenta: "#cd2f7b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 1.02
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Plus Jakarta Sans, var(--font-sans), sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  control: "12px"
  card: "16px"
  panel: "24px"
  plate: "32px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.panel}"
    padding: "24px"
  badge-tinted:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "4px 12px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: eSportsAmaze

## Overview

**Creative North Star: "The Broadcast Control Room"**

eSportsAmaze looks like the production gallery of a live esports broadcast: confident, high-contrast, and built for scanning dense numbers under time pressure. The default building block is a **soft rounded card** — a pure white (`#ffffff`) panel with a 16–24px radius, a 1px `slate-200` border, and a gentle `shadow-xs`/`shadow-sm` lift at rest — sitting on a cool paper canvas (`#f5f7fa`). In dark mode the same cards become **deep navy panels** (`#0b1220`), which is the single most identifiable surface in the product: virtually every data panel is `bg-white … dark:bg-[#0b1220]`.

The energy comes from one bright signal colour — **Broadcast Azure (`#0A5FC4`)** — used freely on links, active pills, CTAs, ring borders and tinted `/10` badges, and from a small broadcast accent set (champion amber, live rose, active emerald, special indigo/purple) delivered as **translucent tinted pills**, never as flat card fills. Headlines are **black-weight and uppercase** with tight tracking; numbers are tabular. Two surfaces earn a genuine gradient: the flagship prize-pool callout and the hero crest plates.

The newsroom vertical (`app/(public)/news/**`, legal pages) runs a deliberately quieter **editorial sub-style** — the `.ed-*` primitives, `--ed-blue #2452c2`, hairlines, no shadows — for long-form reading. That style is real but *secondary*; it is documented under its own note below and must not be imposed on the data-facing pages.

**Key Characteristics:**
- **Soft Broadcast Cards**: 16px / 24px radius, pure white (navy `#0b1220` in dark), 1px `slate-200` border, `shadow-xs`/`shadow-sm` at rest — the default container everywhere except the news vertical.
- **Azure Signal**: `#0A5FC4` is the primary. It floods links, CTAs, active states and tinted badges. The newsroom `#2452c2` is *not* the game-side primary.
- **Navy Nightfall**: dark mode is a specific navy `#0b1220` (siblings `#0b101c`, `#070b14`), never generic black.
- **Black-Weight Headlines**: `font-black uppercase tracking-tight` — the dominant heading voice, not a 700/800 sentence-case headline.
- **Broadcast Accent Pills**: amber = champions / 1st / WWCD; emerald = active / win; rose = live / elimination; indigo-purple = special / staff. Delivered as `bg-{hue}-500/10` pills.
- **Tabular Precision**: every points/rank/score figure is `tabular-nums`.

## Colors

An energetic broadcast palette: cool paper neutrals, a bright azure signal, and a small set of status hues carried as translucent tints.

### Primary
- **Broadcast Azure** (`#0A5FC4`, dark: `blue-400/blue-300`): The signal colour. Links, primary CTAs, active tab pills, focus rings, selected filters, and the `bg-[#0A5FC4]/10` tint behind azure badges. Used across ~78 public files — treat it as *the* brand blue for all data-facing surfaces.
- **Azure Deep** (`#0B4FA6`, i.e. `hover:bg-blue-600`): Hover-only darkening of primary buttons.

### Secondary
- **Champion Amber** (`#f59e0b`, tints `amber-400/15`): Reserved for winners, 1st place, podium gold, and the WWCD mark. The one accent that means "won".
- **Live Rose** (`#f43f5e`): Live status, elimination callouts, the pulsing live dot (`animate-pulse rounded-full bg-rose-500`).
- **Active Emerald** (`#10b981`): Active/positive states (`.ed` active team chips, "upcoming" wins).
- **Special Indigo / Purple** (`#6366f1` / `#8b5cf6`): staff roles, item rewards, and the tail of the blue→indigo gradients.

### Neutral
- **Cool Paper Canvas** (`#f5f7fa`): the page background in light mode.
- **Pure Surface** (`#ffffff`): card bodies, table rows, dropdowns.
- **Navy Surface** (`#0b1220`): the dark-mode card surface. Paired with every white card as `dark:border-white/10 dark:bg-[#0b1220]`.
- **Slate Ink** (`#161a22`): headings and figures. In dark mode the ink is `text-white` / `text-slate-100`.
- **Slate Stone** (`#64748b` / `text-slate-500/400`): metadata, column headers, helper labels.
- **Hairline** (`#e0e6ee` / `border-slate-200`): the 1px card border. In dark mode `dark:border-white/10`.
- **Sand** (`#eaeef4` / `bg-slate-50/80`): inset section headers *inside* cards (`border-b bg-slate-50/50`), table header strips.

### Named Rules
**The Azure Signature Rule.** `#0A5FC4` is the primary for every data-facing surface. Never substitute the newsroom `#2452c2` on home, tournaments, teams, players, compare or rankings — that token belongs only to the news/editorial sub-style.

**The Tinted-Signal Rule.** Colour arrives as a translucent tint (`bg-{hue}-500/10`, `bg-[#0A5FC4]/10`, `bg-amber-400/15`) with saturated text on top. Never fill a whole card or section with a solid bright hue — the only exceptions are the two gradient hero callouts.

**The Champion Amber Rule.** Amber is earned, not decorative: it appears only for a winner, a 1st place, a podium, or a WWCD.

## Typography

**Display Font:** Plus Jakarta Sans (`var(--font-jakarta)`, sans-serif fallback)
**Body Font:** Plus Jakarta Sans (`var(--font-jakarta)`, sans-serif fallback)
**Label/Mono Font:** UI Monospace (`ui-monospace`, for code and telemetry strings only)

**Character:** A geometric grotesque pushed to black weight for headlines; wide-tracked uppercase micro-labels for structure; tabular figures for all data. Loud where it names an event, quiet and precise where it reports a number.

### Hierarchy
- **Display** (900 weight, `clamp(2.25rem, 6vw, 4.5rem)`, line-height ~1.02, tracking `-0.05em`, UPPERCASE): hero tournament / team / player titles.
- **Headline** (900 weight, `1.5rem–1.875rem`, tracking-tight, UPPERCASE): section titles ("Trophies", "Winnings & awards", "Career earnings").
- **Title** (800 weight, `1.125rem`, tracking-tight): card titles, squad names, table section heads.
- **Body** (400/500 weight, `0.9375rem`, line-height 1.65): prose and table cells. Max measure ~65–75ch on article pages.
- **Label / Kicker** (700–800 weight, `10–11px`, tracking `0.12em–0.18em`, UPPERCASE, stone/slate): section kickers, table headers, badge labels, metadata.

### Named Rules
**The Black-Weight Rule.** Headings are `font-black` (900), generally uppercase with tight tracking. `font-extrabold`/sentence-case is the editorial sub-style, not the default.

**The Tabular Precision Rule.** Points, ranks, finishes, times and money are `tabular-nums font-semibold` (`num` / `tabular-nums`). Non-tabular figures in a data column are forbidden.

**The Kicker Rule.** A data card's title is preceded by a 10–11px uppercase wide-tracked kicker in stone (`text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4]` for sections, `text-slate-400` for labels).

## Layout

8px base rhythm, max page container `1320px` (`--page-max-width`), fluid gutters 16px → 32px.
- **Card grid, not table-grid**: data surfaces compose soft cards in `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`; dense tables live *inside* a card with `overflow-x-auto`.
- **Inset headers**: a card's header strip is separated by a bottom border with a tinted fill (`border-b border-slate-100 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02]`).
- **Snap rails** (`.rail`) on mobile for wide matrices / stage strips so the page never scrolls sideways.
- **Compact density inside cards**: table cells `py-2`–`py-4`; cards `p-5`–`p-8` (`sm:p-8` for feature panels).

## Elevation & Depth

Depth is **soft and ambient**. Cards rest with a subtle shadow and lift on interaction:
- **Rest**: `shadow-xs` (small tiles, home cards) or `shadow-sm` (feature cards, prize panels).
- **Hover**: interactive cards raise to `hover:shadow-md`/`hover:shadow-lg`, often with `hover:border-[#0A5FC4]` and `hover:-translate-y-0.5`.
- **Signature glow**: hero status surfaces carry a coloured glow — `shadow-xl shadow-blue-900/25` on the prize callout, `shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)]` on hero crest plates.

### Named Rules
**The Lift-On-Hover Rule.** A clickable card is flat-ish at rest and lifts (shadow + slight translate + azure border) on hover. Static info cards do not lift.

**The Newsroom-Is-Flat Rule.** The no-shadow, hairline-only treatment is valid **only** inside the editorial/news sub-style (see Components → Editorial sub-style). Do not flatten data cards to hairlines.

## Shapes

- **Controls & chips**: 12px (`rounded-xl`).
- **Cards**: 16px (`rounded-2xl`).
- **Feature panels & prize callouts**: 24px (`rounded-3xl`).
- **Hero crest plates**: 32px-ish, often arbitrary (`rounded-[1.8rem]`, `rounded-[2rem]`, `rounded-[2.5rem]`), with a rotated azure backplate behind and a thick white border.
- **Badges / pills / dots**: `rounded-full`.
- **Borders**: 1px `border-slate-200`, or `dark:border-white/10` in dark mode.

## Components

### Buttons
- **Shape:** 16px (`rounded-2xl`) for CTAs, 12px (`rounded-xl`) for compact/table actions.
- **Primary:** solid `bg-[#0A5FC4]` (news uses `.ed-btn` `#2452c2`), white text, `text-xs font-black uppercase tracking-wider` (game pages) or `text-[13px] font-medium` (news), `px-5 py-2.5`, `shadow-sm`, `hover:bg-blue-600`.
- **Segmented toggles:** `rounded-full bg-slate-200/70 p-1` track with an active `bg-[#0A5FC4] text-white shadow-md` pill.
- **Ghost / secondary:** white/slate-100 fill with a `slate-200` border.

### Chips / Badges
- **Tinted status badge (dominant):** `inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4]` — swap the hue for amber/emerald/rose/indigo by state.
- **Filter chip:** `rounded-lg px-3 py-1 text-xs font-bold` — inactive `bg-slate-100 text-slate-600`, active `bg-[#0A5FC4] text-white shadow-sm`.
- **Editorial chip (news only):** `.ed-chip` — `rounded-lg` hairline, 11px.

### Cards / Containers
- **Corner Style:** 16px (`rounded-2xl`) small, 24px (`rounded-3xl`) feature.
- **Background:** `bg-white` / `dark:bg-[#0b1220]`.
- **Border:** 1px `border-slate-200` / `dark:border-white/10`.
- **Shadow:** `shadow-xs`–`shadow-sm` at rest; `hover:shadow-md/lg` when interactive.
- **Header:** bottom-border strip, `bg-slate-50/50` inset fill, 24px uppercase black heading + kicker.
- **Padding:** `p-5`–`p-6`, `sm:p-8` for feature panels.

### Inputs / Fields
- **Style:** `rounded-xl` (12px), `border-slate-200`, `bg-white`, `px-3.5 py-2.5`, `text-sm`.
- **Focus:** border → `#0A5FC4` with a soft ring (`focus:ring-2 focus:ring-[#0A5FC4]/20`).
- **Placeholder:** `slate-400`.

### Navigation
- **Tabs:** pill segments or an underline tab row; the active state is azure — either a `#0A5FC4` pill or a 2px azure bottom border (`.ed-tab-active`).
- **Editorial nav (news):** `.ed-tab` stone/azure underline.

### Signature Components
- **Dark Navy Panel:** every card's dark counterpart `dark:bg-[#0b1220] dark:border-white/10` — the product's most reused surface.
- **Hero Crest Plate:** rotated azure backplate + thick border + soft azure glow behind a team/game mark.
- **Gradient Callout:** `rounded-3xl bg-gradient-to-br from-[#0A5FC4] via-blue-700 to-indigo-950 text-white shadow-xl shadow-blue-900/25` with a radial sheen — reserved for the prize-pool headline and overview CTA.
- **Editorial sub-style (news + legal only):** `.ed-card` / `.ed-card-head` / `.ed-label` / `.ed-th` / `.ed-chip` / `.ed-btn`, `--ed-blue #2452c2`, `rounded-xl`, hairline borders, **no shadow**, `font-extrabold` sentence-case headings.

## Do's and Don'ts

### Do:
- **Do** build data panels as soft rounded cards: `rounded-2xl`/`rounded-3xl border border-slate-200 bg-white shadow-xs/sm dark:border-white/10 dark:bg-[#0b1220]`.
- **Do** use **`#0A5FC4`** as the primary on all data-facing surfaces.
- **Do** headline with `font-black uppercase tracking-tight`, and precede card titles with a uppercase wide-tracked kicker.
- **Do** carry status as translucent `/{opacity}` tints (azure / amber / emerald / rose / indigo), with saturated text.
- **Do** use `tabular-nums` on every figure in a data column, and `shadow-xs/sm` at rest with a hover lift on interactive cards.
- **Do** keep the editorial/news sub-style (`.ed-*`, `#2452c2`, hairline, no shadow) confined to `app/(public)/news/**` and legal pages.
- **Do** respect the `1320px` max width and use `.rail` snap rails for wide matrices on mobile.

### Don't:
- **Don't** apply the newsroom's flat/hairline/no-shadow language to home, tournaments, teams, players, compare or rankings — that stripping is what makes data pages read as bare.
- **Don't** use `#2452c2` (`--ed-blue`) as the primary outside the news sub-style.
- **Don't** fill a whole card or section with a solid bright colour; cover with a `/{10}` tint instead (the two gradient hero callouts are the only exceptions).
- **Don't** use shadow-free 12px cards as the default container on data surfaces, and don't drop the `dark:bg-[#0b1220]` pairing.
- **Don't** use `font-extrabold` sentence-case headings on game pages, or decorative mono for non-data text.
- **Don't** render non-tabular numbers in standings, scorecards, prize tables or rankings.
