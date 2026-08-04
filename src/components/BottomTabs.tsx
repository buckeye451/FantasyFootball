'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const LAST_TEAM_KEY = 'bmcf-last-team';

interface Tab {
  href: string;
  icon: string;
  label: string;
  /** Route prefixes that light this tab up. */
  match: string[];
}

const TABS: Tab[] = [
  { href: '/dashboard', icon: '🏈', label: 'Week', match: ['/dashboard', '/week'] },
  {
    href: '/league',
    icon: '📊',
    label: 'League',
    match: ['/league', '/playoffs', '/drafts', '/trades'],
  },
  { href: '/team', icon: '👤', label: 'My team', match: ['/team'] },
  { href: '/recaps', icon: '📰', label: 'Recaps', match: ['/recaps'] },
  {
    href: '/history',
    icon: '🏆',
    label: 'History',
    match: ['/history', '/lifetime', '/records', '/rankings'],
  },
];

/**
 * Phone-only bottom navigation. The hamburger drawer stays for desktop and as
 * the way into the long lists (every week, every manager) that don't belong in
 * five tabs.
 */
export function BottomTabs() {
  const pathname = usePathname() ?? '';
  const params = useSearchParams();
  const season = params?.get('season');
  const q = season ? `?season=${season}` : '';

  // There's no sign-in, so "my team" means the manager page you were last on.
  // Read after mount so the server and first client render agree.
  const [lastTeam, setLastTeam] = useState<string | null>(null);
  useEffect(() => {
    const slug = pathname.startsWith('/team/') ? pathname.split('/')[2] : null;
    try {
      if (slug) {
        localStorage.setItem(LAST_TEAM_KEY, slug);
        setLastTeam(slug);
      } else {
        setLastTeam(localStorage.getItem(LAST_TEAM_KEY));
      }
    } catch {
      // storage disabled — the tab falls back to the league hub
    }
  }, [pathname]);

  // The splash has no chrome of its own; the bar would sit on top of it.
  if (pathname === '/') return null;

  const active = TABS.reduce<Tab | null>((found, tab) => {
    if (found) return found;
    return tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)) ? tab : null;
  }, null);

  return (
    <nav className="bottom-tabs" aria-label="Sections">
      {TABS.map((tab) => {
        // "My team" has no single route — it points at whichever manager page
        // the reader last opened, and falls back to the roster list.
        const href =
          tab.href === '/team' ? (lastTeam ? `/team/${lastTeam}${q}` : `/league${q}`) : `${tab.href}${q}`;
        const isActive = active === tab;
        return (
          <Link
            key={tab.label}
            className={`bottom-tab${isActive ? ' active' : ''}`}
            href={href}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-tab-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
