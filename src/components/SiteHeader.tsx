'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RecapBell, type BellRecap } from '@/components/RecapBell';

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

/**
 * A top-level destination that also has sub-pages: the label navigates and the
 * caret beside it expands the list, so reaching the parent page never costs an
 * extra tap the way a plain Section would.
 */
function LinkSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="drawer-section">
      <div className="drawer-link-row">
        <Link href={href} className="drawer-link">
          {title}
        </Link>
        <button
          className="drawer-caret-button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} ${title} pages`}
        >
          <span className={`caret${open ? ' open' : ''}`}>▸</span>
        </button>
      </div>
      {open && <div className="drawer-sublist">{children}</div>}
    </div>
  );
}

export function SiteHeader({
  seasons,
  defaultSeason,
  newestRecap,
}: {
  seasons: HeaderSeason[];
  defaultSeason: string | null;
  /** Most recent post across all seasons, for the notification bell. */
  newestRecap: BellRecap | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const activeSeason = searchParams.get('season') ?? defaultSeason ?? seasons[0]?.season ?? '';
  const active = seasons.find((s) => s.season === activeSeason) ?? seasons[0];
  const withSeason = (path: string) => (activeSeason ? `${path}?season=${activeSeason}` : path);

  // Pages that exist for every season, so switching seasons can stay put.
  // Item-specific routes (/team/[slug], /week/[n], /playoffs/round/[n]) can
  // 404 in another season — a manager who wasn't in the league, a week that
  // wasn't played — so those fall back to the dashboard.
  const SEASON_STABLE = [
    '/dashboard',
    '/drafts',
    '/lifetime',
    '/playoffs',
    '/rankings',
    '/recaps',
    '/records',
    '/trades',
  ];
  const seasonHref = (season: string) =>
    SEASON_STABLE.includes(pathname) ? `${pathname}?season=${season}` : `/dashboard?season=${season}`;

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
          <RecapBell recap={newestRecap} />
          <ThemeToggle />
          {seasons.length > 0 && (
            <label className="season-picker">
              <span className="season-picker-label">Season</span>
              <select
                value={activeSeason}
                onChange={(e) => router.push(seasonHref(e.target.value))}
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

        <Link href={withSeason('/recaps')} className="drawer-link">
          Recaps
        </Link>

        <Section title="Weekly Scores">
          {(active?.weeks ?? []).map((w) => (
            <Link key={w} href={withSeason(`/week/${w}`)} className="drawer-sublink">
              Week {w}
            </Link>
          ))}
          {(active?.weeks ?? []).length === 0 && <span className="drawer-empty">No games yet</span>}
        </Section>

        <Section title="Players">
          {(active?.teams ?? []).map((t) => (
            <Link key={t.slug} href={withSeason(`/team/${t.slug}`)} className="drawer-sublink">
              {t.name}
            </Link>
          ))}
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

        <Link href={withSeason('/drafts')} className="drawer-link">
          Drafts
        </Link>

        <Link href={withSeason('/trades')} className="drawer-link">
          Trades
        </Link>

        <LinkSection title="Lifetime Stats" href={withSeason('/lifetime')}>
          <Link href={withSeason('/rankings')} className="drawer-sublink">
            Best Player Rankings
          </Link>
        </LinkSection>

        <Link href={withSeason('/records')} className="drawer-link">
          The Record Book
        </Link>
      </aside>
    </header>
  );
}
