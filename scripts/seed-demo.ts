/**
 * Seed the database with the real BMCF 2024 season (weeks 1–14).
 *
 * Team-level data — weekly scores, schedule, and therefore records and
 * standings — is the league's actual 2024 season, transcribed from the
 * BMCF24League spreadsheet. Player-level data (rosters and per-player weekly
 * points) is generated: starter points are scaled so every team's weekly total
 * matches the real score exactly. Run `npm run sync` against your Sleeper
 * league id to replace all of this with the real thing.
 *
 * Usage: npm run seed:demo
 */
import {
  upsertBracket,
  upsertDraftPicks,
  upsertLeague,
  upsertMatchups,
  upsertPlayers,
  upsertProjections,
  upsertRosters,
  upsertSeasonStats,
  upsertUsers,
} from '../src/lib/sync';
import { getDb } from '../src/lib/db';
import type { SleeperBracketMatch, SleeperMatchup, SleeperPlayer } from '../src/lib/types';

const MANAGERS = ['Sam', 'Cam', 'Lapel', 'Parker', 'Evan', 'Colin', 'Jack', 'Keith', 'Preston', 'Chris'];

// Real weekly scores, weeks 1–14 (from the BMCF24League sheet).
const SCORES: Record<string, number[]> = {
  Sam:     [112.08, 93.46, 136.52, 72.6, 112.04, 119, 142.62, 124.92, 126.1, 126.1, 132.68, 102.62, 154.72, 198.68],
  Cam:     [108.38, 108.86, 65.68, 70.24, 114.16, 89.6, 94.86, 118.16, 113.88, 68.94, 138.98, 104.78, 126.66, 110.92],
  Lapel:   [116.88, 114.44, 143.88, 91.26, 104.9, 95.86, 109.3, 106.38, 103.86, 111.04, 103.1, 94, 124.08, 127.42],
  Parker:  [77.16, 114.56, 111.46, 126.38, 135.78, 141.02, 105.64, 106.36, 133.62, 100.92, 98.66, 118.88, 92.46, 136.16],
  Evan:    [104.16, 159.62, 66.08, 116.1, 104.46, 92.42, 99.36, 112.8, 122.4, 88.44, 126.34, 84.52, 90.6, 94.18],
  Colin:   [83.04, 120.74, 137.18, 92.8, 136.24, 108.4, 87.08, 123.32, 98.76, 165.54, 100.64, 127.86, 105.04, 111.9],
  Jack:    [124.52, 86.32, 95.44, 114.82, 121.96, 112.86, 105.16, 105.64, 112.8, 114.48, 87.14, 104.46, 98.42, 90.32],
  Keith:   [128.86, 122, 92.9, 103.22, 105.02, 124.66, 58.04, 111.4, 91.66, 60.78, 110.44, 105.3, 137.94, 89.32],
  Preston: [139.8, 101.5, 94.92, 122.38, 102.2, 86.8, 156.6, 108.1, 117.1, 89.94, 110.55, 131.46, 102.4, 100.2],
  Chris:   [120.62, 113.58, 78.38, 125.54, 117.62, 112.02, 95.54, 144.66, 100.1, 106.9, 112.08, 102.18, 121.68, 70.72],
};

// Real weekly opponents, weeks 1–14 (from the sheet).
const SCHEDULE: Record<string, string[]> = {
  Sam:     ['Cam', 'Evan', 'Keith', 'Jack', 'Lapel', 'Parker', 'Chris', 'Preston', 'Colin', 'Cam', 'Evan', 'Keith', 'Jack', 'Lapel'],
  Cam:     ['Sam', 'Jack', 'Evan', 'Lapel', 'Keith', 'Colin', 'Parker', 'Chris', 'Preston', 'Sam', 'Jack', 'Evan', 'Lapel', 'Keith'],
  Lapel:   ['Parker', 'Chris', 'Preston', 'Cam', 'Sam', 'Evan', 'Colin', 'Keith', 'Jack', 'Parker', 'Chris', 'Preston', 'Cam', 'Sam'],
  Parker:  ['Lapel', 'Preston', 'Chris', 'Keith', 'Jack', 'Sam', 'Cam', 'Colin', 'Evan', 'Lapel', 'Preston', 'Chris', 'Keith', 'Jack'],
  Evan:    ['Colin', 'Sam', 'Cam', 'Chris', 'Preston', 'Lapel', 'Keith', 'Jack', 'Parker', 'Colin', 'Sam', 'Cam', 'Chris', 'Preston'],
  Colin:   ['Evan', 'Keith', 'Jack', 'Preston', 'Chris', 'Cam', 'Lapel', 'Parker', 'Sam', 'Evan', 'Keith', 'Jack', 'Preston', 'Chris'],
  Jack:    ['Keith', 'Cam', 'Colin', 'Sam', 'Parker', 'Chris', 'Preston', 'Evan', 'Lapel', 'Keith', 'Cam', 'Colin', 'Sam', 'Parker'],
  Keith:   ['Jack', 'Colin', 'Sam', 'Parker', 'Cam', 'Preston', 'Evan', 'Lapel', 'Chris', 'Jack', 'Colin', 'Sam', 'Parker', 'Cam'],
  Preston: ['Chris', 'Parker', 'Lapel', 'Colin', 'Evan', 'Keith', 'Jack', 'Sam', 'Cam', 'Chris', 'Parker', 'Lapel', 'Colin', 'Evan'],
  Chris:   ['Preston', 'Lapel', 'Parker', 'Evan', 'Colin', 'Jack', 'Sam', 'Cam', 'Keith', 'Preston', 'Lapel', 'Parker', 'Evan', 'Colin'],
};

// Final records from the sheet — the seed asserts it reproduces these exactly.
const EXPECTED_RECORDS: Record<string, [number, number]> = {
  Sam: [10, 4], Parker: [9, 5], Colin: [8, 6], Preston: [7, 7], Lapel: [7, 7],
  Keith: [7, 7], Chris: [6, 8], Evan: [6, 8], Cam: [6, 8], Jack: [4, 10],
};

const WEEKS = 14;
const ROSTER_POSITIONS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF', 'BN', 'BN', 'BN', 'BN', 'BN', 'BN'];

// ---- Player pool (2024 season, ordered roughly by fantasy talent) ----------
type PoolEntry = [name: string, team: string];
const POOL: Record<string, PoolEntry[]> = {
  QB: [
    ['Josh Allen', 'BUF'], ['Lamar Jackson', 'BAL'], ['Jalen Hurts', 'PHI'], ['Joe Burrow', 'CIN'],
    ['Jayden Daniels', 'WAS'], ['Baker Mayfield', 'TB'], ['Patrick Mahomes', 'KC'], ['Jared Goff', 'DET'],
    ['Sam Darnold', 'MIN'], ['Brock Purdy', 'SF'], ['Justin Herbert', 'LAC'], ['C.J. Stroud', 'HOU'],
    ['Kyler Murray', 'ARI'], ['Jordan Love', 'GB'], ['Caleb Williams', 'CHI'], ['Geno Smith', 'SEA'],
    ['Bo Nix', 'DEN'], ['Tua Tagovailoa', 'MIA'], ['Matthew Stafford', 'LAR'], ['Dak Prescott', 'DAL'],
  ],
  RB: [
    ['Saquon Barkley', 'PHI'], ['Derrick Henry', 'BAL'], ['Bijan Robinson', 'ATL'], ['Jahmyr Gibbs', 'DET'],
    ['Josh Jacobs', 'GB'], ['Kyren Williams', 'LAR'], ['James Cook', 'BUF'], ['Breece Hall', 'NYJ'],
    ["De'Von Achane", 'MIA'], ['Jonathan Taylor', 'IND'], ['Chase Brown', 'CIN'], ['Kenneth Walker III', 'SEA'],
    ['Aaron Jones', 'MIN'], ['Alvin Kamara', 'NO'], ['Joe Mixon', 'HOU'], ['David Montgomery', 'DET'],
    ['Bucky Irving', 'TB'], ['Chuba Hubbard', 'CAR'], ['Tony Pollard', 'TEN'], ['Najee Harris', 'PIT'],
    ['Rhamondre Stevenson', 'NE'], ["D'Andre Swift", 'CHI'], ['Rachaad White', 'TB'], ['Brian Robinson Jr.', 'WAS'],
    ['Javonte Williams', 'DEN'], ['Zack Moss', 'CIN'], ['Austin Ekeler', 'WAS'], ['Nick Chubb', 'CLE'],
    ['James Conner', 'ARI'], ['Isiah Pacheco', 'KC'], ['Christian McCaffrey', 'SF'], ['Travis Etienne', 'JAX'],
    ['Rico Dowdle', 'DAL'], ['J.K. Dobbins', 'LAC'], ['Tyrone Tracy Jr.', 'NYG'], ['Jaylen Warren', 'PIT'],
    ['Tyjae Spears', 'TEN'], ['Jerome Ford', 'CLE'], ['Ray Davis', 'BUF'], ['Justice Hill', 'BAL'],
  ],
  WR: [
    ["Ja'Marr Chase", 'CIN'], ['Justin Jefferson', 'MIN'], ['CeeDee Lamb', 'DAL'], ['Amon-Ra St. Brown', 'DET'],
    ['Puka Nacua', 'LAR'], ['Malik Nabers', 'NYG'], ['Brian Thomas Jr.', 'JAX'], ['Drake London', 'ATL'],
    ['A.J. Brown', 'PHI'], ['Terry McLaurin', 'WAS'], ['Mike Evans', 'TB'], ['Tyreek Hill', 'MIA'],
    ['Davante Adams', 'NYJ'], ['Garrett Wilson', 'NYJ'], ['Nico Collins', 'HOU'], ['Jaxon Smith-Njigba', 'SEA'],
    ['DK Metcalf', 'SEA'], ['Zay Flowers', 'BAL'], ['DJ Moore', 'CHI'], ['Jordan Addison', 'MIN'],
    ['Tee Higgins', 'CIN'], ['Courtland Sutton', 'DEN'], ['Ladd McConkey', 'LAC'], ['George Pickens', 'PIT'],
    ['Jerry Jeudy', 'CLE'], ['Marvin Harrison Jr.', 'ARI'], ['Xavier Worthy', 'KC'], ['Chris Godwin', 'TB'],
    ['Stefon Diggs', 'HOU'], ['DeVonta Smith', 'PHI'], ['Amari Cooper', 'BUF'], ['Calvin Ridley', 'TEN'],
    ['Rome Odunze', 'CHI'], ['Keenan Allen', 'CHI'], ['Cooper Kupp', 'LAR'], ['Jakobi Meyers', 'LV'],
    ['Khalil Shakir', 'BUF'], ['Deebo Samuel', 'SF'], ['Brandon Aiyuk', 'SF'], ['Christian Kirk', 'JAX'],
    ['Michael Pittman Jr.', 'IND'], ['Jaylen Waddle', 'MIA'], ['Tank Dell', 'HOU'], ['Josh Downs', 'IND'],
    ['Adam Thielen', 'CAR'], ['Jauan Jennings', 'SF'], ['Darnell Mooney', 'ATL'], ["Wan'Dale Robinson", 'NYG'],
    ['Quentin Johnston', 'LAC'], ['Cedric Tillman', 'CLE'],
  ],
  TE: [
    ['Brock Bowers', 'LV'], ['Trey McBride', 'ARI'], ['George Kittle', 'SF'], ['Travis Kelce', 'KC'],
    ['Sam LaPorta', 'DET'], ['T.J. Hockenson', 'MIN'], ['David Njoku', 'CLE'], ['Evan Engram', 'JAX'],
    ['Jonnu Smith', 'MIA'], ['Mark Andrews', 'BAL'], ['Dallas Goedert', 'PHI'], ['Jake Ferguson', 'DAL'],
    ['Tucker Kraft', 'GB'], ['Cade Otton', 'TB'], ['Pat Freiermuth', 'PIT'], ['Kyle Pitts', 'ATL'],
    ['Dalton Kincaid', 'BUF'], ['Cole Kmet', 'CHI'], ['Zach Ertz', 'WAS'], ['Hunter Henry', 'NE'],
  ],
  K: [
    ['Brandon Aubrey', 'DAL'], ['Jake Bates', 'DET'], ['Chris Boswell', 'PIT'], ['Cameron Dicker', 'LAC'],
    ['Justin Tucker', 'BAL'], ['Harrison Butker', 'KC'], ['Tyler Bass', 'BUF'], ['Jake Elliott', 'PHI'],
    ['Younghoe Koo', 'ATL'], ["Ka'imi Fairbairn", 'HOU'],
  ],
  DEF: [
    ['Ravens D/ST', 'BAL'], ['Steelers D/ST', 'PIT'], ['Broncos D/ST', 'DEN'], ['Eagles D/ST', 'PHI'],
    ['Vikings D/ST', 'MIN'], ['Packers D/ST', 'GB'], ['Texans D/ST', 'HOU'], ['Chiefs D/ST', 'KC'],
    ['Seahawks D/ST', 'SEA'], ['Bills D/ST', 'BUF'],
  ],
};

// Expected weekly points by position for the Nth-best player at that position,
// used to make generated scores plausible. [base, dropPerTier, noiseSd]
const POSITION_CURVE: Record<string, [number, number, number]> = {
  QB: [22, 0.45, 5],
  RB: [17, 0.28, 5.5],
  WR: [16.5, 0.22, 5.5],
  TE: [13, 0.4, 4.5],
  K: [9.5, 0.25, 3],
  DEF: [9, 0.35, 5],
};

// Deterministic PRNG so the demo is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20240905);
const gauss = () => {
  // Box–Muller
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Player {
  id: string;
  name: string;
  nfl: string;
  position: string;
  tier: number; // index in the position pool; lower = better
}

// Snake-draft each position group across the ten teams, with a different
// starting team per group so no one team hoards every top pick.
function draftRosters(): Map<string, Player[]> {
  const rosters = new Map<string, Player[]>(MANAGERS.map((m) => [m, []]));
  const perTeam: Record<string, number> = { QB: 2, RB: 4, WR: 5, TE: 2, K: 1, DEF: 1 };
  const startOffset: Record<string, number> = { QB: 0, RB: 3, WR: 6, TE: 9, K: 2, DEF: 5 };
  let nextId = 1;
  for (const [pos, pool] of Object.entries(POOL)) {
    const rounds = perTeam[pos];
    let pick = 0;
    for (let round = 0; round < rounds; round++) {
      for (let seat = 0; seat < MANAGERS.length; seat++) {
        const forward = round % 2 === 0;
        const seatIdx = forward ? seat : MANAGERS.length - 1 - seat;
        const mgr = MANAGERS[(seatIdx + startOffset[pos]) % MANAGERS.length];
        const [name, nfl] = pool[pick];
        rosters.get(mgr)!.push({ id: `D${String(nextId++).padStart(3, '0')}`, name, nfl, position: pos, tier: pick });
        pick++;
      }
    }
  }
  return rosters;
}

function rawWeekPoints(p: Player): number {
  const [base, drop, sd] = POSITION_CURVE[p.position];
  const pts = base - p.tier * drop + gauss() * sd;
  // Everyone has a dud sometimes; nobody scores negative in this demo.
  return Math.max(0, round2(pts));
}

/** Pick the lineup the manager "set" — best by reputation (tier), sometimes wrong. */
function chooseStarters(roster: Player[]): Player[] {
  const byPos = (pos: string) => roster.filter((p) => p.position === pos).sort((a, b) => a.tier - b.tier);
  const maybeSwap = (list: Player[], idx: number) =>
    // 18% of the time the manager plays a hunch and starts the next guy down.
    list.length > idx + 1 && rand() < 0.18 ? list[idx + 1] : list[idx];

  const qb = maybeSwap(byPos('QB'), 0);
  const rbs = byPos('RB');
  const wrs = byPos('WR');
  const te = maybeSwap(byPos('TE'), 0);
  const rb1 = maybeSwap(rbs, 0);
  const rb2 = rbs.find((p) => p !== rb1) ?? rbs[1];
  const wr1 = maybeSwap(wrs, 0);
  const wr2 = wrs.find((p) => p !== wr1) ?? wrs[1];
  const used = new Set([qb, rb1, rb2, te, wr1, wr2]);
  const flexPool = roster
    .filter((p) => ['RB', 'WR', 'TE'].includes(p.position) && !used.has(p))
    .sort((a, b) => a.tier - b.tier);
  const flex = maybeSwap(flexPool, 0);
  return [qb, rb1, rb2, wr1, wr2, te, flex, byPos('K')[0], byPos('DEF')[0]];
}

interface SeasonConfig {
  leagueId: string;
  season: string;
  previousLeagueId: string | null;
  /** Shift applied to the score columns so each season's data differs (0 = real 2024). */
  rotate: number;
  /** Verify the computed records match the sheet (only meaningful when rotate === 0). */
  assert: boolean;
}

/** A manager's weekly score, optionally rotated onto a different manager's column. */
function scoreOf(mgr: string, weekIdx: number, rotate: number): number {
  const idx = MANAGERS.indexOf(mgr);
  const src = MANAGERS[(idx + rotate) % MANAGERS.length];
  return SCORES[src][weekIdx];
}

function seedSeason(cfg: SeasonConfig): void {
  upsertLeague({
    league_id: cfg.leagueId,
    name: 'BMCF League',
    season: cfg.season,
    status: 'complete',
    total_rosters: 10,
    roster_positions: ROSTER_POSITIONS,
    previous_league_id: cfg.previousLeagueId,
    scoring_settings: {},
    settings: { playoff_week_start: 15 },
  });

  const users = MANAGERS.map((m, i) => ({
    user_id: `demo-u${i + 1}`,
    display_name: m,
    avatar: null,
    metadata: { team_name: `Team ${m}` },
  }));
  upsertUsers(cfg.leagueId, users);

  const rosters = draftRosters();
  upsertRosters(
    cfg.leagueId,
    MANAGERS.map((m, i) => ({
      roster_id: i + 1,
      owner_id: `demo-u${i + 1}`,
      league_id: cfg.leagueId,
      players: rosters.get(m)!.map((p) => p.id),
    })),
    users
  );

  const playerDump: Record<string, SleeperPlayer> = {};
  for (const list of rosters.values()) {
    for (const p of list) {
      playerDump[p.id] = {
        player_id: p.id,
        full_name: p.name,
        position: p.position,
        team: p.nfl,
        fantasy_positions: [p.position],
      };
    }
  }
  upsertPlayers(playerDump);

  // Projected points per player for each week (drives Performance %). A player's
  // projection is their tier's baseline with light noise, so actual vs projected
  // varies around 100%.
  const storeProjections = (week: number) => {
    const projections: Array<{
      player_id: string;
      stats: { pts_std: number; pts_half_ppr: number; pts_ppr: number };
    }> = [];
    for (const list of rosters.values()) {
      for (const p of list) {
        const [base, drop] = POSITION_CURVE[p.position];
        const v = Math.max(0, round2(base - p.tier * drop + gauss() * 1.5));
        projections.push({ player_id: p.id, stats: { pts_std: v, pts_half_ppr: v, pts_ppr: v } });
      }
    }
    upsertProjections(cfg.season, week, projections);
  };

  for (let week = 1; week <= WEEKS; week++) {
    const matchupIds = new Map<string, number>();
    let nextMatchup = 1;
    for (const mgr of MANAGERS) {
      if (matchupIds.has(mgr)) continue;
      const opp = SCHEDULE[mgr][week - 1];
      matchupIds.set(mgr, nextMatchup);
      matchupIds.set(opp, nextMatchup);
      nextMatchup++;
    }

    const rows: SleeperMatchup[] = MANAGERS.map((mgr, i) => {
      const roster = rosters.get(mgr)!;
      const target = scoreOf(mgr, week - 1, cfg.rotate);
      const starters = chooseStarters(roster);

      const points: Record<string, number> = {};
      for (const p of roster) points[p.id] = rawWeekPoints(p);

      // Scale the started nine so they sum to the weekly total exactly.
      const rawSum = starters.reduce((s, p) => s + points[p.id], 0);
      const factor = rawSum > 0 ? target / rawSum : 0;
      for (const p of starters) points[p.id] = round2(points[p.id] * factor);
      const adjusted = starters.reduce((s, p) => s + points[p.id], 0);
      const anchor = starters.reduce((a, b) => (points[a.id] >= points[b.id] ? a : b));
      points[anchor.id] = round2(points[anchor.id] + (target - adjusted));

      return {
        roster_id: i + 1,
        matchup_id: matchupIds.get(mgr)!,
        points: target,
        starters: starters.map((p) => p.id),
        players: roster.map((p) => p.id),
        players_points: points,
      };
    });
    upsertMatchups(cfg.leagueId, week, rows);
    storeProjections(week);
  }

  // ---- Playoffs: top-6 bracket over weeks 15–17 ----
  const rid = (mgr: string) => MANAGERS.indexOf(mgr) + 1;
  const seedOrder = MANAGERS.map((mgr) => {
    let w = 0;
    let pf = 0;
    for (let wk = 0; wk < WEEKS; wk++) {
      const s = scoreOf(mgr, wk, cfg.rotate);
      const o = scoreOf(SCHEDULE[mgr][wk], wk, cfg.rotate);
      if (s > o) w++;
      pf += s;
    }
    return { mgr, w, pf };
  }).sort((a, b) => b.w - a.w || b.pf - a.pf);
  const seed = (n: number) => rid(seedOrder[n - 1].mgr);

  const PLAYOFF_WEEKS = [15, 16, 17];
  const scoreAt: Record<number, Record<number, number>> = {};
  for (const week of PLAYOFF_WEEKS) {
    scoreAt[week] = {};
    const rows: SleeperMatchup[] = MANAGERS.map((mgr, i) => {
      const roster = rosters.get(mgr)!;
      const starters = chooseStarters(roster);
      const points: Record<string, number> = {};
      for (const p of roster) points[p.id] = rawWeekPoints(p);
      const total = round2(starters.reduce((s, p) => s + points[p.id], 0));
      scoreAt[week][i + 1] = total;
      return {
        roster_id: i + 1,
        matchup_id: Math.floor(i / 2) + 1,
        points: total,
        starters: starters.map((p) => p.id),
        players: roster.map((p) => p.id),
        players_points: points,
      };
    });
    upsertMatchups(cfg.leagueId, week, rows);
    storeProjections(week);
  }

  const winnerOf = (week: number, a: number, b: number) => (scoreAt[week][a] >= scoreAt[week][b] ? a : b);
  const loserOf = (week: number, a: number, b: number) => (scoreAt[week][a] >= scoreAt[week][b] ? b : a);

  // Round 1 (week 15): 3v6, 4v5 (seeds 1–2 get a bye).
  const w1 = winnerOf(15, seed(3), seed(6));
  const l1 = loserOf(15, seed(3), seed(6));
  const w2 = winnerOf(15, seed(4), seed(5));
  const l2 = loserOf(15, seed(4), seed(5));
  // Round 2 (week 16): 1 vs winner(m2), 2 vs winner(m1).
  const w3 = winnerOf(16, seed(1), w2);
  const l3 = loserOf(16, seed(1), w2);
  const w4 = winnerOf(16, seed(2), w1);
  const l4 = loserOf(16, seed(2), w1);
  // Round 3 (week 17): championship + third place.
  const champ = winnerOf(17, w3, w4);
  const runner = loserOf(17, w3, w4);
  const third = winnerOf(17, l3, l4);
  const fourth = loserOf(17, l3, l4);

  const bracket: SleeperBracketMatch[] = [
    { r: 1, m: 1, t1: seed(3), t2: seed(6), w: w1, l: l1 },
    { r: 1, m: 2, t1: seed(4), t2: seed(5), w: w2, l: l2 },
    { r: 2, m: 3, t1: seed(1), t2: { w: 2 }, w: w3, l: l3 },
    { r: 2, m: 4, t1: seed(2), t2: { w: 1 }, w: w4, l: l4 },
    { r: 3, m: 5, t1: { w: 3 }, t2: { w: 4 }, w: champ, l: runner, p: 1 },
    { r: 3, m: 6, t1: { l: 3 }, t2: { l: 4 }, w: third, l: fourth, p: 3 },
  ];
  upsertBracket(cfg.leagueId, 'winners', bracket);

  // Consolation bracket for seeds 7–10 — its winner is the "ultimate loser".
  const c1 = winnerOf(15, seed(7), seed(10));
  const cl1 = loserOf(15, seed(7), seed(10));
  const c2 = winnerOf(15, seed(8), seed(9));
  const cl2 = loserOf(15, seed(8), seed(9));
  const consolationWinner = winnerOf(16, c1, c2);
  const consolationRunner = loserOf(16, c1, c2);
  const consolation: SleeperBracketMatch[] = [
    { r: 1, m: 1, t1: seed(7), t2: seed(10), w: c1, l: cl1 },
    { r: 1, m: 2, t1: seed(8), t2: seed(9), w: c2, l: cl2 },
    { r: 2, m: 3, t1: { w: 1 }, t2: { w: 2 }, w: consolationWinner, l: consolationRunner, p: 1 },
  ];
  upsertBracket(cfg.leagueId, 'losers', consolation);

  // Season-total stats for the Lifetime page — includes players nobody
  // rostered (mirrors Sleeper's league-wide season stats endpoint).
  const statsDump: Record<string, SleeperPlayer> = {};
  const seasonStats: Record<string, Record<string, number | undefined>> = {};
  for (const list of rosters.values()) {
    for (const p of list) {
      statsDump[p.id] = {
        player_id: p.id,
        full_name: p.name,
        position: p.position,
        team: p.nfl,
        fantasy_positions: [p.position],
      };
      const [base, drop] = POSITION_CURVE[p.position];
      const total = Math.max(0, round2((base - p.tier * drop) * WEEKS + gauss() * 22));
      seasonStats[p.id] = { pts_std: total, pts_half_ppr: total, pts_ppr: total };
    }
  }
  const unrostered: Array<[string, string, string, number]> = [
    ['Russell Wilson', 'PIT', 'QB', 12],
    ['Ezekiel Elliott', 'DAL', 'RB', 30],
    ['Tyler Lockett', 'SEA', 'WR', 36],
    ['Gerald Everett', 'CHI', 'TE', 14],
    ['Greg Zuerlein', 'NYJ', 'K', 8],
    ['Jets D/ST', 'NYJ', 'DEF', 8],
  ];
  unrostered.forEach(([name, nfl, pos, tier], i) => {
    const id = `U${String(i + 1).padStart(3, '0')}`;
    statsDump[id] = { player_id: id, full_name: name, position: pos, team: nfl, fantasy_positions: [pos] };
    const [base, drop] = POSITION_CURVE[pos];
    const total = Math.max(0, round2((base - tier * drop) * WEEKS + gauss() * 22));
    seasonStats[id] = { pts_std: total, pts_half_ppr: total, pts_ppr: total };
  });
  upsertSeasonStats(cfg.season, seasonStats, statsDump);

  // ---- Draft: order every rostered player by value, snake-ish overall order ----
  const drafted = MANAGERS.flatMap((mgr) => rosters.get(mgr)!.map((p) => ({ mgr, p })));
  drafted.sort((a, b) => {
    const va = POSITION_CURVE[a.p.position][0] - a.p.tier * POSITION_CURVE[a.p.position][1];
    const vb = POSITION_CURVE[b.p.position][0] - b.p.tier * POSITION_CURVE[b.p.position][1];
    return vb - va;
  });
  const draftPicks = drafted.map(({ mgr, p }, i) => {
    const rosterId = MANAGERS.indexOf(mgr) + 1;
    const [first, ...rest] = p.name.split(' ');
    return {
      pick_no: i + 1,
      round: Math.floor(i / MANAGERS.length) + 1,
      draft_slot: rosterId,
      roster_id: rosterId,
      picked_by: `demo-u${rosterId}`,
      player_id: p.id,
      metadata: { first_name: first, last_name: rest.join(' '), position: p.position, team: p.nfl },
    };
  });
  upsertDraftPicks(cfg.leagueId, `${cfg.leagueId}-draft`, draftPicks);

  if (cfg.assert) {
    // The real 2024 schedule + scores must reproduce the sheet's records.
    const failures: string[] = [];
    for (const mgr of MANAGERS) {
      let w = 0;
      let l = 0;
      for (let week = 1; week <= WEEKS; week++) {
        const opp = SCHEDULE[mgr][week - 1];
        if (SCORES[mgr][week - 1] > SCORES[opp][week - 1]) w++;
        else if (SCORES[mgr][week - 1] < SCORES[opp][week - 1]) l++;
      }
      const [ew, el] = EXPECTED_RECORDS[mgr];
      const ok = w === ew && l === el;
      if (!ok) failures.push(`${mgr}: computed ${w}-${l}, sheet says ${ew}-${el}`);
      console.log(`  ${ok ? '✓' : '✗'} ${mgr.padEnd(8)} ${w}-${l}`);
    }
    if (failures.length) {
      throw new Error(`Seeded ${cfg.season} records do not match the sheet:\n${failures.join('\n')}`);
    }
  }
  console.log(`Seeded ${cfg.season} (${cfg.leagueId}).`);
}

function main() {
  const db = getDb();
  for (const table of ['matchups', 'players', 'rosters', 'users', 'league', 'draft_picks']) {
    db.exec(`DELETE FROM ${table}`);
  }

  // Two completed seasons: 2024 is the real sheet data; 2025 is a rotated
  // variant so the seasons have visibly different standings to switch between.
  console.log('Seeding 2024 (real BMCF season)…');
  seedSeason({ leagueId: 'demo-2024', season: '2024', previousLeagueId: null, rotate: 0, assert: true });
  console.log('Seeding 2025 (variant)…');
  seedSeason({ leagueId: 'demo-2025', season: '2025', previousLeagueId: 'demo-2024', rotate: 3, assert: false });

  // Upcoming season: teams exist but no games yet — exercises the holding page.
  upsertLeague({
    league_id: 'demo-2026',
    name: 'BMCF League',
    season: '2026',
    status: 'pre_draft',
    total_rosters: 10,
    roster_positions: ROSTER_POSITIONS,
    previous_league_id: 'demo-2025',
    scoring_settings: {},
    settings: { playoff_week_start: 15 },
  });
  const users2026 = MANAGERS.map((m, i) => ({
    user_id: `demo-u${i + 1}`,
    display_name: m,
    avatar: null,
    metadata: { team_name: `Team ${m}` },
  }));
  upsertUsers('demo-2026', users2026);
  upsertRosters(
    'demo-2026',
    MANAGERS.map((m, i) => ({ roster_id: i + 1, owner_id: `demo-u${i + 1}`, league_id: 'demo-2026', players: [] })),
    users2026
  );

  console.log('\nSeeded seasons 2024, 2025, and an upcoming 2026.');
}

main();
