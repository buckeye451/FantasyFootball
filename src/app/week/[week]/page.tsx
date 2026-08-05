import { notFound } from 'next/navigation';
import {
  matchupBoxScore,
  regularSeasonWeeks,
  resolveActiveLeague,
  weekBreakdown,
  weekScoreBoard,
} from '@/lib/stats';
import type { BoxScore } from '@/lib/stats';
import { matchupKey } from '@/components/MatchupBreakdown';
import { WeekScoreboard } from '@/components/WeekScoreboard';
import { WeekRail } from '@/components/WeekRail';
import { ScrollToHash } from '@/components/ScrollToHash';

export const dynamic = 'force-dynamic';

export default function WeekPage({
  params,
  searchParams,
}: {
  params: { week: string };
  searchParams: { season?: string; box?: string };
}) {
  const league = resolveActiveLeague(searchParams.season);
  if (!league) notFound();

  const week = Number(params.week);
  const weeks = regularSeasonWeeks(league.leagueId);
  if (!weeks.includes(week)) notFound();

  const breakdowns = weekBreakdown(league.leagueId, week);
  const board = weekScoreBoard(league.leagueId, week);

  // Keyed rather than parallel, because the scoreboard orders matchups by score
  // while weekBreakdown returns them in roster order.
  const boxScores = new Map<string, BoxScore | null>(
    breakdowns.map((b, i) => [
      matchupKey(b, i),
      matchupBoxScore(
        league.leagueId,
        week,
        b.teams.map((t) => t.team.rosterId)
      ),
    ])
  );

  const latestWeek = weeks[weeks.length - 1];
  const totalRegularWeeks =
    league.playoffWeekStart != null ? league.playoffWeekStart - 1 : latestWeek;
  const railWeeks = Array.from(
    { length: Math.max(totalRegularWeeks, latestWeek) },
    (_, i) => i + 1
  );

  return (
    <>
      <ScrollToHash />

      <div className="week-head">
        <div className="week-head-id">
          <div className="kicker">
            {league.name} · {league.season}
          </div>
          <h1 className="week-title">Week {week}</h1>
        </div>
        <div className="week-head-avg">
          <div className="kicker">League avg</div>
          <div className="week-avg-value">{board.leagueAvg.toFixed(2)}</div>
        </div>
      </div>

      <WeekRail
        weeks={railWeeks}
        selected={week}
        playedThrough={latestWeek}
        season={league.season}
        linkTo="week"
      />

      <div className="week-tiles">
        <WeekTile label="High" value={board.high ? board.high.score.toFixed(2) : '—'} sub={board.high?.team.displayName ?? ''} />
        <WeekTile
          label="Closest"
          value={board.closest ? `+${board.closest.margin.toFixed(2)}` : '—'}
          sub={board.closest?.pair ?? ''}
        />
        <WeekTile
          label="Blowout"
          value={board.blowout ? `+${board.blowout.margin.toFixed(2)}` : '—'}
          sub={board.blowout?.pair ?? ''}
        />
      </div>

      <WeekScoreboard
        board={board}
        season={league.season}
        boxScores={boxScores}
        openBox={searchParams.box}
      />
    </>
  );
}

function WeekTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="week-tile">
      <div className="kicker">{label}</div>
      <div className="week-tile-value">{value}</div>
      <div className="week-tile-sub">{sub}</div>
    </div>
  );
}
