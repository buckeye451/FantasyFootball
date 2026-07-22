import { notFound } from 'next/navigation';
import { getBracket, resolveActiveLeague } from '@/lib/stats';
import { BracketView } from '@/components/BracketView';

export const dynamic = 'force-dynamic';

export default function PlayoffsPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const winners = getBracket(league.leagueId, 'winners');
  const losers = getBracket(league.leagueId, 'losers');

  return (
    <>
      <h1 className="page-title">Playoff bracket</h1>
      <p className="page-subtitle">
        {league.name} · {league.season} postseason.
      </p>

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
