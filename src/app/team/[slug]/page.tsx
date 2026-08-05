import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getPlayerMeta,
  getTeamBySlug,
  getTeams,
  headToHead,
  managerVerdict,
  matchupExtremes,
  resolveActiveLeague,
  teamSeason,
  topStarters,
  teamWeekDetail,
  weeklyMedians,
} from '@/lib/stats';
import { LineupAsSet, OptimalLineup } from '@/components/RosterTables';
import { TeamWeekPicker } from '@/components/TeamWeekPicker';
import { PageNav } from '@/components/PageNav';
import { CarriedByCard, CaseCards, SeasonStrip, VerdictBanner } from '@/components/ManagerVerdict';
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

  // A ?week= deep link points at a specific lineup, so it can't arrive collapsed.
  const openLineups = searchParams.week != null;
  const verdict = managerVerdict(leagueId, team.rosterId);
  const carried = topStarters(leagueId, team.rosterId);

  // The strip's caption, templated from the run itself rather than written.
  const stripNote = (() => {
    if (!verdict || verdict.weeks.length === 0) return 'Every week of the regular season.';
    const w = verdict.weeks;
    const best = w.reduce((m, x) => (x.points > m.points ? x : m), w[0]);
    const wins = w.filter((x) => x.won).length;
    return `${wins}-${w.length - wins} across ${w.length} weeks — best was ${best.points.toFixed(0)} in week ${best.week}.`;
  })();

  // Helpers that preserve the selected season across links.
  const sq = `?season=${seasonYear}`;

  return (
    <>
      <div className="manager-head">
        <div className="manager-head-id">
          <div className="kicker">
            Manager · {seasonYear} season · {verdict ? verdict.weeks.length : weeks.length} weeks
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

      {verdict && <VerdictBanner verdict={verdict} />}
      {verdict && <CaseCards verdict={verdict} />}
      {verdict && <SeasonStrip verdict={verdict} note={stripNote} />}

      <CarriedByCard carried={carried} name={team.displayName} />

      {mine && mine.opponents.length > 0 && (best || worst) && (
        <div className="feature-tiles matchup-tiles">
          {best && (
            <div className="feature-tile">
              <div className="feature-tile-label">😎 Owns</div>
              <div className="feature-tile-name">{best.opponent.displayName}</div>
              <div className="feature-tile-value">
                {seriesLine(best.opponent)} · {diffLine(best.differential)} a meeting
              </div>
            </div>
          )}
          {worst && (
            <div className="feature-tile">
              <div className="feature-tile-label">😤 Owned by</div>
              <div className="feature-tile-name">{worst.opponent.displayName}</div>
              <div className="feature-tile-value">
                {seriesLine(worst.opponent)} · {diffLine(worst.differential)} a meeting
              </div>
            </div>
          )}
        </div>
      )}

      <section className="card">
        <h2 className="card-title">Everything else</h2>
        <p className="card-note">
          The full numbers are still here — one tap away instead of six screens down.
        </p>

        <details className="table-view">
          <summary>Weekly results — all 12 columns</summary>
          <WeeklyResultsTable weeks={season.weeks} slug={team.slug} season={seasonYear} />
        </details>

        {mine && mine.opponents.length > 0 && (
          <details className="table-view">
            <summary>Head to head — all-time, every opponent</summary>
            <HeadToHead data={h2h} fixedKey={ownerKey} />
          </details>
        )}

        <details className="table-view" id="week-detail" open={openLineups}>
          <summary>Week-by-week lineups &amp; optimal lineups</summary>
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
        </details>
      </section>


    </>
  );
}
