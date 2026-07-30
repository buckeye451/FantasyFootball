import {
  bestSeasonsByPosition,
  CHAMPIONS,
  getSeasons,
  headToHead,
  lifetimeDraftRankings,
  lifetimeStandings,
  lifetimeTradeSummary,
  seasonPointsSeries,
} from '@/lib/stats';
import { POSITION_ORDER } from '@/components/PlayerCards';
import { LifetimeStandingsTable } from '@/components/LifetimeStandingsTable';
import { HeadToHead } from '@/components/HeadToHead';
import { SeasonPointsChart } from '@/components/FocusCharts';
import { DraftRankingsTable } from '@/components/DraftRankingsTable';
import { NflTeam } from '@/components/NflTeam';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LifetimePage({ searchParams }: { searchParams: { season?: string } }) {
  const season = searchParams.season;
  const rows = lifetimeStandings();
  const playedSeasons = getSeasons().filter((s) => s.hasGames);
  const leaders = bestSeasonsByPosition(5);
  const h2h = headToHead();
  const draftRanks = lifetimeDraftRankings();
  const { mostTrades, bestTrader } = lifetimeTradeSummary();
  const seasonPoints = seasonPointsSeries();

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <h1>Lifetime stats</h1>
        <p>Career records appear here once at least one season has been synced.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Lifetime stats</h1>
      <p className="page-subtitle">
        Career regular-season numbers across {playedSeasons.length} season
        {playedSeasons.length === 1 ? '' : 's'} (
        {[...playedSeasons].map((s) => s.season).sort().join(', ')}).
      </p>

      <section className="card trophy-case">
        <h2 className="card-title">🏆 Trophy case</h2>
        <p className="card-note">League champions, one trophy per title.</p>
        <div className="trophy-grid">
          {CHAMPIONS.map((c) => (
            <div className="trophy-tile" key={c.name}>
              <div className="trophy-emojis">{'🏆'.repeat(c.trophies)}</div>
              <div className="trophy-name">{c.name}</div>
              <div className="trophy-years">{c.seasons.join(' · ')}</div>
            </div>
          ))}
        </div>
      </section>

      <Link
        className="records-link"
        href={season ? `/records?season=${season}` : '/records'}
      >
        <span className="records-link-text">View the All-Time Records Here</span>
        <span className="records-link-arrow" aria-hidden="true">
          →
        </span>
      </Link>

      <section className="card">
        <h2 className="card-title">All-time standings</h2>
        <p className="card-note">
          Combined regular-season records across every season. Click a column to sort.
        </p>
        <LifetimeStandingsTable rows={rows} />
      </section>

      {seasonPoints.length > 0 && (
        <section className="card">
          <h2 className="card-title">Actual vs best-possible points by season</h2>
          <p className="card-note">
            League-wide regular-season totals — what everyone scored against what the best-possible
            lineups would have scored.
          </p>
          <SeasonPointsChart data={seasonPoints} />
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Head to head</h2>
        <p className="card-note">
          Pick a manager to see their all-time record against each opponent — expand a row for
          every meeting in order.
        </p>
        <HeadToHead data={h2h} />
      </section>

      {(mostTrades || bestTrader) && (
        <section>
          <h2 className="card-title">All-time trades</h2>
          <p className="card-note">
            Every completed trade across every season. Points gained is what a manager&rsquo;s
            acquisitions went on to average per week, less what the players they gave up went on
            to average.
          </p>
          <div className="feature-tiles">
            {mostTrades && (
              <div className="feature-tile">
                <div className="feature-tile-label">🔁 Trade Happy</div>
                <div className="feature-tile-name">{mostTrades.team.displayName}</div>
                <div className="feature-tile-value">
                  {mostTrades.trades} trade{mostTrades.trades === 1 ? '' : 's'}
                </div>
              </div>
            )}
            {bestTrader && (
              <div className="feature-tile">
                <div className="feature-tile-label">📈 Best Trader</div>
                <div className="feature-tile-name">{bestTrader.team.displayName}</div>
                <div className="feature-tile-value">
                  {bestTrader.pointsGained > 0 ? '+' : ''}
                  {bestTrader.pointsGained.toFixed(1)} points gained
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {draftRanks.length > 0 && (
        <section className="card">
          <h2 className="card-title">All-time draft rankings</h2>
          <p className="card-note">
            Every season&rsquo;s draft score added together — total points above positional
            replacement. The pick columns show each manager&rsquo;s single worst early pick and
            best pick across all their drafts.
          </p>
          <DraftRankingsTable rows={draftRanks} showSeason showDrafts />
        </section>
      )}

      <section>
        <h2 className="card-title">Best seasons by position, all-time</h2>
        <p className="card-note">
          Highest-scoring individual seasons at each position across all league years — every NFL
          player counts, rostered or not.
        </p>
        <div className="pos-grid">
          {POSITION_ORDER.filter((pos) => leaders.has(pos)).map((pos) => (
            <div className="pos-card" key={pos}>
              <h3>{pos}</h3>
              <ol>
                {leaders.get(pos)!.map((l, i) => (
                  <li key={`${l.playerId}-${l.season}`}>
                    <span className="pos-rank">{i + 1}</span>
                    <span className="pos-name">
                      {l.name}{' '}
                      <span className="pos-team">
                        <NflTeam code={l.team} /> {l.season} · {l.manager ?? 'Free agent'}
                      </span>
                    </span>
                    <span className="pos-pts">{l.points.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
              <Link
                className="pos-more"
                href={`/rankings?pos=${pos}&year=all${season ? `&season=${season}` : ''}`}
              >
                View top 50 →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
