import { resolveActiveLeague, seasonTrades, tradeSummary } from '@/lib/stats';
import { TradesList } from '@/components/TradesList';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TradesPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const trades = seasonTrades(league.leagueId);
  const { mostTrades, bestTrader } = tradeSummary(trades);

  return (
    <>
      <h1 className="page-title">Trades</h1>
      <p className="page-subtitle">
        {league.name} · {league.season} · every completed trade between managers. Averages are
        points per week of the season — everything the player scored before the trade over the
        weeks before it, then from the trade week on over the weeks remaining. Weeks nobody
        rostered them still count.
      </p>
      {(mostTrades || bestTrader) && (
        <div className="trade-tiles">
          {mostTrades && (
            <div className="trade-tile">
              <div className="trade-tile-label">🔁 Trade Happy</div>
              <div className="trade-tile-name">{mostTrades.team.displayName}</div>
              <div className="trade-tile-value">
                {mostTrades.trades} trade{mostTrades.trades === 1 ? '' : 's'}
              </div>
            </div>
          )}
          {bestTrader && (
            <div className="trade-tile">
              <div className="trade-tile-label">📈 Best Trader</div>
              <div className="trade-tile-name">{bestTrader.team.displayName}</div>
              <div className="trade-tile-value">
                {bestTrader.pointsGained > 0 ? '+' : ''}
                {bestTrader.pointsGained.toFixed(1)} points gained
              </div>
            </div>
          )}
        </div>
      )}

      <TradesList trades={trades} />
    </>
  );
}
