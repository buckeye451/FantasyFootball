import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'league.db');

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
  last_synced_at TEXT
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
  fantasy_positions TEXT
);
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at TEXT NOT NULL,
  scope TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_matchups_week ON matchups (league_id, week);
`;

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
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
