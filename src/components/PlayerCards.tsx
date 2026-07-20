import type { PlayerAgg, WeeklyStar } from '@/lib/stats';

export const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

/** Season-long leaders at each position across every rostered player. */
export function TopSeasonPlayers({ byPosition }: { byPosition: Map<string, PlayerAgg[]> }) {
  return (
    <div className="pos-grid">
      {POSITION_ORDER.filter((pos) => byPosition.has(pos)).map((pos) => (
        <div className="pos-card" key={pos}>
          <h3>{pos}</h3>
          <ol>
            {byPosition.get(pos)!.map((a, i) => (
              <li key={a.player.playerId}>
                <span className="pos-rank">{i + 1}</span>
                <span className="pos-name">
                  {a.player.name}{' '}
                  <span className="pos-team">
                    {a.player.team} · {a.managers.join(', ')}
                  </span>
                </span>
                <span className="pos-pts">{a.totalPoints.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** Best single performance at each position for one week. */
export function PlayersOfWeek({
  byPosition,
  week,
}: {
  byPosition: Map<string, WeeklyStar>;
  week: number;
}) {
  return (
    <div className="pos-grid">
      {POSITION_ORDER.filter((pos) => byPosition.has(pos)).map((pos) => {
        const star = byPosition.get(pos)!;
        return (
          <div className="pos-card" key={pos}>
            <h3>
              {pos} · Week {week}
            </h3>
            <ol>
              <li>
                <span className="pos-name">
                  {star.player.name}{' '}
                  <span className="pos-team">
                    {star.player.team} · {star.manager}
                    {star.started ? '' : ' (on the bench!)'}
                  </span>
                </span>
                <span className="pos-pts">{star.points.toFixed(1)}</span>
              </li>
            </ol>
          </div>
        );
      })}
    </div>
  );
}
