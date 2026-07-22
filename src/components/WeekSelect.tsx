'use client';

import { useRouter } from 'next/navigation';

/** Dashboard week selector — rewinds the standings, the stat tiles, and
 *  players-of-the-week to "as of" the chosen week. */
export function WeekSelect({
  weeks,
  selected,
  season,
}: {
  weeks: number[];
  selected: number;
  season: string;
}) {
  const router = useRouter();
  return (
    <label className="week-select">
      <span className="week-select-label">As of</span>
      <select
        value={selected}
        onChange={(e) => router.push(`/dashboard?season=${season}&week=${e.target.value}`)}
        aria-label="Show dashboard as of week"
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
