import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'league.db');

// Bump when the schema changes in a way that needs a rebuild. All data here is
// re-fetchable from Sleeper, so migrating just drops the re-syncable tables and
// lets the next sync repopulate them.
const SCHEMA_VERSION = 9;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS league (
  league_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  status TEXT,
  total_rosters INTEGER NOT NULL,
  roster_positions TEXT NOT NULL,
  scoring_settings TEXT,
  settings TEXT,
  previous_league_id TEXT,
  last_synced_at TEXT,
  -- Set only when a sync of this league runs all the way to completion. A
  -- partial/interrupted sync (e.g. Sleeper rate-limiting mid-backfill) leaves
  -- this NULL, so the caching logic keeps retrying instead of locking in the
  -- incomplete data as "done".
  fully_synced_at TEXT
);
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  team_name TEXT,
  avatar TEXT
);
CREATE TABLE IF NOT EXISTS rosters (
  league_id TEXT NOT NULL,
  roster_id INTEGER NOT NULL,
  owner_id TEXT,
  display_name TEXT,
  team_name TEXT,
  PRIMARY KEY (league_id, roster_id)
);
CREATE TABLE IF NOT EXISTS matchups (
  league_id TEXT NOT NULL,
  week INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  matchup_id INTEGER,
  points REAL NOT NULL,
  starters TEXT NOT NULL,
  players TEXT NOT NULL,
  players_points TEXT NOT NULL,
  PRIMARY KEY (league_id, week, roster_id)
);
CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  position TEXT,
  team TEXT,
  fantasy_positions TEXT,
  -- NFL GSIS id, used to join Sleeper players to nflverse historical data.
  gsis_id TEXT,
  -- ESPN athlete id, used to build headshot URLs.
  espn_id TEXT
);
-- The team a player actually played for in a past season (from nflverse).
-- Sleeper only reports a player's current team, which is wrong for old seasons.
CREATE TABLE IF NOT EXISTS player_season_teams (
  season TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team TEXT NOT NULL,
  PRIMARY KEY (season, player_id)
);
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at TEXT NOT NULL,
  scope TEXT NOT NULL,
  detail TEXT
);
CREATE TABLE IF NOT EXISTS projections (
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  pts_std REAL,
  pts_half REAL,
  pts_ppr REAL,
  PRIMARY KEY (season, week, player_id)
);
CREATE TABLE IF NOT EXISTS brackets (
  league_id TEXT NOT NULL,
  bracket_type TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (league_id, bracket_type)
);
CREATE TABLE IF NOT EXISTS player_season_stats (
  season TEXT NOT NULL,
  player_id TEXT NOT NULL,
  position TEXT,
  pts_std REAL,
  pts_half REAL,
  pts_ppr REAL,
  PRIMARY KEY (season, player_id)
);
CREATE TABLE IF NOT EXISTS draft_picks (
  league_id TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  pick_no INTEGER NOT NULL,
  round INTEGER,
  draft_slot INTEGER,
  roster_id INTEGER,
  picked_by TEXT,
  player_id TEXT NOT NULL,
  player_name TEXT,
  position TEXT,
  PRIMARY KEY (league_id, pick_no)
);
-- Completed trades between managers (from Sleeper's transactions feed).
CREATE TABLE IF NOT EXISTS trades (
  league_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  week INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (league_id, transaction_id)
);
-- Weekly recap posts. UNLIKE every other table here this is user-authored and
-- cannot be re-fetched from anywhere, so it must never be dropped by migrate().
CREATE TABLE IF NOT EXISTS recaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season TEXT NOT NULL,
  title TEXT NOT NULL,
  preheader TEXT,
  body TEXT NOT NULL,
  images TEXT,          -- JSON array of stored file names
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recaps_season ON recaps (season, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matchups_week ON matchups (league_id, week);
CREATE INDEX IF NOT EXISTS idx_projections_week ON projections (season, week);
`;

function migrate(db: DatabaseSync): void {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  if (row.user_version < SCHEMA_VERSION) {
    // Safe: everything below is re-synced from Sleeper. Dropping lets the new
    // schema (e.g. per-season roster names) take effect on existing databases.
    // NEVER add `recaps` here — those posts are written by hand and cannot be
    // recovered from any API.
    db.exec(`
      DROP TABLE IF EXISTS matchups;
      DROP TABLE IF EXISTS rosters;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS league;
      DROP TABLE IF EXISTS sync_log;
      DROP TABLE IF EXISTS projections;
      DROP TABLE IF EXISTS brackets;
      DROP TABLE IF EXISTS player_season_stats;
      DROP TABLE IF EXISTS draft_picks;
      DROP TABLE IF EXISTS trades;
      DROP TABLE IF EXISTS players;
      DROP TABLE IF EXISTS player_season_teams;
    `);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA); // ensure tables exist (old shape on a pre-migration DB)
  migrate(db); // drop re-syncable tables if the schema version advanced
  db.exec(SCHEMA); // recreate with the current shape
  return db;
}

// Reuse one handle across Next.js dev-mode hot reloads.
const globalForDb = globalThis as unknown as { __leagueDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!globalForDb.__leagueDb) {
    globalForDb.__leagueDb = open();
  }
  return globalForDb.__leagueDb;
}
