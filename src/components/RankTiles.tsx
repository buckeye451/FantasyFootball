'use client';

import { useEffect, useState } from 'react';

export interface RankBoardEntry {
  /** Stable identity for the row — a roster id within a season, a manager
   *  across them. Matched against `highlightKey` to mark "you". */
  key: string;
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
  /** Already formatted — a rank like "#7", or a name. */
  headline: string;
  /** Render the headline at display size, for a tile led by a rank. */
  big?: boolean;
  /** The one or two figures shown under the headline. */
  lines: string[];
  /** What the full board is measuring, for the popup's subheading. */
  note: string;
  board: RankBoardEntry[];
}

function RankModal({
  tile,
  highlightKey,
  onClose,
}: {
  tile: RankTile;
  highlightKey?: string;
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
        aria-label={`${tile.label} — full rankings`}
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
            const you = highlightKey != null && e.key === highlightKey;
            return (
              <li key={e.key} className={you ? 'is-you' : undefined}>
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
 * Tiles that each open the full league board behind them. Used for the team
 * page's four ranks and the lifetime page's trade leaders; `highlightKey`
 * marks a row as the reader's own, and is left unset where there isn't one.
 */
export function RankTiles({
  tiles,
  highlightKey,
  className = 'rank-tiles',
}: {
  tiles: RankTile[];
  highlightKey?: string;
  className?: string;
}) {
  const [open, setOpen] = useState<RankTile | null>(null);

  return (
    <>
      <div className={`feature-tiles ${className}`}>
        {tiles.map((t) => (
          <div className="feature-tile" key={t.key}>
            <div className="feature-tile-label">{t.label}</div>
            <div className={`feature-tile-name${t.big ? ' rank-figure' : ''}`}>{t.headline}</div>
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
        <RankModal tile={open} highlightKey={highlightKey} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
