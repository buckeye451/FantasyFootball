import {
  currentStandings,
  getTeams,
  playoffRounds,
  regularSeasonWeeks,
  resolveActiveLeague,
  seasonHeat,
  seasonTrades,
} from '@/lib/stats';
import { HubList, type HubRow } from '@/components/HubList';
import { SeasonHeat } from '@/components/SeasonHeat';

export const dynamic = 'force-dynamic';

/**
 * Phone hub behind the 📊 tab. Everything in the drawer that describes the
 * league as a whole gets a home here, so the bottom bar doesn't strand any
 * destination.
 */
export default function LeaguePage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) {
    return (
      <div className="empty-state">
        <h1>No league data yet</h1>
        <p>Run a sync, then this page will list everything the league has.</p>
      </div>
    );
  }

  const leagueId = league.leagueId;
  const season = league.season;
  const q = `?season=${season}`;
  const weeks = regularSeasonWeeks(leagueId);
  const teams = getTeams(leagueId);
  const standings = currentStandings(leagueId);
  const rounds = playoffRounds(leagueId);
  const trades = seasonTrades(leagueId);
  const heat = seasonHeat(leagueId);

  const leader = standings[0];
  const nextRound = rounds.find((r) => r.week != null);

  const rows: HubRow[] = [
    {
      href: `/dashboard${q}`,
      icon: '📋',
      title: 'Standings',
      sub: leader
        ? `All 13 columns · ${leader.team.displayName} leads at ${leader.wins}-${leader.losses}`
        : 'Rank, record and rates',
    },
    {
      href: weeks.length ? `/week/${weeks[weeks.length - 1]}${q}` : `/dashboard${q}`,
      icon: '🗓',
      title: 'Weekly scores',
      sub: weeks.length
        ? `Week ${weeks[0]} – ${weeks[weeks.length - 1]} · every matchup + box score`
        : 'Every matchup, week by week',
    },
    {
      href: `/playoffs${q}`,
      icon: '🏟',
      title: 'Playoffs',
      sub: 'Bracket + per-round breakdowns',
      badge: nextRound?.week != null ? `wk ${nextRound.week}` : undefined,
    },
    {
      href: `/drafts${q}`,
      icon: '📝',
      title: 'Drafts',
      sub: 'Draft board + draft scores, every season',
    },
    {
      href: `/trades${q}`,
      icon: '🔁',
      title: 'Trades',
      sub: trades.length
        ? `${trades.length} completed ${trades.length === 1 ? 'trade' : 'trades'} · points gained`
        : 'Every completed trade · points gained',
    },
    {
      href: `/team/${teams[0]?.slug ?? ''}${q}`,
      icon: '👥',
      title: 'Managers',
      sub: `All ${teams.length} teams · lineups + optimal`,
    },
  ];

  return (
    <>
      <h1 className="page-title">League</h1>
      <p className="page-subtitle">
        {league.name} · {season}
      </p>

      <HubList rows={rows} />

      {heat.rows.length > 0 && heat.weeks.length > 0 && (
        <SeasonHeat weeks={heat.weeks} rows={heat.rows} season={season} />
      )}
    </>
  );
}
