import { getSeasons, positionRankings, rankablePositions } from '@/lib/stats';
import { POSITION_ORDER } from '@/components/PlayerCards';
import { PlayerHeadshot } from '@/components/PlayerHeadshot';
import { RankingFilters } from '@/components/RankingFilters';
import { NflTeam } from '@/components/NflTeam';

export const dynamic = 'force-dynamic';

const TOP_N = 50;

export default function RankingsPage({
  searchParams,
}: {
  searchParams: { season?: string; pos?: string; year?: string };
}) {
  const available = rankablePositions();
  // Known positions first, in the order the rest of the app uses them, then
  // anything unexpected the stats feed threw in.
  const positions = [
    ...POSITION_ORDER.filter((p) => available.includes(p)),
    ...available.filter((p) => !POSITION_ORDER.includes(p)).sort(),
  ];
  const years = getSeasons()
    .filter((s) => s.hasGames)
    .map((s) => s.season)
    .sort()
    .reverse();

  if (positions.length === 0) {
    return (
      <div className="empty-state">
        <h1>Best player rankings</h1>
        <p>Rankings appear here once season stats have been synced.</p>
      </div>
    );
  }

  const position = positions.includes(searchParams.pos ?? '') ? searchParams.pos! : positions[0];
  const yearParam = searchParams.year === 'all' ? 'all' : searchParams.year ?? 'all';
  const year = years.includes(yearParam) ? yearParam : 'all';
  const rows = positionRankings(position, year === 'all' ? null : year, TOP_N);

  return (
    <>
      <h1 className="page-title">Best player rankings</h1>
      <p className="page-subtitle">
        The top {TOP_N} scoring seasons at each position, in this league&rsquo;s scoring format.
        Every NFL player counts, rostered or not — all-time lists one row per season, so a player
        can appear more than once.
      </p>

      <section className="card">
        <RankingFilters positions={positions} years={years} position={position} year={year} />

        {rows.length === 0 ? (
          <p className="card-note">
            No {position} scoring on record for {year === 'all' ? 'any season' : year}.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="draft-table rank-table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Player</th>
                  <th>Manager</th>
                  <th className="num">Year</th>
                  <th className="num">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.playerId}-${r.season}`}>
                    <td className="num">{i + 1}</td>
                    <td>
                      <span className="rank-player">
                        <PlayerHeadshot
                          key={`${r.playerId}-${r.season}`}
                          player={{
                            playerId: r.playerId,
                            name: r.name,
                            position: r.position,
                            team: r.team,
                            espnId: r.espnId,
                          }}
                          size={34}
                        />
                        <span className="rank-ident">
                          <span className="rank-name">{r.name}</span>
                          <NflTeam code={r.team} />
                        </span>
                      </span>
                    </td>
                    <td className="rank-manager">{r.manager ?? 'Free agent'}</td>
                    <td className="num">{r.season}</td>
                    <td className="num">{r.points.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
