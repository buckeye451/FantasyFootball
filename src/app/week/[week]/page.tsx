import { notFound } from 'next/navigation';
import { regularSeasonWeeks, resolveActiveLeague, weekBreakdown } from '@/lib/stats';
import { MatchupBreakdownList } from '@/components/MatchupBreakdown';
import { PageNav } from '@/components/PageNav';

export const dynamic = 'force-dynamic';

export default function WeekPage({
  params,
  searchParams,
}: {
  params: { week: string };
  searchParams: { season?: string };
}) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const week = Number(params.week);
  const weeks = regularSeasonWeeks(league.leagueId);
  if (!weeks.includes(week)) notFound();

  const breakdowns = weekBreakdown(league.leagueId, week);

  return (
    <>
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
      <MatchupBreakdownList breakdowns={breakdowns} season={league.season} />
    </>
  );
}
