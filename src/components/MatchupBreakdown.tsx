import Link from 'next/link';
import type { MatchupBreakdown, TeamWeekStat } from '@/lib/stats';

function pct(n: number | null): string {
  return n == null ? '—' : `${n.toFixed(1)}%`;
}

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
      <td className="num">{t.winPctVsLeague.toFixed(0)}%</td>
      <td className="num">{pct(t.performancePct)}</td>
      <td className="num">{t.managerScorePct.toFixed(1)}%</td>
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
export function MatchupBreakdownList({
  breakdowns,
  season,
}: {
  breakdowns: MatchupBreakdown[];
  season: string;
}) {
  if (breakdowns.length === 0) {
    return <p className="card-note">No matchup data for this week.</p>;
  }
  return (
    <div className="matchup-list">
      {breakdowns.map((b, i) => {
        const topScore = Math.max(...b.teams.map((t) => t.score));
        const tied = b.teams.length === 2 && b.teams[0].score === b.teams[1].score;
        return (
          <div className="card matchup-card" key={b.matchupId ?? `solo-${i}`}>
            <div className="table-wrap">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th className="num">Score</th>
                    <th className="num" title="Percent of the other teams this score would beat">
                      Win % vs League
                    </th>
                    <th className="num" title="Score ÷ projected points">
                      Performance %
                    </th>
                    <th className="num" title="Score ÷ best-possible lineup (max 100%)">
                      Manager Score
                    </th>
                    <th className="center" title="Would the optimal lineup have won this matchup?">
                      Best Lineup Wins?
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
          </div>
        );
      })}
    </div>
  );
}
