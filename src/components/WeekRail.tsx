'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

/**
 * The dashboard's week strip: every regular-season week as a tappable cell,
 * so moving between weeks costs one tap instead of opening a select.
 *
 * `WeekSelect` still handles the other pages — this replaces it only here,
 * where the week is the main axis the reader moves along.
 */
export function WeekRail({
  weeks,
  selected,
  playedThrough,
  season,
  pct,
  syncedLabel,
  hasPlayoffs,
}: {
  weeks: number[];
  selected: number;
  /** Last week with scored games — weeks past this read as not yet played. */
  playedThrough: number;
  season: string;
  pct?: number;
  /** Preformatted on the server — formatting a date here would render with the
      server's locale first and the browser's on hydration, which mismatches. */
  syncedLabel?: string | null;
  hasPlayoffs?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Bring the selected week into view on a phone, where the rail overflows.
  // scrollIntoView would also scroll the page vertically to reach it; setting
  // scrollLeft keeps the movement inside the rail.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const active = track.querySelector<HTMLElement>('.week-rail-cell.current');
    if (!active) return;
    const target = active.offsetLeft - (track.clientWidth - active.offsetWidth) / 2;
    track.scrollLeft = Math.max(0, target);
  }, [selected]);

  return (
    <div className="week-rail">
      <span className="kicker week-rail-title">Week</span>
      <div className="week-rail-track" ref={trackRef}>
        {weeks.map((w) => {
          const state = w === selected ? 'current' : w <= playedThrough ? 'played' : 'unplayed';
          // Weeks with no games yet are shown so the season's full shape is
          // visible, but there's nothing to navigate to.
          return state === 'unplayed' ? (
            <span key={w} className="week-rail-cell unplayed">
              {w}
            </span>
          ) : (
            <Link
              key={w}
              className={`week-rail-cell ${state}`}
              href={`/dashboard?season=${season}&week=${w}`}
              // Each of these is a full dashboard render, and the whole rail
              // sits on screen at once — prefetching all of them would cost a
              // dozen of the app's most expensive renders to save one.
              prefetch={false}
              aria-current={w === selected ? 'page' : undefined}
            >
              {w}
            </Link>
          );
        })}
        {hasPlayoffs && (
          <Link className="week-rail-playoffs" href={`/playoffs?season=${season}`}>
            Playoffs →
          </Link>
        )}
      </div>
      <span className="week-rail-meta">
        {pct != null && `${pct.toFixed(1)}% of the season played`}
        {pct != null && syncedLabel ? ' · ' : ''}
        {syncedLabel && `synced ${syncedLabel}`}
      </span>
    </div>
  );
}
