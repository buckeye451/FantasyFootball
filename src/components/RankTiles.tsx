'use client';

import { useEffect, useState } from 'react';

export interface RankBoardEntry {
  rosterId: number;
  rank: number;
  name: string;
  /** Headline figure for this category. */
  value: string;
  /** Supporting figure, shown under the name. */
  detail: string;
}

export interface RankTile {
  key: string;
  label: string;
  rank: number | null;
  /** The one or two figures shown under the rank. */
  lines: string[];
  /** What the full board is measuring, for the popup's subheading. */
  note: string;
  board: RankBoardEntry[];
}

function RankModal({
  tile,
  rosterId,
  teams,
  onClose,
}: {
  tile: RankTile;
  rosterId: number;
  teams: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal record-modal rank-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${tile.label} — all ${teams} teams`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="record-modal-head">
          <div>
            <h2 className="record-modal-title">{tile.label}</h2>
            <p className="record-modal-sub">{tile.note}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <ol className="record-list rank-list">
          {tile.board.map((e) => {
            const you = e.rosterId === rosterId;
            return (
              <li key={e.rosterId} className={you ? 'is-you' : undefined}>
                <span className="record-rank">{e.rank}</span>
                <span className="record-who">
                  <span className="record-holder">
                    {e.name}
                    {you && <span className="rank-you">you</span>}
                  </span>
                  <span className="record-lines">{e.detail}</span>
                </span>
                <span className="record-value">{e.value}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * The team page's four rank tiles, each opening the full league board for its
 * category with the team whose page you're on marked.
 */
export function RankTiles({
  tiles,
  rosterId,
  teams,
}: {
  tiles: RankTile[];
  rosterId: number;
  teams: number;
}) {
  const [open, setOpen] = useState<RankTile | null>(null);

  return (
    <>
      <div className="feature-tiles rank-tiles">
        {tiles.map((t) => (
          <div className="feature-tile" key={t.key}>
            <div className="feature-tile-label">{t.label}</div>
            <div className="feature-tile-name">
              {t.rank == null ? '—' : `#${t.rank}`}
              <span className="feature-tile-of">of {teams}</span>
            </div>
            {t.lines.map((line, i) => (
              <div className="feature-tile-value" key={i}>
                {line}
              </div>
            ))}
            <button
              className="rank-more"
              onClick={() => setOpen(t)}
              aria-label={`See full rankings for ${t.label}`}
            >
              See full rankings
              <span aria-hidden="true"> →</span>
            </button>
          </div>
        ))}
      </div>

      {open && (
        <RankModal tile={open} rosterId={rosterId} teams={teams} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
