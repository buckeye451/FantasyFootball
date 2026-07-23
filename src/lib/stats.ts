import { getDb } from './db';
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

  const build = (throughWeeks: number[]): Array<Omit<Standing, 'rank' | 'movement'>> =>
    teams.map((team) => {
      let wins = 0,
        losses = 0,
        ties = 0,
        pf = 0,
        pa = 0,
        optimalSum = 0;
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
  const meta = getPlayerMeta();
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
  const meta = getPlayerMeta();
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

export function teamSeason(leagueId: string, rosterId: number): TeamSeason | null {
  const league = getLeagueInfo(leagueId);
  if (!league) return null;
  const teams = getTeams(leagueId);
  const team = teams.find((t) => t.rosterId === rosterId);
  if (!team) return null;

  const matchups = getMatchups(leagueId);
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
