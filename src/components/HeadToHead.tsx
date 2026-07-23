'use client';

import { Fragment, useState } from 'react';
import type { ManagerH2H } from '@/lib/stats';

function pct(n: number | null): string {
  return n == null ? '—' : `${n.toFixed(1)}%`;
}

export function HeadToHead({ data }: { data: ManagerH2H[] }) {
  const [managerKey, setManagerKey] = useState(data[0]?.key ?? '');
  const [openOpp, setOpenOpp] = useState<string | null>(null);

  const active = data.find((m) => m.key === managerKey) ?? data[0];
  if (!active) return <p className="card-note">Not enough matchups yet.</p>;

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
              <th>vs Opponent</th>
              <th>Record</th>
              <th className="num">PF</th>
              <th className="num">PA</th>
              <th className="num" title="Manager performance: points ÷ best-possible lineup">
                Mgr %
              </th>
              <th className="num" title="Performance: points ÷ projected">
                Perf %
              </th>
              <th className="center"></th>
            </tr>
          </thead>
          <tbody>
            {active.opponents.map((o) => {
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
                    <td className="center sub">{o.matches.length} {o.matches.length === 1 ? 'game' : 'games'}</td>
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
