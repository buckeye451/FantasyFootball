# BMCF League

A fantasy football dashboard for the BMCF league, backed by the
[Sleeper API](https://docs.sleeper.com). Weekly data is pulled from Sleeper
into a local SQLite database automatically, and the site serves:

- **Dashboard** — standings (with week-over-week movement), best players of the
  season by position, players of the week, a weekly-scores line chart, and a
  week-by-week standings chart. Click up to four teams to highlight them across
  both charts.
- **A tab for every manager** — season stats, weekly results, the exact lineup
  they set each week, and the **optimal lineup** for that week with every
  should-have-started player they left on the bench highlighted in red, plus a
  season-long "lineup efficiency" score.

## Quick start

```bash
npm install

# Option A: your real league
cp .env.example .env         # put your Sleeper league id in SLEEPER_LEAGUE_ID
npm run sync                 # pull league, rosters, matchups, players into SQLite

# Option B: demo data (the real 2024 BMCF season — scores, schedule, standings)
npm run seed:demo

npm run dev                  # http://localhost:3000
```

Your Sleeper league id is the long number in your league's URL:
`https://sleeper.com/leagues/<LEAGUE_ID>/...`. The Sleeper read API is public —
no API key needed. Node **22.13+** is required (the app uses the built-in
`node:sqlite` driver, so there are no database dependencies to install).

## How data collection works

`src/lib/sync.ts` pulls from Sleeper and upserts into `data/league.db`:

| Sleeper endpoint | What it fills |
|---|---|
| `/league/{id}` | league name, season, roster slots, playoff week |
| `/league/{id}/users` + `/rosters` | managers and their teams |
| `/league/{id}/matchups/{week}` | every week's scores, starters, and per-player points |
| `/players/nfl` | names/positions/teams for every player the league has rostered (cached to disk, refreshed at most daily) |

Sync is idempotent — run it as often as you like. Three ways to keep data fresh
during the season:

1. **In-app auto-sync** — set `AUTO_SYNC=true` (and optionally
   `AUTO_SYNC_MINUTES`, default 60) and the running server re-syncs itself on an
   interval.
2. **Cron** — schedule `npm run sync`, or ping `POST /api/sync` on the running
   app.
3. **Manual** — `npm run sync` whenever you feel like it.

## Demo season

`npm run seed:demo` loads the league's real 2024 season: the actual weekly
scores, schedule, records, and standings for all ten teams (transcribed from the
BMCF24League spreadsheet — the seed asserts the computed records match the
sheet). Player-level rosters and per-player weekly points are generated, with
starter points scaled so each team's weekly total matches the real score
exactly. Running `npm run sync` against a real league id replaces the demo data.

## Project layout

```
src/lib/db.ts        SQLite schema + connection (node:sqlite, WAL mode)
src/lib/sleeper.ts   Sleeper REST client
src/lib/sync.ts      ingestion (idempotent upserts, player-dump caching)
src/lib/autosync.ts  optional in-process sync scheduler
src/lib/optimal.ts   optimal-lineup solver (fills most-restrictive slots first)
src/lib/stats.ts     standings, rank history, player aggregates, team seasons
src/app/             Next.js pages: dashboard, /team/[slug], /api/sync
src/components/      tables, charts (Recharts), roster/optimal lineup views
scripts/             CLI sync + demo seed
data/                SQLite database + player cache (gitignored)
```

## Deploying for the league

Any Node 22.13+ host that can keep a process and a disk file works (Railway,
Fly.io, Render, a Raspberry Pi…): `npm run build && npm run start`, set
`SLEEPER_LEAGUE_ID` and `AUTO_SYNC=true`, and share the URL with the league.
Serverless platforms without a persistent filesystem (e.g. Vercel's default
setup) won't persist the SQLite file between deploys — prefer a host with a
volume.
