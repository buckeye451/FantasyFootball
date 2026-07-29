import type { BoxScore, BoxScorePlayer } from '@/lib/stats';
import { NflTeam } from '@/components/NflTeam';

/**
 * Slot labels the league uses that aren't a plain position — kept off the
 * position colour classes so FLEX doesn't get painted like a real position.
 */
const COMPOUND_SLOTS = new Set(['FLEX', 'SUPER_FLEX', 'REC_FLEX', 'IDP_FLEX', 'BE']);

function slotLabel(slot: string): string {
  if (slot === 'SUPER_FLEX') return 'SFLX';
  if (slot === 'REC_FLEX') return 'RFLX';
  if (slot === 'FLEX') return 'FLX';
  if (slot === 'DEF') return 'D/ST';
  return slot;
}

function PlayerCell({ p, align }: { p: BoxScorePlayer | null; align: 'left' | 'right' }) {
  if (!p) {
    return <span className={`box-player box-${align} box-empty`}>—</span>;
  }
  return (
    <span className={`box-player box-${align}`}>
      <span className="box-name">{p.name}</span>
      <span className="box-meta">
        <NflTeam code={p.nflTeam} /> {p.position}
      </span>
    </span>
  );
}

/**
 * Side-by-side scoring for one matchup: totals at the top, then starters
 * aligned by lineup slot, then each side's bench.
 */
export function BoxScoreTable({ box }: { box: BoxScore }) {
  const { home, away, rows } = box;
  const homeWon = away != null && home.score > away.score;
  const awayWon = away != null && away.score > home.score;
  const firstBench = rows.findIndex((r) => r.bench);

  return (
    <div className="box-score">
      <div className="box-head">
        <div className={`box-head-side${homeWon ? ' won' : ''}`}>
          <span className="box-head-name">{home.team.displayName}</span>
          <span className="box-head-score">{home.score.toFixed(2)}</span>
        </div>
        <div className="box-head-vs">vs</div>
        <div className={`box-head-side away${awayWon ? ' won' : ''}`}>
          <span className="box-head-name">{away ? away.team.displayName : 'Bye'}</span>
          <span className="box-head-score">{away ? away.score.toFixed(2) : '—'}</span>
        </div>
      </div>

      <table className="box-table">
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.slot}-${i}`}
              className={`${r.bench ? 'box-bench-row' : ''}${i === firstBench ? ' box-bench-first' : ''}`}
            >
              <td className="box-cell-left">
                <PlayerCell p={r.home} align="left" />
              </td>
              <td className="num box-pts">{r.home ? r.home.points.toFixed(2) : ''}</td>
              <td className="box-slot">
                <span
                  className={`draft-pos${COMPOUND_SLOTS.has(r.slot) ? '' : ` draft-pos-${r.slot}`}`}
                >
                  {slotLabel(r.slot)}
                </span>
              </td>
              <td className="num box-pts">{r.away ? r.away.points.toFixed(2) : ''}</td>
              <td className="box-cell-right">
                <PlayerCell p={r.away} align="right" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="box-cell-left box-foot-label">Bench points</td>
            <td className="num box-pts">{home.benchPoints.toFixed(2)}</td>
            <td className="box-slot" />
            <td className="num box-pts">{away ? away.benchPoints.toFixed(2) : ''}</td>
            <td className="box-cell-right box-foot-label">Bench points</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
