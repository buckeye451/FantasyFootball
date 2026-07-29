'use client';

import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Position and year pickers for the rankings page. They drive the URL rather
 * than local state so the table stays server-rendered and a filtered view can
 * be linked to or bookmarked. The header's own `season` param is preserved —
 * it controls the nav, not this list.
 */
export function RankingFilters({
  positions,
  years,
  position,
  year,
}: {
  positions: string[];
  years: string[];
  position: string;
  /** A season, or 'all' for every year. */
  year: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const go = (next: { pos?: string; year?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pos', next.pos ?? position);
    params.set('year', next.year ?? year);
    router.push(`/rankings?${params.toString()}`);
  };

  return (
    <div className="rank-filters">
      <label className="rank-filter">
        <span>Position</span>
        <select value={position} onChange={(e) => go({ pos: e.target.value })}>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="rank-filter">
        <span>Year</span>
        <select value={year} onChange={(e) => go({ year: e.target.value })}>
          <option value="all">All-time</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
