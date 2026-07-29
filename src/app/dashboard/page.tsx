import {
  championOf,
  currentStandings,
  getSeasons,
  getTeams,
  playersOfWeek,
  regularSeasonWeeks,
  resolveActiveLeague,
  seasonProgress,
  standingsThroughWeek,
  topSeasonPlayersByPosition,
  weekBreakdown,
  weeklyRankSeries,
  weeklyScoreSeries,
} from '@/lib/stats';
import Link from 'next/link';
import { LeagueChartsBoard } from '@/components/FocusCharts';
import { MatchupBreakdownList } from '@/components/MatchupBreakdown';
import { latestRecap } from '@/lib/recaps';
import { PlayersOfWeek, TopSeasonPlayers } from '@/components/PlayerCards';
import { StandingsTable } from '@/components/StandingsTable';
import { WeekSelect } from '@/components/WeekSelect';
import { SeasonProgressTile } from '@/components/SeasonProgress';

export const dynamic = 'force-dynamic';

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { season?: string; week?: string };
}) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) {
    return (
      <div className="empty-state">
        <h1>No league data yet</h1>
        <p>
          Set <code>SLEEPER_LEAGUE_ID</code> in <code>.env</code> and run <code>npm run sync</code> —
          or load the demo seasons with <code>npm run seed:demo</code>.
        </p>
      </div>
    );
  }

  const leagueId = league.leagueId;
  const season = league.season;
  const teams = getTeams(leagueId).map((t) => ({ slug: t.slug, name: t.displayName }));

  // League is connected but no scored games yet (pre-draft / offseason, or the
  // very first sync is still running). Show a friendly holding page.
  if (currentStandings(leagueId).length === 0) {
    const otherWithGames = getSeasons().find((s) => s.hasGames);
    return (
      <div className="empty-state">
        <h1>{league.name} · {season}</h1>
        <p>
          {teams.length > 0
            ? `${teams.length} teams are set up, but there aren't any scored games yet.`
            : "This season is set up, but there aren't any teams or scored games yet."}
          {' '}Standings, charts, and player stats will appear here once the {season} season
          plays its weeks.
        </p>
        {otherWithGames && (
          <p className="page-subtitle">
            Use the <strong>Season</strong> menu above to view {otherWithGames.season}, which has
            completed games.
          </p>
        )}
      </div>
    );
  }

  const weeks = regularSeasonWeeks(leagueId);
  const latestWeek = weeks[weeks.length - 1];
  const scoreData = weeklyScoreSeries(leagueId);
  const rankData = weeklyRankSeries(leagueId);
  const topPlayers = topSeasonPlayersByPosition(leagueId, 5);

  // The week selector rewinds the three sections below (standings, the four
  // tiles, players-of-the-week); charts and season leaders stay full-season.
  const requestedWeek = Number(searchParams.week);
  const selectedWeek = weeks.includes(requestedWeek) ? requestedWeek : latestWeek;

  const standings = standingsThroughWeek(leagueId, selectedWeek);
  const pow = playersOfWeek(leagueId, selectedWeek);

  // Single-week leaders for the stat tiles.
  const recap = latestRecap(season);
  // Real calendar progress, so it doesn't rewind with the week selector above.
  const progress = seasonProgress(leagueId);
  const weekMatchups = weekBreakdown(leagueId, selectedWeek);
  const weekTeams = weekMatchups.flatMap((m) => m.teams);
  const highestScoring = weekTeams.reduce<(typeof weekTeams)[number] | null>(
    (best, t) => (best == null || t.score > best.score ? t : best),
    null
  );
  const perfTeams = weekTeams.filter((t) => t.performancePct != null);
  const highestPerf = perfTeams.reduce<(typeof weekTeams)[number] | null>(
    (best, t) => (best == null || t.performancePct! > best.performancePct! ? t : best),
    null
  );
  const bestManager = weekTeams.reduce<(typeof weekTeams)[number] | null>(
    (best, t) => (best == null || t.managerScorePct > best.managerScorePct ? t : best),
    null
  );

  return (
    <>
      <h1 className="page-title">{season} dashboard</h1>
      <div className="dash-controls">
        <p className="page-subtitle">
          {league.name} · {standings.length} teams
          {league.lastSyncedAt ? ` · data updated ${new Date(league.lastSyncedAt).toLocaleString()}` : ''}
        </p>
        <WeekSelect weeks={weeks} selected={selectedWeek} season={season} />
      </div>

      <div className="tile-grid">
        <div className="tile">
          <div className="tile-label">👑 Highest Score</div>
          <div className="tile-value">
            {highestScoring ? highestScoring.score.toFixed(1) : '—'}
          </div>
          <div className="tile-sub">
            {highestScoring
              ? `${highestScoring.team.displayName} · week ${selectedWeek}`
              : ''}
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">✅ Highest Performance</div>
          <div className="tile-value">
            {highestPerf?.performancePct != null ? `${highestPerf.performancePct.toFixed(1)}%` : '—'}
          </div>
          <div className="tile-sub">
            {highestPerf ? `${highestPerf.team.displayName} · ${highestPerf.score.toFixed(1)} pts` : 'no projections'}
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">📋 Best Manager</div>
          <div className="tile-value">
            {bestManager ? `${bestManager.managerScorePct.toFixed(1)}%` : '—'}
          </div>
          <div className="tile-sub">
            {bestManager ? `${bestManager.team.displayName} · ${bestManager.score.toFixed(1)} of ${bestManager.optimal.toFixed(1)}` : ''}
          </div>
        </div>
        {pow.mvp && (
          <div className="tile">
            <div className="tile-label">🏈 Week {selectedWeek} MVP</div>
            <div className="tile-value">{pow.mvp.points.toFixed(1)}</div>
            <div className="tile-sub">
              {pow.mvp.player.name} ({pow.mvp.player.position}) · {pow.mvp.manager}
            </div>
          </div>
        )}
      </div>

      {recap && (
        <Link className="recap-preview" href={`/recaps?season=${season}#recap-${recap.id}`}>
          <div className="recap-preview-body">
            <div className="recap-preview-label">Latest recap</div>
            <div className="recap-preview-title">{recap.title}</div>
            {recap.preheader && <div className="recap-preview-sub">{recap.preheader}</div>}
          </div>
          <span className="recap-preview-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      )}

      {progress && <SeasonProgressTile progress={progress} season={season} />}

      <section className="card">
        <h2 className="card-title">Standings</h2>
        <p className="card-note">
          Regular season through week {selectedWeek}. Arrows show movement since the prior week.
        </p>
        <StandingsTable standings={standings} season={season} champion={championOf(season)} />
      </section>

      <section>
        <h2 className="card-title">Players of the week</h2>
        <p className="card-note">Top fantasy performance at each position in week {selectedWeek}, across all rosters.</p>
        <PlayersOfWeek byPosition={pow.byPosition} week={selectedWeek} />
      </section>

      <section>
        <h2 className="card-title">Week {selectedWeek} scores</h2>
        <p className="card-note">
          Every matchup that week. ROL % = share of the rest of the league this score beats · Perf %
          = score ÷ projected · Manager % = score ÷ best-possible lineup · BLW? = would the optimal
          lineup have won.
        </p>
        <MatchupBreakdownList
          breakdowns={weekMatchups}
          season={season}
          compact
          boxLinkWeek={selectedWeek}
        />
      </section>

      <LeagueChartsBoard teams={teams} scoreData={scoreData} rankData={rankData} />

      <section>
        <h2 className="card-title">Best of the season</h2>
        <p className="card-note">Total fantasy points this season by position, across every rostered player.</p>
        <TopSeasonPlayers byPosition={topPlayers} />
      </section>
    </>
  );
}
