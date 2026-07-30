'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Standing } from '@/lib/types';
import { managerClass, performanceClass } from '@/lib/thresholds';

/** Teams that make the playoffs — the red line sits under this place. */
const PLAYOFF_SPOTS = 6;

/**
 * Leading cells pinned while the table scrolls sideways: rank, the movement
 * arrow, and the team. The arrow rides along because it sits between the two
 * the reader actually needs — columns can only be frozen contiguously from the
 * left edge.
 */
const STICKY_COLS = 3;

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
}: {
  standings: Standing[];
  season?: string;
  champion?: string | null;
}) {
  const q = season ? `?season=${season}` : '';
  const champKey = champion?.toLowerCase() ?? null;
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const tableRef = useRef<HTMLTableElement>(null);

  // Each pinned column has to be offset by the real width of the ones before
  // it. Those widths depend on the rendered content, so they're measured
  // rather than guessed, and re-measured whenever the table resizes.
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const measure = () => {
      const header = table.querySelector('thead tr');
      if (!header) return;
      const cells = Array.from(header.children) as HTMLElement[];
      let offset = 0;
      for (let i = 0; i < STICKY_COLS; i++) {
        table.style.setProperty(`--sticky-${i}`, `${offset}px`);
        offset += cells[i]?.getBoundingClientRect().width ?? 0;
      }
    };
    // The seam on the last pinned column only earns its keep once something is
    // actually hidden behind it — on a wide screen the table doesn't scroll and
    // a divider there would imply a split that isn't real.
    const wrap = table.parentElement;
    const onScroll = () => {
      table.classList.toggle('is-pinned', (wrap?.scrollLeft ?? 0) > 0);
    };

    measure();
    onScroll();
    const observer = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    observer.observe(table);
    wrap?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      wrap?.removeEventListener('scroll', onScroll);
    };
  }, []);

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

  const stick = (i: number) => `sticky-col sticky-col-${i}`;

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

  return (
    <div className="table-wrap">
      <table className="standings-table" ref={tableRef}>
        <thead>
          <tr>
            {th('rank', 'Rank', { num: true, stickyAt: 0 })}
            <th className={stick(1)}></th>
            {th('team', 'Team', { stickyAt: 2 })}
            {th('record', 'Record')}
            {th('mgr', 'Mgr %', {
              num: true,
              title: 'Manager performance: points scored ÷ best-possible lineup',
            })}
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
            return (
              <tr key={s.team.rosterId} className={cls || undefined}>
                <td className={`num ${stick(0)}`}>{s.rank}</td>
                <td className={stick(1)}>
                  <Movement delta={s.movement} />
                </td>
                <td className={`team-cell ${stick(2)}`}>
                  <Link href={`/team/${s.team.slug}${q}`}>{s.team.displayName}</Link>
                  {isChamp && (
                    <span className="champ-trophy" title={`${season ?? ''} champion`.trim()}>
                      🏆
                    </span>
                  )}
                </td>
                <td>
                  {s.wins}-{s.losses}
                  {s.ties ? `-${s.ties}` : ''}
                </td>
                <td className="num">
                  <span className={managerClass(s.managerPerformance)}>
                    {s.managerPerformance.toFixed(1)}%
                  </span>
                </td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
