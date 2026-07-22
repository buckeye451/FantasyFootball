import type { Metadata } from 'next';
import { defaultSeason, getSeasons, getTeams, playoffRounds, regularSeasonWeeks } from '@/lib/stats';
import { ensureAutoSync } from '@/lib/autosync';
import { SiteHeader, type HeaderSeason } from '@/components/SiteHeader';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BMCF League',
  description: 'Fantasy football league dashboard powered by the Sleeper API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let seasons: HeaderSeason[] = [];
  let fallbackSeason: string | null = null;
  try {
    ensureAutoSync();
    fallbackSeason = defaultSeason();
    seasons = getSeasons().map((s) => ({
      ...s,
      teams: getTeams(s.leagueId).map((t) => ({ slug: t.slug, name: t.displayName })),
      weeks: regularSeasonWeeks(s.leagueId),
      playoffRounds: playoffRounds(s.leagueId).map((r) => ({ round: r.round, name: r.name })),
    }));
  } catch {
    // fresh checkout with no database yet — render the shell anyway
  }
  return (
    <html lang="en">
      <body>
        <SiteHeader seasons={seasons} defaultSeason={fallbackSeason} />
        <main>{children}</main>
      </body>
    </html>
  );
}
