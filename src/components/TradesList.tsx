import type { TradeAsset, TradeView } from '@/lib/stats';
import { NflTeam } from '@/components/NflTeam';
import { PlayerHeadshot } from '@/components/PlayerHeadshot';

function Avg({ v }: { v: number | null }) {
  return <>{v == null ? '—' : v.toFixed(1)}</>;
}

/**
 * Which way the player's weekly average moved across the trade. Compares the
 * figures as displayed, so a marker can't contradict the numbers beside it —
 * 12.44 and 12.38 both render as 12.4 and count as unchanged. Nothing is shown
 * when a side has no window to average, or when the two are level.
 */
function trend(before: number | null, after: number | null): 'up' | 'down' | null {
  if (before == null || after == null) return null;
  const shown = (v: number) => Math.round(v * 10) / 10;
  const [b, a] = [shown(before), shown(after)];
  if (a === b) return null;
  return a > b ? 'up' : 'down';
}

function AssetRow({ p }: { p: TradeAsset }) {
  const dir = trend(p.avgBefore, p.avgAfter);
  return (
    <li className="trade-player">
      <PlayerHeadshot
        key={p.playerId}
        player={{
          playerId: p.playerId,
          name: p.name,
          position: p.position,
          team: p.team,
          espnId: p.espnId,
        }}
        size={38}
      />
      <span className="trade-player-body">
        <span className="trade-player-name">
          {p.name}
          {dir && (
            <span
              className={`trade-trend ${dir}`}
              title={
                dir === 'up'
                  ? 'Averaging more per week since the trade'
                  : 'Averaging less per week since the trade'
              }
            >
              {dir === 'up' ? '▲' : '▼'}
            </span>
          )}
        </span>
        <span className="trade-player-meta">
          <span className={`draft-pos draft-pos-${p.position}`}>{p.position}</span>
          <NflTeam code={p.team} />
        </span>
        <span
          className="trade-player-avg"
          title="Points per week of the season — before the trade, then from the trade week on. Counts every NFL week, including weeks nobody in the league rostered them."
        >
          <Avg v={p.avgBefore} /> <span className="trade-avg-arrow">→</span>{' '}
          <span className={dir ?? undefined}>
            <Avg v={p.avgAfter} />
          </span>{' '}
          <span className="trade-avg-label">avg/wk</span>
        </span>
      </span>
    </li>
  );
}

/** A season's trades, one split tile per deal, each side showing what it got. */
export function TradesList({ trades }: { trades: TradeView[] }) {
  if (trades.length === 0) {
    return <p className="card-note">No trades on record for this season.</p>;
  }
  return (
    <div className="trades-list">
      {trades.map((t) => (
        <section className="card trade-card" key={t.transactionId}>
          <div className="trade-week">Week {t.week} trade</div>
          <div className="trade-sides" data-sides={t.sides.length}>
            {t.sides.map((s) => (
              <div className="trade-side" key={s.team.rosterId}>
                <div className="trade-side-name">{s.team.displayName}</div>
                <div className="trade-side-label">acquired</div>
                <ul className="trade-side-players">
                  {s.players.map((p) => (
                    <AssetRow p={p} key={p.playerId} />
                  ))}
                  {s.faab > 0 && <li className="trade-extra">+ ${s.faab} FAAB</li>}
                  {s.picks.map((pick) => (
                    <li className="trade-extra" key={pick}>
                      + {pick} pick
                    </li>
                  ))}
                  {s.players.length === 0 && s.faab === 0 && s.picks.length === 0 && (
                    <li className="trade-extra">nothing?!</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
