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
}

export interface LineupSlot {
  slot: string;
  playerId: string | null;
  points: number;
  /** In the optimal view: true when this player was actually on the bench that week. */
  wasBenched?: boolean;
}
