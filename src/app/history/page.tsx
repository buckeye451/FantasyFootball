import { SEASON_CHAMPIONS, getSeasons, recordBook, resolveActiveLeague } from '@/lib/stats';
import { managerName } from '@/lib/managers';
import { HubList, type HubRow } from '@/components/HubList';
import { LeadStory } from '@/components/LeadStory';

export const dynamic = 'force-dynamic';

/**
 * Phone hub behind the 🏆 tab: everything that reaches back past this season.
 * Season switching still lives in the header, so these pages can be read for
 * a past year exactly as they can today.
 */
export default function HistoryPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  const season = league?.season ?? '';
  const q = season ? `?season=${season}` : '';

  const groups = recordBook();
  const highestGame = groups
    .flatMap((g) => g.records)
    .find((r) => r.key === 'highest-game')?.entries[0];

  const seasons = getSeasons().map((s) => s.season);
  const span = seasons.length ? `${seasons[seasons.length - 1]} – ${seasons[0]}` : '';

  // SEASON_CHAMPIONS is keyed by Sleeper handle; every other page shows the
  // name we actually use, so map it here too.
  const byManager = new Map<string, number>();
  for (const handle of Object.values(SEASON_CHAMPIONS)) {
    const name = managerName(handle);
    byManager.set(name, (byManager.get(name) ?? 0) + 1);
  }
  const trophySub = [...byManager.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
    .join(' · ');

  const rows: HubRow[] = [
    {
      href: `/lifetime${q}`,
      icon: '📈',
      title: 'Lifetime stats',
      sub: 'Career standings · head to head · trades · drafts',
    },
    {
      href: `/rankings${q}`,
      icon: '🥇',
      title: 'Best player rankings',
      sub: 'Top 50 at each position, any season',
    },
    {
      href: '/records',
      icon: '📖',
      title: 'The record book',
      sub: 'Team, player, streak and futility records',
    },
    {
      href: `/lifetime${q}#trophy-case`,
      icon: '🏆',
      title: 'Trophy case',
      sub: trophySub || 'Every champion',
    },
  ];

  return (
    <>
      <h1 className="page-title">History</h1>
      <p className="page-subtitle">{span}</p>

      {highestGame && (
        <div className="dash-lead history-lead">
          <LeadStory
            kicker="All-time high score"
            figure={highestGame.display}
            headline={highestGame.holder}
            blurb={highestGame.lines.join(' · ')}
            stats={[]}
            href={`/team/${highestGame.slug}`}
          />
        </div>
      )}

      <HubList rows={rows} />
    </>
  );
}
