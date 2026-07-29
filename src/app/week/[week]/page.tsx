import { notFound } from 'next/navigation';
import {
  matchupBoxScore,
  regularSeasonWeeks,
  resolveActiveLeague,
  weekBreakdown,
} from '@/lib/stats';
import { MatchupBreakdownList } from '@/components/MatchupBreakdown';
import { PageNav } from '@/components/PageNav';
import { ScrollToHash } from '@/components/ScrollToHash';

export const dynamic = 'force-dynamic';

export default function WeekPage({
  params,
  searchParams,
}: {
  params: { week: string };
  searchParams: { season?: string; box?: string };
}) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const week = Number(params.week);
  const weeks = regularSeasonWeeks(league.leagueId);
  if (!weeks.includes(week)) notFound();

  const breakdowns = weekBreakdown(league.leagueId, week);
  const boxScores = breakdowns.map((b) =>
    matchupBoxScore(league.leagueId, week, b.teams.map((t) => t.team.rosterId))
  );

  return (
    <>
      <ScrollToHash />
      <h1 className="page-title">Week {week} scores</h1>
      <p className="page-subtitle">
        {league.name} · {league.season} · every matchup with each team&apos;s advanced stats.
      </p>
      <PageNav
        label="Week"
        value={String(week)}
        ariaLabel="Jump to another week"
        options={weeks.map((w) => ({
          value: String(w),
          label: `Week ${w}`,
          href: `/week/${w}?season=${league.season}`,
        }))}
      />
      <MatchupBreakdownList
        breakdowns={breakdowns}
        season={league.season}
        boxScores={boxScores}
        openBox={searchParams.box}
      />
    </>
  );
}
