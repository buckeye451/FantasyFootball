'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LifetimeRow } from '@/lib/stats';
import { managerClass, winRateClass } from '@/lib/thresholds';

type SortKey =
  | 'manager'
  | 'trophies'
  | 'seasons'
  | 'record'
  | 'winPct'
  | 'mgr'
  | 'pf'
  | 'pa'
  | 'avg'
  | 'high'
  | 'best';

const ACCESSORS: Record<SortKey, (r: LifetimeRow) => number | string> = {
  manager: (r) => r.displayName.toLowerCase(),
  trophies: (r) => r.trophies,
  seasons: (r) => r.seasons,
  record: (r) => r.wins * 1e6 + r.pointsFor,
  winPct: (r) => r.winPct,
  mgr: (r) => r.managerPerformance,
  pf: (r) => r.pointsFor,
  pa: (r) => r.pointsAgainst,
  avg: (r) => r.avgPoints,
  high: (r) => r.highScore,
  best: (r) => r.bestFinish ?? 999,
};

const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = {
  manager: 'asc',
  trophies: 'desc',
  seasons: 'desc',
  record: 'desc',
  winPct: 'desc',
  mgr: 'desc',
  pf: 'desc',
  pa: 'desc',
  avg: 'desc',
  high: 'desc',
  best: 'asc', // #1 is best
};

export function LifetimeStandingsTable({ rows }: { rows: LifetimeRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const clickSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir(DEFAULT_DIR[key]);
    }
  };

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = ACCESSORS[sortKey](a);
        const bv = ACCESSORS[sortKey](b);
        const cmp =
          typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return dir === 'asc' ? cmp : -cmp;
      })
    : rows; // default: the incoming order (trophies, then win %)

  const th = (key: SortKey, label: string, opts?: { num?: boolean; center?: boolean; title?: string }) => (
    <th
      className={`sortable${opts?.num ? ' num' : ''}${opts?.center ? ' center' : ''}${
        sortKey === key ? ' sorted' : ''
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
      <table>
        <thead>
          <tr>
            {th('manager', 'Manager')}
            {th('trophies', '🏆', { center: true })}
            {th('seasons', 'Seasons', { num: true })}
            {th('record', 'Record')}
            {th('winPct', 'Win %', { num: true })}
            {th('mgr', 'Mgr %', {
              num: true,
              title: 'Career manager performance: points scored ÷ best-possible lineup',
            })}
            {th('pf', 'PF', { num: true })}
            {th('pa', 'PA', { num: true })}
            {th('avg', 'Avg', { num: true })}
            {th('high', 'High', { num: true })}
            {th('best', 'Best', { num: true, title: 'Best regular-season finish' })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.slug + r.displayName}>
              <td className="team-cell">
                <Link href={`/team/${r.slug}`}>{r.displayName}</Link>
              </td>
              <td className="center">{r.trophies > 0 ? '🏆'.repeat(r.trophies) : ''}</td>
              <td className="num">{r.seasons}</td>
              <td>
                {r.wins}-{r.losses}
                {r.ties ? `-${r.ties}` : ''}
              </td>
              <td className="num">
                <span className={winRateClass(r.winPct)}>{r.winPct.toFixed(1)}%</span>
              </td>
              <td className="num">
                <span className={managerClass(r.managerPerformance)}>
                  {r.managerPerformance.toFixed(1)}%
                </span>
              </td>
              <td className="num">{r.pointsFor.toFixed(1)}</td>
              <td className="num">{r.pointsAgainst.toFixed(1)}</td>
              <td className="num">{r.avgPoints.toFixed(1)}</td>
              <td className="num">{r.highScore.toFixed(1)}</td>
              <td className="num">{r.bestFinish != null ? `#${r.bestFinish}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
