import { resolveActiveLeague, seasonTrades } from '@/lib/stats';
import { TradesList } from '@/components/TradesList';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TradesPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const trades = seasonTrades(league.leagueId);

  return (
    <>
      <h1 className="page-title">Trades</h1>
      <p className="page-subtitle">
        {league.name} · {league.season} · every completed trade between managers. Averages are
        points per week of the season — everything the player scored before the trade over the
        weeks before it, then from the trade week on over the weeks remaining. Weeks nobody
        rostered them still count.
      </p>
      <TradesList trades={trades} />
    </>
  );
}
