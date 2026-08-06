import {
  draftBoard,
  getSeasons,
  lifetimeDraftRankings,
  resolveActiveLeague,
} from '@/lib/stats';
import { DraftsView } from '@/components/DraftsView';

export const dynamic = 'force-dynamic';

export default function DraftsPage({ searchParams }: { searchParams: { season?: string } }) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) {
    return (
      <div className="empty-state">
        <h1>Drafts</h1>
        <p>No league data yet. Draft results appear here once a season has been synced.</p>
      </div>
    );
  }

  const board = draftBoard(league.leagueId);
  if (!board) {
    const otherWithGames = getSeasons().find((s) => s.hasGames);
    return (
      <div className="empty-state">
        <h1>{league.name} · {league.season} draft</h1>
        <p>
          No draft has been recorded for the {league.season} season yet. It will appear here after
          the draft runs and the next sync stores it.
        </p>
        {otherWithGames && otherWithGames.season !== league.season && (
          <p className="page-subtitle">
            Use the <strong>Season</strong> menu above to view another season&rsquo;s draft.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <DraftsView board={board} allTime={lifetimeDraftRankings()} season={league.season} />
    </>
  );
}
