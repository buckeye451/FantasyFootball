import Link from 'next/link';
import type { SeedBoard, SeedRow } from '@/lib/stats';

/**
 * Compact standings as a seed board rather than a narrow table: two ranked
 * groups answering "am I in the playoffs?" at a glance, with one line per team
 * explaining why they sit where they do.
 */
export function StandingsCompact({ board, season }: { board: SeedBoard; season?: string }) {
  const q = season ? `?season=${season}` : '';
  const inPlayoffs = board.rows.filter((r) => r.rank <= board.playoffSpots);
  const outside = board.rows.filter((r) => r.rank > board.playoffSpots);

  return (
    <div className="seed-board">
      <div className="seed-col">
        <div className="seed-col-head">
          <span className="kicker seed-col-label in">In the playoffs</span>
          <span className="seed-col-sub">seeds 1 – {board.playoffSpots}</span>
        </div>
        {inPlayoffs.map((r) => (
          <SeedCard key={r.standing.team.rosterId} row={r} q={q} spots={board.playoffSpots} />
        ))}
      </div>

      <div className="seed-col">
        <div className="seed-col-head">
          <span className="kicker seed-col-label out">Outside looking in</span>
          <span className="seed-col-sub">
            seeds {board.playoffSpots + 1} – {board.rows.length}
          </span>
        </div>
        {outside.map((r) => (
          <SeedCard key={r.standing.team.rosterId} row={r} q={q} spots={board.playoffSpots} />
        ))}
      </div>
    </div>
  );
}

function SeedCard({ row, q, spots }: { row: SeedRow; q: string; spots: number }) {
  const s = row.standing;
  const classes = ['seed-card', `state-${row.state}`];
  if (row.rank === 1) classes.push('leader');
  if (row.rank === spots) classes.push('bubble-seed');
  // Rows fade with distance below the cut rather than stopping at a hard line.
  if (row.rank > spots) classes.push(row.rank - spots >= 3 ? 'far-out' : 'just-out');

  return (
    <Link className={classes.join(' ')} href={`/team/${s.team.slug}${q}`}>
      <span className="figure seed-rank">{row.rank}</span>
      <span className="seed-body">
        <span className="seed-name">
          {s.team.displayName}
          {row.rank === 1 && (
            <span className="seed-trophy" aria-hidden="true">
              {' '}
              🏆
            </span>
          )}
        </span>
        <span className="seed-note">{row.note}</span>
      </span>
      <span className="seed-right">
        <span className="seed-record">
          {s.wins}-{s.losses}
          {s.ties ? `-${s.ties}` : ''}
        </span>
        {row.chip && <span className="kicker seed-chip">{row.chip}</span>}
      </span>
    </Link>
  );
}
