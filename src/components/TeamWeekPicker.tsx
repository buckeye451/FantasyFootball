'use client';

import { useRouter } from 'next/navigation';

/** Week selector for a team's lineup section (navigates to that week). */
export function TeamWeekPicker({
  slug,
  weeks,
  selected,
  season,
}: {
  slug: string;
  weeks: number[];
  selected: number;
  season: string;
}) {
  const router = useRouter();
  return (
    <label className="week-select">
      <span className="week-select-label">Week</span>
      <select
        value={selected}
        onChange={(e) => router.push(`/team/${slug}?week=${e.target.value}&season=${season}#week-detail`)}
        aria-label="Select week"
      >
        {weeks.map((w) => (
          <option key={w} value={w}>
            Week {w}
          </option>
        ))}
      </select>
    </label>
  );
}
