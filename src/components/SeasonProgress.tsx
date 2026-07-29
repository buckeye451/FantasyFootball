import type { SeasonProgress as Progress } from '@/lib/stats';

/**
 * How far through the season we are, as a dash per week — the regular season
 * followed by the postseason rounds, which are tinted differently so it's
 * clear where the playoffs start.
 */
export function SeasonProgressTile({ progress, season }: { progress: Progress; season: string }) {
  const { segments, completed, total, pct } = progress;
  return (
    <div className="progress-tile">
      <div className="progress-head">
        <span className="progress-label">{season} season progress</span>
        <span className="progress-count">
          {completed} of {total} weeks
        </span>
      </div>
      <div className="progress-row">
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
          aria-label={`${completed} of ${total} weeks complete`}
        >
          {segments.map((s, i) => (
            <span
              key={i}
              className={`progress-dash${s.done ? ' done' : ''}${s.postseason ? ' post' : ''}`}
              title={s.label}
            />
          ))}
        </div>
        <span className="progress-pct">{pct.toFixed(1)}% Completed</span>
      </div>
    </div>
  );
}
