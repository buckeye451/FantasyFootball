'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface HeaderSeason {
  season: string;
  leagueId: string;
  name: string;
  hasGames: boolean;
  teams: Array<{ slug: string; name: string }>;
  weeks: number[];
  playoffRounds: Array<{ round: number; name: string }>;
}

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="drawer-section">
      <button className="drawer-section-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <span className={`caret${open ? ' open' : ''}`}>▸</span>
      </button>
      {open && <div className="drawer-sublist">{children}</div>}
    </div>
  );
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
  const [open, setOpen] = useState(false);

  const activeSeason = searchParams.get('season') ?? defaultSeason ?? seasons[0]?.season ?? '';
  const active = seasons.find((s) => s.season === activeSeason) ?? seasons[0];
  const withSeason = (path: string) => (activeSeason ? `${path}?season=${activeSeason}` : path);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand-row">
          <button
            className="hamburger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link
            href={withSeason('/dashboard')}
            className="brand"
            aria-label={active?.name ?? 'BMCFF Fantasy Football'}
          >
            <img src="/hero/logo.svg" alt={active?.name ?? 'BMCFF'} className="brand-logo" />
          </Link>
          {seasons.length > 0 && (
            <label className="season-picker">
              <span className="season-picker-label">Season</span>
              <select
                value={activeSeason}
                onChange={(e) => router.push(`/dashboard?season=${e.target.value}`)}
                aria-label="Select season"
              >
                {seasons.map((s) => (
                  <option key={s.season} value={s.season}>
                    {s.season}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <span className="drawer-title">{active?.name ?? 'BMCF League'}</span>
          <span className="drawer-season">{activeSeason}</span>
        </div>

        <Link href={withSeason('/dashboard')} className="drawer-link">
          Dashboard
        </Link>

        <Link href={withSeason('/lifetime')} className="drawer-link">
          Lifetime Stats
        </Link>

        <Link href={withSeason('/drafts')} className="drawer-link">
          Drafts
        </Link>

        <Section title="Players" defaultOpen>
          {(active?.teams ?? []).map((t) => (
            <Link key={t.slug} href={withSeason(`/team/${t.slug}`)} className="drawer-sublink">
              {t.name}
            </Link>
          ))}
        </Section>

        <Section title="Weekly Scores">
          {(active?.weeks ?? []).map((w) => (
            <Link key={w} href={withSeason(`/week/${w}`)} className="drawer-sublink">
              Week {w}
            </Link>
          ))}
          {(active?.weeks ?? []).length === 0 && <span className="drawer-empty">No games yet</span>}
        </Section>

        <Section title="Playoffs">
          {(active?.playoffRounds ?? []).length > 0 ? (
            <>
              <Link href={withSeason('/playoffs')} className="drawer-sublink">
                Playoff Bracket
              </Link>
              {active!.playoffRounds.map((r) => (
                <Link
                  key={r.round}
                  href={withSeason(`/playoffs/round/${r.round}`)}
                  className="drawer-sublink"
                >
                  {r.name}
                </Link>
              ))}
            </>
          ) : (
            <span className="drawer-empty">No playoffs yet</span>
          )}
        </Section>
      </aside>
    </header>
  );
}
