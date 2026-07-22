import Link from 'next/link';
import type { Standing } from '@/lib/types';

function Movement({ delta }: { delta: number }) {
  if (delta > 0) return <span className="up">▲ {delta}</span>;
  if (delta < 0) return <span className="down">▼ {Math.abs(delta)}</span>;
  return <span className="flat">–</span>;
}

export function StandingsTable({ standings, season }: { standings: Standing[]; season?: string }) {
  const q = season ? `?season=${season}` : '';
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="num">Rank</th>
            <th></th>
            <th>Team</th>
            <th>Record</th>
            <th className="num">Win %</th>
            <th className="num">PF</th>
            <th className="num">PA</th>
            <th className="num">+/−</th>
            <th className="num">Avg</th>
            <th className="num">High</th>
            <th className="num">Low</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const games = s.wins + s.losses + s.ties;
            const diff = Math.round((s.pointsFor - s.pointsAgainst) * 100) / 100;
            return (
              <tr key={s.team.rosterId}>
                <td className="num">{s.rank}</td>
                <td>
                  <Movement delta={s.movement} />
                </td>
                <td className="team-cell">
                  <Link href={`/team/${s.team.slug}${q}`}>{s.team.displayName}</Link>{' '}
                  <span className="sub">{s.team.teamName !== s.team.displayName ? s.team.teamName : ''}</span>
                </td>
                <td>
                  {s.wins}-{s.losses}
                  {s.ties ? `-${s.ties}` : ''}
                </td>
                <td className="num">{games ? ((s.wins / games) * 100).toFixed(1) : '0.0'}%</td>
                <td className="num">{s.pointsFor.toFixed(1)}</td>
                <td className="num">{s.pointsAgainst.toFixed(1)}</td>
                <td className="num">
                  <span className={diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'}>
                    {diff > 0 ? '+' : ''}
                    {diff.toFixed(1)}
                  </span>
                </td>
                <td className="num">{s.avgPoints.toFixed(1)}</td>
                <td className="num">{s.highScore.toFixed(1)}</td>
                <td className="num">{s.lowScore.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
