'use client';

import { Fragment, useState } from 'react';
import type { H2HOpponent, ManagerH2H } from '@/lib/stats';

function pct(n: number | null): string {
  return n == null ? '—' : `${n.toFixed(1)}%`;
}

type SortKey = 'opponent' | 'record' | 'pf' | 'pa' | 'mgr' | 'perf' | 'games';

const ACCESSORS: Record<SortKey, (o: H2HOpponent) => number | string> = {
  opponent: (o) => o.displayName.toLowerCase(),
  record: (o) => o.wins * 1e6 + o.pointsFor,
  pf: (o) => o.pointsFor,
  pa: (o) => o.pointsAgainst,
  mgr: (o) => o.managerPct ?? -1,
  perf: (o) => o.performancePct ?? -1,
  games: (o) => o.matches.length,
};

const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = {
  opponent: 'asc',
  record: 'desc',
  pf: 'desc',
  pa: 'desc',
  mgr: 'desc',
  perf: 'desc',
  games: 'desc',
};

export function HeadToHead({ data }: { data: ManagerH2H[] }) {
  const [managerKey, setManagerKey] = useState(data[0]?.key ?? '');
  const [openOpp, setOpenOpp] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const active = data.find((m) => m.key === managerKey) ?? data[0];
  if (!active) return <p className="card-note">Not enough matchups yet.</p>;

  const clickSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDir(DEFAULT_DIR[key]);
    }
  };

  const opponents = sortKey
    ? [...active.opponents].sort((a, b) => {
        const av = ACCESSORS[sortKey](a);
        const bv = ACCESSORS[sortKey](b);
        const cmp =
          typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
        return dir === 'asc' ? cmp : -cmp;
      })
    : active.opponents;

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
    <>
      <div className="h2h-controls">
        <label className="week-select">
          <span className="week-select-label">Manager</span>
          <select
            value={active.key}
            onChange={(e) => {
              setManagerKey(e.target.value);
              setOpenOpp(null);
            }}
            aria-label="Select manager"
          >
            {data.map((m) => (
              <option key={m.key} value={m.key}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {th('opponent', 'vs Opponent')}
              {th('record', 'Record')}
              {th('pf', 'PF', { num: true })}
              {th('pa', 'PA', { num: true })}
              {th('mgr', 'Mgr %', { num: true, title: 'Manager performance: points ÷ best-possible lineup' })}
              {th('perf', 'Perf %', { num: true, title: 'Performance: points ÷ projected' })}
              {th('games', 'Games', { center: true })}
            </tr>
          </thead>
          <tbody>
            {opponents.map((o) => {
              const open = openOpp === o.key;
              return (
                <Fragment key={o.key}>
                  <tr
                    className={`h2h-row${open ? ' open' : ''}`}
                    onClick={() => setOpenOpp(open ? null : o.key)}
                  >
                    <td className="team-cell">
                      <span className={`caret${open ? ' open' : ''}`}>▸</span> {o.displayName}
                    </td>
                    <td>
                      {o.wins}-{o.losses}
                      {o.ties ? `-${o.ties}` : ''}
                    </td>
                    <td className="num">{o.pointsFor.toFixed(1)}</td>
                    <td className="num">{o.pointsAgainst.toFixed(1)}</td>
                    <td className="num">{pct(o.managerPct)}</td>
                    <td className="num">{pct(o.performancePct)}</td>
                    <td className="center sub">{o.matches.length}</td>
                  </tr>
                  {open && (
                    <tr className="h2h-detail-row">
                      <td colSpan={7}>
                        <div className="h2h-detail">
                          <table>
                            <thead>
                              <tr>
                                <th>Season</th>
                                <th className="num">Week</th>
                                <th className="num">{active.displayName}</th>
                                <th className="num">{o.displayName}</th>
                                <th className="center">Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.matches.map((mt, i) => (
                                <tr key={`${mt.season}-${mt.week}-${i}`}>
                                  <td>{mt.season}</td>
                                  <td className="num">{mt.week}</td>
                                  <td className="num strong">{mt.myPoints.toFixed(2)}</td>
                                  <td className="num">{mt.oppPoints.toFixed(2)}</td>
                                  <td className="center">
                                    <span className={`badge ${mt.result.toLowerCase()}`}>{mt.result}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
