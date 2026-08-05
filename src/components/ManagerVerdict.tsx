import type { CarriedBy, ManagerVerdict as Verdict } from '@/lib/stats';
import { PlayerHeadshot } from '@/components/PlayerHeadshot';

/** The page's one inverted surface: the claim, then the evidence for it. */
export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  return (
    <section className="verdict">
      <div className="kicker verdict-kicker">The verdict</div>
      <h2 className="verdict-headline">{verdict.headline}</h2>
      <p className="verdict-sub">{verdict.sub}</p>
      <div className="verdict-chips">
        {verdict.chips.map((c) => (
          <span key={c} className="verdict-chip">
            {c}
          </span>
        ))}
      </div>
    </section>
  );
}

/** Scoring / Management / Luck — a grade, the number behind it, one sentence. */
export function CaseCards({ verdict }: { verdict: Verdict }) {
  return (
    <section>
      <h2 className="card-title">The case, in three parts</h2>
      <p className="card-note">Each grade is one number, with the number that earned it.</p>
      <div className="case-grid">
        {verdict.cards.map((c) => (
          <div className="card case-card" key={c.key}>
            <div className="case-top">
              <span className="kicker">{c.label}</span>
              <span className={`case-grade tone-${c.tone}`}>{c.grade}</span>
            </div>
            <div className="case-figure">
              {c.figure} <span className="case-unit">{c.unit}</span>
            </div>
            <div className="case-bar">
              <span className={`case-bar-fill tone-${c.tone}`} style={{ width: `${c.fill}%` }} />
            </div>
            <p className="case-evidence">{c.evidence}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The season's shape as a sparkline of win/loss bars, one per week. */
export function SeasonStrip({ verdict, note }: { verdict: Verdict; note: string }) {
  return (
    <section className="card">
      <h2 className="card-title">How the season went</h2>
      <p className="card-note">{note}</p>
      <div
        className="season-strip"
        style={{ '--strip-cols': verdict.weeks.length } as React.CSSProperties}
      >
        {verdict.weeks.map((w) => (
          <div
            key={w.week}
            className="strip-col"
            title={`Wk ${w.week} · ${w.points.toFixed(1)}${
              w.opponentPoints != null ? ` vs ${w.opponentPoints.toFixed(1)}` : ''
            }${w.opponent ? ` (${w.opponent})` : ''}`}
          >
            <div className="strip-track">
              <div
                className={`strip-bar ${w.won ? 'won' : 'lost'}`}
                style={{ height: `${(w.height * 100).toFixed(1)}%` }}
              />
            </div>
            <div className="strip-score">{Math.round(w.points)}</div>
            <div className="kicker strip-week">W{w.week}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The players the season actually rode. */
export function CarriedByCard({ carried, name }: { carried: CarriedBy; name: string }) {
  if (carried.players.length === 0) return null;
  return (
    <section className="card">
      <h2 className="card-title">Who carried it</h2>
      <p className="card-note">
        {carried.players.length} players were {(carried.topShare * 100).toFixed(0)}% of every point{' '}
        {name} started.
      </p>
      <div className="carried-grid">
        {carried.players.map(({ usage: u }) => (
          <div className="carried-row" key={u.player.playerId}>
            <PlayerHeadshot player={u.player} size={46} />
            <div className="carried-body">
              <div className="carried-name">{u.player.name}</div>
              <div className="carried-meta">
                {u.player.position} · {u.weeksStarted} starts · high {u.bestWeek.toFixed(1)}
              </div>
              <div className="figure carried-points">{u.pointsWhileStarting.toFixed(1)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
