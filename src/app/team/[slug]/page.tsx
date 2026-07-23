import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPlayerMeta,
  getTeamBySlug,
  resolveActiveLeague,
  teamSeason,
  teamWeekDetail,
  weeklyMedians,
} from '@/lib/stats';
import { TeamWeeklyChart } from '@/components/FocusCharts';
import { LineupAsSet, OptimalLineup } from '@/components/RosterTables';
import { TeamWeekPicker } from '@/components/TeamWeekPicker';

export const dynamic = 'force-dynamic';

export default function TeamPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { week?: string; season?: string };
}) {
  const league = resolveActiveLeague(searchParams.season);
  const team = league ? getTeamBySlug(league.leagueId, params.slug) : null;
  if (!league || !team) notFound();

  const leagueId = league.leagueId;
  const seasonYear = league.season;
  const season = teamSeason(leagueId, team.rosterId);
  if (!season || season.weeks.length === 0) notFound();

  const weeks = season.weeks.map((w) => w.week);
  const requested = Number(searchParams.week);
  const selectedWeek = weeks.includes(requested) ? requested : weeks[weeks.length - 1];
  const detail = teamWeekDetail(leagueId, team.rosterId, selectedWeek);
  const meta = getPlayerMeta();

  const medians = new Map(weeklyMedians(leagueId).map((m) => [m.week, m.median]));
  const chartData = season.weeks.map((w) => ({
    week: w.week,
    points: w.points,
    median: medians.get(w.week) ?? 0,
  }));

  // Helpers that preserve the selected season across links.
  const sq = `?season=${seasonYear}`;
  const weekHref = (w: number) => `/team/${team.slug}?week=${w}&season=${seasonYear}#week-detail`;

  return (
    <>
      <h1 className="page-title">{team.teamName}</h1>
      <p className="page-subtitle">
        {seasonYear} · managed by {team.displayName}
        {season.rank ? ` · #${season.rank} in the league` : ''}
      </p>

      <div className="tile-grid">
        <div className="tile">
          <div className="tile-label">Record</div>
          <div className="tile-value">
            {season.wins}-{season.losses}
            {season.ties ? `-${season.ties}` : ''}
          </div>
          <div className="tile-sub">{season.rank ? `#${season.rank} overall` : 'unranked'}</div>
        </div>
        <div className="tile">
          <div className="tile-label">Points for</div>
          <div className="tile-value">{season.pointsFor.toFixed(1)}</div>
          <div className="tile-sub">
            {season.avgPoints.toFixed(1)} avg · high {season.highScore.toFixed(1)}
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">Lineup efficiency</div>
          <div className="tile-value">{season.efficiency.toFixed(1)}%</div>
          <div className="tile-sub">of the best possible {season.totalOptimal.toFixed(1)} pts</div>
        </div>
        <div className="tile">
          <div className="tile-label">Left on the bench</div>
          <div className="tile-value">{season.totalPointsLost.toFixed(1)}</div>
          <div className="tile-sub">points this season</div>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">Season, week by week</h2>
        <p className="card-note">Weekly score against the league median.</p>
        <TeamWeeklyChart data={chartData} teamName={team.displayName} />
      </section>

      <section className="card">
        <h2 className="card-title">Weekly results</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Opponent</th>
                <th></th>
                <th className="num">Score</th>
                <th className="num">Opp</th>
                <th className="num">Optimal</th>
                <th className="num">Benched pts</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {season.weeks.map((w) => (
                <tr key={w.week}>
                  <td>W{w.week}</td>
                  <td className="team-cell">
                    {w.opponent ? (
                      <Link href={`/team/${w.opponent.slug}${sq}`}>{w.opponent.displayName}</Link>
                    ) : (
                      <span className="sub">bye</span>
                    )}
                  </td>
                  <td>{w.result && <span className={`badge ${w.result.toLowerCase()}`}>{w.result}</span>}</td>
                  <td className="num">{w.points.toFixed(2)}</td>
                  <td className="num">{w.opponentPoints != null ? w.opponentPoints.toFixed(2) : '—'}</td>
                  <td className="num">{w.optimalPoints.toFixed(2)}</td>
                  <td className="num">
                    {w.benchPointsLost > 0 ? (
                      <span className="down">{w.benchPointsLost.toFixed(2)}</span>
                    ) : (
                      <span className="flat">0</span>
                    )}
                  </td>
                  <td>
                    <Link className="sub" href={weekHref(w.week)}>
                      view lineup →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" id="week-detail">
        <h2 className="card-title">Week {selectedWeek} lineup</h2>
        <div className="week-picker-row">
          <TeamWeekPicker slug={team.slug} weeks={weeks} selected={selectedWeek} season={seasonYear} />
        </div>

        {detail ? (
          <>
            <div className="matchup-banner">
              <span className="team-cell">{team.displayName}</span>
              <span className="matchup-score">{detail.points.toFixed(2)}</span>
              {detail.opponent && (
                <>
                  <span className="vs">vs</span>
                  <span className="matchup-score">{detail.opponentPoints?.toFixed(2)}</span>
                  <span className="team-cell">
                    <Link href={`/team/${detail.opponent.slug}${sq}`}>{detail.opponent.displayName}</Link>
                  </span>
                </>
              )}
              {detail.result && <span className={`badge ${detail.result.toLowerCase()}`}>{detail.result}</span>}
            </div>

            <div className="two-col">
              <div>
                <h3 className="card-title">Lineup as set</h3>
                <p className="card-note">The roster {team.displayName} submitted for week {selectedWeek}.</p>
                <LineupAsSet detail={detail} meta={meta} />
              </div>
              <div>
                <h3 className="card-title">Optimal lineup</h3>
                <p className="card-note">
                  Best possible lineup from that week&apos;s roster — players left on the bench are highlighted.
                </p>
                <OptimalLineup detail={detail} meta={meta} />
              </div>
            </div>
          </>
        ) : (
          <p className="card-note">No matchup data for this week.</p>
        )}
      </section>
    </>
  );
}
