'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Standing } from '@/lib/types';
import type { SeedBoard } from '@/lib/stats';
import { managerClass, performanceClass } from '@/lib/thresholds';
import { useStickyColumns } from '@/components/useStickyColumns';
import { useCompactFull } from '@/components/SegTabs';
import { StandingsCompact } from '@/components/StandingsCompact';

/** Teams that make the playoffs — the red line sits under this place. */
const PLAYOFF_SPOTS = 6;

/**
 * Leading cells pinned while the table scrolls sideways.
 *
 * Full mode pins rank, the movement arrow and the team: the arrow rides along
 * because it sits between the two the reader actually needs, and columns can
 * only be frozen contiguously from the left edge. Compact folds the arrow into
 * the team cell, so it only has two to pin — and at five columns it doesn't
 * scroll on a phone anyway.
 */
const STICKY_FULL = 3;
const STICKY_COMPACT = 2;

function Movement({ delta }: { delta: number }) {
  if (delta > 0) return <span className="up">▲ {delta}</span>;
  if (delta < 0) return <span className="down">▼ {Math.abs(delta)}</span>;
  return <span className="flat">–</span>;
}

type SortKey =
  | 'rank'
  | 'team'
  | 'record'
  | 'mgr'
  | 'pf'
  | 'pa'
  | 'diff'
  | 'perf'
  | 'opp'
  | 'avg'
  | 'high'
  | 'low';

const ACCESSORS: Record<SortKey, (s: Standing) => number | string> = {
  rank: (s) => s.rank,
  team: (s) => s.team.displayName.toLowerCase(),
  // sort by wins, breaking ties on points-for
  record: (s) => s.wins * 1e6 + s.pointsFor,
  mgr: (s) => s.managerPerformance,
  pf: (s) => s.pointsFor,
  pa: (s) => s.pointsAgainst,
  diff: (s) => s.pointsFor - s.pointsAgainst,
  perf: (s) => s.performance ?? -1,
  opp: (s) => s.opponentPerformance ?? -1,
  avg: (s) => s.avgPoints,
  high: (s) => s.highScore,
  low: (s) => s.lowScore,
};

// Direction a column jumps to the first time it's clicked.
const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = {
  rank: 'asc',
  team: 'asc',
  record: 'desc',
  mgr: 'desc',
  pf: 'desc',
  pa: 'desc',
  diff: 'desc',
  perf: 'desc',
  opp: 'desc',
  avg: 'desc',
  high: 'desc',
  low: 'desc',
};

export function StandingsTable({
  standings,
  season,
  champion,
  throughWeek,
  board,
}: {
  standings: Standing[];
  season?: string;
  champion?: string | null;
  /** Latest week reflected in these figures, shown in the section note. */
  throughWeek?: number;
  /** Seeded playoff picture — Compact renders this instead of a table. */
  board?: SeedBoard;
}) {
  const q = season ? `?season=${season}` : '';
  const champKey = champion?.toLowerCase() ?? null;
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const { mode, control } = useCompactFull('standings', 'Full · 13 columns');
  const compact = mode === 'compact';
  const stickyCount = compact ? STICKY_COMPACT : STICKY_FULL;
  const tableRef = useStickyColumns(stickyCount);

  const clickSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir(DEFAULT_DIR[key]);
    }
  };

  const sorted = [...standings].sort((a, b) => {
    const av = ACCESSORS[sortKey](a);
    const bv = ACCESSORS[sortKey](b);
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return dir === 'asc' ? cmp : -cmp;
  });

  const stick = (i: number) =>
    `sticky-col sticky-col-${i}${i === stickyCount - 1 ? ' sticky-col-last' : ''}`;

  const th = (key: SortKey, label: string, opts?: { num?: boolean; title?: string; stickyAt?: number }) => (
    <th
      className={`sortable${opts?.num ? ' num' : ''}${sortKey === key ? ' sorted' : ''}${
        opts?.stickyAt != null ? ` ${stick(opts.stickyAt)}` : ''
      }`}
      onClick={() => clickSort(key)}
      title={opts?.title}
      aria-sort={sortKey === key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      <span className="sort-caret">{sortKey === key ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
    </th>
  );

  const head = (
    <div className="section-head">
      {control}
      <p className="section-note">
        {compact && board
          ? board.gamesRemaining > 0
            ? `${board.gamesRemaining} week${board.gamesRemaining === 1 ? '' : 's'} left · top ${board.playoffSpots} make the playoffs`
            : `Final · top ${board.playoffSpots} made the playoffs`
          : `${throughWeek != null ? `Through week ${throughWeek} · ` : ''}click a column to sort · arrows show movement since the prior week`}
      </p>
    </div>
  );

  // Compact drops the table entirely for the seed board — the question it
  // answers is "am I in?", which a narrow table answers badly.
  if (compact && board) {
    return (
      <>
        {head}
        <StandingsCompact board={board} season={season} champion={champion} />
      </>
    );
  }

  return (
    <>
      {head}
      <div className="table-wrap">
        <table className="sticky-table" ref={tableRef}>
          <thead>
            <tr>
              {th('rank', 'Rank', { num: true, stickyAt: 0 })}
              {!compact && <th className={stick(1)}></th>}
              {th('team', 'Team', { stickyAt: compact ? 1 : 2 })}
              {th('record', 'Record')}
              {compact && th('pf', 'PF', { num: true })}
              {th('mgr', 'Mgr %', {
                num: true,
                title: 'Manager performance: points scored ÷ best-possible lineup',
              })}
              {!compact && (
                <>
                  {th('pf', 'PF', { num: true })}
                  {th('pa', 'PA', { num: true })}
                  {th('diff', '+/−', { num: true })}
                  {th('perf', 'Perf %', {
                    num: true,
                    title: 'Performance: points scored ÷ points projected',
                  })}
                  {th('opp', 'Opp. %', {
                    num: true,
                    title:
                      "Opponent performance: points scored against you ÷ your opponents' projected points",
                  })}
                  {th('avg', 'Avg', { num: true })}
                  {th('high', 'High', { num: true })}
                  {th('low', 'Low', { num: true })}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const diff = Math.round((s.pointsFor - s.pointsAgainst) * 100) / 100;
              const isChamp = champKey != null && s.team.displayName.toLowerCase() === champKey;
              // Playoff cutoff: red rule under 6th place. Tied to the rank, not
              // the row position, so it still marks the right team when the
              // table is sorted by another column.
              const cls = [isChamp ? 'champ-row' : '', s.rank === PLAYOFF_SPOTS ? 'playoff-cut' : '']
                .filter(Boolean)
                .join(' ');
              const trophy = isChamp && (
                <span className="champ-trophy" title={`${season ?? ''} champion`.trim()}>
                  🏆
                </span>
              );
              return (
                <tr key={s.team.rosterId} className={cls || undefined}>
                  <td className={`num ${stick(0)}`}>{s.rank}</td>
                  {!compact && (
                    <td className={stick(1)}>
                      <Movement delta={s.movement} />
                    </td>
                  )}
                  <td className={`team-cell ${stick(compact ? 1 : 2)}`}>
                    {/* Compact has no column of its own for the arrow, so it
                        rides inside the team cell rather than being dropped. */}
                    {compact && (
                      <span className="standings-move">
                        <Movement delta={s.movement} />
                      </span>
                    )}
                    <Link href={`/team/${s.team.slug}${q}`}>{s.team.displayName}</Link>
                    {trophy}
                  </td>
                  <td>
                    {s.wins}-{s.losses}
                    {s.ties ? `-${s.ties}` : ''}
                  </td>
                  {compact && <td className="num">{s.pointsFor.toFixed(1)}</td>}
                  <td className="num">
                    <span className={managerClass(s.managerPerformance)}>
                      {s.managerPerformance.toFixed(1)}%
                    </span>
                  </td>
                  {!compact && (
                    <>
                      <td className="num">{s.pointsFor.toFixed(1)}</td>
                      <td className="num">{s.pointsAgainst.toFixed(1)}</td>
                      <td className="num">
                        <span className={diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'}>
                          {diff > 0 ? '+' : ''}
                          {diff.toFixed(1)}
                        </span>
                      </td>
                      <td className="num">
                        {s.performance == null ? (
                          '—'
                        ) : (
                          <span className={performanceClass(s.performance)}>
                            {s.performance.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="num">
                        {s.opponentPerformance == null ? (
                          '—'
                        ) : (
                          <span className={performanceClass(s.opponentPerformance)}>
                            {s.opponentPerformance.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="num">{s.avgPoints.toFixed(1)}</td>
                      <td className="num">{s.highScore.toFixed(1)}</td>
                      <td className="num">{s.lowScore.toFixed(1)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
