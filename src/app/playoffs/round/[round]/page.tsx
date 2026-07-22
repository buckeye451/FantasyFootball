import { notFound } from 'next/navigation';
import { playoffRoundBreakdown, playoffRounds, resolveActiveLeague } from '@/lib/stats';
import { MatchupBreakdownList } from '@/components/MatchupBreakdown';

export const dynamic = 'force-dynamic';

export default function PlayoffRoundPage({
  params,
  searchParams,
}: {
  params: { round: string };
  searchParams: { season?: string };
}) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const round = Number(params.round);
  const rounds = playoffRounds(league.leagueId);
  const info = rounds.find((r) => r.round === round);
  if (!info) notFound();

  const breakdowns = playoffRoundBreakdown(league.leagueId, round);

  return (
    <>
      <h1 className="page-title">
        Playoffs · {info.name}
        {info.week != null ? ` (Week ${info.week})` : ''}
      </h1>
      <p className="page-subtitle">
        {league.name} · {league.season} · matchups among the teams still alive this round.
      </p>
      <MatchupBreakdownList breakdowns={breakdowns} season={league.season} />
    </>
  );
}
