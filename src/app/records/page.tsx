import { getSeasons, recordBook } from '@/lib/stats';
import { RecordBook } from '@/components/RecordBook';

export const dynamic = 'force-dynamic';

export default function RecordsPage() {
  const groups = recordBook();
  const played = getSeasons().filter((s) => s.hasGames);

  if (groups.length === 0) {
    return (
      <div className="empty-state">
        <h1>The Record Book</h1>
        <p>Records appear here once at least one season has been played.</p>
      </div>
    );
  }

  const years = played.map((s) => s.season).sort();

  return (
    <div className="record-page">
      <h1 className="page-title">The Record Book</h1>
      <p className="page-subtitle">
        All-time single records across the league&rsquo;s regular-season history
        {years.length > 0 ? ` (${years[0]}–${years[years.length - 1]})` : ''}. Playoff weeks are
        excluded, so a three-week run can&rsquo;t sit alongside a full season.
      </p>
      <RecordBook groups={groups} />
    </div>
  );
}
