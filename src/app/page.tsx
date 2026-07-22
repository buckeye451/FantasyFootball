import {
  currentStandings,
  getLeague,
  getTeams,
  playersOfWeek,
  regularSeasonWeeks,
  topSeasonPlayersByPosition,
  weeklyRankSeries,
  weeklyScoreSeries,
} from '@/lib/stats';
import { LeagueChartsBoard } from '@/components/FocusCharts';
import { PlayersOfWeek, TopSeasonPlayers } from '@/components/PlayerCards';
import { StandingsTable } from '@/components/StandingsTable';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const league = getLeague();
  if (!league) {
    return (
      <div className="empty-state">
        <h1>No league data yet</h1>
        <p>
          Set <code>SLEEPER_LEAGUE_ID</code> in <code>.env</code> and run <code>npm run sync</code> —
          or load the demo season with <code>npm run seed:demo</code>.
        </p>
      </div>
    );
  }

  const standings = currentStandings();
  const teams = getTeams().map((t) => ({ slug: t.slug, name: t.displayName }));

  // League is connected but no scored games yet (pre-draft / offseason, or the
  // very first sync is still running). Show a friendly holding page instead of
  // trying to render standings that don't exist yet.
  if (standings.length === 0) {
    return (
      <div className="empty-state">
        <h1>{league.name} is connected</h1>
        <p>
          {teams.length > 0
            ? `${teams.length} teams are set up, but there aren't any scored games yet.`
            : "The league is set up, but there aren't any teams or scored games yet."}
          {' '}Standings, charts, and player stats will appear here automatically once
          the {league.season} season has played weeks.
        </p>
        <p className="page-subtitle">
          {league.lastSyncedAt
            ? `Last checked Sleeper ${new Date(league.lastSyncedAt).toLocaleString()}.`
            : 'Syncing from Sleeper…'}{' '}
          Want to see last season instead? Point <code>SLEEPER_LEAGUE_ID</code> at your
          previous season&apos;s league.
        </p>
      </div>
    );
  }

  const weeks = regularSeasonWeeks();
  const latestWeek = weeks[weeks.length - 1];
  const scoreData = weeklyScoreSeries();
  const rankData = weeklyRankSeries();
  const pow = playersOfWeek(latestWeek);
  const topPlayers = topSeasonPlayersByPosition(5);

  const leader = standings[0];
  const bestWeek = scoreData.reduce(
    (best, row) => {
      for (const t of teams) {
        const v = row[t.slug];
        if (v != null && v > best.points) best = { points: v, team: t.name, week: row.week };
      }
      return best;
    },
    { points: 0, team: '', week: 0 }
  );
  const mostPF = [...standings].sort((a, b) => b.pointsFor - a.pointsFor)[0];

  return (
    <>
      <h1 className="page-title">League dashboard</h1>
      <p className="page-subtitle">
        Through week {latestWeek} · {standings.length} teams
        {league.lastSyncedAt ? ` · data updated ${new Date(league.lastSyncedAt).toLocaleString()}` : ''}
      </p>

      <div className="tile-grid">
        <div className="tile">
          <div className="tile-label">League leader</div>
          <div className="tile-value">{leader.team.displayName}</div>
          <div className="tile-sub">
            {leader.wins}-{leader.losses}
            {leader.ties ? `-${leader.ties}` : ''} · {leader.pointsFor.toFixed(1)} PF
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">Most points</div>
          <div className="tile-value">{mostPF.pointsFor.toFixed(1)}</div>
          <div className="tile-sub">
            {mostPF.team.displayName} · {mostPF.avgPoints.toFixed(1)} per week
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">Best single week</div>
          <div className="tile-value">{bestWeek.points.toFixed(1)}</div>
          <div className="tile-sub">
            {bestWeek.team} · week {bestWeek.week}
          </div>
        </div>
        {pow.mvp && (
          <div className="tile">
            <div className="tile-label">Week {latestWeek} MVP</div>
            <div className="tile-value">{pow.mvp.points.toFixed(1)}</div>
            <div className="tile-sub">
              {pow.mvp.player.name} ({pow.mvp.player.position}) · {pow.mvp.manager}
            </div>
          </div>
        )}
      </div>

      <section className="card">
        <h2 className="card-title">Standings</h2>
        <p className="card-note">Regular season through week {latestWeek}. Arrows show movement since last week.</p>
        <StandingsTable standings={standings} />
      </section>

      <LeagueChartsBoard teams={teams} scoreData={scoreData} rankData={rankData} />

      <section>
        <h2 className="card-title">Players of the week</h2>
        <p className="card-note">Top fantasy performance at each position in week {latestWeek}, across all rosters.</p>
        <PlayersOfWeek byPosition={pow.byPosition} week={latestWeek} />
      </section>

      <section>
        <h2 className="card-title">Best of the season</h2>
        <p className="card-note">Total fantasy points this season by position, across every rostered player.</p>
        <TopSeasonPlayers byPosition={topPlayers} />
      </section>
    </>
  );
}
