import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPlayerMeta,
  getTeamBySlug,
  getTeams,
  headToHead,
  matchupExtremes,
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
import { HeadToHead } from '@/components/HeadToHead';
import { WeeklyResultsTable } from '@/components/WeeklyResultsTable';

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
      headline: `#${rankOf(boards.place) ?? '—'}`,
      big: true,
      lines: standing
        ? [`${standing.wins}-${standing.losses}${standing.ties ? `-${standing.ties}` : ''}`]
        : ['—'],
      note: 'League standings, best record first',
      board: boards.place.map((r) => ({
        key: String(r.rosterId),
        rank: r.rank,
        name: r.name,
        value: `${r.standing.wins}-${r.standing.losses}${r.standing.ties ? `-${r.standing.ties}` : ''}`,
        detail: `${r.standing.pointsFor.toFixed(1)} points for`,
      })),
    },
    {
      key: 'points',
      label: 'Points Per Game',
      headline: `#${rankOf(boards.points) ?? '—'}`,
      big: true,
      lines: standing
        ? [`${standing.avgPoints.toFixed(1)} per game`, `${standing.pointsFor.toFixed(1)} total`]
        : ['—'],
      note: 'Ranked on total points scored this season',
      board: boards.points.map((r) => ({
        key: String(r.rosterId),
        rank: r.rank,
        name: r.name,
        value: `${r.standing.pointsFor.toFixed(1)}`,
        detail: `${r.standing.avgPoints.toFixed(1)} per game`,
      })),
    },
    {
      key: 'manager',
      label: 'Manager Rank',
      headline: `#${rankOf(boards.manager) ?? '—'}`,
      big: true,
      lines: standing
        ? [
            `${standing.managerPerformance.toFixed(1)}% manager`,
            `${bench(standing).toFixed(1)} left on the bench`,
          ]
        : ['—'],
      note: 'Points scored ÷ best-possible lineup',
      board: boards.manager.map((r) => ({
        key: String(r.rosterId),
        rank: r.rank,
        name: r.name,
        value: `${r.standing.managerPerformance.toFixed(1)}%`,
        detail: `${bench(r.standing).toFixed(1)} left on the bench`,
      })),
    },
    {
      key: 'performance',
      label: 'Performance %',
      headline: `#${rankOf(boards.performance) ?? '—'}`,
      big: true,
      lines:
        standing && standing.perfProjected > 0
          ? [
              `${standing.perfPoints.toFixed(1)} scored`,
              `${standing.perfProjected.toFixed(1)} projected`,
            ]
          : ['no projections'],
      note: 'Points scored ÷ points projected',
      board: boards.performance.map((r) => ({
        key: String(r.rosterId),
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

  // All-time head to head, pinned to this manager. Keyed by owner so it
  // follows the person across seasons, not the roster slot.
  const h2h = headToHead();
  const ownerKey = team.ownerId || team.displayName.toLowerCase();
  const mine = h2h.find((m) => m.key === ownerKey) ?? null;
  const { best, worst } = matchupExtremes(mine);
  const seriesLine = (o: { wins: number; losses: number; ties: number }) =>
    `${o.wins}-${o.losses}${o.ties ? `-${o.ties}` : ''}`;
  const diffLine = (d: number) => `${d > 0 ? '+' : ''}${d.toFixed(1)} points`;

  const medians = new Map(weeklyMedians(leagueId).map((m) => [m.week, m.median]));
  const chartData = season.weeks.map((w) => ({
    week: w.week,
    points: w.points,
    median: medians.get(w.week) ?? 0,
  }));

  // Helpers that preserve the selected season across links.
  const sq = `?season=${seasonYear}`;

  return (
    <>
      <div className="manager-head">
        <div className="manager-head-id">
          <div className="kicker">
            Manager · {seasonYear}
            {season.rank ? ` · #${season.rank} in the league` : ''}
          </div>
          <h1 className="manager-name">{team.displayName}</h1>
          <p className="page-subtitle">{team.teamName}</p>
        </div>

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
      </div>

      <RankTiles tiles={tiles} highlightKey={String(team.rosterId)} />

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
        <WeeklyResultsTable weeks={season.weeks} slug={team.slug} season={seasonYear} />
      </section>

      {mine && mine.opponents.length > 0 && (
        <>
          {(best || worst) && (
            <div className="feature-tiles matchup-tiles">
              {best && (
                <div className="feature-tile">
                  <div className="feature-tile-label">😎 Best Matchup</div>
                  <div className="feature-tile-name">{best.opponent.displayName}</div>
                  <div className="feature-tile-value">{seriesLine(best.opponent)}</div>
                  <div className="feature-tile-value">{diffLine(best.differential)}</div>
                </div>
              )}
              {worst && (
                <div className="feature-tile">
                  <div className="feature-tile-label">😤 Worst Matchup</div>
                  <div className="feature-tile-name">{worst.opponent.displayName}</div>
                  <div className="feature-tile-value">{seriesLine(worst.opponent)}</div>
                  <div className="feature-tile-value">{diffLine(worst.differential)}</div>
                </div>
              )}
            </div>
          )}

          <section className="card">
            <h2 className="card-title">Head to head</h2>
            <p className="card-note">
              {team.displayName}&rsquo;s all-time record against each opponent, across every
              season — expand a row for every meeting in order.
            </p>
            <HeadToHead data={h2h} fixedKey={ownerKey} />
          </section>
        </>
      )}

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
