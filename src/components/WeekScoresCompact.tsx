'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { WeekScoreBoard } from '@/lib/stats';
import { useIsMobile } from '@/components/useIsMobile';
import { SortedScores } from '@/components/SortedScores';

/** Matchup cards shown before the "see all" link kicks in on a phone. */
const PHONE_CARDS = 4;

/**
 * Compact week scores: one card per matchup with the week's storylines flagged,
 * then every score in a single sorted list so a high-scoring loss is visible
 * without opening a box score.
 */
export function WeekScoresCompact({
  board,
  week,
  season,
}: {
  board: WeekScoreBoard;
  week: number;
  season: string;
}) {
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);
  const q = `?season=${season}`;

  // Desktop keeps score order. When a phone truncates the list, the flagged
  // cards move to the front — they're the reason this view exists, so they
  // can't be the ones that fall off the end.
  const truncating = isMobile && !showAll && board.cards.length > PHONE_CARDS;
  const ordered = truncating
    ? [
        ...board.cards.filter((c) => c.isHigh || c.isClosest),
        ...board.cards.filter((c) => !c.isHigh && !c.isClosest),
      ]
    : board.cards;
  const cards = truncating ? ordered.slice(0, PHONE_CARDS) : ordered;
  const hidden = board.cards.length - cards.length;

  return (
    <>
      <div className="score-cards">
        {cards.map((c) => {
          const kicker = c.isHigh ? 'High score' : c.isClosest ? 'Closest' : 'Final';
          const tone = c.isHigh ? 'high' : c.isClosest ? 'close' : 'final';
          const href = `/week/${week}${q}${c.matchupId != null ? `&box=${c.matchupId}#matchup-${c.matchupId}` : ''}`;
          return (
            <Link
              key={`${c.winner.team.rosterId}-${c.loser.team.rosterId}`}
              className={`score-card tone-${tone}`}
              href={href}
              prefetch={false}
            >
              <span className="kicker score-card-kicker">{kicker}</span>
              <span className="score-row win">
                <span className="score-team">{c.winner.team.displayName}</span>
                <span className="figure score-value">{c.winner.score.toFixed(1)}</span>
              </span>
              <span className="score-row lose">
                <span className="score-team">
                  {c.loser.team.displayName}
                  {/* Lost, but their best-possible lineup would have won it. */}
                  {c.loser.bestLineupWins === 'yes' && (
                    <span
                      className="score-blw"
                      title="Would have won with their best-possible lineup"
                    >
                      *
                    </span>
                  )}
                </span>
                <span className="figure score-value">{c.loser.score.toFixed(1)}</span>
              </span>
              <span className="score-margin">by {c.margin.toFixed(1)}</span>
            </Link>
          );
        })}
      </div>

      {hidden > 0 && (
        <button type="button" className="score-more" onClick={() => setShowAll(true)}>
          See all {board.cards.length} matchups →
        </button>
      )}

      {/* A bare asterisk means nothing on a phone, where there's no hover. */}
      {cards.some((c) => c.loser.bestLineupWins === 'yes') && (
        <p className="score-legend">
          <span className="score-blw">*</span> would have won with their best-possible lineup
        </p>
      )}

      <SortedScores rows={board.sorted} season={season} />
    </>
  );
}
