'use client';

import { useMemo, useState } from 'react';
import type { DraftBoard, DraftPick } from '@/lib/stats';

function num(n: number | null): string {
  return n == null ? '—' : n.toFixed(1);
}

function rank(n: number | null): string {
  return n == null ? '—' : `#${n}`;
}

// Arrow showing how the player's positional finish compares to where they were
// drafted at their position. Lower rank number = better.
//   finish better than drafted        → green up arrow
//   1–10 spots worse than drafted      → orange down arrow
//   more than 10 spots worse           → red down arrow
//   same, or no season finish          → nothing
function FinishArrow({ finish, drafted }: { finish: number | null; drafted: number }) {
  if (finish == null) return null;
  const delta = finish - drafted; // positive = finished worse than drafted
  if (delta < 0) return <span className="draft-arrow up" aria-label="outperformed draft slot">▲</span>;
  if (delta === 0) return null;
  if (delta <= 10) return <span className="draft-arrow warn" aria-label="finished below draft slot">▼</span>;
  return <span className="draft-arrow down" aria-label="finished well below draft slot">▼</span>;
}

const FMT_LABEL: Record<string, string> = {
  ppr: 'PPR',
  half_ppr: 'Half-PPR',
  std: 'Standard',
};

function HeaderRow({ showValue }: { showValue?: boolean }) {
  return (
    <tr>
      <th>Pick</th>
      <th className="num" title="Order this player was taken at their position in the draft">
        Pos Drafted
      </th>
      <th className="num" title="Finish among all players at this position that season">
        Pos Finish
      </th>
      <th className="num" title="Season fantasy points in this league's scoring">
        Pts
      </th>
      <th className="num" title="Most fantasy points in a single week (weeks rostered here)">
        High
      </th>
      {showValue && (
        <th
          className="num"
          title="Season points above the positional replacement level (Best Draft score contribution)"
        >
          Value
        </th>
      )}
    </tr>
  );
}

function PickRow({
  p,
  showManager,
  showValue,
}: {
  p: DraftPick;
  showManager: boolean;
  showValue?: boolean;
}) {
  const v = p.vsReplacement;
  return (
    <tr>
      <td>
        <div className="draft-pick">
          <span className="draft-no">#{p.pickNo}</span>
          <span className="draft-player">
            <span className="draft-name">{p.name}</span>{' '}
            <span className={`draft-pos draft-pos-${p.position}`}>{p.position}</span>
            {showManager && <span className="draft-mgr">{p.manager}</span>}
          </span>
        </div>
      </td>
      <td className="num">{rank(p.posDraftRank)}</td>
      <td className="num">
        {rank(p.posSeasonRank)}
        <FinishArrow finish={p.posSeasonRank} drafted={p.posDraftRank} />
      </td>
      <td className="num strong">{num(p.seasonPoints)}</td>
      <td className="num">{num(p.highWeek)}</td>
      {showValue && (
        <td className="num">
          {v == null ? (
            '—'
          ) : (
            <span className={v > 0 ? 'up' : v < 0 ? 'down' : 'flat'}>
              {v > 0 ? '+' : ''}
              {v.toFixed(1)}
            </span>
          )}
        </td>
      )}
    </tr>
  );
}

function valueSpan(v: number | null): React.ReactNode {
  if (v == null) return '—';
  return (
    <span className={v > 0 ? 'up' : v < 0 ? 'down' : 'flat'}>
      {v > 0 ? '+' : ''}
      {v.toFixed(1)}
    </span>
  );
}

/** A pick plus its ordinal within that manager's own draft (their Nth selection). */
interface RankPick {
  pick: DraftPick;
  mgrPickNo: number;
}

interface DraftRankRow {
  ownerId: string;
  manager: string;
  score: number;
  worstEarly: RankPick | null; // lowest value among the manager's first 7 picks
  bestPick: RankPick | null; // highest value across their whole draft
}

function RankPickCell({ entry }: { entry: RankPick | null }) {
  if (!entry) return <>—</>;
  const { pick, mgrPickNo } = entry;
  return (
    <span className="draft-rank-pick">
      <span className="draft-no">#{mgrPickNo}</span>{' '}
      <span className="draft-name">{pick.name}</span>{' '}
      <span className={`draft-pos draft-pos-${pick.position}`}>{pick.position}</span>{' '}
      {valueSpan(pick.vsReplacement)}
    </span>
  );
}

export function DraftBoardView({ board }: { board: DraftBoard }) {
  const [ownerId, setOwnerId] = useState(board.managers[0]?.ownerId ?? '');

  const byManager = useMemo(
    () => board.picks.filter((p) => p.ownerId === ownerId),
    [board.picks, ownerId]
  );

  // Every manager's draft ranked by total value vs replacement, with their
  // worst pick from their first seven selections and their best pick overall.
  const rankings = useMemo<DraftRankRow[]>(() => {
    const rows = board.managers.map((m) => {
      // Number picks by this manager's own draft order, so #2 means their
      // second selection regardless of where it fell overall.
      const scored = board.picks
        .filter((p) => p.ownerId === m.ownerId)
        .sort((a, b) => a.pickNo - b.pickNo)
        .map((pick, i) => ({ pick, mgrPickNo: i + 1 }))
        .filter((e) => e.pick.vsReplacement != null);
      const score = scored.reduce((s, e) => s + (e.pick.vsReplacement ?? 0), 0);
      let worstEarly: RankPick | null = null;
      for (const e of scored) {
        if (e.mgrPickNo > 7) continue;
        if (!worstEarly || e.pick.vsReplacement! < worstEarly.pick.vsReplacement!) worstEarly = e;
      }
      let bestPick: RankPick | null = null;
      for (const e of scored) {
        if (!bestPick || e.pick.vsReplacement! > bestPick.pick.vsReplacement!) bestPick = e;
      }
      return { ownerId: m.ownerId, manager: m.name, score: Math.round(score * 10) / 10, worstEarly, bestPick };
    });
    return rows.sort((a, b) => b.score - a.score);
  }, [board.managers, board.picks]);

  return (
    <>
      <p className="page-subtitle">
        {board.season} draft · {board.picks.length} picks ·{' '}
        {FMT_LABEL[board.scoringFormat] ?? board.scoringFormat} scoring
      </p>

      <div className="tile-grid draft-tiles">
        <div className="tile">
          <div className="tile-label">📈 Biggest Riser</div>
          <div className="tile-value">{board.riser ? board.riser.name : '—'}</div>
          <div className="tile-sub">
            {board.riser
              ? `+${board.riser.delta} · ${board.riser.position} drafted #${board.riser.drafted}, finished #${board.riser.finished} · ${board.riser.manager}`
              : 'no season stats yet'}
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">📉 Biggest Faller</div>
          <div className="tile-value">{board.faller ? board.faller.name : '—'}</div>
          <div className="tile-sub">
            {board.faller
              ? `${board.faller.delta} · ${board.faller.position} drafted #${board.faller.drafted}, finished #${board.faller.finished} · ${board.faller.manager}`
              : 'no season stats yet'}
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">🎯 Best Draft</div>
          <div className="tile-value">{board.bestDraft ? board.bestDraft.manager : '—'}</div>
          <div className="tile-sub">
            {board.bestDraft
              ? `${board.bestDraft.score >= 0 ? '+' : ''}${board.bestDraft.score.toFixed(1)} pts vs replacement`
              : 'no season stats yet'}
          </div>
        </div>
        <div className="tile">
          <div className="tile-label">😬 Worst Draft</div>
          <div className="tile-value">{board.worstDraft ? board.worstDraft.manager : '—'}</div>
          <div className="tile-sub">
            {board.worstDraft
              ? `${board.worstDraft.score >= 0 ? '+' : ''}${board.worstDraft.score.toFixed(1)} pts vs replacement`
              : 'no season stats yet'}
          </div>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">Draft rankings</h2>
        <p className="card-note">
          Every draft scored by total points above positional replacement — the same math as the
          Best/Worst Draft tiles.
        </p>
        <div className="table-wrap">
          <table className="draft-table draft-compact">
            <thead>
              <tr>
                <th className="num">Rank</th>
                <th>Manager</th>
                <th className="num" title="Sum of every pick's points above positional replacement">
                  Score
                </th>
                <th title="Lowest-value pick among their first seven selections">
                  Worst Early Pick
                </th>
                <th title="Highest-value pick of their whole draft">Best Pick</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => (
                <tr key={r.ownerId}>
                  <td className="num">{i + 1}</td>
                  <td className="team-cell">{r.manager}</td>
                  <td className="num strong">{valueSpan(r.score)}</td>
                  <td>
                    <RankPickCell entry={r.worstEarly} />
                  </td>
                  <td>
                    <RankPickCell entry={r.bestPick} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">By manager</h2>
        <p className="card-note">Pick a manager to see their draft in order.</p>
        <div className="h2h-controls">
          <label className="week-select">
            <span className="week-select-label">Manager</span>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              aria-label="Select manager"
            >
              {board.managers.map((m) => (
                <option key={m.ownerId} value={m.ownerId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table className="draft-table draft-compact">
            <thead>
              <HeaderRow showValue />
            </thead>
            <tbody>
              {byManager.map((p) => (
                <PickRow key={p.pickNo} p={p} showManager={false} showValue />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Full draft</h2>
        <p className="card-note">Every pick in order. Pts are the player&rsquo;s season total.</p>
        <div className="table-wrap">
          <table className="draft-table draft-compact">
            <thead>
              <HeaderRow />
            </thead>
            <tbody>
              {board.picks.map((p) => (
                <PickRow key={p.pickNo} p={p} showManager />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
