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
- **A season dropdown** — switch between every season the league has played.
  List one Sleeper league id per season in `SLEEPER_LEAGUE_ID`; the app also
  follows each league's previous-season chain, so a new season appears
  automatically once it starts.

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

## Demo seasons

`npm run seed:demo` loads three demo seasons so you can try the season dropdown:
the real **2024** season (actual weekly scores, schedule, records, and standings
for all ten teams, transcribed from the BMCF24League spreadsheet — the seed
asserts the computed records match the sheet), a **2025** variant with different
standings, and an **upcoming 2026** with teams but no games yet (which shows the
"season hasn't started" holding page). Player-level rosters and per-player weekly
points are generated, with starter points scaled so each team's weekly total
matches its score exactly. Running `npm run sync` against your real league ids
replaces all of it.

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

## Deploy to Fly.io (share it with the league)

This repo ships everything Fly needs: a `Dockerfile`, a `.dockerignore`, an
entrypoint (`scripts/docker-entrypoint.sh`), and a `fly.toml` with the league id
already filled in. Fly is a good fit because the SQLite database lives on a
persistent **volume** — data survives restarts and deploys.

### Option A — deploy from the browser via GitHub Actions (no install needed)

Best when you can't (or don't want to) install anything locally — e.g. on a work
computer. `flyctl` runs inside GitHub's servers, so you only ever use two
websites: **fly.io** and **github.com**. This repo already includes the workflow
at `.github/workflows/fly-deploy.yml`, which creates the app + volume and deploys
for you.

1. **Make a Fly account** at [fly.io](https://fly.io) and add a payment method
   (Fly requires a card on file even though a scale-to-zero app like this costs
   pennies — often nothing).
2. **Create a Fly access token** in the dashboard: click your account (top-right)
   → **Tokens** (or **Access Tokens**) → create a token → copy it. A personal
   access token or an org deploy token both work.
3. **Add the token to GitHub**: in this repo, go to **Settings → Secrets and
   variables → Actions → New repository secret**. Name it exactly
   `FLY_API_TOKEN`, paste the token, save.
4. **Deploy**: go to the **Actions** tab → **Deploy to Fly.io** → **Run
   workflow** (pick this branch) → **Run**. The run creates the app, creates the
   1 GB database volume, builds the image on Fly's servers, and boots it. When
   it finishes, the job summary prints your URL (`https://bmcf-league.fly.dev`).

After that, every push to the default branch redeploys automatically, and you
can re-run it any time from the Actions tab. If the app name `bmcf-league` is
already taken on Fly, edit the `app = ` line in `fly.toml` (the workflow reads
the name from there) and re-run.

### Option B — deploy with the flyctl CLI (if you can install it)

```bash
# 1. Install flyctl and sign in (https://fly.io/docs/flyctl/install/)
curl -L https://fly.io/install.sh | sh
fly auth signup        # or: fly auth login

# 2. From the repo root, create the app (rename in fly.toml first if taken).
fly apps create bmcf-league

# 3. Create the 1 GB volume the database lives on (match the region in fly.toml).
fly volumes create bmcf_data --size 1 --region ord

# 4. Deploy.
fly deploy
```

`fly deploy` builds the image on Fly's remote builders (no local Docker needed)
and boots the app. Open it with `fly open`, and share that URL with your league.

### What happens on deploy

- The container starts the web server immediately and, in the background, runs
  an initial sync from Sleeper into the volume — the dashboard fills in within a
  few seconds of the first boot.
- `AUTO_SYNC=true` (in `fly.toml`) makes the running app re-pull from Sleeper
  every `AUTO_SYNC_MINUTES` (default 180) while it's awake, so scores update on
  their own during the season.
- The app **scales to zero when idle** to stay cheap/free; the next visitor
  wakes it and triggers a fresh sync. Want it always warm (no cold starts)? Set
  `min_machines_running = 1` in `fly.toml` and redeploy.

### Config knobs (`fly.toml` → `[env]`)

| Var | Purpose |
|---|---|
| `SLEEPER_LEAGUE_ID` | Your league(s), comma-separated — one id per season (already set to the 2026, 2025, and 2024 leagues). |
| `AUTO_SYNC` | `true` to auto-refresh from Sleeper while running. |
| `AUTO_SYNC_MINUTES` | Minutes between auto-syncs. |
| `DB_PATH` | DB location — points at the mounted volume (`/data/league.db`). |

Force a data refresh any time without redeploying:

```bash
fly ssh console -C "npm run sync"     # or hit https://<your-app>.fly.dev/api/sync
```

### Option C — Render or Railway (fully click-through, no tokens)

If you'd rather avoid the token/secret setup entirely, [Render](https://render.com)
and [Railway](https://railway.app) both deploy straight from a GitHub repo in the
browser and reuse the same `Dockerfile`:

1. Sign in with GitHub and create a new **Web Service** (Render) / project
   (Railway) from this repo. It auto-detects the `Dockerfile`.
2. Add a **persistent disk / volume** mounted at `/data` (1 GB is plenty).
3. Set environment variables: `SLEEPER_LEAGUE_ID=1382410388192120832`,
   `AUTO_SYNC=true`, `DB_PATH=/data/league.db`.
4. Create the service — it builds and gives you a public URL.

Any Node 22.13+ host with a persistent disk works on the same principle. Avoid
serverless platforms without a persistent filesystem (e.g. Vercel's default
setup) — they won't keep the SQLite file between requests/deploys.
