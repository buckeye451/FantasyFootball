import type { Metadata } from 'next';
import { getLeague, getTeams } from '@/lib/stats';
import { ensureAutoSync } from '@/lib/autosync';
import { TeamNav } from '@/components/TeamNav';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BMCF League',
  description: 'Fantasy football league dashboard powered by the Sleeper API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let league = null;
  let teams: Array<{ slug: string; name: string }> = [];
  try {
    ensureAutoSync();
    league = getLeague();
    teams = getTeams().map((t) => ({ slug: t.slug, name: t.displayName }));
  } catch {
    // fresh checkout with no database yet — render the shell anyway
  }
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="brand-row">
              <span className="brand">{league?.name ?? 'BMCF League'}</span>
              <span className="brand-season">{league ? `${league.season} season` : ''}</span>
            </div>
            <TeamNav teams={teams} />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
