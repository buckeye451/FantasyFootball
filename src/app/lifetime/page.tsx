import Link from 'next/link';
import {
  bestSeasonsByPosition,
  CHAMPIONS,
  getSeasons,
  lifetimeStandings,
} from '@/lib/stats';
import { POSITION_ORDER } from '@/components/PlayerCards';

export const dynamic = 'force-dynamic';

export default function LifetimePage({ searchParams }: { searchParams: { season?: string } }) {
  const rows = lifetimeStandings();
  const playedSeasons = getSeasons().filter((s) => s.hasGames);
  const leaders = bestSeasonsByPosition(5);
  const sq = searchParams.season ? `?season=${searchParams.season}` : '';

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <h1>Lifetime stats</h1>
        <p>Career records appear here once at least one season has been synced.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Lifetime stats</h1>
      <p className="page-subtitle">
        Career regular-season numbers across {playedSeasons.length} season
        {playedSeasons.length === 1 ? '' : 's'} (
        {[...playedSeasons].map((s) => s.season).sort().join(', ')}).
      </p>

      <section className="card">
        <h2 className="card-title">🏆 Trophy case</h2>
        <p className="card-note">League champions, one trophy per title.</p>
        <div className="trophy-grid">
          {CHAMPIONS.map((c) => (
            <div className="trophy-tile" key={c.name}>
              <div className="trophy-emojis">{'🏆'.repeat(c.trophies)}</div>
              <div className="trophy-name">{c.name}</div>
              <div className="trophy-sub">
                {c.trophies} championship{c.trophies === 1 ? '' : 's'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">All-time standings</h2>
        <p className="card-note">Combined regular-season records across every season.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Manager</th>
                <th className="center">🏆</th>
                <th className="num">Seasons</th>
                <th>Record</th>
                <th className="num">Win %</th>
                <th className="num">PF</th>
                <th className="num">PA</th>
                <th className="num">Avg</th>
                <th className="num">High</th>
                <th className="num" title="Best regular-season finish">
                  Best
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug + r.displayName}>
                  <td className="team-cell">
                    <Link href={`/team/${r.slug}${sq}`}>{r.displayName}</Link>
                  </td>
                  <td className="center">{r.trophies > 0 ? '🏆'.repeat(r.trophies) : ''}</td>
                  <td className="num">{r.seasons}</td>
                  <td>
                    {r.wins}-{r.losses}
                    {r.ties ? `-${r.ties}` : ''}
                  </td>
                  <td className="num">{r.winPct.toFixed(1)}%</td>
                  <td className="num">{r.pointsFor.toFixed(1)}</td>
                  <td className="num">{r.pointsAgainst.toFixed(1)}</td>
                  <td className="num">{r.avgPoints.toFixed(1)}</td>
                  <td className="num">{r.highScore.toFixed(1)}</td>
                  <td className="num">{r.bestFinish != null ? `#${r.bestFinish}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="card-title">Best seasons by position, all-time</h2>
        <p className="card-note">
          Highest-scoring individual seasons at each position across all league years — every NFL
          player counts, rostered or not.
        </p>
        <div className="pos-grid">
          {POSITION_ORDER.filter((pos) => leaders.has(pos)).map((pos) => (
            <div className="pos-card" key={pos}>
              <h3>{pos}</h3>
              <ol>
                {leaders.get(pos)!.map((l, i) => (
                  <li key={`${l.playerId}-${l.season}`}>
                    <span className="pos-rank">{i + 1}</span>
                    <span className="pos-name">
                      {l.name}{' '}
                      <span className="pos-team">
                        {l.team ? `${l.team} · ` : ''}
                        {l.season}
                      </span>
                    </span>
                    <span className="pos-pts">{l.points.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
