import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPlayerMeta,
  getTeamBySlug,
  getTeams,
  mostStartedByPosition,
  rankBoards,
  resolveActiveLeague,
  teamSeason,
  teamWeekDetail,
  weeklyMedians,
} from '@/lib/stats';
import { TeamWeeklyChart } from '@/components/FocusCharts';
import { LineupAsSet, OptimalLineup } from '@/components/RosterTables';
import { MostStartedPlayers } from '@/components/PlayerCards';
import { TeamWeekPicker } from '@/components/TeamWeekPicker';
import { PageNav } from '@/components/PageNav';
import { RankTiles, type RankTile } from '@/components/RankTiles';
import { managerClass, winPctClass } from '@/lib/thresholds';

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
  // Season-scoped so the lineups show the NFL team each player actually
  // played for that year, not their current one.
  const meta = getPlayerMeta(seasonYear);

  const mostStarted = mostStartedByPosition(leagueId, team.rosterId);
  // Where this team sits in the league on each headline metric, plus the full
  // board behind each one for the popups. Every figure comes from the
  // standings rather than teamSeason: teamSeason sums points across the
  // postseason while its record and rank are regular-season only, so pairing
  // its totals with a league rank would show one number and rank on another.
  const boards = rankBoards(leagueId);
  const rankOf = (rows: typeof boards.place) =>
    rows.find((r) => r.rosterId === team.rosterId)?.rank ?? null;
  const bench = (s: (typeof boards.place)[number]['standing']) =>
    Math.max(0, s.optimalPoints - s.pointsFor);
  const standing = boards.place.find((r) => r.rosterId === team.rosterId)?.standing ?? null;

  const tiles: RankTile[] = [
    {
      key: 'place',
      label: 'Current Place',
      rank: rankOf(boards.place),
      lines: standing
        ? [`${standing.wins}-${standing.losses}${standing.ties ? `-${standing.ties}` : ''}`]
        : ['—'],
      note: 'League standings, best record first',
      board: boards.place.map((r) => ({
        rosterId: r.rosterId,
        rank: r.rank,
        name: r.name,
        value: `${r.standing.wins}-${r.standing.losses}${r.standing.ties ? `-${r.standing.ties}` : ''}`,
        detail: `${r.standing.pointsFor.toFixed(1)} points for`,
      })),
    },
    {
      key: 'points',
      label: 'Points Per Game',
      rank: rankOf(boards.points),
      lines: standing
        ? [`${standing.avgPoints.toFixed(1)} per game`, `${standing.pointsFor.toFixed(1)} total`]
        : ['—'],
      note: 'Ranked on total points scored this season',
      board: boards.points.map((r) => ({
        rosterId: r.rosterId,
        rank: r.rank,
        name: r.name,
        value: `${r.standing.pointsFor.toFixed(1)}`,
        detail: `${r.standing.avgPoints.toFixed(1)} per game`,
      })),
    },
    {
      key: 'manager',
      label: 'Manager Rank',
      rank: rankOf(boards.manager),
      lines: standing
        ? [
            `${standing.managerPerformance.toFixed(1)}% manager`,
            `${bench(standing).toFixed(1)} left on the bench`,
          ]
        : ['—'],
      note: 'Points scored ÷ best-possible lineup',
      board: boards.manager.map((r) => ({
        rosterId: r.rosterId,
        rank: r.rank,
        name: r.name,
        value: `${r.standing.managerPerformance.toFixed(1)}%`,
        detail: `${bench(r.standing).toFixed(1)} left on the bench`,
      })),
    },
    {
      key: 'performance',
      label: 'Performance %',
      rank: rankOf(boards.performance),
      lines:
        standing && standing.perfProjected > 0
          ? [
              `${standing.perfPoints.toFixed(1)} scored`,
              `${standing.perfProjected.toFixed(1)} projected`,
            ]
          : ['no projections'],
      note: 'Points scored ÷ points projected',
      board: boards.performance.map((r) => ({
        rosterId: r.rosterId,
        rank: r.rank,
        name: r.name,
        value: r.standing.performance == null ? '—' : `${r.standing.performance.toFixed(1)}%`,
        detail:
          r.standing.perfProjected > 0
            ? `${r.standing.perfPoints.toFixed(1)} of ${r.standing.perfProjected.toFixed(1)} projected`
            : 'no projections',
      })),
    },
  ];

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

      {/* Carries the selected week across, so you can hold a week steady and
          step through managers to compare them. */}
      <PageNav
        label="Manager"
        value={team.slug}
        ariaLabel="Jump to another manager"
        options={getTeams(leagueId).map((t) => ({
          value: t.slug,
          label: t.displayName,
          href: `/team/${t.slug}?week=${selectedWeek}&season=${seasonYear}`,
        }))}
      />

      <RankTiles tiles={tiles} rosterId={team.rosterId} teams={boards.teams} />

      <section className="card">
        <h2 className="card-title">Season, week by week</h2>
        <p className="card-note">Weekly score against the league median.</p>
        <TeamWeeklyChart data={chartData} teamName={team.displayName} />
      </section>

      {mostStarted.size > 0 && (
        <section>
          <h2 className="card-title">Most-started players</h2>
          <p className="card-note">
            Who {team.displayName} leaned on at each position — points scored in the weeks they
            were started.
          </p>
          <MostStartedPlayers byPosition={mostStarted} />
        </section>
      )}

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
                <th className="num" title="Percent of the other teams this score would have beaten">
                  % vs ROL
                </th>
                <th className="num" title="Score ÷ best-possible lineup (max 100%)">
                  Manager %
                </th>
                <th className="num">Optimal</th>
                <th className="center" title="Best lineup wins? Would the best-possible lineup have won this matchup?">
                  BLW?
                </th>
                <th
                  className="num"
                  title="Percent of the other teams the best-possible lineup would have beaten"
                >
                  Optimal ROL %
                </th>
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
                  <td className="num">
                    <span className={winPctClass(w.winPctVsLeague)}>
                      {w.winPctVsLeague.toFixed(0)}%
                    </span>
                  </td>
                  <td className="num">
                    <span className={managerClass(w.managerPct)}>{w.managerPct.toFixed(1)}%</span>
                  </td>
                  <td className="num">{w.optimalPoints.toFixed(2)}</td>
                  <td className="center">
                    {w.bestLineupWins === null ? (
                      <span className="flat">–</span>
                    ) : w.bestLineupWins === 'yes' ? (
                      <span className="up">Yes</span>
                    ) : (
                      <span className="down">No</span>
                    )}
                  </td>
                  <td className="num">
                    <span className={winPctClass(w.optimalWinPctVsLeague)}>
                      {w.optimalWinPctVsLeague.toFixed(0)}%
                    </span>
                  </td>
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
