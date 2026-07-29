import { getDb } from './db';
import { managerName } from './managers';
import { optimalLineup, round2, startingSlots, type OptimalResult } from './optimal';
import type {
  MatchupRow,
  PlayerMeta,
  SleeperBracketMatch,
  SleeperBracketSlot,
  Standing,
  TeamInfo,
  WeekResult,
} from './types';

export interface LeagueInfo {
  leagueId: string;
  name: string;
  season: string;
  status: string | null;
  rosterPositions: string[];
  playoffWeekStart: number | null;
  lastSyncedAt: string | null;
}

export interface SeasonOption {
  season: string;
  leagueId: string;
  name: string;
  hasGames: boolean;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toLeagueInfo(row: Record<string, unknown>): LeagueInfo {
  const settings = JSON.parse((row.settings as string) ?? '{}');
  return {
    leagueId: row.league_id as string,
    name: row.name as string,
    season: row.season as string,
    status: (row.status as string) ?? null,
    rosterPositions: JSON.parse(row.roster_positions as string),
    playoffWeekStart:
      typeof settings.playoff_week_start === 'number' ? settings.playoff_week_start : null,
    lastSyncedAt: (row.last_synced_at as string) ?? null,
  };
}

/** Every synced season, newest first, with whether it has any scored games. */
export function getSeasons(): SeasonOption[] {
  const rows = getDb()
    .prepare(
      `SELECT l.league_id, l.season, l.name,
              (SELECT COUNT(*) FROM matchups m WHERE m.league_id = l.league_id) AS games
       FROM league l`
    )
    .all() as Array<Record<string, unknown>>;
  return rows
    .map((r) => ({
      season: r.season as string,
      leagueId: r.league_id as string,
      name: r.name as string,
      hasGames: (r.games as number) > 0,
    }))
    .sort((a, b) => Number(b.season) - Number(a.season));
}

/** The season to show when none is specified: newest with games, else newest. */
export function defaultSeason(): string | null {
  const seasons = getSeasons();
  if (seasons.length === 0) return null;
  return (seasons.find((s) => s.hasGames) ?? seasons[0]).season;
}

export function getLeagueInfo(leagueId: string): LeagueInfo | null {
  const row = getDb()
    .prepare('SELECT * FROM league WHERE league_id = ?')
    .get(leagueId) as Record<string, unknown> | undefined;
  return row ? toLeagueInfo(row) : null;
}

/** Resolve a `?season=` value (or the default) to that season's league. */
export function resolveActiveLeague(seasonParam?: string): LeagueInfo | null {
  const seasons = getSeasons();
  if (seasons.length === 0) return null;
  const chosen =
    (seasonParam && seasons.find((s) => s.season === seasonParam)) ||
    seasons.find((s) => s.hasGames) ||
    seasons[0];
  return getLeagueInfo(chosen.leagueId);
}

export function getTeams(leagueId: string): TeamInfo[] {
  const rows = getDb()
    .prepare(
      `SELECT roster_id, owner_id, display_name, team_name
       FROM rosters WHERE league_id = ? ORDER BY roster_id`
    )
    .all(leagueId) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    // Real name where we know the handle; slug follows from it.
    const display = managerName(r.display_name as string) || `Team ${r.roster_id}`;
    return {
      rosterId: r.roster_id as number,
      ownerId: (r.owner_id as string) ?? '',
      displayName: display,
      teamName: (r.team_name as string) || display,
      slug: slugify(display),
    };
  });
}

export function getTeamBySlug(leagueId: string, slug: string): TeamInfo | null {
  return getTeams(leagueId).find((t) => t.slug === slug) ?? null;
}

export function getMatchups(leagueId: string): MatchupRow[] {
  const rows = getDb()
    .prepare('SELECT * FROM matchups WHERE league_id = ? ORDER BY week, roster_id')
    .all(leagueId) as Array<Record<string, unknown>>;
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

/**
 * Player metadata keyed by Sleeper id. Pass a season to show the team each
 * player actually played for that year (from nflverse) instead of Sleeper's
 * current-team-only value; players with no historical row keep Sleeper's.
 */
export function getPlayerMeta(season?: string): Map<string, PlayerMeta> {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM players').all() as Array<Record<string, unknown>>;
  const historical = new Map<string, string>();
  if (season) {
    const teamRows = db
      .prepare('SELECT player_id, team FROM player_season_teams WHERE season = ?')
      .all(season) as Array<{ player_id: string; team: string }>;
    for (const t of teamRows) historical.set(t.player_id, t.team);
  }
  const map = new Map<string, PlayerMeta>();
  for (const r of rows) {
    const id = r.player_id as string;
    map.set(id, {
      playerId: id,
      name: r.full_name as string,
      position: (r.position as string) ?? 'UNKNOWN',
      team: historical.get(id) ?? (r.team as string) ?? 'FA',
      espnId: (r.espn_id as string) ?? null,
    });
  }
  return map;
}

/** Weeks that have scored matchups, ascending. */
export function getWeeks(matchups: MatchupRow[]): number[] {
  return [...new Set(matchups.map((m) => m.week))].sort((a, b) => a - b);
}

/** Regular-season weeks only (standings ignore playoff weeks). */
export function regularSeasonWeeks(leagueId: string, matchups = getMatchups(leagueId)): number[] {
  const league = getLeagueInfo(leagueId);
  const weeks = getWeeks(matchups);
  if (!league?.playoffWeekStart) return weeks;
  return weeks.filter((w) => w < league.playoffWeekStart!);
}

function opponentOf(row: MatchupRow, weekRows: MatchupRow[]): MatchupRow | null {
  if (row.matchupId == null) return null;
  return (
    weekRows.find((m) => m.matchupId === row.matchupId && m.rosterId !== row.rosterId) ?? null
  );
}

export function standingsThroughWeek(leagueId: string, week: number): Standing[] {
  const teams = getTeams(leagueId);
  const matchups = getMatchups(leagueId);
  const league = getLeagueInfo(leagueId);
  const meta = getPlayerMeta();
  const regWeeks = regularSeasonWeeks(leagueId, matchups).filter((w) => w <= week);

  // Projections per week, loaded once (used for season Performance %).
  const fmt = scoringFormat(leagueId);
  const projByWeek = new Map<number, Map<string, Proj>>();
  if (league) {
    for (const w of regWeeks) projByWeek.set(w, weekProjections(league.season, w));
  }

  const build = (throughWeeks: number[]): Array<Omit<Standing, 'rank' | 'movement'>> =>
    teams.map((team) => {
      let wins = 0,
        losses = 0,
        ties = 0,
        pf = 0,
        pa = 0,
        optimalSum = 0;
      // Points and projections are accumulated only for weeks that actually
      // have projection data, so the ratio compares like with like.
      let projSum = 0,
        projPf = 0;
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
        const wp = projByWeek.get(w);
        const projected = wp ? projectedTotal(mine.starters, wp, fmt) : null;
        if (projected != null && projected > 0) {
          projSum += projected;
          projPf += mine.points;
        }
        if (league) {
          optimalSum += optimalLineup(
            league.rosterPositions,
            mine.starters,
            mine.playersPoints,
            meta
          ).optimalTotal;
        }
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
        // Season-cumulative manager performance: points scored ÷ best-possible
        // lineup points, through these weeks (naturally ≤ 100%).
        managerPerformance: optimalSum > 0 ? Math.min(100, round2((pf / optimalSum) * 100)) : 100,
        // Season performance: points scored ÷ points projected.
        performance: projSum > 0 ? round2((projPf / projSum) * 100) : null,
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

export function currentStandings(leagueId: string): Standing[] {
  const weeks = regularSeasonWeeks(leagueId);
  return weeks.length ? standingsThroughWeek(leagueId, weeks[weeks.length - 1]) : [];
}

/** One point per team per week: that week's score. For the scores line chart. */
export function weeklyScoreSeries(leagueId: string): Array<Record<string, number>> {
  const matchups = getMatchups(leagueId);
  const teams = getTeams(leagueId);
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
export function weeklyRankSeries(leagueId: string): Array<Record<string, number>> {
  return regularSeasonWeeks(leagueId).map((week) => {
    const row: Record<string, number> = { week };
    for (const s of standingsThroughWeek(leagueId, week)) {
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
export function topSeasonPlayersByPosition(leagueId: string, topN = 5): Map<string, PlayerAgg[]> {
  const matchups = getMatchups(leagueId);
  const meta = getPlayerMeta(getLeagueInfo(leagueId)?.season);
  const teams = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));

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
export function playersOfWeek(
  leagueId: string,
  week: number
): { byPosition: Map<string, WeeklyStar>; mvp: WeeklyStar | null } {
  const matchups = getMatchups(leagueId).filter((m) => m.week === week);
  const meta = getPlayerMeta(getLeagueInfo(leagueId)?.season);
  const teams = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));

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

export interface StarterUsage {
  player: PlayerMeta;
  weeksStarted: number;
  /** Points this player scored in the weeks they were started. */
  pointsWhileStarting: number;
  /** Best single week among the weeks they were started. */
  bestWeek: number;
}

/**
 * The player this roster started most often at each position, with what they
 * scored in those weeks. Ties on weeks started break toward the higher total.
 */
export function mostStartedByPosition(
  leagueId: string,
  rosterId: number
): Map<string, StarterUsage> {
  const league = getLeagueInfo(leagueId);
  const meta = getPlayerMeta(league?.season);
  const usage = new Map<string, StarterUsage>();

  for (const m of getMatchups(leagueId)) {
    if (m.rosterId !== rosterId) continue;
    for (const pid of m.starters) {
      if (!pid || pid === '0') continue;
      const player = meta.get(pid);
      if (!player) continue;
      const points = m.playersPoints[pid] ?? 0;
      let u = usage.get(pid);
      if (!u) {
        u = { player, weeksStarted: 0, pointsWhileStarting: 0, bestWeek: 0 };
        usage.set(pid, u);
      }
      u.weeksStarted++;
      u.pointsWhileStarting = round2(u.pointsWhileStarting + points);
      u.bestWeek = Math.max(u.bestWeek, round2(points));
    }
  }

  const byPosition = new Map<string, StarterUsage>();
  for (const u of usage.values()) {
    const pos = u.player.position;
    const cur = byPosition.get(pos);
    if (
      !cur ||
      u.weeksStarted > cur.weeksStarted ||
      (u.weeksStarted === cur.weeksStarted && u.pointsWhileStarting > cur.pointsWhileStarting)
    ) {
      byPosition.set(pos, u);
    }
  }
  return byPosition;
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

export function teamWeekDetail(leagueId: string, rosterId: number, week: number): TeamWeekDetail | null {
  const league = getLeagueInfo(leagueId);
  if (!league) return null;
  const teams = getTeams(leagueId);
  const team = teams.find((t) => t.rosterId === rosterId);
  if (!team) return null;

  const weekRows = getMatchups(leagueId).filter((m) => m.week === week);
  const mine = weekRows.find((m) => m.rosterId === rosterId);
  if (!mine) return null;
  const opp = opponentOf(mine, weekRows);
  const meta = getPlayerMeta(league.season);

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

export function teamSeason(leagueId: string, rosterId: number): TeamSeason | null {
  const league = getLeagueInfo(leagueId);
  if (!league) return null;
  const teams = getTeams(leagueId);
  const team = teams.find((t) => t.rosterId === rosterId);
  if (!team) return null;

  const matchups = getMatchups(leagueId);
  const meta = getPlayerMeta(league.season);
  const weeks: WeekResult[] = [];
  for (const week of getWeeks(matchups)) {
    const weekRows = matchups.filter((m) => m.week === week);
    const mine = weekRows.find((m) => m.rosterId === rosterId);
    if (!mine) continue;
    const opp = opponentOf(mine, weekRows);
    const oppTeam = opp ? teams.find((t) => t.rosterId === opp.rosterId) ?? null : null;
    const optimal = optimalLineup(league.rosterPositions, mine.starters, mine.playersPoints, meta);
    // Beat-the-league percentages measure this team against every other team's
    // actual score that week — the same basis as the week pages' ROL %.
    const otherScores = weekRows.filter((r) => r.rosterId !== rosterId).map((r) => r.points);
    const pctBeating = (value: number) =>
      otherScores.length
        ? round2((otherScores.filter((s) => value > s).length / otherScores.length) * 100)
        : 0;
    weeks.push({
      week,
      points: mine.points,
      opponent: oppTeam,
      opponentPoints: opp?.points ?? null,
      result: opp ? (mine.points > opp.points ? 'W' : mine.points < opp.points ? 'L' : 'T') : null,
      optimalPoints: optimal.optimalTotal,
      benchPointsLost: optimal.pointsLost,
      winPctVsLeague: pctBeating(mine.points),
      managerPct:
        optimal.optimalTotal > 0
          ? Math.min(100, round2((mine.points / optimal.optimalTotal) * 100))
          : 100,
      optimalWinPctVsLeague: pctBeating(optimal.optimalTotal),
      bestLineupWins:
        opp == null || mine.points > opp.points
          ? null // no opponent, or the week was already won
          : optimal.optimalTotal > opp.points
            ? 'yes'
            : 'no',
    });
  }

  const standing = currentStandings(leagueId).find((s) => s.team.rosterId === rosterId) ?? null;
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

// ---------------------------------------------------------------------------
// Weekly score breakdowns + per-team advanced metrics
// ---------------------------------------------------------------------------

export type ScoringFormat = 'ppr' | 'half_ppr' | 'std';

/** Infer the league's scoring format from its reception points. */
export function scoringFormat(leagueId: string): ScoringFormat {
  const row = getDb()
    .prepare('SELECT scoring_settings FROM league WHERE league_id = ?')
    .get(leagueId) as { scoring_settings: string } | undefined;
  const rec = row ? Number(JSON.parse(row.scoring_settings || '{}').rec ?? 0) : 0;
  if (rec >= 1) return 'ppr';
  if (rec >= 0.5) return 'half_ppr';
  return 'std';
}

interface Proj {
  std: number | null;
  half: number | null;
  ppr: number | null;
}

function weekProjections(season: string, week: number): Map<string, Proj> {
  const rows = getDb()
    .prepare('SELECT player_id, pts_std, pts_half, pts_ppr FROM projections WHERE season = ? AND week = ?')
    .all(season, week) as Array<Record<string, unknown>>;
  const map = new Map<string, Proj>();
  for (const r of rows) {
    map.set(r.player_id as string, {
      std: (r.pts_std as number) ?? null,
      half: (r.pts_half as number) ?? null,
      ppr: (r.pts_ppr as number) ?? null,
    });
  }
  return map;
}

function projValue(p: Proj | undefined, fmt: ScoringFormat): number | null {
  if (!p) return null;
  const v = fmt === 'ppr' ? p.ppr : fmt === 'half_ppr' ? p.half : p.std;
  return v ?? null;
}

/** Sum of projected points for the starters a team played (null if too sparse). */
function projectedTotal(starters: string[], proj: Map<string, Proj>, fmt: ScoringFormat): number | null {
  let sum = 0;
  let have = 0;
  let total = 0;
  for (const pid of starters) {
    if (!pid || pid === '0') continue;
    total++;
    const v = projValue(proj.get(pid), fmt);
    if (v != null) {
      sum += v;
      have++;
    }
  }
  if (total === 0 || have < Math.ceil(total * 0.6)) return null;
  return round2(sum);
}

export interface TeamWeekStat {
  team: TeamInfo;
  score: number;
  optimal: number;
  projected: number | null;
  /** score ÷ projected × 100 */
  performancePct: number | null;
  /** % of the other teams this score would beat */
  winPctVsLeague: number;
  /** score ÷ best-possible-lineup × 100, capped at 100 */
  managerScorePct: number;
  /** 'yes' = would have won with the optimal lineup; 'no' = still would have lost; null = already won */
  bestLineupWins: 'yes' | 'no' | null;
  result: 'W' | 'L' | 'T' | null;
  opponentScore: number | null;
}

export interface MatchupBreakdown {
  matchupId: number | null;
  teams: TeamWeekStat[];
}

function computeTeamWeekStat(
  m: MatchupRow,
  opponentScore: number | null,
  otherScores: number[],
  rosterPositions: string[],
  meta: Map<string, PlayerMeta>,
  fmt: ScoringFormat,
  proj: Map<string, Proj>,
  team: TeamInfo
): TeamWeekStat {
  const optimal = optimalLineup(rosterPositions, m.starters, m.playersPoints, meta).optimalTotal;
  const projected = projectedTotal(m.starters, proj, fmt);
  const beat = otherScores.filter((s) => m.points > s).length;
  const winPct = otherScores.length ? round2((beat / otherScores.length) * 100) : 0;
  const managerScore = optimal > 0 ? Math.min(100, round2((m.points / optimal) * 100)) : 100;
  const performance = projected && projected > 0 ? round2((m.points / projected) * 100) : null;
  const result =
    opponentScore == null ? null : m.points > opponentScore ? 'W' : m.points < opponentScore ? 'L' : 'T';
  let best: 'yes' | 'no' | null = null;
  if (opponentScore != null) {
    if (m.points > opponentScore) best = null; // already won
    else best = optimal > opponentScore ? 'yes' : 'no';
  }
  return {
    team,
    score: round2(m.points),
    optimal: round2(optimal),
    projected,
    performancePct: performance,
    winPctVsLeague: winPct,
    managerScorePct: managerScore,
    bestLineupWins: best,
    result,
    opponentScore: opponentScore == null ? null : round2(opponentScore),
  };
}

/** Every matchup in a week with each team's advanced metrics. Winner listed first. */
export function weekBreakdown(leagueId: string, week: number): MatchupBreakdown[] {
  const league = getLeagueInfo(leagueId);
  if (!league) return [];
  const teams = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));
  const weekRows = getMatchups(leagueId).filter((m) => m.week === week);
  const meta = getPlayerMeta();
  const fmt = scoringFormat(leagueId);
  const proj = weekProjections(league.season, week);

  const statFor = (m: MatchupRow): TeamWeekStat => {
    const opp = opponentOf(m, weekRows);
    const others = weekRows.filter((x) => x.rosterId !== m.rosterId).map((x) => x.points);
    return computeTeamWeekStat(
      m,
      opp?.points ?? null,
      others,
      league.rosterPositions,
      meta,
      fmt,
      proj,
      teams.get(m.rosterId)!
    );
  };

  const byMatch = new Map<number, MatchupRow[]>();
  const solo: MatchupRow[] = [];
  for (const m of weekRows) {
    if (m.matchupId == null) {
      solo.push(m);
      continue;
    }
    if (!byMatch.has(m.matchupId)) byMatch.set(m.matchupId, []);
    byMatch.get(m.matchupId)!.push(m);
  }

  const out: MatchupBreakdown[] = [];
  for (const [mid, rows] of [...byMatch.entries()].sort((a, b) => a[0] - b[0])) {
    const stats = rows.map(statFor).sort((a, b) => b.score - a.score);
    out.push({ matchupId: mid, teams: stats });
  }
  for (const m of solo) out.push({ matchupId: null, teams: [statFor(m)] });
  return out;
}

// ---------------------------------------------------------------------------
// Playoff brackets
// ---------------------------------------------------------------------------

export interface BracketTeam {
  rosterId: number | null;
  team: TeamInfo | null;
  score: number | null;
  label: string;
}

export interface BracketMatch {
  round: number;
  matchId: number;
  week: number | null;
  placement?: number;
  winnerRosterId: number | null;
  teams: [BracketTeam, BracketTeam];
}

export interface BracketRound {
  round: number;
  week: number | null;
  name: string;
  matches: BracketMatch[];
}

function roundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Championship';
  if (round === totalRounds - 1) return 'Semifinals';
  if (round === totalRounds - 2) return 'Quarterfinals';
  return `Round ${round}`;
}

function rawBracket(leagueId: string, type: string): SleeperBracketMatch[] {
  const row = getDb()
    .prepare('SELECT data FROM brackets WHERE league_id = ? AND bracket_type = ?')
    .get(leagueId, type) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as SleeperBracketMatch[]) : [];
}

function resolveSlot(
  slot: SleeperBracketSlot,
  matches: SleeperBracketMatch[]
): { rosterId: number | null; label: string } {
  if (slot == null) return { rosterId: null, label: 'TBD' };
  if (typeof slot === 'number') return { rosterId: slot, label: '' };
  // pointer to the winner/loser of an earlier match
  const isW = 'w' in slot;
  const refId = isW ? slot.w : slot.l;
  const ref = matches.find((mm) => mm.m === refId);
  const rosterId = ref ? (isW ? ref.w : ref.l) : null;
  return { rosterId, label: rosterId == null ? `${isW ? 'Winner' : 'Loser'} of Game ${refId}` : '' };
}

/** Assemble a bracket into rounds, with team info and each team's score for the round's week. */
export function getBracket(leagueId: string, type: 'winners' | 'losers' = 'winners'): BracketRound[] {
  const league = getLeagueInfo(leagueId);
  const matches = rawBracket(leagueId, type);
  if (!league || matches.length === 0) return [];

  const teams = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));
  const matchups = getMatchups(leagueId);
  const rounds = [...new Set(matches.map((m) => m.r))].sort((a, b) => a - b);
  const totalRounds = rounds.length;
  const playoffStart = league.playoffWeekStart;

  const scoreOf = (rosterId: number | null, week: number | null): number | null => {
    if (rosterId == null || week == null) return null;
    const row = matchups.find((m) => m.week === week && m.rosterId === rosterId);
    return row ? round2(row.points) : null;
  };

  return rounds.map((r, i) => {
    const week = playoffStart != null ? playoffStart + i : null;
    const roundMatches = matches
      .filter((m) => m.r === r)
      .sort((a, b) => a.m - b.m)
      .map((m): BracketMatch => {
        const build = (slot: SleeperBracketSlot): BracketTeam => {
          const { rosterId, label } = resolveSlot(slot, matches);
          const team = rosterId != null ? teams.get(rosterId) ?? null : null;
          return { rosterId, team, score: scoreOf(rosterId, week), label: team?.displayName ?? label };
        };
        return {
          round: r,
          matchId: m.m,
          week,
          placement: m.p,
          winnerRosterId: m.w ?? null,
          teams: [build(m.t1), build(m.t2)],
        };
      });
    return { round: r, week, name: roundName(r, totalRounds), matches: roundMatches };
  });
}

export interface Podium {
  champion: TeamInfo | null;
  runnerUp: TeamInfo | null;
  third: TeamInfo | null;
  /** Winner of the consolation bracket. */
  ultimateLoser: TeamInfo | null;
}

/**
 * Final placements from the stored brackets. Sleeper tags the match that
 * decides a placement with `p` (1 = championship, 3 = third place), so the
 * champion and runner-up come from the p=1 match's winner and loser. Falls
 * back to the last round's only match for brackets with no placement tags.
 */
export function podium(leagueId: string): Podium {
  const teams = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));
  const pick = (rosterId: number | null | undefined) =>
    rosterId != null ? teams.get(rosterId) ?? null : null;

  const winners = rawBracket(leagueId, 'winners');
  const losers = rawBracket(leagueId, 'losers');

  const lastRound = winners.length ? Math.max(...winners.map((m) => m.r)) : null;
  const final =
    winners.find((m) => m.p === 1) ??
    (lastRound != null ? winners.filter((m) => m.r === lastRound)[0] ?? null : null);
  const thirdPlace = winners.find((m) => m.p === 3) ?? null;
  const consolationFinal =
    losers.find((m) => m.p === 1) ??
    (losers.length ? losers.filter((m) => m.r === Math.max(...losers.map((x) => x.r)))[0] : null);

  return {
    champion: pick(final?.w),
    runnerUp: pick(final?.l),
    third: pick(thirdPlace?.w),
    ultimateLoser: pick(consolationFinal?.w),
  };
}

export function playoffRounds(leagueId: string): Array<{ round: number; week: number | null; name: string }> {
  // "Round 1", "Round 2", … for the menu and round pages. The bracket view keeps
  // the descriptive names (Quarterfinals/Semifinals/Championship) on its columns.
  return getBracket(leagueId, 'winners').map((r) => ({
    round: r.round,
    week: r.week,
    name: `Round ${r.round}`,
  }));
}

export function hasPlayoffs(leagueId: string): boolean {
  return rawBracket(leagueId, 'winners').length > 0;
}

/**
 * Playoff-round breakdown that mirrors the weekly breakdown, but scoped to the
 * teams still alive in that round (win % is measured against the other teams
 * playing that round, not the whole league).
 */
export function playoffRoundBreakdown(leagueId: string, round: number): MatchupBreakdown[] {
  const league = getLeagueInfo(leagueId);
  if (!league) return [];
  const bracket = getBracket(leagueId, 'winners');
  const rd = bracket.find((r) => r.round === round);
  if (!rd || rd.week == null) return [];

  const week = rd.week;
  const weekRows = getMatchups(leagueId).filter((m) => m.week === week);
  const rowByRoster = new Map(weekRows.map((m) => [m.rosterId, m]));
  const teams = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));
  const meta = getPlayerMeta();
  const fmt = scoringFormat(leagueId);
  const proj = weekProjections(league.season, week);

  // All roster ids alive in this round.
  const participants: number[] = [];
  for (const mt of rd.matches) {
    for (const t of mt.teams) if (t.rosterId != null) participants.push(t.rosterId);
  }
  const scoreByRoster = new Map(
    participants.map((rid) => [rid, rowByRoster.get(rid)?.points ?? 0])
  );

  const out: MatchupBreakdown[] = [];
  for (const mt of rd.matches) {
    const teamStats: TeamWeekStat[] = [];
    for (const t of mt.teams) {
      if (t.rosterId == null) continue;
      const row = rowByRoster.get(t.rosterId);
      if (!row) continue;
      const oppSlot = mt.teams.find((x) => x.rosterId !== t.rosterId);
      const oppScore = oppSlot?.rosterId != null ? scoreByRoster.get(oppSlot.rosterId) ?? null : null;
      const others = participants
        .filter((rid) => rid !== t.rosterId)
        .map((rid) => scoreByRoster.get(rid) ?? 0);
      teamStats.push(
        computeTeamWeekStat(
          row,
          oppScore ?? null,
          others,
          league.rosterPositions,
          meta,
          fmt,
          proj,
          teams.get(t.rosterId)!
        )
      );
    }
    teamStats.sort((a, b) => b.score - a.score);
    out.push({ matchupId: mt.matchId, teams: teamStats });
  }
  return out;
}

/** League median score per week — context line for the team chart. */
export function weeklyMedians(leagueId: string): Array<{ week: number; median: number }> {
  const matchups = getMatchups(leagueId);
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

// ---------------------------------------------------------------------------
// Lifetime (all-seasons) stats
// ---------------------------------------------------------------------------

/** Season champion by year (Sleeper display name). Single source of truth. */
export const SEASON_CHAMPIONS: Record<string, string> = {
  '2025': 'JMoneyy10',
  '2024': 'keithchief',
  '2023': 'cjasin',
};

/** The champion's display name for a season, or null if none recorded. */
export function championOf(season: string): string | null {
  const handle = SEASON_CHAMPIONS[season];
  return handle ? managerName(handle) : null;
}

export function trophiesFor(displayName: string): number {
  return Object.values(SEASON_CHAMPIONS).filter(
    (n) => managerName(n).toLowerCase() === displayName.toLowerCase()
  ).length;
}

/** The seasons a manager won, oldest first. */
export function championSeasons(displayName: string): string[] {
  return Object.entries(SEASON_CHAMPIONS)
    .filter(([, handle]) => managerName(handle).toLowerCase() === displayName.toLowerCase())
    .map(([season]) => season)
    .sort();
}

/** Distinct champions with their title counts (for the lifetime trophy case). */
export const CHAMPIONS: Array<{ name: string; trophies: number; seasons: string[] }> = Array.from(
  new Set(Object.values(SEASON_CHAMPIONS).map(managerName))
).map((name) => ({ name, trophies: trophiesFor(name), seasons: championSeasons(name) }));

export interface LifetimeRow {
  displayName: string;
  slug: string;
  seasons: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  pointsFor: number;
  pointsAgainst: number;
  avgPoints: number;
  highScore: number;
  managerPerformance: number; // career points ÷ best-possible-lineup points, %
  bestFinish: number | null;
  trophies: number;
}

/**
 * Career regular-season records across every synced season, aggregated per
 * manager (keyed by Sleeper user id so a renamed team still counts as the
 * same person; display name comes from their most recent season).
 */
export function lifetimeStandings(): LifetimeRow[] {
  const seasons = getSeasons().filter((s) => s.hasGames);
  const byOwner = new Map<string, LifetimeRow & { games: number; optimalSum: number }>();

  // Oldest season first so the newest display name wins.
  for (const season of [...seasons].sort((a, b) => Number(a.season) - Number(b.season))) {
    for (const s of currentStandings(season.leagueId)) {
      const key = s.team.ownerId || s.team.displayName.toLowerCase();
      let row = byOwner.get(key);
      if (!row) {
        row = {
          displayName: s.team.displayName,
          slug: s.team.slug,
          seasons: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          winPct: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          avgPoints: 0,
          highScore: 0,
          managerPerformance: 0,
          bestFinish: null,
          trophies: 0,
          games: 0,
          optimalSum: 0,
        };
        byOwner.set(key, row);
      }
      row.displayName = s.team.displayName;
      row.slug = s.team.slug;
      row.seasons++;
      row.wins += s.wins;
      row.losses += s.losses;
      row.ties += s.ties;
      row.pointsFor = round2(row.pointsFor + s.pointsFor);
      row.pointsAgainst = round2(row.pointsAgainst + s.pointsAgainst);
      row.highScore = Math.max(row.highScore, s.highScore);
      row.bestFinish = row.bestFinish == null ? s.rank : Math.min(row.bestFinish, s.rank);
      row.games += s.wins + s.losses + s.ties;
      // Back out this season's best-possible-lineup total from its manager %.
      row.optimalSum += s.managerPerformance > 0 ? (s.pointsFor * 100) / s.managerPerformance : s.pointsFor;
    }
  }

  return [...byOwner.values()]
    .map((r) => ({
      ...r,
      winPct: r.games ? round2((r.wins / r.games) * 100) : 0,
      avgPoints: r.games ? round2(r.pointsFor / r.games) : 0,
      managerPerformance:
        r.optimalSum > 0 ? Math.min(100, round2((r.pointsFor / r.optimalSum) * 100)) : 100,
      trophies: trophiesFor(r.displayName),
    }))
    .sort((a, b) => b.trophies - a.trophies || b.winPct - a.winPct || b.pointsFor - a.pointsFor);
}

export interface SeasonLeader {
  playerId: string;
  name: string;
  team: string;
  season: string;
  points: number;
  manager: string | null; // manager who rostered them that season (null = free agent)
}

/**
 * Map "season::playerId" → the manager who rostered that player the most weeks
 * that season, so all-time leaders can be attributed to a manager the way the
 * dashboard's Players of the Week are. Players no team ever rostered are absent.
 */
function seasonRosteredManagers(seasons: SeasonOption[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const s of seasons) {
    const teams = new Map(getTeams(s.leagueId).map((t) => [t.rosterId, t.displayName]));
    const weeksByRoster = new Map<string, Map<number, number>>();
    for (const m of getMatchups(s.leagueId)) {
      for (const pid of m.players) {
        let byRoster = weeksByRoster.get(pid);
        if (!byRoster) {
          byRoster = new Map();
          weeksByRoster.set(pid, byRoster);
        }
        byRoster.set(m.rosterId, (byRoster.get(m.rosterId) ?? 0) + 1);
      }
    }
    for (const [pid, byRoster] of weeksByRoster) {
      let bestRoster = -1;
      let bestWeeks = -1;
      for (const [rid, weeks] of byRoster) {
        if (weeks > bestWeeks) {
          bestWeeks = weeks;
          bestRoster = rid;
        }
      }
      const mgr = teams.get(bestRoster);
      if (mgr) result.set(`${s.season}::${pid}`, mgr);
    }
  }
  return result;
}

/**
 * Best individual seasons per position across every synced season, from
 * league-wide NFL season stats (every player who scored — not just the ones
 * someone rostered). Points use this league's scoring format.
 */
export function bestSeasonsByPosition(topN = 5): Map<string, SeasonLeader[]> {
  const playedSeasons = getSeasons().filter((s) => s.hasGames);
  const fmtLeague = playedSeasons[0];
  const fmt = fmtLeague ? scoringFormat(fmtLeague.leagueId) : 'ppr';
  const col = fmt === 'ppr' ? 'pts_ppr' : fmt === 'half_ppr' ? 'pts_half' : 'pts_std';
  const seasons = new Set(getSeasons().map((s) => s.season));
  const managers = seasonRosteredManagers(playedSeasons);

  const rows = getDb()
    .prepare(
      // Prefer the team the player actually played for that season; fall back
      // to Sleeper's current team when we have no historical row.
      `SELECT s.season, s.player_id, s.position, s.${col} AS pts, p.full_name,
              COALESCE(t.team, p.team) AS team
       FROM player_season_stats s
       LEFT JOIN players p ON p.player_id = s.player_id
       LEFT JOIN player_season_teams t
              ON t.player_id = s.player_id AND t.season = s.season
       WHERE s.${col} IS NOT NULL`
    )
    .all() as Array<Record<string, unknown>>;

  const byPosition = new Map<string, SeasonLeader[]>();
  for (const r of rows) {
    if (!seasons.has(r.season as string)) continue; // only seasons this league played
    const pos = (r.position as string) ?? 'UNKNOWN';
    if (!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos)!.push({
      playerId: r.player_id as string,
      name: (r.full_name as string) ?? (r.player_id as string),
      team: (r.team as string) ?? '',
      season: r.season as string,
      points: round2(r.pts as number),
      manager: managers.get(`${r.season as string}::${r.player_id as string}`) ?? null,
    });
  }
  for (const [pos, list] of byPosition) {
    list.sort((a, b) => b.points - a.points);
    byPosition.set(pos, list.slice(0, topN));
  }
  return byPosition;
}

export interface SeasonPoints {
  season: string;
  /** League-wide points actually scored that regular season. */
  actual: number;
  /** League-wide points the best-possible lineups would have scored. */
  optimal: number;
}

/**
 * Actual vs best-possible points per season, summed across every team. Uses
 * regular-season weeks only, matching the all-time standings above it.
 */
export function seasonPointsSeries(): SeasonPoints[] {
  const out: SeasonPoints[] = [];
  for (const s of getSeasons()) {
    if (!s.hasGames) continue;
    const league = getLeagueInfo(s.leagueId);
    if (!league) continue;
    const meta = getPlayerMeta(s.season);
    const matchups = getMatchups(s.leagueId);
    const weeks = new Set(regularSeasonWeeks(s.leagueId, matchups));
    let actual = 0;
    let optimal = 0;
    for (const m of matchups) {
      if (!weeks.has(m.week)) continue;
      actual += m.points;
      optimal += optimalLineup(league.rosterPositions, m.starters, m.playersPoints, meta).optimalTotal;
    }
    out.push({ season: s.season, actual: round2(actual), optimal: round2(optimal) });
  }
  return out.sort((a, b) => Number(a.season) - Number(b.season));
}

// ---------------------------------------------------------------------------
// Head-to-head (all-time, per manager vs each opponent)
// ---------------------------------------------------------------------------

export interface H2HMatch {
  season: string;
  week: number;
  myPoints: number;
  oppPoints: number;
  result: 'W' | 'L' | 'T';
}

export interface H2HOpponent {
  key: string;
  displayName: string;
  slug: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  managerPct: number | null;
  performancePct: number | null;
  matches: H2HMatch[];
}

export interface ManagerH2H {
  key: string;
  displayName: string;
  slug: string;
  opponents: H2HOpponent[];
}

interface H2HAgg {
  key: string;
  displayName: string;
  slug: string;
  wins: number;
  losses: number;
  ties: number;
  pf: number;
  pa: number;
  optimalSum: number;
  projPf: number;
  projSum: number;
  matches: H2HMatch[];
}

/**
 * Every manager's all-time regular-season record against each other manager,
 * with points for/against, manager %, performance %, and the full list of
 * their meetings in chronological order. Managers are keyed by Sleeper user
 * id so renames stay the same person.
 */
export function headToHead(): ManagerH2H[] {
  const seasons = getSeasons()
    .filter((s) => s.hasGames)
    .sort((a, b) => Number(a.season) - Number(b.season));
  const meta = getPlayerMeta();
  const ownerKeyOf = (t: TeamInfo) => t.ownerId || t.displayName.toLowerCase();

  const managers = new Map<
    string,
    { key: string; displayName: string; slug: string; opps: Map<string, H2HAgg> }
  >();

  for (const season of seasons) {
    const leagueId = season.leagueId;
    const league = getLeagueInfo(leagueId);
    const teamByRoster = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));
    const matchups = getMatchups(leagueId);
    const fmt = scoringFormat(leagueId);

    for (const week of regularSeasonWeeks(leagueId, matchups)) {
      const weekRows = matchups.filter((m) => m.week === week);
      const proj = weekProjections(season.season, week);
      for (const mine of weekRows) {
        const opp = opponentOf(mine, weekRows);
        if (!opp) continue;
        const myTeam = teamByRoster.get(mine.rosterId);
        const oppTeam = teamByRoster.get(opp.rosterId);
        if (!myTeam || !oppTeam) continue;
        const myKey = ownerKeyOf(myTeam);
        const oppKey = ownerKeyOf(oppTeam);
        if (myKey === oppKey) continue;

        let m = managers.get(myKey);
        if (!m) {
          m = { key: myKey, displayName: myTeam.displayName, slug: myTeam.slug, opps: new Map() };
          managers.set(myKey, m);
        }
        m.displayName = myTeam.displayName;
        m.slug = myTeam.slug;

        let agg = m.opps.get(oppKey);
        if (!agg) {
          agg = {
            key: oppKey,
            displayName: oppTeam.displayName,
            slug: oppTeam.slug,
            wins: 0,
            losses: 0,
            ties: 0,
            pf: 0,
            pa: 0,
            optimalSum: 0,
            projPf: 0,
            projSum: 0,
            matches: [],
          };
          m.opps.set(oppKey, agg);
        }
        agg.displayName = oppTeam.displayName;
        agg.slug = oppTeam.slug;

        const result: 'W' | 'L' | 'T' =
          mine.points > opp.points ? 'W' : mine.points < opp.points ? 'L' : 'T';
        if (result === 'W') agg.wins++;
        else if (result === 'L') agg.losses++;
        else agg.ties++;
        agg.pf = round2(agg.pf + mine.points);
        agg.pa = round2(agg.pa + opp.points);
        if (league) {
          agg.optimalSum += optimalLineup(
            league.rosterPositions,
            mine.starters,
            mine.playersPoints,
            meta
          ).optimalTotal;
        }
        const projected = projectedTotal(mine.starters, proj, fmt);
        if (projected && projected > 0) {
          agg.projPf = round2(agg.projPf + mine.points);
          agg.projSum = round2(agg.projSum + projected);
        }
        agg.matches.push({
          season: season.season,
          week,
          myPoints: round2(mine.points),
          oppPoints: round2(opp.points),
          result,
        });
      }
    }
  }

  return [...managers.values()]
    .map((m) => ({
      key: m.key,
      displayName: m.displayName,
      slug: m.slug,
      opponents: [...m.opps.values()]
        .map((a) => ({
          key: a.key,
          displayName: a.displayName,
          slug: a.slug,
          wins: a.wins,
          losses: a.losses,
          ties: a.ties,
          pointsFor: round2(a.pf),
          pointsAgainst: round2(a.pa),
          managerPct: a.optimalSum > 0 ? Math.min(100, round2((a.pf / a.optimalSum) * 100)) : null,
          performancePct: a.projSum > 0 ? round2((a.projPf / a.projSum) * 100) : null,
          matches: a.matches.sort(
            (x, y) => Number(x.season) - Number(y.season) || x.week - y.week
          ),
        }))
        .sort((x, y) => x.displayName.localeCompare(y.displayName)),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

// ---------------------------------------------------------------------------
// Draft board
// ---------------------------------------------------------------------------

export interface DraftPick {
  pickNo: number; // overall pick number
  round: number;
  manager: string; // manager who made/received the pick
  ownerId: string;
  playerId: string;
  name: string;
  position: string;
  seasonPoints: number | null; // season fantasy total (league scoring)
  posSeasonRank: number | null; // finish among all players at this position that season
  posDraftRank: number; // Nth at this position taken in the draft
  highWeek: number | null; // most points in a single week
  lowWeek: number | null; // fewest points in a single week
  vsReplacement: number | null; // season points − positional replacement level
  team: string | null; // NFL team that season
}

export interface DraftMover {
  name: string;
  position: string;
  manager: string;
  drafted: number; // positional draft rank
  finished: number; // positional season finish
  delta: number; // drafted − finished; positive = climbed
}

export interface DraftGrade {
  manager: string;
  ownerId: string;
  score: number; // sum of each pick's points above positional replacement
}

/** A single pick as shown in the draft-rankings tables. */
export interface DraftRankPick {
  name: string;
  position: string;
  season: string;
  managerPickNo: number; // Nth selection of that manager's own draft
  value: number; // season points above positional replacement
}

export interface DraftRankRow {
  ownerId: string;
  manager: string;
  score: number; // total points above replacement
  drafts: number; // how many drafts this covers (1 per season)
  worstEarly: DraftRankPick | null; // lowest-value pick among their first 7
  bestPick: DraftRankPick | null; // highest-value pick
}

/** How many of a manager's own selections count as "early". */
const EARLY_PICK_COUNT = 7;

export interface DraftBoard {
  season: string;
  scoringFormat: ScoringFormat;
  picks: DraftPick[]; // overall pick order
  managers: Array<{ ownerId: string; name: string }>; // draft-slot order
  rankings: DraftRankRow[]; // best draft first
  riser: DraftMover | null; // best finish vs draft slot (QB/RB/WR/TE)
  faller: DraftMover | null; // worst finish vs draft slot (QB/RB/WR/TE)
  bestDraft: DraftGrade | null;
  worstDraft: DraftGrade | null;
}

/**
 * Score each manager's draft by summing every pick's points above positional
 * replacement, and pull out their worst early pick and best pick overall.
 * Picks are numbered within the manager's own draft, so "#2" is their second
 * selection regardless of where it landed in the overall order.
 */
function buildDraftRankings(
  picks: DraftPick[],
  managers: Array<{ ownerId: string; name: string }>,
  season: string
): DraftRankRow[] {
  const rows = managers.map((m) => {
    const own = picks
      .filter((p) => p.ownerId === m.ownerId)
      .sort((a, b) => a.pickNo - b.pickNo)
      .map((pick, i) => ({ pick, managerPickNo: i + 1 }))
      .filter((e) => e.pick.vsReplacement != null);

    let score = 0;
    let worstEarly: DraftRankPick | null = null;
    let bestPick: DraftRankPick | null = null;
    for (const e of own) {
      const value = round2(e.pick.vsReplacement!);
      score += value;
      const entry: DraftRankPick = {
        name: e.pick.name,
        position: e.pick.position,
        season,
        managerPickNo: e.managerPickNo,
        value,
      };
      if (e.managerPickNo <= EARLY_PICK_COUNT && (!worstEarly || value < worstEarly.value)) {
        worstEarly = entry;
      }
      if (!bestPick || value > bestPick.value) bestPick = entry;
    }
    return {
      ownerId: m.ownerId,
      manager: m.name,
      score: round2(score),
      drafts: 1,
      worstEarly,
      bestPick,
    };
  });
  return rows.sort((a, b) => b.score - a.score);
}

/**
 * Career draft rankings: every season's draft score summed per manager (keyed
 * by Sleeper user id so a rename still counts as the same person), with their
 * single worst early pick and best pick across all drafts.
 */
export function lifetimeDraftRankings(): DraftRankRow[] {
  const agg = new Map<string, DraftRankRow>();
  for (const s of getSeasons()) {
    // getSeasons() is newest-first, so the first name seen is the current one.
    const board = draftBoard(s.leagueId);
    if (!board) continue;
    for (const row of board.rankings) {
      const key = row.ownerId || row.manager.toLowerCase();
      let cur = agg.get(key);
      if (!cur) {
        cur = {
          ownerId: row.ownerId,
          manager: row.manager,
          score: 0,
          drafts: 0,
          worstEarly: null,
          bestPick: null,
        };
        agg.set(key, cur);
      }
      cur.score = round2(cur.score + row.score);
      cur.drafts += 1;
      if (row.worstEarly && (!cur.worstEarly || row.worstEarly.value < cur.worstEarly.value)) {
        cur.worstEarly = row.worstEarly;
      }
      if (row.bestPick && (!cur.bestPick || row.bestPick.value > cur.bestPick.value)) {
        cur.bestPick = row.bestPick;
      }
    }
  }
  return [...agg.values()].sort((a, b) => b.score - a.score);
}

/**
 * Positional rank whose season total serves as the "replacement level" a
 * drafted player is measured against (roughly the best widely-available
 * waiver option at each position in a 10-team league).
 */
const REPLACEMENT_RANK: Record<string, number> = {
  QB: 15,
  RB: 25,
  WR: 25,
  TE: 15,
  K: 12,
  DEF: 12,
};

const MOVER_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

/**
 * The season's draft with, for each pick, the player's season fantasy total,
 * their positional finish that season, what number they were at their position
 * in the draft, and their best/worst single week. Weekly high/low come from the
 * league's own matchup scores (the weeks the player was rostered here). Returns
 * null if this league has no stored draft.
 */
export function draftBoard(leagueId: string): DraftBoard | null {
  const db = getDb();
  const pickRows = db
    .prepare('SELECT * FROM draft_picks WHERE league_id = ? ORDER BY pick_no')
    .all(leagueId) as Array<Record<string, unknown>>;
  if (pickRows.length === 0) return null;

  const info = getLeagueInfo(leagueId);
  const season = info?.season ?? '';
  const fmt = scoringFormat(leagueId);
  const col = fmt === 'ppr' ? 'pts_ppr' : fmt === 'half_ppr' ? 'pts_half' : 'pts_std';
  const meta = getPlayerMeta(season);
  const teams = new Map(getTeams(leagueId).map((t) => [t.rosterId, t]));

  // Season totals + positional finish, from league-wide season stats.
  const statRows = db
    .prepare(
      `SELECT player_id, position, ${col} AS pts FROM player_season_stats
       WHERE season = ? AND ${col} IS NOT NULL`
    )
    .all(season) as Array<{ player_id: string; position: string | null; pts: number }>;
  const seasonPts = new Map<string, number>();
  const byPos = new Map<string, Array<{ pid: string; pts: number }>>();
  for (const r of statRows) {
    seasonPts.set(r.player_id, round2(r.pts));
    const pos = r.position ?? 'UNKNOWN';
    if (!byPos.has(pos)) byPos.set(pos, []);
    byPos.get(pos)!.push({ pid: r.player_id, pts: r.pts });
  }
  const posSeasonRank = new Map<string, number>();
  for (const list of byPos.values()) {
    list.sort((a, b) => b.pts - a.pts);
    list.forEach((e, i) => posSeasonRank.set(e.pid, i + 1));
  }

  // Best/worst single week from this league's matchup scores.
  const high = new Map<string, number>();
  const low = new Map<string, number>();
  for (const m of getMatchups(leagueId)) {
    for (const [pid, pts] of Object.entries(m.playersPoints)) {
      if (pts == null) continue;
      high.set(pid, Math.max(high.get(pid) ?? -Infinity, pts));
      low.set(pid, Math.min(low.get(pid) ?? Infinity, pts));
    }
  }

  // Replacement level per position: the Nth-best season total league-wide.
  const replacement = new Map<string, number>();
  for (const [pos, n] of Object.entries(REPLACEMENT_RANK)) {
    const list = byPos.get(pos);
    if (!list || list.length === 0) continue;
    replacement.set(pos, list[Math.min(n, list.length) - 1].pts);
  }

  const posDraftCount = new Map<string, number>();
  const picks: DraftPick[] = pickRows.map((r) => {
    const playerId = r.player_id as string;
    const pm = meta.get(playerId);
    const position = (r.position as string) || pm?.position || 'UNKNOWN';
    const n = (posDraftCount.get(position) ?? 0) + 1;
    posDraftCount.set(position, n);
    const rosterId = r.roster_id as number | null;
    const team = rosterId != null ? teams.get(rosterId) : undefined;
    const base = replacement.get(position);
    return {
      pickNo: r.pick_no as number,
      round: (r.round as number) ?? 0,
      manager: team?.displayName ?? '—',
      ownerId: team?.ownerId ?? '',
      playerId,
      name: (r.player_name as string) || pm?.name || playerId,
      position,
      seasonPoints: seasonPts.get(playerId) ?? null,
      posSeasonRank: posSeasonRank.get(playerId) ?? null,
      posDraftRank: n,
      highWeek: high.has(playerId) ? round2(high.get(playerId)!) : null,
      lowWeek: low.has(playerId) ? round2(low.get(playerId)!) : null,
      vsReplacement: base == null ? null : round2((seasonPts.get(playerId) ?? 0) - base),
      team: pm?.team ?? null,
    };
  });

  // Managers in draft order: earliest overall pick first (i.e. draft slot 1..N).
  const earliest = new Map<string, { ownerId: string; name: string; pick: number }>();
  for (const p of picks) {
    if (!p.ownerId) continue;
    const cur = earliest.get(p.ownerId);
    if (!cur || p.pickNo < cur.pick) {
      earliest.set(p.ownerId, { ownerId: p.ownerId, name: p.manager, pick: p.pickNo });
    }
  }
  const managers = [...earliest.values()]
    .sort((a, b) => a.pick - b.pick)
    .map(({ ownerId, name }) => ({ ownerId, name }));

  // Biggest riser / faller: finish vs draft slot, skill positions only.
  let riser: DraftMover | null = null;
  let faller: DraftMover | null = null;
  for (const p of picks) {
    if (!MOVER_POSITIONS.has(p.position) || p.posSeasonRank == null) continue;
    const mover: DraftMover = {
      name: p.name,
      position: p.position,
      manager: p.manager,
      drafted: p.posDraftRank,
      finished: p.posSeasonRank,
      delta: p.posDraftRank - p.posSeasonRank,
    };
    if (!riser || mover.delta > riser.delta) riser = mover;
    if (!faller || mover.delta < faller.delta) faller = mover;
  }

  // Draft grades: each pick's season total vs the replacement level at its
  // position, summed per manager. A drafted player with no recorded points
  // counts as 0 — a full bust.
  const grades = new Map<string, DraftGrade>();
  for (const p of picks) {
    if (!p.ownerId || p.vsReplacement == null) continue;
    let g = grades.get(p.ownerId);
    if (!g) {
      g = { manager: p.manager, ownerId: p.ownerId, score: 0 };
      grades.set(p.ownerId, g);
    }
    g.score += p.vsReplacement;
  }
  let bestDraft: DraftGrade | null = null;
  let worstDraft: DraftGrade | null = null;
  for (const g of grades.values()) {
    g.score = round2(g.score);
    if (!bestDraft || g.score > bestDraft.score) bestDraft = g;
    if (!worstDraft || g.score < worstDraft.score) worstDraft = g;
  }

  return {
    season,
    scoringFormat: fmt,
    picks,
    managers,
    rankings: buildDraftRankings(picks, managers, season),
    riser,
    faller,
    bestDraft,
    worstDraft,
  };
}
