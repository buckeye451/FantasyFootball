'use client';

import Link from 'next/link';
import type { WeekResult } from '@/lib/types';
import { managerClass, winPctClass } from '@/lib/thresholds';
import { useStickyColumns } from '@/components/useStickyColumns';
import { useCompactFull } from '@/components/SegTabs';

/** Week and opponent stay put; the scoring columns are the wide ones that scroll. */
const STICKY_COLS = 2;

/**
 * A team's season, week by week. Lives in its own client component so the
 * leading columns can be pinned — the offsets have to be measured from the
 * rendered header.
 */
export function WeeklyResultsTable({
  weeks,
  slug,
  season,
}: {
  weeks: WeekResult[];
  slug: string;
  season: string;
}) {
  const tableRef = useStickyColumns(STICKY_COLS);
  const { mode, control } = useCompactFull('weekly-results', 'Full · 12 columns');
  const compact = mode === 'compact';
  const sq = `?season=${season}`;
  const weekHref = (w: number) => `/team/${slug}?week=${w}&season=${season}#week-detail`;

  const totals = weeks.reduce(
    (acc, w) => ({
      scored: acc.scored + w.points,
      optimal: acc.optimal + w.optimalPoints,
      benched: acc.benched + w.benchPointsLost,
    }),
    { scored: 0, optimal: 0, benched: 0 }
  );

  return (
    <>
      <div className="section-head">
        {control}
        <p className="section-note">
          {compact
            ? 'Week, opponent and the score. Full adds the manager and optimal-lineup columns.'
            : 'Every rate the week produced, including the best-possible lineup.'}
        </p>
      </div>
      <div className="table-wrap">
        <table className="sticky-table" ref={tableRef}>
          <thead>
            <tr>
              <th className="sticky-col sticky-col-0">Week</th>
              <th className="sticky-col sticky-col-1 sticky-col-last">Opponent</th>
              <th></th>
              <th className="num">Score</th>
              <th className="num">Opp</th>
              {!compact && (
                <>
                  <th
                    className="num"
                    title="Percent of the other teams this score would have beaten"
                  >
                    % vs ROL
                  </th>
                  <th className="num" title="Score ÷ best-possible lineup (max 100%)">
                    Manager %
                  </th>
                  <th className="num">Optimal</th>
                  <th
                    className="center"
                    title="Best lineup wins? Would the best-possible lineup have won this matchup?"
                  >
                    BLW?
                  </th>
                  <th
                    className="num"
                    title="Percent of the other teams the best-possible lineup would have beaten"
                  >
                    Optimal ROL %
                  </th>
                  <th className="num">Benched pts</th>
                  <th></th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.week}>
                <td className="sticky-col sticky-col-0">W{w.week}</td>
                <td className="team-cell sticky-col sticky-col-1 sticky-col-last">
                  {w.opponent ? (
                    <Link href={`/team/${w.opponent.slug}${sq}`}>{w.opponent.displayName}</Link>
                  ) : (
                    <span className="sub">bye</span>
                  )}
                </td>
                <td>
                  {w.result && <span className={`badge ${w.result.toLowerCase()}`}>{w.result}</span>}
                </td>
                <td className="num">{w.points.toFixed(2)}</td>
                <td className="num">
                  {w.opponentPoints != null ? w.opponentPoints.toFixed(2) : '—'}
                </td>
                {!compact && (
                  <>
                    <td className="num">
                      <span className={winPctClass(w.winPctVsLeague)}>
                        {w.winPctVsLeague.toFixed(0)}%
                      </span>
                    </td>
                    <td className="num">
                      <span className={managerClass(w.managerPct)}>{w.managerPct.toFixed(1)}%</span>
                    </td>
                    <td className="num">{w.optimalPoints.toFixed(2)}</td>
                    <td className="center">
                      {w.bestLineupWins === null ? (
                        <span className="flat">–</span>
                      ) : w.bestLineupWins === 'yes' ? (
                        <span className="up">Yes</span>
                      ) : (
                        <span className="down">No</span>
                      )}
                    </td>
                    <td className="num">
                      <span className={winPctClass(w.optimalWinPctVsLeague)}>
                        {w.optimalWinPctVsLeague.toFixed(0)}%
                      </span>
                    </td>
                    <td className="num">
                      {w.benchPointsLost > 0 ? (
                        <span className="down">{w.benchPointsLost.toFixed(2)}</span>
                      ) : (
                        <span className="flat">0</span>
                      )}
                    </td>
                    <td>
                      <Link className="sub" href={weekHref(w.week)}>
                        view lineup →
                      </Link>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-totals">
        Season totals: {totals.scored.toFixed(1)} scored · {totals.optimal.toFixed(1)} best possible
        · {totals.benched.toFixed(1)} benched
      </p>
    </>
  );
}
