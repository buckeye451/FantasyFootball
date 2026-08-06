import {
  championOf,
  currentStandings,
  getSeasons,
  getTeams,
  playersOfWeek,
  playoffRounds,
  regularSeasonWeeks,
  resolveActiveLeague,
  seasonProgress,
  seedBoard,
  standingsThroughWeek,
  topSeasonPlayersByPosition,
  weekBreakdown,
  weeklyRankSeries,
  weekScoreBoard,
  weeklyScoreSeries,
} from '@/lib/stats';
import Link from 'next/link';
import { LeagueChartsBoard } from '@/components/FocusCharts';
import { latestRecap } from '@/lib/recaps';
import { managerClass, performanceClass } from '@/lib/thresholds';
import { PlayersOfWeek, TopSeasonPlayers } from '@/components/PlayerCards';
import { StandingsTable } from '@/components/StandingsTable';
import { SeasonProgressTile } from '@/components/SeasonProgress';
import { WeekRail } from '@/components/WeekRail';
import { LeadStory, LeadTile } from '@/components/LeadStory';
import { WeekScoresSection } from '@/components/WeekScoresSection';

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
  const scoreBoard = weekScoreBoard(leagueId, selectedWeek);
  // Rewinds with the week selector, same as the full standings table.
  const board = seedBoard(leagueId, selectedWeek);
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

  // Best single week anyone has posted so far, on the same "as of" basis as
  // the rest of the page — so the lead story's claim can't outrun the standings
  // the reader is looking at.
  const seasonHigh = standings.reduce((max, s) => Math.max(max, s.highScore), 0);
  const isSeasonHigh = highestScoring != null && highestScoring.score >= seasonHigh - 0.005;

  // The rail shows the league's whole declared regular season, not just the
  // weeks that have rows, so an in-progress season still reads as 17 weeks.
  const totalRegularWeeks = league.playoffWeekStart != null ? league.playoffWeekStart - 1 : latestWeek;
  const railWeeks = Array.from({ length: Math.max(totalRegularWeeks, latestWeek) }, (_, i) => i + 1);
  const hasPlayoffs = playoffRounds(leagueId).length > 0;
  // Seconds are noise on a rail that has to fit a phone.
  const syncedLabel = league.lastSyncedAt
    ? new Date(league.lastSyncedAt).toLocaleString(undefined, {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <>
      <div className="dash-head">
        <h1 className="page-title">{season} dashboard</h1>
        <p className="page-subtitle">
          {league.name} · {standings.length} teams
        </p>
      </div>

      <WeekRail
        weeks={railWeeks}
        selected={selectedWeek}
        playedThrough={latestWeek}
        season={season}
        pct={progress?.pct}
        syncedLabel={syncedLabel}
        hasPlayoffs={hasPlayoffs}
      />

      <div className="dash-lead">
        {highestScoring ? (
          <LeadStory
            kicker={`👑 Week ${selectedWeek} · high score of the ${isSeasonHigh ? 'season' : 'week'}`}
            figure={highestScoring.score.toFixed(1)}
            headline={`${highestScoring.team.displayName} posts this week's high score: ${highestScoring.score.toFixed(1)}`}
            blurb={
              isSeasonHigh
                ? `Nobody has posted a bigger week in ${season}.`
                : `Week ${selectedWeek}'s best score — ${(seasonHigh - highestScoring.score).toFixed(1)} off the season high.`
            }
            stats={[
              {
                label: 'Perf',
                value:
                  highestScoring.performancePct != null
                    ? `${highestScoring.performancePct.toFixed(1)}%`
                    : '—',
                tone: performanceClass(highestScoring.performancePct),
              },
              {
                label: 'Manager',
                value: `${highestScoring.managerScorePct.toFixed(1)}%`,
                tone: managerClass(highestScoring.managerScorePct),
              },
              {
                label: 'Left on bench',
                value: (highestScoring.optimal - highestScoring.score).toFixed(1),
              },
              { label: 'ROL %', value: `${highestScoring.winPctVsLeague.toFixed(0)}%` },
            ]}
            href={`/team/${highestScoring.team.slug}?season=${season}&week=${selectedWeek}#week-detail`}
          />
        ) : (
          <div className="lead-story">
            <div className="kicker lead-story-kicker">Week {selectedWeek}</div>
            <div className="lead-story-headline">No scored games this week yet.</div>
          </div>
        )}

        <div className="dash-lead-tiles">
          <LeadTile
            label="✅ Highest Performance"
            sub={
              highestPerf
                ? `${highestPerf.team.displayName} · ${highestPerf.score.toFixed(1)} pts`
                : 'no projections'
            }
            value={
              highestPerf?.performancePct != null ? `${highestPerf.performancePct.toFixed(1)}%` : '—'
            }
            tone="series"
          />
          <LeadTile
            label="📋 Best Manager"
            sub={
              bestManager
                ? `${bestManager.team.displayName} · ${bestManager.score.toFixed(1)} of ${bestManager.optimal.toFixed(1)}`
                : undefined
            }
            value={bestManager ? `${bestManager.managerScorePct.toFixed(1)}%` : '—'}
            tone="good"
          />
          <LeadTile
            label={`🏈 Week ${selectedWeek} MVP`}
            sub={
              pow.mvp
                ? `${pow.mvp.player.name} (${pow.mvp.player.position}) · ${pow.mvp.manager}`
                : undefined
            }
            value={pow.mvp ? pow.mvp.points.toFixed(1) : '—'}
            tone="ink"
          />
        </div>
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
        <StandingsTable
          standings={standings}
          season={season}
          champion={championOf(season)}
          throughWeek={selectedWeek}
          board={board}
        />
      </section>

      <WeekScoresSection
        week={selectedWeek}
        season={season}
        breakdowns={weekMatchups}
        board={scoreBoard}
      />

      <section>
        <h2 className="card-title">Players of the week</h2>
        <p className="card-note">Top fantasy performance at each position in week {selectedWeek}, across all rosters.</p>
        <PlayersOfWeek byPosition={pow.byPosition} week={selectedWeek} />
      </section>

      <LeagueChartsBoard teams={teams} scoreData={scoreData} rankData={rankData} />

      <section>
        <h2 className="card-title">Best of the season</h2>
        <p className="card-note">Total fantasy points this season by position, across every rostered player.</p>
        <TopSeasonPlayers byPosition={topPlayers} season={season} />
      </section>
    </>
  );
}
