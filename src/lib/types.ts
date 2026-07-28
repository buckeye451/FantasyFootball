// Shapes returned by the Sleeper API (https://docs.sleeper.com) — only the
// fields this app consumes.

export interface SleeperState {
  week: number;
  season: string;
  season_type: string;
  leg: number;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string; // pre_draft | drafting | in_season | complete
  total_rosters: number;
  roster_positions: string[]; // e.g. ["QB","RB","RB","WR","WR","TE","FLEX","K","DEF","BN",...]
  previous_league_id: string | null; // links to the prior season's league
  scoring_settings: Record<string, number>;
  settings: {
    playoff_week_start?: number;
    leg?: number;
    last_scored_leg?: number;
    [k: string]: unknown;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  league_id: string;
  players: string[] | null;
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number | null;
  points: number;
  starters: string[] | null;
  players: string[] | null;
  players_points: Record<string, number> | null;
}

export interface SleeperPlayer {
  player_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string | null;
  team?: string | null;
  fantasy_positions?: string[] | null;
  /** NFL GSIS id — joins Sleeper players to nflverse historical data. */
  gsis_id?: string | null;
  /** ESPN athlete id — keys ESPN headshots. Sometimes a number, often null. */
  espn_id?: number | string | null;
}

// A slot in a playoff bracket match: a resolved roster id, or a pointer to the
// winner/loser of an earlier match (before that match has been decided).
export type SleeperBracketSlot = number | { w: number } | { l: number } | null;

export interface SleeperBracketMatch {
  r: number; // round (1 = first playoff round)
  m: number; // match id within the bracket
  t1: SleeperBracketSlot;
  t2: SleeperBracketSlot;
  w: number | null; // winning roster id, once decided
  l: number | null; // losing roster id, once decided
  t1_from?: { w?: number; l?: number } | null;
  t2_from?: { w?: number; l?: number } | null;
  p?: number; // placement this match decides (1 = championship, 3 = third place, …)
}

export interface SleeperProjection {
  player_id?: string;
  stats?: {
    pts_std?: number;
    pts_half_ppr?: number;
    pts_ppr?: number;
    [k: string]: number | undefined;
  };
}

export interface SleeperDraft {
  draft_id: string;
  season?: string;
  status?: string;
  start_time?: number;
}

export interface SleeperDraftPick {
  pick_no: number;
  round: number;
  draft_slot: number;
  roster_id: number | string | null;
  picked_by?: string;
  player_id: string;
  metadata?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
    [k: string]: string | undefined;
  };
}

// App-level read models

export interface TeamInfo {
  rosterId: number;
  ownerId: string;
  displayName: string;
  teamName: string;
  slug: string;
}

export interface MatchupRow {
  week: number;
  rosterId: number;
  matchupId: number | null;
  points: number;
  starters: string[];
  players: string[];
  playersPoints: Record<string, number>;
}

export interface PlayerMeta {
  playerId: string;
  name: string;
  position: string;
  team: string;
  /** ESPN athlete id, when Sleeper supplies one. */
  espnId: string | null;
}

export interface Standing {
  team: TeamInfo;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  avgPoints: number;
  highScore: number;
  lowScore: number;
  managerPerformance: number; // season points ÷ best-possible lineup points, %
  performance: number | null; // season points ÷ season projected points, % (null = no projections)
  rank: number;
  movement: number; // vs. previous week's rank; positive = climbed
}

export interface WeekResult {
  week: number;
  points: number;
  opponent: TeamInfo | null;
  opponentPoints: number | null;
  result: 'W' | 'L' | 'T' | null;
  optimalPoints: number;
  benchPointsLost: number;
  /** % of the other teams this score would have beaten that week */
  winPctVsLeague: number;
  /** points ÷ best-possible lineup × 100, capped at 100 */
  managerPct: number;
  /** % of the other teams the best-possible lineup would have beaten */
  optimalWinPctVsLeague: number;
}

export interface LineupSlot {
  slot: string;
  playerId: string | null;
  points: number;
  /** In the optimal view: true when this player was actually on the bench that week. */
  wasBenched?: boolean;
}
