'use client';

import { useEffect, useState } from 'react';
import type { RecordDef, RecordGroup } from '@/lib/stats';

function Top25Modal({ record, onClose }: { record: RecordDef; onClose: () => void }) {
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
        className="modal record-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${record.label} — top ${record.entries.length}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="record-modal-head">
          <div>
            <h2 className="record-modal-title">{record.label}</h2>
            <p className="record-modal-sub">Top {record.entries.length}, all-time</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <ol className="record-list">
          {record.entries.map((e, i) => (
            <li key={`${e.slug}-${i}`}>
              <span className="record-rank">{i + 1}</span>
              <span className="record-who">
                <span className="record-holder">{e.holder}</span>
                {e.lines.length > 0 && (
                  <span className="record-lines">{e.lines.join(' · ')}</span>
                )}
              </span>
              <span className="record-value">{e.display}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * The record book: a tile per record showing the current holder, each opening
 * its full top 25. Every list is computed on the server and shipped with the
 * page, so opening one costs no round trip.
 */
export function RecordBook({ groups }: { groups: RecordGroup[] }) {
  const [openRecord, setOpenRecord] = useState<RecordDef | null>(null);
  // null = every group, which is what a desktop reader usually wants.
  const [category, setCategory] = useState<string | null>(null);

  // The headline record gets a band of its own above the grid.
  const headline = groups
    .flatMap((g) => g.records)
    .find((r) => r.key === 'highest-game')?.entries[0];

  const shown = category ? groups.filter((g) => g.key === category) : groups;

  return (
    <>
      {headline && (
        <div className="record-hero">
          <div className="kicker record-hero-kicker">All-time high score</div>
          <div className="figure record-hero-figure">{headline.display}</div>
          <div className="record-hero-holder">{headline.holder}</div>
          <div className="record-hero-note">{headline.lines.join(' · ')}</div>
        </div>
      )}

      <div className="record-chips" role="group" aria-label="Record categories">
        <button
          type="button"
          className={`record-chip${category === null ? ' active' : ''}`}
          aria-pressed={category === null}
          onClick={() => setCategory(null)}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            className={`record-chip${category === g.key ? ' active' : ''}`}
            aria-pressed={category === g.key}
            onClick={() => setCategory(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {shown.map((g) => (
        <section className="record-section" key={g.key}>
          <h2 className="record-group-label">{g.label}</h2>
          <div className="record-grid">
            {g.records.map((r) => {
              const top = r.entries[0];
              return (
                <div className="record-card" key={r.key}>
                  <div className="record-card-label">{r.label}</div>
                  <div className="record-card-value">{top.display}</div>
                  <div className="record-card-holder">{top.holder}</div>
                  {top.lines.map((line, i) => (
                    <div className="record-card-line" key={i}>
                      {line}
                    </div>
                  ))}
                  <button className="record-more" onClick={() => setOpenRecord(r)}>
                    Top {r.entries.length}
                    <span aria-hidden="true"> →</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {openRecord && <Top25Modal record={openRecord} onClose={() => setOpenRecord(null)} />}
    </>
  );
}
