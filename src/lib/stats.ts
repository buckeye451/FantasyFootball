import { getDb } from './db';
import { optimalLineup, round2, startingSlots, type OptimalResult } from './optimal';
import type { MatchupRow, PlayerMeta, Standing, TeamInfo, WeekResult } from './types';

export interface LeagueInfo {
  leagueId: string;
  name: string;
  season: string;
  status: string | null;
  rosterPositions: string[];
  playoffWeekStart: number | null;
  lastSyncedAt: string | null;
}

export function getLeague(): LeagueInfo | null {
  const row = getDb()
    .prepare('SELECT * FROM league ORDER BY season DESC LIMIT 1')
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  const settings = JSON.parse((row.settings as string) ?? '{}');
  return {
    leagueId: row.league_id as string,
    name: row.name as string,
    season: row.season as string,
    status: (row.status as string) ?? null,
    rosterPositions: JSON.parse(row.roster_positions as string),
    playoffWeekStart: typeof settings.playoff_week_start === 'number' ? settings.playoff_week_start : null,
    lastSyncedAt: (row.last_synced_at as string) ?? null,
  };
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getTeams(): TeamInfo[] {
  const rows = getDb()
    .prepare(
      `SELECT r.roster_id, r.owner_id, u.display_name, u.team_name
       FROM rosters r LEFT JOIN users u ON u.user_id = r.owner_id
       ORDER BY r.roster_id`
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const display = (r.display_name as string) ?? `Team ${r.roster_id}`;
    return {
      rosterId: r.roster_id as number,
      ownerId: (r.owner_id as string) ?? '',
      displayName: display,
      teamName: (r.team_name as string) || display,
      slug: slugify(display),
    };
  });
}

export function getTeamBySlug(slug: string): TeamInfo | null {
  return getTeams().find((t) => t.slug === slug) ?? null;
}

export function getMatchups(): MatchupRow[] {
  const rows = getDb()
    .prepare('SELECT * FROM matchups ORDER BY week, roster_id')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    week: r.week as number,
    rosterId: r.roster_id as number,
    matchupId: (r.matchup_id as number) ?? null,
    points: r.points as number,
    starters: JSON.parse(r.starters as string),
    players: JSON.parse(r.players as string),
    playersPoints: JSON.parse(r.players_points as string),
  }));
}

export function getPlayerMeta(): Map<string, PlayerMeta> {
  const rows = getDb().prepare('SELECT * FROM players').all() as Array<Record<string, unknown>>;
  const map = new Map<string, PlayerMeta>();
  for (const r of rows) {
    map.set(r.player_id as string, {
      playerId: r.player_id as string,
      name: r.full_name as string,
      position: (r.position as string) ?? 'UNKNOWN',
      team: (r.team as string) ?? 'FA',
    });
  }
  return map;
}

/** Weeks that have scored matchups, ascending. */
export function getWeeks(matchups = getMatchups()): number[] {
  return [...new Set(matchups.map((m) => m.week))].sort((a, b) => a - b);
}

/** Regular-season weeks only (standings ignore playoff weeks). */
export function regularSeasonWeeks(): number[] {
  const league = getLeague();
  const weeks = getWeeks();
  if (!league?.playoffWeekStart) return weeks;
  return weeks.filter((w) => w < league.playoffWeekStart!);
}

function opponentOf(row: MatchupRow, weekRows: MatchupRow[]): MatchupRow | null {
  if (row.matchupId == null) return null;
  return (
    weekRows.find((m) => m.matchupId === row.matchupId && m.rosterId !== row.rosterId) ?? null
  );
}

export function standingsThroughWeek(week: number): Standing[] {
  const teams = getTeams();
  const matchups = getMatchups();
  const regWeeks = regularSeasonWeeks().filter((w) => w <= week);

  const build = (throughWeeks: number[]): Array<Omit<Standing, 'rank' | 'movement'>> =>
    teams.map((team) => {
      let wins = 0,
        losses = 0,
        ties = 0,
        pf = 0,
        pa = 0;
      let high = -Infinity,
        low = Infinity;
      for (const w of throughWeeks) {
        const weekRows = matchups.filter((m) => m.week === w);
        const mine = weekRows.find((m) => m.rosterId === team.rosterId);
        if (!mine) continue;
        const opp = opponentOf(mine, weekRows);
        pf += mine.points;
        high = Math.max(high, mine.points);
        low = Math.min(low, mine.points);
        if (opp) {
          pa += opp.points;
          if (mine.points > opp.points) wins++;
          else if (mine.points < opp.points) losses++;
          else ties++;
        }
      }
      const games = wins + losses + ties;
      return {
        team,
        wins,
        losses,
        ties,
        pointsFor: round2(pf),
        pointsAgainst: round2(pa),
        avgPoints: games ? round2(pf / games) : 0,
        highScore: games ? round2(high) : 0,
        lowScore: games ? round2(low) : 0,
      };
    });

  const rank = (rows: Array<Omit<Standing, 'rank' | 'movement'>>) =>
    [...rows].sort(
      (a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor || a.team.rosterId - b.team.rosterId
    );

  const current = rank(build(regWeeks));
  const prev = rank(build(regWeeks.slice(0, -1)));
  const prevRank = new Map(prev.map((s, i) => [s.team.rosterId, i + 1]));

  return current.map((s, i) => ({
    ...s,
    rank: i + 1,
    movement: regWeeks.length > 1 ? (prevRank.get(s.team.rosterId) ?? i + 1) - (i + 1) : 0,
  }));
}

export function currentStandings(): Standing[] {
  const weeks = regularSeasonWeeks();
  return weeks.length ? standingsThroughWeek(weeks[weeks.length - 1]) : [];
}

/** One point per team per week: that week's score. For the scores line chart. */
export function weeklyScoreSeries(): Array<Record<string, number>> {
  const matchups = getMatchups();
  const teams = getTeams();
  return getWeeks(matchups).map((week) => {
    const row: Record<string, number> = { week };
    for (const t of teams) {
      const m = matchups.find((x) => x.week === week && x.rosterId === t.rosterId);
      if (m) row[t.slug] = m.points;
    }
    return row;
  });
}

/** One point per team per week: standings rank after that week. For the bump chart. */
export function weeklyRankSeries(): Array<Record<string, number>> {
  return regularSeasonWeeks().map((week) => {
    const row: Record<string, number> = { week };
    for (const s of standingsThroughWeek(week)) {
      row[s.team.slug] = s.rank;
    }
    return row;
  });
}

export interface PlayerAgg {
  player: PlayerMeta;
  totalPoints: number;
  weeksRostered: number;
  weeksStarted: number;
  avgPoints: number;
  bestWeek: number;
  managers: string[];
}

/** Season totals for every player any team rostered, grouped by position. */
export function topSeasonPlayersByPosition(topN = 5): Map<string, PlayerAgg[]> {
  const matchups = getMatchups();
  const meta = getPlayerMeta();
  const teams = new Map(getTeams().map((t) => [t.rosterId, t]));

  const agg = new Map<string, PlayerAgg>();
  for (const m of matchups) {
    const started = new Set(m.starters);
    for (const [pid, pts] of Object.entries(m.playersPoints)) {
      const pm = meta.get(pid);
      if (!pm) continue;
      let a = agg.get(pid);
      if (!a) {
        a = {
          player: pm,
          totalPoints: 0,
          weeksRostered: 0,
          weeksStarted: 0,
          avgPoints: 0,
          bestWeek: 0,
          managers: [],
        };
        agg.set(pid, a);
      }
      a.totalPoints = round2(a.totalPoints + pts);
      a.weeksRostered++;
      if (started.has(pid)) a.weeksStarted++;
      a.bestWeek = Math.max(a.bestWeek, pts);
      const mgr = teams.get(m.rosterId)?.displayName;
      if (mgr && !a.managers.includes(mgr)) a.managers.push(mgr);
    }
  }

  const byPosition = new Map<string, PlayerAgg[]>();
  for (const a of agg.values()) {
    a.avgPoints = a.weeksRostered ? round2(a.totalPoints / a.weeksRostered) : 0;
    const pos = a.player.position;
    if (!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos)!.push(a);
  }
  for (const [pos, list] of byPosition) {
    list.sort((a, b) => b.totalPoints - a.totalPoints);
    byPosition.set(pos, list.slice(0, topN));
  }
  return byPosition;
}

export interface WeeklyStar {
  player: PlayerMeta;
  points: number;
  manager: string;
  started: boolean;
}

/** Best fantasy performance per position in a given week, plus the overall MVP. */
export function playersOfWeek(week: number): { byPosition: Map<string, WeeklyStar>; mvp: WeeklyStar | null } {
  const matchups = getMatchups().filter((m) => m.week === week);
  const meta = getPlayerMeta();
  const teams = new Map(getTeams().map((t) => [t.rosterId, t]));

  const byPosition = new Map<string, WeeklyStar>();
  let mvp: WeeklyStar | null = null;
  for (const m of matchups) {
    const started = new Set(m.starters);
    for (const [pid, pts] of Object.entries(m.playersPoints)) {
      const pm = meta.get(pid);
      if (!pm) continue;
      const star: WeeklyStar = {
        player: pm,
        points: pts,
        manager: teams.get(m.rosterId)?.displayName ?? '—',
        started: started.has(pid),
      };
      const cur = byPosition.get(pm.position);
      if (!cur || pts > cur.points) byPosition.set(pm.position, star);
      if (pm.position !== 'DEF' && pm.position !== 'K' && (!mvp || pts > mvp.points)) mvp = star;
    }
  }
  return { byPosition, mvp };
}

export interface TeamWeekDetail {
  week: number;
  team: TeamInfo;
  opponent: TeamInfo | null;
  points: number;
  opponentPoints: number | null;
  result: 'W' | 'L' | 'T' | null;
  starters: Array<{ slot: string; playerId: string | null; points: number }>;
  bench: Array<{ playerId: string; points: number }>;
  optimal: OptimalResult;
}

export function teamWeekDetail(rosterId: number, week: number): TeamWeekDetail | null {
  const league = getLeague();
  if (!league) return null;
  const teams = getTeams();
  const team = teams.find((t) => t.rosterId === rosterId);
  if (!team) return null;

  const weekRows = getMatchups().filter((m) => m.week === week);
  const mine = weekRows.find((m) => m.rosterId === rosterId);
  if (!mine) return null;
  const opp = opponentOf(mine, weekRows);
  const meta = getPlayerMeta();

  const slots = startingSlots(league.rosterPositions);
  const starters = slots.map((slot, i) => {
    const pid = mine.starters[i];
    const valid = pid && pid !== '0' ? pid : null;
    return { slot, playerId: valid, points: valid ? mine.playersPoints[valid] ?? 0 : 0 };
  });
  const startedIds = new Set(mine.starters);
  const bench = mine.players
    .filter((pid) => !startedIds.has(pid))
    .map((pid) => ({ playerId: pid, points: mine.playersPoints[pid] ?? 0 }))
    .sort((a, b) => b.points - a.points);

  const optimal = optimalLineup(league.rosterPositions, mine.starters, mine.playersPoints, meta);

  const oppTeam = opp ? teams.find((t) => t.rosterId === opp.rosterId) ?? null : null;
  return {
    week,
    team,
    opponent: oppTeam,
    points: mine.points,
    opponentPoints: opp?.points ?? null,
    result: opp ? (mine.points > opp.points ? 'W' : mine.points < opp.points ? 'L' : 'T') : null,
    starters,
    bench,
    optimal,
  };
}

export interface TeamSeason {
  team: TeamInfo;
  weeks: WeekResult[];
  wins: number;
  losses: number;
  ties: number;
  rank: number | null;
  pointsFor: number;
  pointsAgainst: number;
  avgPoints: number;
  highScore: number;
  totalOptimal: number;
  totalPointsLost: number;
  /** actual / optimal across the season */
  efficiency: number;
}

export function teamSeason(rosterId: number): TeamSeason | null {
  const league = getLeague();
  if (!league) return null;
  const teams = getTeams();
  const team = teams.find((t) => t.rosterId === rosterId);
  if (!team) return null;

  const matchups = getMatchups();
  const meta = getPlayerMeta();
  const weeks: WeekResult[] = [];
  for (const week of getWeeks(matchups)) {
    const weekRows = matchups.filter((m) => m.week === week);
    const mine = weekRows.find((m) => m.rosterId === rosterId);
    if (!mine) continue;
    const opp = opponentOf(mine, weekRows);
    const oppTeam = opp ? teams.find((t) => t.rosterId === opp.rosterId) ?? null : null;
    const optimal = optimalLineup(league.rosterPositions, mine.starters, mine.playersPoints, meta);
    weeks.push({
      week,
      points: mine.points,
      opponent: oppTeam,
      opponentPoints: opp?.points ?? null,
      result: opp ? (mine.points > opp.points ? 'W' : mine.points < opp.points ? 'L' : 'T') : null,
      optimalPoints: optimal.optimalTotal,
      benchPointsLost: optimal.pointsLost,
    });
  }

  const standing = currentStandings().find((s) => s.team.rosterId === rosterId) ?? null;
  const played = weeks.filter((w) => w.result !== null);
  const pf = round2(weeks.reduce((s, w) => s + w.points, 0));
  const totalOptimal = round2(weeks.reduce((s, w) => s + w.optimalPoints, 0));
  return {
    team,
    weeks,
    wins: standing?.wins ?? played.filter((w) => w.result === 'W').length,
    losses: standing?.losses ?? played.filter((w) => w.result === 'L').length,
    ties: standing?.ties ?? played.filter((w) => w.result === 'T').length,
    rank: standing?.rank ?? null,
    pointsFor: pf,
    pointsAgainst: round2(weeks.reduce((s, w) => s + (w.opponentPoints ?? 0), 0)),
    avgPoints: weeks.length ? round2(pf / weeks.length) : 0,
    highScore: weeks.length ? Math.max(...weeks.map((w) => w.points)) : 0,
    totalOptimal,
    totalPointsLost: round2(weeks.reduce((s, w) => s + w.benchPointsLost, 0)),
    efficiency: totalOptimal ? round2((pf / totalOptimal) * 100) : 100,
  };
}

/** League median score per week — context line for the team chart. */
export function weeklyMedians(): Array<{ week: number; median: number }> {
  const matchups = getMatchups();
  return getWeeks(matchups).map((week) => {
    const pts = matchups
      .filter((m) => m.week === week)
      .map((m) => m.points)
      .sort((a, b) => a - b);
    const mid = Math.floor(pts.length / 2);
    const median = pts.length % 2 ? pts[mid] : (pts[mid - 1] + pts[mid]) / 2;
    return { week, median: round2(median) };
  });
}
