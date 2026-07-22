'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface HeaderSeason {
  season: string;
  leagueId: string;
  name: string;
  hasGames: boolean;
  teams: Array<{ slug: string; name: string }>;
}

export function SiteHeader({
  seasons,
  defaultSeason,
}: {
  seasons: HeaderSeason[];
  defaultSeason: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeSeason = searchParams.get('season') ?? defaultSeason ?? seasons[0]?.season ?? '';
  const active = seasons.find((s) => s.season === activeSeason) ?? seasons[0];
  const teams = active?.teams ?? [];
  const withSeason = (path: string) => (activeSeason ? `${path}?season=${activeSeason}` : path);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand-row">
          <Link href={withSeason('/')} className="brand">
            {active?.name ?? 'BMCF League'}
          </Link>
          {seasons.length > 0 && (
            <label className="season-picker">
              <span className="season-picker-label">Season</span>
              <select
                value={activeSeason}
                onChange={(e) => router.push(`/?season=${e.target.value}`)}
                aria-label="Select season"
              >
                {seasons.map((s) => (
                  <option key={s.season} value={s.season}>
                    {s.season}
                    {s.hasGames ? '' : ' (upcoming)'}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <nav className="team-nav" aria-label="League navigation">
          <Link href={withSeason('/')} className={pathname === '/' ? 'active' : ''}>
            Dashboard
          </Link>
          {teams.map((t) => {
            const href = `/team/${t.slug}`;
            return (
              <Link
                key={t.slug}
                href={withSeason(href)}
                className={pathname === href ? 'active' : ''}
              >
                {t.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
