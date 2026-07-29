import Link from 'next/link';
import type { BoxScore, MatchupBreakdown, TeamWeekStat } from '@/lib/stats';
import { managerClass, performanceClass, winPctClass } from '@/lib/thresholds';
import { BoxScoreTable } from '@/components/BoxScore';

function BestLineup({ v }: { v: 'yes' | 'no' | null }) {
  if (v === null) return <span className="flat">–</span>;
  return v === 'yes' ? <span className="up">Yes</span> : <span className="down">No</span>;
}

function TeamRow({ t, season, winner }: { t: TeamWeekStat; season: string; winner: boolean }) {
  return (
    <tr className={winner ? 'winner-row' : undefined}>
      <td className="team-cell">
        <Link href={`/team/${t.team.slug}?season=${season}`}>{t.team.displayName}</Link>
        {t.result && <span className={`badge ${t.result.toLowerCase()}`}>{t.result}</span>}
      </td>
      <td className="num strong">{t.score.toFixed(2)}</td>
      <td className="num">
        <span className={winPctClass(t.winPctVsLeague)}>{t.winPctVsLeague.toFixed(0)}%</span>
      </td>
      <td className="num">
        {t.performancePct == null ? (
          '—'
        ) : (
          <span className={performanceClass(t.performancePct)}>
            {t.performancePct.toFixed(1)}%
          </span>
        )}
      </td>
      <td className="num">
        <span className={managerClass(t.managerScorePct)}>{t.managerScorePct.toFixed(1)}%</span>
      </td>
      <td className="center">
        <BestLineup v={t.bestLineupWins} />
      </td>
    </tr>
  );
}

/**
 * Renders a week's (or playoff round's) matchups, each as a two-row card with
 * per-team advanced metrics. Winner of each matchup is highlighted.
 */
/** Stable per-matchup id, used for both the anchor and the ?box= parameter. */
export function matchupKey(b: MatchupBreakdown, index: number): string {
  return b.matchupId != null ? String(b.matchupId) : `solo-${index}`;
}

export function MatchupBreakdownList({
  breakdowns,
  season,
  compact,
  boxScores,
  openBox,
  boxLinkWeek,
}: {
  breakdowns: MatchupBreakdown[];
  season: string;
  /** Always-short headers and tighter spacing, for the dashboard's week view. */
  compact?: boolean;
  /** Parallel to `breakdowns`. Supplied only where the full lineups are wanted. */
  boxScores?: Array<BoxScore | null>;
  /** Matchup key to render already expanded, from `?box=` on the week page. */
  openBox?: string;
  /** When set, each matchup links through to its box score on that week's page. */
  boxLinkWeek?: number;
}) {
  if (breakdowns.length === 0) {
    return <p className="card-note">No matchup data for this week.</p>;
  }
  return (
    <div className="matchup-list">
      {breakdowns.map((b, i) => {
        const topScore = Math.max(...b.teams.map((t) => t.score));
        const tied = b.teams.length === 2 && b.teams[0].score === b.teams[1].score;
        const box = boxScores?.[i] ?? null;
        const key = matchupKey(b, i);
        return (
          <div className="card matchup-card" id={`matchup-${key}`} key={key}>
            <div className="table-wrap">
              <table className={`breakdown-table${compact ? ' breakdown-compact' : ''}`}>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th className="num">Score</th>
                    <th className="num" title="Percent of the other teams this score would beat">
                      {compact ? (
                        'ROL %'
                      ) : (
                        <>
                          <span className="th-full">Win % vs League</span>
                          <span className="th-short">Win %</span>
                        </>
                      )}
                    </th>
                    <th className="num" title="Score ÷ projected points">
                      {compact ? (
                        'Perf %'
                      ) : (
                        <>
                          <span className="th-full">Performance %</span>
                          <span className="th-short">Perf %</span>
                        </>
                      )}
                    </th>
                    <th className="num" title="Score ÷ best-possible lineup (max 100%)">
                      {compact ? (
                        'Manager %'
                      ) : (
                        <>
                          <span className="th-full">Manager Score</span>
                          <span className="th-short">Mgr %</span>
                        </>
                      )}
                    </th>
                    <th className="center" title="Would the optimal lineup have won this matchup?">
                      {compact ? (
                        'BLW?'
                      ) : (
                        <>
                          <span className="th-full">Best Lineup Wins?</span>
                          <span className="th-short">Best LU?</span>
                        </>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {b.teams.map((t) => (
                    <TeamRow
                      key={t.team.rosterId}
                      t={t}
                      season={season}
                      winner={!tied && t.score === topScore}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {box && (
              // <details> so the box score expands without any JavaScript, and
              // stays open across a re-render.
              <details className="box-toggle" open={openBox === key}>
                <summary>
                  <span className="box-caret" aria-hidden="true">
                    ▸
                  </span>
                  Full box score
                </summary>
                <BoxScoreTable box={box} />
              </details>
            )}
            {boxLinkWeek != null && (
              // Straight through to this matchup on the week page, already
              // expanded — ?box= opens it, the anchor scrolls to it.
              <Link
                className="box-link"
                href={`/week/${boxLinkWeek}?season=${season}&box=${key}#matchup-${key}`}
              >
                Full box score
                <span className="box-link-arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
