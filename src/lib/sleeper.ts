import type {
  SleeperLeague,
  SleeperMatchup,
  SleeperPlayer,
  SleeperRoster,
  SleeperState,
  SleeperUser,
} from './types';

// Sleeper's read API is public — no API key required.
const BASE = process.env.SLEEPER_API_BASE ?? 'https://api.sleeper.app/v1';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Sleeper API ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

export const sleeper = {
  state: () => get<SleeperState>('/state/nfl'),
  league: (leagueId: string) => get<SleeperLeague>(`/league/${leagueId}`),
  users: (leagueId: string) => get<SleeperUser[]>(`/league/${leagueId}/users`),
  rosters: (leagueId: string) => get<SleeperRoster[]>(`/league/${leagueId}/rosters`),
  matchups: (leagueId: string, week: number) =>
    get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`),
  // ~5 MB dump of every NFL player; Sleeper asks that it be fetched at most once per day.
  allPlayers: () => get<Record<string, SleeperPlayer>>('/players/nfl'),
};
