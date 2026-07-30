import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBracket, podium, resolveActiveLeague } from '@/lib/stats';
import { BracketView } from '@/components/BracketView';
import type { TeamInfo } from '@/lib/types';

export const dynamic = 'force-dynamic';

function FinishTile({
  medal,
  label,
  team,
  season,
  loser,
}: {
  medal: string;
  label: string;
  team: TeamInfo | null;
  season: string;
  loser?: boolean;
}) {
  return (
    <div className={`finish-tile${loser ? ' loser' : ''}`}>
      <div className="finish-medal" aria-hidden="true">
        {medal}
      </div>
      <div className="finish-label">{label}</div>
      <div className="finish-name">
        {team ? (
          <Link href={`/team/${team.slug}?season=${season}`}>{team.displayName}</Link>
        ) : (
          '—'
        )}
      </div>
    </div>
  );
}

export default function PlayoffsPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const winners = getBracket(league.leagueId, 'winners');
  const losers = getBracket(league.leagueId, 'losers');
  const places = podium(league.leagueId);
  const hasResults =
    places.champion || places.runnerUp || places.third || places.ultimateLoser;

  return (
    <>
      <h1 className="page-title">Playoff bracket</h1>
      <p className="page-subtitle">
        {league.name} · {league.season} postseason.
      </p>

      {hasResults && (
        <section className="card trophy-case finish-case">
          <h2 className="card-title">Final standings</h2>
          <p className="card-note">
            How the {league.season} postseason finished — plus the consolation bracket winner.
          </p>
          <div className="finish-grid">
            <FinishTile medal="🏆" label="Champion" team={places.champion} season={league.season} />
            <FinishTile medal="🥈" label="Runner-up" team={places.runnerUp} season={league.season} />
            <FinishTile medal="🥉" label="Third place" team={places.third} season={league.season} />
            <FinishTile
              medal="💩"
              label="Ultimate loser"
              team={places.ultimateLoser}
              season={league.season}
              loser
            />
          </div>
        </section>
      )}

      {winners.length === 0 ? (
        <div className="empty-state">
          <h1>No playoff bracket yet</h1>
          <p>The bracket appears once the {league.season} postseason is set.</p>
        </div>
      ) : (
        <section className="card">
          <h2 className="card-title">Championship bracket</h2>
          <BracketView rounds={winners} season={league.season} />
        </section>
      )}

      {losers.length > 0 && (
        <section className="card">
          <h2 className="card-title">Consolation bracket</h2>
          <BracketView rounds={losers} season={league.season} />
        </section>
      )}
    </>
  );
}
