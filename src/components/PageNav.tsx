'use client';

import { useRouter } from 'next/navigation';

export interface PageNavOption {
  value: string;
  label: string;
  /** Built on the server so the season — and any anchor — travels with it. */
  href: string;
}

/**
 * On-page dropdown for stepping between sibling pages: weeks on the weekly
 * scores page, managers on a team page. Saves a trip through the drawer when
 * you're reading straight down a list of weeks or comparing two managers.
 *
 * Hidden when there's nowhere else to go — a one-option picker is just noise.
 */
export function PageNav({
  label,
  options,
  value,
  ariaLabel,
}: {
  label: string;
  options: PageNavOption[];
  value: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  if (options.length < 2) return null;
  return (
    <div className="page-nav">
      <label className="week-select">
        <span className="week-select-label">{label}</span>
        <select
          value={value}
          onChange={(e) => {
            const next = options.find((o) => o.value === e.target.value);
            if (next) router.push(next.href);
          }}
          aria-label={ariaLabel}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
