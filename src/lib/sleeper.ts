import type {
  SleeperBracketMatch,
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeague,
  SleeperMatchup,
  SleeperPlayer,
  SleeperProjection,
  SleeperRoster,
  SleeperState,
  SleeperUser,
} from './types';

// Sleeper's read API is public — no API key required.
const BASE = process.env.SLEEPER_API_BASE ?? 'https://api.sleeper.app/v1';
// Projections live on the (undocumented) api.sleeper.com host.
const PROJECTIONS_BASE = process.env.SLEEPER_PROJECTIONS_BASE ?? 'https://api.sleeper.com';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Sleeper API ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'];

export const sleeper = {
  state: () => get<SleeperState>(`${BASE}/state/nfl`),
  league: (leagueId: string) => get<SleeperLeague>(`${BASE}/league/${leagueId}`),
  users: (leagueId: string) => get<SleeperUser[]>(`${BASE}/league/${leagueId}/users`),
  rosters: (leagueId: string) => get<SleeperRoster[]>(`${BASE}/league/${leagueId}/rosters`),
  matchups: (leagueId: string, week: number) =>
    get<SleeperMatchup[]>(`${BASE}/league/${leagueId}/matchups/${week}`),
  winnersBracket: (leagueId: string) =>
    get<SleeperBracketMatch[]>(`${BASE}/league/${leagueId}/winners_bracket`),
  losersBracket: (leagueId: string) =>
    get<SleeperBracketMatch[]>(`${BASE}/league/${leagueId}/losers_bracket`),
  // Season-total actual stats for EVERY NFL player (not just rostered ones),
  // keyed by player id, with pre-computed pts_std / pts_half_ppr / pts_ppr.
  seasonStats: (season: string) =>
    get<Record<string, Record<string, number | undefined>>>(
      `${BASE}/stats/nfl/regular/${season}`
    ),
  // Per-player projections for one NFL week. Undocumented endpoint; each item
  // carries pre-computed fantasy points for std / half-ppr / ppr scoring.
  projections: (season: string, week: number) => {
    const qs = POSITIONS.map((p) => `position[]=${p}`).join('&');
    return get<SleeperProjection[]>(
      `${PROJECTIONS_BASE}/projections/nfl/${season}/${week}?season_type=regular&${qs}`
    );
  },
  // A league's drafts (usually one). Newest first.
  drafts: (leagueId: string) => get<SleeperDraft[]>(`${BASE}/league/${leagueId}/drafts`),
  // Every pick in a draft, in overall order.
  draftPicks: (draftId: string) => get<SleeperDraftPick[]>(`${BASE}/draft/${draftId}/picks`),
  // ~5 MB dump of every NFL player; Sleeper asks that it be fetched at most once per day.
  allPlayers: () => get<Record<string, SleeperPlayer>>(`${BASE}/players/nfl`),
};
