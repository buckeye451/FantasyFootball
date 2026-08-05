import Link from 'next/link';
import type { BoxScore, TeamWeekStat, WeekMatchupCard, WeekScoreBoard } from '@/lib/stats';
import { managerClass, performanceClass, winPctClass } from '@/lib/thresholds';
import { BoxScoreTable } from '@/components/BoxScore';

/**
 * The week's matchups as a scoreboard: each result readable at a glance, with
 * the advanced rates and the full box score folded away behind disclosures
 * rather than spread across a table wide enough to need sideways scrolling.
 */
export function WeekScoreboard({
  board,
  season,
  boxScores,
  openBox,
}: {
  board: WeekScoreBoard;
  season: string;
  /** Keyed by matchup id, so a card can find its own lineups. */
  boxScores: Map<string, BoxScore | null>;
  /** Matchup key to render already expanded, from `?box=` on the URL. */
  openBox?: string;
}) {
  return (
    <div className="scoreboard">
      {board.cards.map((c, i) => {
        const key = c.matchupId != null ? String(c.matchupId) : `solo-${i}`;
        return (
          <ScoreCard
            key={key}
            card={c}
            season={season}
            matchKey={key}
            box={boxScores.get(key) ?? null}
            openBox={openBox === key}
          />
        );
      })}
    </div>
  );
}

function ScoreCard({
  card,
  season,
  matchKey,
  box,
  openBox,
}: {
  card: WeekMatchupCard;
  season: string;
  matchKey: string;
  box: BoxScore | null;
  openBox: boolean;
}) {
  const q = `?season=${season}`;

  // The one-line story under each name. Only facts that are true of this
  // matchup appear, so a plain result stays plain.
  const winNote = [
    `Won by ${card.margin.toFixed(2)}`,
    card.isClosest ? 'closest game' : null,
    card.isBlowout ? 'biggest margin' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const loseNote = [
    'Lost',
    card.loser.bestLineupWins === 'yes' ? 'best lineup wins' : null,
    card.loserLowest ? 'lowest score of the week' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="card score-match" id={`matchup-${matchKey}`}>
      <div className="score-match-head">
        <SideRow team={card.winner} note={winNote} won q={q} highlight={card.isClosest || card.isBlowout} />
        <SideRow
          team={card.loser}
          note={loseNote}
          won={false}
          q={q}
          highlight={card.loser.bestLineupWins === 'yes'}
        />
      </div>

      <details className="score-fold">
        <summary>
          <span className="score-caret" aria-hidden="true">
            ›
          </span>
          Advanced
        </summary>
        <div className="score-fold-body">
          <div className="adv-grid">
            <span className="kicker">Team</span>
            <span className="kicker num">Win%</span>
            <span className="kicker num">Perf</span>
            <span className="kicker num">Mgr</span>
            <AdvRow team={card.winner} />
            <AdvRow team={card.loser} />
          </div>
          <p className="adv-note">
            {card.loser.bestLineupWins === 'yes' ? (
              <span className="adv-note-flag">
                {card.loser.team.displayName}&apos;s best possible lineup would have won this
                matchup.
              </span>
            ) : (
              "Neither manager's best possible lineup would have flipped this result."
            )}{' '}
            <span className="adv-note-key">
              Win% = share of the league this score beats · Perf = score ÷ projection · Mgr = score
              ÷ best lineup.
            </span>
          </p>
        </div>
      </details>

      <details className="score-fold" open={openBox || undefined}>
        <summary>
          <span className="score-caret" aria-hidden="true">
            ›
          </span>
          Box score
        </summary>
        <div className="score-fold-body">
          {box ? (
            <BoxScoreTable box={box} />
          ) : (
            <p className="card-note">No lineup data for this matchup.</p>
          )}
        </div>
      </details>
    </div>
  );
}

function SideRow({
  team,
  note,
  won,
  q,
  highlight,
}: {
  team: TeamWeekStat;
  note: string;
  won: boolean;
  q: string;
  highlight?: boolean;
}) {
  return (
    <div className={`score-side${won ? ' won' : ' lost'}`}>
      <span className="score-side-bar" aria-hidden="true" />
      <span className="score-side-body">
        <span className="score-side-name">
          <Link href={`/team/${team.team.slug}${q}`} prefetch={false}>
            {team.team.displayName}
          </Link>
          <span className={`badge ${won ? 'w' : 'l'}`}>{won ? 'W' : 'L'}</span>
        </span>
        <span className={`score-side-note${highlight ? ' flagged' : ''}`}>{note}</span>
      </span>
      <span className="figure score-side-score">{team.score.toFixed(2)}</span>
    </div>
  );
}

function AdvRow({ team }: { team: TeamWeekStat }) {
  return (
    <>
      <span className="adv-team">{team.team.displayName}</span>
      <span className="num">
        <span className={winPctClass(team.winPctVsLeague)}>
          {team.winPctVsLeague.toFixed(0)}%
        </span>
      </span>
      <span className="num">
        {team.performancePct == null ? (
          '—'
        ) : (
          <span className={performanceClass(team.performancePct)}>
            {team.performancePct.toFixed(1)}%
          </span>
        )}
      </span>
      <span className="num">
        <span className={managerClass(team.managerScorePct)}>
          {team.managerScorePct.toFixed(1)}%
        </span>
      </span>
    </>
  );
}
