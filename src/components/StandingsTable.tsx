'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Standing } from '@/lib/types';

function Movement({ delta }: { delta: number }) {
  if (delta > 0) return <span className="up">▲ {delta}</span>;
  if (delta < 0) return <span className="down">▼ {Math.abs(delta)}</span>;
  return <span className="flat">–</span>;
}

type SortKey = 'rank' | 'team' | 'record' | 'mgr' | 'pf' | 'pa' | 'diff' | 'avg' | 'high' | 'low';

const ACCESSORS: Record<SortKey, (s: Standing) => number | string> = {
  rank: (s) => s.rank,
  team: (s) => s.team.displayName.toLowerCase(),
  // sort by wins, breaking ties on points-for
  record: (s) => s.wins * 1e6 + s.pointsFor,
  mgr: (s) => s.managerPerformance,
  pf: (s) => s.pointsFor,
  pa: (s) => s.pointsAgainst,
  diff: (s) => s.pointsFor - s.pointsAgainst,
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

  const th = (key: SortKey, label: string, opts?: { num?: boolean; title?: string }) => (
    <th
      className={`sortable${opts?.num ? ' num' : ''}${sortKey === key ? ' sorted' : ''}`}
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
            <th className="champ-col" title="Season champion"></th>
            {th('rank', 'Rank', { num: true })}
            <th></th>
            {th('team', 'Team')}
            {th('record', 'Record')}
            {th('mgr', 'Mgr %', {
              num: true,
              title: 'Manager performance: points scored ÷ best-possible lineup',
            })}
            {th('pf', 'PF', { num: true })}
            {th('pa', 'PA', { num: true })}
            {th('diff', '+/−', { num: true })}
            {th('avg', 'Avg', { num: true })}
            {th('high', 'High', { num: true })}
            {th('low', 'Low', { num: true })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const diff = Math.round((s.pointsFor - s.pointsAgainst) * 100) / 100;
            const isChamp = champKey != null && s.team.displayName.toLowerCase() === champKey;
            return (
              <tr key={s.team.rosterId} className={isChamp ? 'champ-row' : undefined}>
                <td className="champ-col">{isChamp ? '🏆' : ''}</td>
                <td className="num">{s.rank}</td>
                <td>
                  <Movement delta={s.movement} />
                </td>
                <td className="team-cell">
                  <Link href={`/team/${s.team.slug}${q}`}>{s.team.displayName}</Link>
                </td>
                <td>
                  {s.wins}-{s.losses}
                  {s.ties ? `-${s.ties}` : ''}
                </td>
                <td className="num">{s.managerPerformance.toFixed(1)}%</td>
                <td className="num">{s.pointsFor.toFixed(1)}</td>
                <td className="num">{s.pointsAgainst.toFixed(1)}</td>
                <td className="num">
                  <span className={diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'}>
                    {diff > 0 ? '+' : ''}
                    {diff.toFixed(1)}
                  </span>
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
