import type { TeamWeekDetail } from '@/lib/stats';
import type { PlayerMeta } from '@/lib/types';
import { NflTeam } from '@/components/NflTeam';

function PlayerCell({ meta, playerId }: { meta: Map<string, PlayerMeta>; playerId: string | null }) {
  if (!playerId) return <span className="sub">— empty —</span>;
  const p = meta.get(playerId);
  if (!p) return <span>{playerId}</span>;
  return (
    <>
      {p.name}{' '}
      <span className="pos-team">
        {p.position} <NflTeam code={p.team} />
      </span>
    </>
  );
}

/** The lineup the manager actually submitted, plus the bench below it. */
export function LineupAsSet({ detail, meta }: { detail: TeamWeekDetail; meta: Map<string, PlayerMeta> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Slot</th>
            <th>Player</th>
            <th className="num">Points</th>
          </tr>
        </thead>
        <tbody>
          {detail.starters.map((s, i) => (
            <tr key={`${s.slot}-${i}`}>
              <td>
                <span className="slot-tag">{s.slot}</span>
              </td>
              <td>
                <PlayerCell meta={meta} playerId={s.playerId} />
              </td>
              <td className="num">{s.points.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="bench-header">
            <td colSpan={3}>Bench</td>
          </tr>
          {detail.bench.map((b) => (
            <tr key={b.playerId}>
              <td>
                <span className="slot-tag">BN</span>
              </td>
              <td>
                <PlayerCell meta={meta} playerId={b.playerId} />
              </td>
              <td className="num">{b.points.toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2}>
              <strong>Total</strong>
            </td>
            <td className="num">
              <strong>{detail.optimal.actualTotal.toFixed(2)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * The best lineup that was possible with this week's roster. Players the
 * manager left on the bench are highlighted in red.
 */
export function OptimalLineup({ detail, meta }: { detail: TeamWeekDetail; meta: Map<string, PlayerMeta> }) {
  const { optimal } = detail;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Slot</th>
            <th>Player</th>
            <th className="bench-flag"></th>
            <th className="num">Points</th>
          </tr>
        </thead>
        <tbody>
          {optimal.slots.map((s, i) => (
            <tr key={`${s.slot}-${i}`} className={s.wasBenched ? 'benched-row' : undefined}>
              <td>
                <span className="slot-tag">{s.slot}</span>
              </td>
              <td>
                <PlayerCell meta={meta} playerId={s.playerId} />
              </td>
              <td className="bench-flag">
                {s.wasBenched && (
                  <span className="benched-tag" title="Left on the bench" aria-label="Left on the bench">
                    ⚠
                  </span>
                )}
              </td>
              <td className="num">{s.points.toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3}>
              <strong>Optimal total</strong>
              {optimal.pointsLost > 0 ? (
                <span className="sub"> · {optimal.pointsLost.toFixed(2)} pts left on the bench</span>
              ) : (
                <span className="sub"> · perfect lineup!</span>
              )}
            </td>
            <td className="num">
              <strong>{optimal.optimalTotal.toFixed(2)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
