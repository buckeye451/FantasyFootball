import Link from 'next/link';
import type { BracketRound, BracketTeam } from '@/lib/stats';

function TeamLine({
  t,
  season,
  winner,
}: {
  t: BracketTeam;
  season: string;
  winner: boolean;
}) {
  return (
    <div className={`bracket-team${winner ? ' winner' : ''}${t.team ? '' : ' tbd'}`}>
      <span className="bracket-team-name">
        {t.team ? (
          <Link href={`/team/${t.team.slug}?season=${season}`}>{t.team.displayName}</Link>
        ) : (
          t.label
        )}
      </span>
      <span className="bracket-team-score">{t.score != null ? t.score.toFixed(2) : '—'}</span>
    </div>
  );
}

/** Bracket laid out as columns (one per round), each a stack of matchups. */
export function BracketView({ rounds, season }: { rounds: BracketRound[]; season: string }) {
  if (rounds.length === 0) {
    return <p className="card-note">The playoff bracket isn&apos;t available yet.</p>;
  }
  return (
    <div className="bracket-wrap">
      <div className="bracket">
        {rounds.map((rd) => (
          <div className="bracket-col" key={rd.round}>
            <div className="bracket-col-head">
              {rd.name}
              {rd.week != null && <span className="sub"> · Week {rd.week}</span>}
            </div>
            {rd.matches.map((m) => {
              const [a, b] = m.teams;
              const decided = m.winnerRosterId != null;
              return (
                <div className="bracket-match" key={m.matchId}>
                  {m.placement != null && (
                    <div className="bracket-placement">
                      {m.placement === 1 ? 'Championship' : `Places ${m.placement}–${m.placement + 1}`}
                    </div>
                  )}
                  <TeamLine t={a} season={season} winner={decided && m.winnerRosterId === a.rosterId} />
                  <TeamLine t={b} season={season} winner={decided && m.winnerRosterId === b.rosterId} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
