import Link from 'next/link';
import type { WeekScoreRow } from '@/lib/stats';

/**
 * Every score in a week as one sorted bar list, independent of who played
 * whom — so a high-scoring loss is visible without opening a box score.
 *
 * Shared by the dashboard's compact week view and the weekly scores page.
 */
export function SortedScores({ rows, season }: { rows: WeekScoreRow[]; season: string }) {
  const q = `?season=${season}`;
  return (
    <>
      <div className="sorted-head">
        <span className="kicker">All {rows.length} scores, sorted</span>
        <span className="sorted-sub">highest to lowest, regardless of who played whom</span>
      </div>

      <div className="card sorted-card">
        <div className="sorted-list">
          {rows.map((r) => (
            <div key={r.team.rosterId} className="sorted-row">
              <Link className="sorted-name" href={`/team/${r.team.slug}${q}`} prefetch={false}>
                {r.team.displayName}
              </Link>
              <span className="sorted-track">
                <span
                  className={`sorted-bar${r.isTop ? ' top' : r.won ? ' won' : ' lost'}`}
                  style={{ width: `${(r.share * 100).toFixed(1)}%` }}
                />
              </span>
              <span className={`figure sorted-score${r.isTop ? ' top' : r.won ? '' : ' lost'}`}>
                {r.score.toFixed(1)}
              </span>
              <span className={`sorted-wl ${r.won ? 'w' : 'l'}`}>{r.won ? 'W' : 'L'}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
