'use client';

import type { MatchupBreakdown, WeekScoreBoard } from '@/lib/stats';
import { useCompactFull } from '@/components/SegTabs';
import { MatchupBreakdownList } from '@/components/MatchupBreakdown';
import { WeekScoresCompact } from '@/components/WeekScoresCompact';

/**
 * The dashboard's week-scores section and its own Compact/Full control.
 *
 * The toggle lives here rather than being shared with the standings above so
 * each section can be read the way its reader wants — someone who always wants
 * every scoring column doesn't have to take a 13-column standings table with it.
 */
export function WeekScoresSection({
  week,
  season,
  breakdowns,
  board,
}: {
  week: number;
  season: string;
  breakdowns: MatchupBreakdown[];
  board: WeekScoreBoard;
}) {
  const { mode, control } = useCompactFull('week-scores', 'Full · 5 columns');
  const compact = mode === 'compact';

  return (
    <section>
      <div className="section-head">
        <h2 className="card-title">Week {week} scores</h2>
        {control}
        <p className="section-note">
          {compact
            ? "Every matchup, plus the week's scores in one sorted list."
            : 'ROL % = share of the rest of the league this score beats · Perf % = score ÷ projected · Manager % = score ÷ best-possible lineup · BLW? = would the optimal lineup have won.'}
        </p>
      </div>

      {compact ? (
        <WeekScoresCompact board={board} week={week} season={season} />
      ) : (
        <MatchupBreakdownList
          breakdowns={breakdowns}
          season={season}
          compact
          boxLinkWeek={week}
        />
      )}
    </section>
  );
}
