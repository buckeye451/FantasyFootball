import type { Metadata } from 'next';
import { Archivo, Barlow_Condensed } from 'next/font/google';
import { defaultSeason, getSeasons, getTeams, playoffRounds, regularSeasonWeeks } from '@/lib/stats';
import { ensureAutoSync } from '@/lib/autosync';
import { SiteHeader, type HeaderSeason } from '@/components/SiteHeader';
import { newestRecap } from '@/lib/recaps';
import type { BellRecap } from '@/components/RecapBell';
import './globals.css';

export const dynamic = 'force-dynamic';

/* Self-hosted at build time by next/font, so there's no render-blocking round
   trip to Google and no layout shift. The CSS variables are what globals.css
   reads — see --font-ui / --font-display. */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
});
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BMCF League',
  description: 'Fantasy football league dashboard powered by the Sleeper API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let seasons: HeaderSeason[] = [];
  let fallbackSeason: string | null = null;
  let bellRecap: BellRecap | null = null;
  try {
    ensureAutoSync();
    fallbackSeason = defaultSeason();
    seasons = getSeasons().map((s) => ({
      ...s,
      teams: getTeams(s.leagueId).map((t) => ({ slug: t.slug, name: t.displayName })),
      weeks: regularSeasonWeeks(s.leagueId),
      playoffRounds: playoffRounds(s.leagueId).map((r) => ({ round: r.round, name: r.name })),
    }));
    const latest = newestRecap();
    bellRecap = latest
      ? {
          id: latest.id,
          season: latest.season,
          title: latest.title,
          preheader: latest.preheader,
          createdAt: latest.createdAt,
        }
      : null;
  } catch {
    // fresh checkout with no database yet — render the shell anyway
  }
  return (
    <html lang="en" data-theme="dark" className={`${archivo.variable} ${barlowCondensed.variable}`}>
      <head>
        {/* Apply the saved theme before first paint, so a light-mode user
            doesn't get a flash of the dark palette on every navigation. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bmcf-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <SiteHeader seasons={seasons} defaultSeason={fallbackSeason} newestRecap={bellRecap} />
        <main>{children}</main>
      </body>
    </html>
  );
}
