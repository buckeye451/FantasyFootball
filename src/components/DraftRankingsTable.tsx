import type { DraftRankPick, DraftRankRow } from '@/lib/stats';

function ValueSpan({ v }: { v: number }) {
  return (
    <span className={v > 0 ? 'up' : v < 0 ? 'down' : 'flat'}>
      {v > 0 ? '+' : ''}
      {v.toFixed(1)}
    </span>
  );
}

function PickCell({ entry, showSeason }: { entry: DraftRankPick | null; showSeason?: boolean }) {
  if (!entry) return <>—</>;
  return (
    <span className="draft-rank-pick">
      <span className="draft-no">#{entry.managerPickNo}</span>{' '}
      <span className="draft-name">{entry.name}</span>{' '}
      <span className={`draft-pos draft-pos-${entry.position}`}>{entry.position}</span>{' '}
      {showSeason && <span className="draft-rank-season">{entry.season}</span>}{' '}
      <ValueSpan v={entry.value} />
    </span>
  );
}

/**
 * Managers ranked by total points above positional replacement. Used for a
 * single season's draft and, with showSeason/showDrafts, for the all-time view.
 */
export function DraftRankingsTable({
  rows,
  showSeason,
  showDrafts,
}: {
  rows: DraftRankRow[];
  showSeason?: boolean;
  showDrafts?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className="draft-table draft-compact">
        <thead>
          <tr>
            <th className="num">Rank</th>
            <th>Manager</th>
            {showDrafts && (
              <th className="num" title="Drafts included in this total">
                Drafts
              </th>
            )}
            <th className="num" title="Sum of every pick's points above positional replacement">
              Score
            </th>
            <th title="Lowest-value pick among their first seven selections">Worst Early Pick</th>
            <th title="Highest-value pick of their draft">Best Pick</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.ownerId || r.manager}>
              <td className="num">{i + 1}</td>
              <td className="team-cell">{r.manager}</td>
              {showDrafts && <td className="num sub">{r.drafts}</td>}
              <td className="num strong">
                <ValueSpan v={r.score} />
              </td>
              <td>
                <PickCell entry={r.worstEarly} showSeason={showSeason} />
              </td>
              <td>
                <PickCell entry={r.bestPick} showSeason={showSeason} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
