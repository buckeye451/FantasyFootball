# Handoff: BMCF League — Broadcast direction (dashboard, manager, lifetime, mobile nav)

## Overview
A restyle of the existing BMCF League app (`buckeye451/FantasyFootball`, branch `claude/bmcf24league-access-33xz3j`). The **colour profile is unchanged** — every value comes verbatim from `src/app/globals.css` (both `[data-theme="dark"]` and `[data-theme="light"]`). What changes: typography, layout hierarchy, a Compact/Full tab on data-heavy sections, a season-heat matrix, a mobile bottom tab bar with two hub screens, and a record-book layout.

No data, metric or column is removed. Everything the app renders today is still reachable.

## About the design files
`BMCF Redesign Explorations.dc.html` is a **design reference created in HTML** — a prototype of the intended look, not production code to copy. The task is to recreate these screens inside the existing Next.js app using its established patterns: server components under `src/app/`, client components under `src/components/`, and class-based CSS in `src/app/globals.css` driven by the existing `var(--*)` tokens.

Do **not** port the prototype's inline styles. Add classes to `globals.css` in the same style as the existing ones, and keep referencing the token variables (`var(--surface)`, `var(--muted)`, `var(--series-1)`, …) so both themes and the `ThemeToggle` keep working.

## Fidelity
**High-fidelity.** Colours, type sizes, weights and spacing are final and are stated below. Recreate pixel-for-pixel using the app's own tokens.

## What to implement, in order

### 1. Type system (new)
Two web fonts, loaded once in `src/app/layout.tsx` via `next/font/google`:

| Role | Font | Usage |
|---|---|---|
| Display / headings / big figures | **Barlow Condensed** 600, 700 | Section headings, hero score, tile figures, slot tags, table kickers |
| UI / body | **Archivo** 400, 600, 700 | Everything else — replaces `system-ui` |

Two new tokens in `globals.css` `:root` (theme-independent):
```css
--font-display: 'Barlow Condensed', system-ui, sans-serif;
--font-ui: Archivo, system-ui, -apple-system, 'Segoe UI', sans-serif;
```
`body { font-family: var(--font-ui); }` replaces the current `system-ui, -apple-system, 'Segoe UI', sans-serif`.

Heading recipe (replaces `.card-title` at section level — keep `.card-title` for sub-headings):
```css
.section-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 26px;          /* 24px on the manager/lifetime pages, 20-22px on phones */
  letter-spacing: .4px;
  text-transform: uppercase;
  margin: 0;
}
```
Kicker / eyebrow recipe, used on every tile label and table header:
```css
.kicker {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 10.5px;        /* 11px in tiles, 12px in the hero */
  letter-spacing: 1.6px;    /* 2.2-2.6px in the hero */
  text-transform: uppercase;
  color: var(--muted);
}
```
Big figures (`.figure`): `font-family: var(--font-display); font-weight: 700; line-height: 1;` at 84px (desktop hero), 64px (phone hero), 44px (rank tiles), 34px (stat tiles), 26-30px (list rows). Keep `font-variant-numeric: tabular-nums` on anything in a table.

**Do not** bolden Archivo past 700, and do not use Barlow Condensed for body copy.

### 2. Dashboard (`src/app/dashboard/page.tsx`)
New order, top to bottom:

1. **Header** — unchanged `SiteHeader`, plus two additions:
   - Desktop top-level tabs beside the logo: Dashboard / Recaps / Managers / Playoffs / Lifetime. Active tab: `padding: 9px 13px; border-radius: 8px; background: var(--accent-wash); box-shadow: inset 0 0 0 1px var(--focus-ring);` inactive: `color: var(--ink-2)`. The hamburger drawer stays for the long lists.
   - A **week rail** under the brand row, replacing the buried `WeekSelect` on the dashboard (keep `WeekSelect` for other pages). Each week is a `min-width: 30px; text-align: center; padding: 5px 0; border-radius: 6px;` cell; current week `background: var(--series-1); color: #fff; font-weight: 700`; played weeks `color: var(--muted)`; unplayed `color: var(--baseline)`; then a `Playoffs →` link in `var(--progress-post)` and, right-aligned, `82.4% of the season played · synced <time>`.
2. **Lead story** (new) — replaces the first `.tile`. Grid `1.35fr 1fr`, gap 22px.
   - Left card: `border-radius: 14px; border: 1px solid var(--border); padding: 26px 28px; background: linear-gradient(115deg, #4a2a86 0%, #17102a 62%);` in dark. In light use `linear-gradient(115deg, #1e6b42 0%, #14512f 70%)` with `#fff` text (same inversion the existing `--recap-tile-*` does).
   - Contents: gold kicker (`👑 Week N · high score of the season`), 84px figure, 22px/600 Archivo headline, 13.5px `var(--ink-2)` blurb (max 44ch), then a row of four label/value pairs (Perf, Manager, Left on bench, ROL %) at kicker 10.5px + 20px/700 Archivo.
   - Source data: `weekBreakdown()` already returns `score`, `performancePct`, `managerScorePct`, `winPctVsLeague`; bench points = `optimal - score`. The headline sentence should come from the recap when one exists (`latestRecap(season).title`), else fall back to `"<manager> posts <score>"`.
   - Right column: the remaining three tiles, restyled — `background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 16px; display:flex; align-items:center; gap:14px;` label+sub on the left, a 34px Barlow figure on the right (`var(--series-1)` for Perf, `var(--good)` for Manager, `var(--ink)` for MVP).
3. **Latest recap tile** — keep exactly as today (`.recap-preview`, `--recap-tile-*`), just with `--font-display` on its label and Archivo 700/17px on the title. This must stay on the dashboard.
4. **Season progress** — `SeasonProgressTile` unchanged.
5. **Standings** — `StandingsTable` gains a **Compact / Full** toggle.
   - Compact: Rank, Team (with movement arrow and 🏆 inline), Record, PF, Mgr %. Five columns, no horizontal scroll at 390px.
   - Full: all 13 of today's columns, unchanged headers and `managerClass`/`performanceClass` threshold pills.
   - The toggle is a segmented control (see §6). Keep sorting, `PLAYOFF_SPOTS` red rule and `champ-row` in both modes. On phones, Compact renders as one card per team instead of a table (see §5).
6. **Week N scores** — `MatchupBreakdownList` gains the same toggle: *Scores only* (Team + Score) vs *Full metrics* (today's six columns). Keep the `Full box score →` link.
7. **Season heat** (new) — full-width, **directly below Week N scores and above Players of the week**. See §4.
8. **Players of the week** — tabs *Week N* / *Best of the season* / *All-time top 50* over the existing `PlayersOfWeek`, `TopSeasonPlayers` and a link to `/rankings`. Cards keep `.pos-card` but the position heading takes the position colour token (`--pos-qb`/`--pos-rb`/`--pos-wr`/`--pos-te`; K and DEF use `--muted`) in the kicker style, and the points figure becomes a 26px Barlow figure.
9. **League charts** — keep `LeagueChartsBoard` as is (chips + two `TeamsLineChart`s + `DataTable`). Optionally restyle the rank chart as a bump chart later; not required for this pass.

### 3. Season heat (new component)
`src/components/SeasonHeat.tsx` — a matrix, one row per team, one cell per week.

- Grid: `grid-template-columns: 74px repeat(N, 1fr); gap: 4px;` (phone: `52px repeat(N, 1fr); gap: 2.5px`).
- Header row: week numbers, 11.5px, `var(--muted)`, centred. On phones label every other week.
- Cell: `height: 24px; border-radius: 3px;` (phone 17px). Fill encodes score against that week's league median:
  - above median → `rgba(12,163,12,α)` in dark / `rgba(30,107,66,α)` in light (i.e. `--good`),
  - below median → `rgba(208,59,59,α)` in dark / `rgba(179,64,47,α)` in light (i.e. `--critical`),
  - α scales 0.2 → 0.95 with distance from the median; clamp so no cell is invisible.
- The season-high cell gets `box-shadow: 0 0 0 2px var(--progress-post)`.
- Row label: Archivo 600/13px; rows outside the playoff cut use `var(--ink-2)`.
- Legend under the matrix: "Below median" — a 200×8px `linear-gradient(90deg, critical, transparent, good)` bar — "Above", plus a gold-outlined `season high` chip.
- Tabs: *vs median* (default) / *Raw score* / *Manager %* — same data, different encoding.
- A cell click routes to `/week/{w}?season={season}&box={matchupId}#matchup-{matchupId}`; a row-label click routes to `/team/{slug}?season={season}`.
- Data: `weeklyScoreSeries(leagueId)` + `weeklyMedians(leagueId)`, both already in `src/lib/stats.ts`. Show the first 6 teams then a `+N more` expander row on phones.

### 4. Segmented Compact/Full control (new component)
`src/components/SegTabs.tsx`. Markup: a wrapper with `display:flex; gap:3px; padding:3px; border-radius:9px; background: var(--surface-2); border: 1px solid var(--baseline);` and one `<button>` per option: `padding: 5px 12px; border-radius: 6px; font: 600 12px var(--font-ui);` inactive `color: var(--ink-2)`, active `background: var(--series-1); color: #fff`. Phone size: `padding: 4px 9px; font-size: 11px`.

Persist the choice in `localStorage` per section key so a manager who prefers Full always gets Full. Add `:focus-visible { outline: 2px solid var(--series-1); outline-offset: 1px; }` to match the existing controls.

### 5. Manager page (`src/app/team/[slug]/page.tsx`)
- Page head: kicker `Manager · {season} · #{rank} in the league`, then the manager name as a 52px Barlow uppercase `h1`. `PageNav` and `TeamWeekPicker` move to the right of that row as pill selects.
- `RankTiles`: keep the four tiles and their full-board modal. Restyle to the inverted tile (`--recap-tile-bg`/`-ink`/`-muted`), 44px Barlow rank figure, and the existing `See full rankings →` affordance in the tile's muted colour.
- `TeamWeeklyChart` unchanged; keep the chips and `View as table`.
- `MostStartedPlayers` becomes a list of rows: 38px headshot, name + `POS · TEAM · N weeks started · high X`, 24px Barlow points figure.
- Best/worst matchup keep `feature-tile`.
- `WeeklyResultsTable` gains the toggle: Compact = Week, Opponent, result badge, Score, Opp; Full = today's 12 columns. Footer line: `Show all N weeks ↓` on the left, season totals (`scored · best possible · benched`) on the right.
- `HeadToHead` and the week lineup (`LineupAsSet` + `OptimalLineup` side by side) unchanged.

### 6. Lifetime page (`src/app/lifetime/page.tsx`)
- Page-level tabs: Standings / Head to head / Trades / Drafts / Record book (the last links to `/records`).
- Trophy case: `CHAMPIONS` as inverted tiles; the in-progress season as a gold-outlined tile (`border: 1px solid var(--progress-post); background: var(--champ-wash)`).
- `LifetimeStandingsTable` gains the toggle: Compact = Manager, 🏆, Record, Win %; Full = today's 13 career columns.
- `SeasonPointsChart` unchanged, including the truncated axis and the `//` break mark.
- Trade tiles and `bestSeasonsByPosition` cards restyled per §2.9.

### 7. Mobile: bottom tab bar + hubs (new)
`src/components/BottomTabs.tsx`, rendered from `src/app/layout.tsx` and shown only under `max-width: 640px` (the hamburger drawer stays for desktop and as a fallback).

```css
.bottom-tabs {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  background: var(--surface-opaque);
  border-top: 1px solid var(--border);
  display: grid; grid-template-columns: repeat(5, 1fr);
  padding: 8px 4px 10px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));
}
.bottom-tab {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; min-height: 48px;               /* never below 44 */
  color: var(--muted); font: 600 10.5px var(--font-ui);
}
.bottom-tab.active { color: var(--series-1); }
```
Also add `main { padding-bottom: 86px; }` under the same media query so content clears the bar.

Five tabs, emoji kept as the league's voice: 🏈 Week · 📊 League · 👤 My team · 📰 Recaps · 🏆 History.

Two new hub routes so every drawer destination keeps a home:

- **`/league`** (📊) — list rows linking to Standings, Weekly Scores, Playoffs, **Drafts**, Trades, Managers. Row: `background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 15px; min-height: 48px; display:flex; align-items:center; gap:12px;` emoji at 20px, title Archivo 600/15px, sub 11.5px `var(--muted)`, chevron `›` in `var(--muted)`. A row may carry a badge (e.g. Playoffs → `wk 15` in `var(--progress-post)`, kicker style). Season heat can sit below the list.
- **`/history`** (🏆) — an all-time-high hero tile, then rows for Lifetime stats, Best player rankings, The Record Book (badge `1 new` when a record was set this week), Trophy case.

Full mapping from today's drawer:

| Drawer item | Tab |
|---|---|
| Dashboard | 🏈 Week |
| Weekly Scores → Week 1…N | 📊 League |
| Players (each manager) | 📊 League → Managers, and 👤 My team |
| Playoffs → bracket + rounds | 📊 League |
| **Drafts** | **📊 League** |
| Trades | 📊 League |
| Recaps | 📰 Recaps |
| Lifetime Stats | 🏆 History |
| Best Player Rankings | 🏆 History |
| The Record Book | 🏆 History |

Season switching stays in the header on every screen, as today.

### 8. Record book (`src/components/RecordBook.tsx`)
- A hero band for the headline record: gradient ground as §2.2, gold kicker, 62px Barlow figure, Archivo 600/15px holder line, 12.5px note.
- Category chips (Team / Player / Streaks / Futility): active `background: var(--accent-wash); box-shadow: inset 0 0 0 1px var(--series-1);` inactive `border: 1px solid var(--baseline); color: var(--ink-2)`.
- Record cards become rows: label kicker + holder + detail on the left; on the right a 28px Barlow figure in `var(--record-value)` (`var(--critical)` for futility records) with `Top 25 →` beneath it — that line needs `white-space: nowrap`.
- A record set in the current week gets `border: 1px solid var(--progress-post); background: var(--champ-wash)` and a `New this week` kicker.
- On phones the top-25 list opens as a bottom sheet rather than the centred `.modal`.

## Interactions & behaviour
- **Compact/Full** and the section tabs are client-side only; no refetch. Persist per-section in `localStorage`.
- Week rail: same navigation as `WeekSelect` today (`?week=N`), horizontally scrollable on phones, current week scrolled into view on mount (use `scrollLeft`, not `scrollIntoView`).
- Bottom tabs: active tab derived from `usePathname()`. Tapping the active tab returns to that hub's root.
- Hover: rows and tiles lift to `border-color: var(--muted)` — same as `.recap-preview:hover` today.
- Focus: keep the existing `outline: 2px solid var(--series-1); outline-offset: 1px`.
- Reduced motion: no new animation is introduced; the existing `prefers-reduced-motion` block still covers the splash.
- Responsive: hero grid `1.35fr 1fr` → single column under 900px; tile row `repeat(4,1fr)` → `repeat(2,1fr)` under 900px → 1 column under 560px; season heat drops to 6 rows + expander under 640px.

## Design tokens
No new colours. Everything below already exists in `src/app/globals.css` — read them from there rather than copying hexes into components.

Used in this redesign: `--page`, `--surface`, `--surface-2`, `--surface-opaque`, `--ink`, `--ink-2`, `--muted`, `--grid`, `--baseline`, `--border`, `--series-1…4`, `--good`, `--critical`, `--critical-wash`, `--accent-wash`, `--focus-ring`, `--champ-wash`, `--row-stripe`, `--progress-empty`, `--progress-fill`, `--progress-post`, `--recap-tile-bg/-ink/-muted/-border`, `--val-good-fg/-bg`, `--val-warn-fg/-bg`, `--val-bad-fg/-bg`, `--pos-qb/-rb/-wr/-te`, `--record-value/-label/-line/-holder`, `--headshot-bg`.

Two gradients are new but built only from existing values: `linear-gradient(115deg, #4a2a86 0%, #17102a 62%)` (dark hero; `#4a2a86` is `--recap-tile-ink`, `#17102a` is `--surface-opaque`) and `linear-gradient(115deg, #1e6b42 0%, #14512f 70%)` (light hero; `#1e6b42` is light `--good`). Prefer expressing them as `color-mix()`/token references.

New spacing/radius values in use: radius 14px (hero), 12px (cards/tiles — existing), 11px (phone list rows), 9px (segmented wrapper), 6-8px (segmented options, badges). Gaps: 22px between desktop columns, 12-14px between tiles, 8-10px between phone rows.

Type scale: 84 / 72 / 64 / 62 / 56 / 52 / 44 / 38 / 34 / 30 / 26 / 24 / 22 (Barlow Condensed 700) and 22 / 20 / 17 / 15 / 14.5 / 14 / 13.5 / 13 / 12.5 / 12 / 11.5 / 10.5 (Archivo 400/600/700).

## Assets
- `public/hero/logo.svg` — existing brand mark, used in the header at 38px (desktop) / 28px (phone) and on the splash.
- `public/hero/player-1.png`, `player-2.png`, `player-3.png`, `player-4.png` — existing splash cutouts. The prototype also shows them behind live league news on the splash; geometry is the current `src/app/page.tsx` (`--h` 72/66/90/80vh, `--overlap` 0/9/11/12vw, z 2/4/1/3).
- Player headshots come from `PlayerHeadshot` (ESPN → Sleeper → initials). No change.
- No new icons: the emoji already in the product (👑 ✅ 📋 🏈 🏆 😎 😤 🔁 📈) are the icon set, plus 📊 👤 📰 🗓 🏟 📝 👥 🥇 📖 for the new nav rows.

## Files
- `BMCF Redesign Explorations.dc.html` — the prototype. Turn 3 (`#3a`, `#3b`, `#3c`) is the direction to build; turn 4 (`#4a`, `#4b`, `#4c`) is the mobile navigation; turn 1 `#1a` is the faithful recreation of today's dashboard for before/after comparison.
- `globals.css` — a copy of the app's current stylesheet, for token reference.
- `github.md` — repo/branch association and the screen → source-file map.

## Suggested commit order
1. Fonts + `--font-display`/`--font-ui` tokens + `.section-title`/`.kicker`/`.figure` classes (no layout change yet).
2. `SegTabs` + Compact/Full on `StandingsTable`.
3. Dashboard lead story + week rail.
4. `SeasonHeat` and its placement below Week N scores.
5. `BottomTabs` + `/league` and `/history` hubs.
6. Manager page, lifetime page, record book.
