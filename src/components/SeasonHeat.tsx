'use client';

// A row's label and its cells have to be siblings inside the grid, so each row
// is a keyed fragment rather than a wrapping element.
import { Fragment as ReactFragment, useMemo, useState } from 'react';
import Link from 'next/link';
import type { HeatRow } from '@/lib/stats';
import { SegTabs } from '@/components/SegTabs';
import { useIsMobile } from '@/components/useIsMobile';

type Encoding = 'median' | 'raw' | 'manager';

/** Teams shown before the expander kicks in on a phone. */
const PHONE_ROWS = 6;

const ENCODINGS = [
  { value: 'median' as const, label: 'vs median' },
  { value: 'raw' as const, label: 'Raw score' },
  { value: 'manager' as const, label: 'Manager %' },
];

/**
 * Signed strength of a cell in its encoding, as -1…1. Negative reads red,
 * positive green; the magnitude drives the alpha.
 */
function strength(
  cell: { score: number; median: number; managerPct: number },
  encoding: Encoding,
  scale: { spread: number; lo: number; hi: number }
): number {
  if (encoding === 'manager') {
    // Manager % is a 0–100 rate where ~85 is ordinary and 100 is perfect, so
    // it gets its own midpoint rather than the score scale's.
    return Math.max(-1, Math.min(1, (cell.managerPct - 88) / 12));
  }
  if (encoding === 'raw') {
    const mid = (scale.hi + scale.lo) / 2;
    const half = (scale.hi - scale.lo) / 2 || 1;
    return Math.max(-1, Math.min(1, (cell.score - mid) / half));
  }
  return Math.max(-1, Math.min(1, (cell.score - cell.median) / (scale.spread || 1)));
}

function cellStyle(s: number): { background: string } {
  // Floor the alpha so a cell sitting exactly on the median is still a visible
  // tile rather than a hole in the grid.
  const alpha = 0.2 + Math.abs(s) * 0.75;
  const tone = s >= 0 ? 'var(--heat-good)' : 'var(--heat-bad)';
  return { background: `color-mix(in srgb, ${tone} ${(alpha * 100).toFixed(1)}%, transparent)` };
}

export function SeasonHeat({
  weeks,
  rows,
  season,
  playoffSpots = 6,
}: {
  weeks: number[];
  rows: HeatRow[];
  season: string;
  playoffSpots?: number;
}) {
  const [encoding, setEncoding] = useState<Encoding>('median');
  const [expanded, setExpanded] = useState(false);

  const { scale, best } = useMemo(() => {
    const all = rows.flatMap((r) => r.cells);
    const diffs = all.map((c) => Math.abs(c.score - c.median));
    const scores = all.map((c) => c.score);
    // 90th percentile rather than the max, so one blowout week doesn't flatten
    // every other cell to near-invisible.
    const sorted = [...diffs].sort((a, b) => a - b);
    const spread = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] || 1 : 1;
    const top = all.reduce<(typeof all)[number] | null>(
      (m, c) => (m == null || c.score > m.score ? c : m),
      null
    );
    return {
      scale: {
        spread,
        lo: scores.length ? Math.min(...scores) : 0,
        hi: scores.length ? Math.max(...scores) : 1,
      },
      best: top,
    };
  }, [rows]);

  // Only phones trade completeness for height — a desktop grid shows everyone.
  const isMobile = useIsMobile();
  const shown = !isMobile || expanded ? rows : rows.slice(0, PHONE_ROWS);
  const hidden = rows.length - shown.length;

  const gridStyle = { '--heat-cols': weeks.length } as React.CSSProperties;

  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">Season heat</h2>
        <SegTabs
          options={ENCODINGS}
          value={encoding}
          onChange={setEncoding}
          storageKey="season-heat"
          ariaLabel="Heat encoding"
        />
        <p className="section-note">Every team, every week — click a cell to open that matchup.</p>
      </div>

      <div className="card heat-card">
        <div className="heat-grid" style={gridStyle}>
          <div className="heat-corner" />
          {weeks.map((w, i) => (
            <div
              key={w}
              // Labelling all 14 weeks doesn't fit a phone, so alternate ones
              // carry the number and the rest hold the column's place.
              className={`heat-week${i % 2 === 1 ? ' heat-week-alt' : ''}`}
            >
              {w}
            </div>
          ))}

          {shown.map((row) => (
            <ReactFragment key={row.team.rosterId}>
              <Link
                className={`heat-team${row.rank > playoffSpots ? ' out' : ''}`}
                href={`/team/${row.team.slug}?season=${season}`}
                prefetch={false}
              >
                {row.team.displayName}
              </Link>
              {weeks.map((w) => {
                const cell = row.cells.find((c) => c.week === w);
                if (!cell) return <div key={w} className="heat-cell empty" />;
                const isBest = best != null && cell.score === best.score;
                const label = `${row.team.displayName}, week ${w}: ${cell.score.toFixed(1)} (median ${cell.median.toFixed(1)}, manager ${cell.managerPct.toFixed(0)}%)`;
                return (
                  <Link
                    key={w}
                    className={`heat-cell${isBest ? ' best' : ''}`}
                    style={cellStyle(strength(cell, encoding, scale))}
                    href={`/week/${w}?season=${season}${cell.matchupId != null ? `&box=${cell.matchupId}#matchup-${cell.matchupId}` : ''}`}
                    // Every page is force-dynamic, so a prefetch is a full
                    // server render. With ~140 cells on screen that floods both
                    // the server and the browser's connection pool, and the
                    // navigation the reader actually asked for queues behind
                    // it. One matrix is not worth 140 speculative renders.
                    prefetch={false}
                    title={label}
                    aria-label={label}
                  />
                );
              })}
            </ReactFragment>
          ))}
        </div>

        {hidden > 0 && (
          <button type="button" className="heat-more" onClick={() => setExpanded(true)}>
            +{hidden} more ↓
          </button>
        )}

        <div className="heat-legend">
          <span>Below median</span>
          <span className="heat-legend-bar" />
          <span>Above</span>
          <span className="heat-legend-chip">season high</span>
        </div>
      </div>
    </section>
  );
}
