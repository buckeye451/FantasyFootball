'use client';

import { useMemo, useState } from 'react';
import type { DraftBoard, DraftPick } from '@/lib/stats';

function num(n: number | null): string {
  return n == null ? '—' : n.toFixed(1);
}

function rank(n: number | null): string {
  return n == null ? '—' : `#${n}`;
}

const FMT_LABEL: Record<string, string> = {
  ppr: 'PPR',
  half_ppr: 'Half-PPR',
  std: 'Standard',
};

function HeaderRow({ showLow }: { showLow: boolean }) {
  return (
    <tr>
      <th>Pick</th>
      <th className="num" title="Season fantasy points in this league's scoring">
        Pts
      </th>
      <th className="num" title="Finish among all players at this position that season">
        Pos Finish
      </th>
      <th className="num" title="Order this player was taken at their position in the draft">
        Pos Drafted
      </th>
      <th className="num" title="Most fantasy points in a single week (weeks rostered here)">
        High
      </th>
      {showLow && (
        <th className="num" title="Fewest fantasy points in a single week (weeks rostered here)">
          Low
        </th>
      )}
    </tr>
  );
}

function PickRow({
  p,
  showManager,
  showLow,
}: {
  p: DraftPick;
  showManager: boolean;
  showLow: boolean;
}) {
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
      <td className="num strong">{num(p.seasonPoints)}</td>
      <td className="num">{rank(p.posSeasonRank)}</td>
      <td className="num">{rank(p.posDraftRank)}</td>
      <td className="num">{num(p.highWeek)}</td>
      {showLow && <td className="num">{num(p.lowWeek)}</td>}
    </tr>
  );
}

export function DraftBoardView({ board }: { board: DraftBoard }) {
  const [ownerId, setOwnerId] = useState(board.managers[0]?.ownerId ?? '');

  const byManager = useMemo(
    () => board.picks.filter((p) => p.ownerId === ownerId),
    [board.picks, ownerId]
  );

  return (
    <>
      <p className="page-subtitle">
        {board.season} draft · {board.picks.length} picks ·{' '}
        {FMT_LABEL[board.scoringFormat] ?? board.scoringFormat} scoring
      </p>

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
              <HeaderRow showLow={false} />
            </thead>
            <tbody>
              {byManager.map((p) => (
                <PickRow key={p.pickNo} p={p} showManager={false} showLow={false} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Full draft</h2>
        <p className="card-note">Every pick in order. Pts are the player&rsquo;s season total.</p>
        <div className="table-wrap">
          <table className="draft-table">
            <thead>
              <HeaderRow showLow />
            </thead>
            <tbody>
              {board.picks.map((p) => (
                <PickRow key={p.pickNo} p={p} showManager showLow />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
