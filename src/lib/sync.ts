import fs from 'node:fs';
import path from 'node:path';
import { getDb, DB_PATH } from './db';
import { sleeper } from './sleeper';
import type {
  SleeperLeague,
  SleeperMatchup,
  SleeperPlayer,
  SleeperRoster,
  SleeperUser,
} from './types';

// Keep the player-dump cache next to the DB so it lands on the same volume.
const PLAYERS_CACHE = path.join(path.dirname(DB_PATH), 'players-cache.json');
const PLAYERS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Sleeper asks for ≤ 1 fetch/day

export function upsertLeague(league: SleeperLeague): void {
  getDb()
    .prepare(
      `INSERT INTO league (league_id, name, season, status, total_rosters, roster_positions, scoring_settings, settings, previous_league_id, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(league_id) DO UPDATE SET
         name = excluded.name, season = excluded.season, status = excluded.status,
         total_rosters = excluded.total_rosters, roster_positions = excluded.roster_positions,
         scoring_settings = excluded.scoring_settings, settings = excluded.settings,
         previous_league_id = excluded.previous_league_id,
         last_synced_at = excluded.last_synced_at`
    )
    .run(
      league.league_id,
      league.name,
      league.season,
      league.status ?? null,
      league.total_rosters,
      JSON.stringify(league.roster_positions),
      JSON.stringify(league.scoring_settings ?? {}),
      JSON.stringify(league.settings ?? {}),
      league.previous_league_id ?? null,
      new Date().toISOString()
    );
}

export function upsertUsers(leagueId: string, users: SleeperUser[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO users (user_id, league_id, display_name, team_name, avatar)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       league_id = excluded.league_id, display_name = excluded.display_name,
       team_name = excluded.team_name, avatar = excluded.avatar`
  );
  for (const u of users) {
    stmt.run(u.user_id, leagueId, u.display_name, u.metadata?.team_name ?? null, u.avatar ?? null);
  }
}

/**
 * Store rosters with the manager + team name denormalized per league, so a
 * team's identity is correct for the season being viewed even if the manager
 * renamed their team in a later year.
 */
export function upsertRosters(leagueId: string, rosters: SleeperRoster[], users: SleeperUser[]): void {
  const db = getDb();
  const byId = new Map(users.map((u) => [u.user_id, u]));
  const stmt = db.prepare(
    `INSERT INTO rosters (league_id, roster_id, owner_id, display_name, team_name)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(league_id, roster_id) DO UPDATE SET
       owner_id = excluded.owner_id, display_name = excluded.display_name,
       team_name = excluded.team_name`
  );
  for (const r of rosters) {
    const u = r.owner_id ? byId.get(r.owner_id) : undefined;
    const display = u?.display_name ?? `Team ${r.roster_id}`;
    stmt.run(leagueId, r.roster_id, r.owner_id ?? null, display, u?.metadata?.team_name ?? null);
  }
}

export function upsertMatchups(leagueId: string, week: number, matchups: SleeperMatchup[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO matchups (league_id, week, roster_id, matchup_id, points, starters, players, players_points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(league_id, week, roster_id) DO UPDATE SET
       matchup_id = excluded.matchup_id, points = excluded.points,
       starters = excluded.starters, players = excluded.players,
       players_points = excluded.players_points`
  );
  for (const m of matchups) {
    stmt.run(
      leagueId,
      week,
      m.roster_id,
      m.matchup_id ?? null,
      m.points ?? 0,
      JSON.stringify(m.starters ?? []),
      JSON.stringify(m.players ?? []),
      JSON.stringify(m.players_points ?? {})
    );
  }
}

export function upsertPlayers(players: Record<string, SleeperPlayer>, onlyIds?: Set<string>): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO players (player_id, full_name, position, team, fantasy_positions)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET
       full_name = excluded.full_name, position = excluded.position,
       team = excluded.team, fantasy_positions = excluded.fantasy_positions`
  );
  for (const [id, p] of Object.entries(players)) {
    if (onlyIds && !onlyIds.has(id)) continue;
    // Team defenses come back keyed by team code with no name fields.
    const name = p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(' ') ?? id;
    stmt.run(
      id,
      name || id,
      p.position ?? null,
      p.team ?? null,
      JSON.stringify(p.fantasy_positions ?? (p.position ? [p.position] : []))
    );
  }
}

function logSync(scope: string, detail: string): void {
  getDb()
    .prepare('INSERT INTO sync_log (ran_at, scope, detail) VALUES (?, ?, ?)')
    .run(new Date().toISOString(), scope, detail);
}

async function fetchPlayersDump(): Promise<Record<string, SleeperPlayer>> {
  try {
    const stat = fs.statSync(PLAYERS_CACHE);
    if (Date.now() - stat.mtimeMs < PLAYERS_CACHE_TTL_MS) {
      return JSON.parse(fs.readFileSync(PLAYERS_CACHE, 'utf8'));
    }
  } catch {
    // no cache yet
  }
  const dump = await sleeper.allPlayers();
  fs.mkdirSync(path.dirname(PLAYERS_CACHE), { recursive: true });
  fs.writeFileSync(PLAYERS_CACHE, JSON.stringify(dump));
  return dump;
}

/**
 * Pull everything for a league from Sleeper into SQLite: league settings,
 * users, rosters, every scored week's matchups, and metadata for every player
 * that appears in the league. Idempotent — safe to run on a schedule.
 */
export async function syncLeague(leagueId: string): Promise<string> {
  const league = await sleeper.league(leagueId);
  upsertLeague(league);

  const [users, rosters, state] = await Promise.all([
    sleeper.users(leagueId),
    sleeper.rosters(leagueId),
    sleeper.state(),
  ]);
  upsertUsers(leagueId, users);
  upsertRosters(leagueId, rosters, users);

  // Which weeks exist? For the season in progress, sync through the current
  // week; for a finished (or archived) season, walk every possible week and
  // keep the ones that were actually scored.
  const inThisSeason = state.season === league.season && league.status === 'in_season';
  const lastWeek = inThisSeason ? state.week : 18;

  const referenced = new Set<string>();
  let storedWeeks = 0;
  for (let week = 1; week <= lastWeek; week++) {
    const matchups = await sleeper.matchups(leagueId, week);
    if (!matchups || matchups.length === 0) continue;
    const scored = matchups.some((m) => (m.points ?? 0) > 0);
    if (!scored && !inThisSeason) continue; // unplayed future week of an old season
    upsertMatchups(leagueId, week, matchups);
    storedWeeks++;
    for (const m of matchups) {
      for (const id of m.players ?? []) referenced.add(id);
      for (const id of m.starters ?? []) referenced.add(id);
    }
  }
  for (const r of rosters) {
    for (const id of r.players ?? []) referenced.add(id);
  }

  // Store metadata only for players this league has ever rostered — keeps the
  // players table at ~200 rows instead of ~12,000.
  const dump = await fetchPlayersDump();
  upsertPlayers(dump, referenced);

  const detail = `league=${leagueId} season=${league.season} weeks=${storedWeeks} players=${referenced.size}`;
  logSync('full', detail);
  return detail;
}

/**
 * Expand the configured league id(s) into the full set of seasons to sync by
 * walking each league's `previous_league_id` chain back through prior years.
 * Deduplicates, and caps the walk so a cycle can't loop forever.
 */
async function expandSeasons(startIds: string[]): Promise<string[]> {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const start of startIds) {
    let current: string | null = start;
    let hops = 0;
    while (current && !seen.has(current) && hops < 25) {
      seen.add(current);
      ordered.push(current);
      hops++;
      try {
        const league = await sleeper.league(current);
        current = league.previous_league_id ?? null;
      } catch {
        current = null; // stop this chain on a fetch error
      }
    }
  }
  return ordered;
}

/**
 * Sync every configured season into the database. Accepts one or more Sleeper
 * league ids (comma-separated in SLEEPER_LEAGUE_ID) and also follows each
 * league's previous-season chain, so setting just the current year's id pulls
 * the whole history automatically.
 */
export async function syncAll(leagueIds: string[]): Promise<string> {
  const all = await expandSeasons(leagueIds);
  const details: string[] = [];
  for (const id of all) {
    try {
      details.push(await syncLeague(id));
    } catch (err) {
      details.push(`league=${id} FAILED: ${String(err)}`);
    }
  }
  const detail = `synced ${all.length} season(s): ${details.join(' | ')}`;
  logSync('all', detail);
  return detail;
}

/** Configured Sleeper league id(s), comma-separated in SLEEPER_LEAGUE_ID. */
export function requireLeagueIds(): string[] {
  const raw = process.env.SLEEPER_LEAGUE_ID;
  const ids = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    throw new Error(
      'SLEEPER_LEAGUE_ID is not set. Copy .env.example to .env and add your league id ' +
        '(the number in your league URL at sleeper.com). You can list several seasons ' +
        'comma-separated, e.g. SLEEPER_LEAGUE_ID=<2026id>,<2025id>,<2024id>.'
    );
  }
  return ids;
}
