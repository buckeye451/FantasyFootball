'use client';

import { useMemo, useState } from 'react';
import type { DraftBoard, DraftPick, DraftRankRow } from '@/lib/stats';
import { SegTabs } from '@/components/SegTabs';
import { NflTeam } from '@/components/NflTeam';

type Scope = 'season' | 'all';
type Mode = 'compact' | 'full';

/** Positional rank as "RB8", or a dash when the player never scored. */
function posRank(position: string, n: number | null): string {
  return n == null ? '—' : `${position}${n}`;
}

function signed(v: number): string {
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
}

/**
 * The drafts page: the picks that decided it first, then who won the draft,
 * with every existing table still reachable behind a toggle or a row.
 */
export function DraftsView({
  board,
  allTime,
  season,
}: {
  board: DraftBoard;
  allTime: DraftRankRow[];
  season: string;
}) {
  const [scope, setScope] = useState<Scope>('season');
  const [mode, setMode] = useState<Mode>('compact');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [manager, setManager] = useState(board.managers[0]?.ownerId ?? '');

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // Only picks that actually produced a value can be called a steal or a bust.
  const graded = useMemo(
    () => board.picks.filter((p) => p.vsReplacement != null),
    [board.picks]
  );
  const steals = useMemo(
    () => [...graded].sort((a, b) => b.vsReplacement! - a.vsReplacement!).slice(0, 5),
    [graded]
  );
  const busts = useMemo(
    () => [...graded].sort((a, b) => a.vsReplacement! - b.vsReplacement!).slice(0, 5),
    [graded]
  );

  const rows = scope === 'all' ? allTime : board.rankings;
  const best = rows[0] ?? null;
  const worst = rows[rows.length - 1] ?? null;
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.score)));

  const managerPicks = useMemo(
    () =>
      board.picks
        .filter((p) => p.ownerId === manager)
        .sort((a, b) => a.pickNo - b.pickNo),
    [board.picks, manager]
  );

  // Round.pick, so a pick reads as its slot rather than a flat ordinal.
  const slotOf = (p: DraftPick) => {
    const perRound = board.managers.length || 1;
    const inRound = ((p.pickNo - 1) % perRound) + 1;
    return `${p.round}.${String(inRound).padStart(2, '0')}`;
  };

  return (
    <>
      <div className="drafts-head">
        <h1 className="page-title">Drafts</h1>
        <SegTabs
          options={[
            { value: 'season' as const, label: season },
            { value: 'all' as const, label: 'All-time' },
          ]}
          value={scope}
          onChange={setScope}
          ariaLabel="Draft scope"
        />
      </div>

      {scope === 'season' && steals.length > 0 && (
        <>
          <PickRail label="Steals" tone="up" picks={steals} slotOf={slotOf} />
          <PickRail label="Busts" tone="down" picks={busts} slotOf={slotOf} />
        </>
      )}

      {best && worst && (
        <>
          <span className="kicker">Who won the draft</span>
          <div className="draft-verdict">
            <div className="tile draft-verdict-best">
              <div className="tile-label">{scope === 'all' ? 'All-time best' : 'Best draft'}</div>
              <div className="tile-value draft-verdict-name">{best.manager}</div>
              <div className="tile-sub">
                <span className={best.score >= 0 ? 'up' : 'down'}>{signed(best.score)}</span>{' '}
                {scope === 'all' ? `over ${best.drafts} drafts` : 'vs replacement'}
              </div>
            </div>
            <div className="tile">
              <div className="tile-label">{scope === 'all' ? 'All-time worst' : 'Worst draft'}</div>
              <div className="tile-value draft-verdict-name">{worst.manager}</div>
              <div className="tile-sub">
                <span className={worst.score >= 0 ? 'up' : 'down'}>{signed(worst.score)}</span>{' '}
                {scope === 'all' ? `over ${worst.drafts} drafts` : 'vs replacement'}
              </div>
            </div>
          </div>
        </>
      )}

      <section className="card">
        <div className="drafts-card-head">
          <h2 className="card-title">Draft grades</h2>
          <SegTabs
            options={[
              { value: 'compact' as const, label: 'Compact' },
              { value: 'full' as const, label: 'Full' },
            ]}
            value={mode}
            onChange={setMode}
            storageKey="draft-grades"
            ariaLabel="Grades detail"
          />
        </div>

        {mode === 'compact' ? (
          <div className="grade-bars">
            {rows.map((r, i) => (
              <div className="grade-row" key={r.ownerId}>
                <span className="grade-rank">{i + 1}</span>
                <span className="grade-name">{r.manager}</span>
                <span className="grade-track">
                  <span
                    className={`grade-fill ${r.score >= 0 ? 'up' : 'down'}`}
                    style={{ width: `${(Math.abs(r.score) / maxAbs) * 100}%` }}
                  />
                </span>
                <span className={`grade-score ${r.score >= 0 ? 'up' : 'down'}`}>
                  {signed(r.score)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="draft-table draft-compact">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Manager</th>
                  {scope === 'all' && <th className="num">Drafts</th>}
                  <th className="num">Score</th>
                  {scope === 'season' && (
                    <th className="num" title="Picks that finished above positional replacement">
                      Steals
                    </th>
                  )}
                  <th>Best Pick</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.ownerId}>
                    <td className="num">{i + 1}</td>
                    <td className="team-cell">{r.manager}</td>
                    {scope === 'all' && <td className="num sub">{r.drafts}</td>}
                    <td className="num strong">
                      <span className={r.score >= 0 ? 'up' : 'down'}>{signed(r.score)}</span>
                    </td>
                    {scope === 'season' && <td className="num">{r.steals}</td>}
                    <td>
                      {r.bestPick ? (
                        <>
                          <span className="draft-name">{r.bestPick.name}</span>{' '}
                          <span className={`draft-pos draft-pos-${r.bestPick.position}`}>
                            {r.bestPick.position}
                          </span>{' '}
                          {scope === 'all' && (
                            <span className="draft-rank-season">{r.bestPick.season}</span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="draft-rows">
        <HubToggle
          id="by-manager"
          icon="👤"
          title="By manager"
          sub="One manager's draft, in order"
          open={!!open['by-manager']}
          onToggle={() => toggle('by-manager')}
        >
          <label className="week-select draft-mgr-select">
            <span className="week-select-label">Manager</span>
            <select
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              aria-label="Choose a manager"
            >
              {board.managers.map((m) => (
                <option key={m.ownerId} value={m.ownerId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <table className="draft-table draft-compact">
            <thead>
              <tr>
                <th>Pick</th>
                <th className="num">Drafted</th>
                <th className="num">Finish</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {managerPicks.map((p) => (
                <PickRow key={p.playerId + p.pickNo} pick={p} slot={slotOf(p)} showValue />
              ))}
            </tbody>
          </table>
        </HubToggle>

        <HubToggle
          id="all-picks"
          icon="📋"
          title="Every pick, in order"
          sub={`${board.picks.length} picks`}
          open={!!open['all-picks']}
          onToggle={() => toggle('all-picks')}
        >
          <table className="draft-table draft-compact">
            <thead>
              <tr>
                <th>Pick</th>
                <th className="num">Drafted</th>
                <th className="num">Finish</th>
                <th className="num">Pts</th>
              </tr>
            </thead>
            <tbody>
              {board.picks.map((p) => (
                <PickRow key={p.playerId + p.pickNo} pick={p} slot={slotOf(p)} showManager />
              ))}
            </tbody>
          </table>
        </HubToggle>
      </div>
    </>
  );
}

function PickRail({
  label,
  tone,
  picks,
  slotOf,
}: {
  label: string;
  tone: 'up' | 'down';
  picks: DraftPick[];
  slotOf: (p: DraftPick) => string;
}) {
  return (
    <section aria-label={label}>
      <div className="rail-head">
        <span className={`section-title rail-title tone-${tone}`}>{label}</span>
        <span className="rail-hint" aria-hidden="true">
          swipe →
        </span>
      </div>
      <div className="pick-rail">
        {picks.map((p) => (
          <article className={`pick-card tone-${tone}`} key={p.playerId + p.pickNo}>
            <div className="pick-card-top">
              <span className={`draft-pos draft-pos-${p.position}`}>{p.position}</span>
              <span className="pick-card-meta">
                {p.team ? <NflTeam code={p.team} /> : null} {p.manager} · {slotOf(p)}
              </span>
            </div>
            <div className="pick-card-name">{p.name}</div>
            <div className="pick-card-move">
              <span className="pick-card-from">{posRank(p.position, p.posDraftRank)}</span>
              <span className={`pick-card-arrow tone-${tone}`}>→</span>
              <span className={`figure pick-card-to tone-${tone}`}>
                {posRank(p.position, p.posSeasonRank)}
              </span>
            </div>
            <div className="pick-card-foot">
              <span className="pick-card-pts">
                {p.seasonPoints != null ? `${p.seasonPoints.toFixed(1)} pts` : 'no points'}
              </span>
              <span className={tone === 'up' ? 'up' : 'down'}>{signed(p.vsReplacement ?? 0)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PickRow({
  pick,
  slot,
  showValue,
  showManager,
}: {
  pick: DraftPick;
  slot: string;
  showValue?: boolean;
  showManager?: boolean;
}) {
  const drafted = posRank(pick.position, pick.posDraftRank);
  const finish = pick.posSeasonRank;
  const delta = finish != null ? pick.posDraftRank - finish : null;
  const arrow =
    delta == null ? null : delta > 0 ? 'up' : delta >= -10 ? 'warn' : 'down';

  return (
    <tr>
      <td>
        <div className="draft-pick">
          <span className="draft-no">{slot}</span>
          <span className="draft-player">
            <span className="draft-name">{pick.name}</span>{' '}
            <span className={`draft-pos draft-pos-${pick.position}`}>{pick.position}</span>
            {showManager && (
              <span className="draft-sub">
                {pick.team ? <NflTeam code={pick.team} /> : null}
                <span className="draft-mgr">{pick.manager}</span>
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="num">{drafted}</td>
      <td className="num">
        {posRank(pick.position, finish)}
        {arrow && (
          <span className={`draft-arrow ${arrow}`}>{arrow === 'up' ? '▲' : '▼'}</span>
        )}
      </td>
      <td className="num">
        {showValue ? (
          pick.vsReplacement == null ? (
            '—'
          ) : (
            <span className={pick.vsReplacement >= 0 ? 'up' : 'down'}>
              {signed(pick.vsReplacement)}
            </span>
          )
        ) : (
          <span className="strong">
            {pick.seasonPoints != null ? pick.seasonPoints.toFixed(1) : '—'}
          </span>
        )}
      </td>
    </tr>
  );
}

function HubToggle({
  id,
  icon,
  title,
  sub,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  sub: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className="hub-row draft-hub"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`panel-${id}`}
      >
        <span className="hub-row-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="hub-row-body">
          <span className="hub-row-title">{title}</span>
          <span className="hub-row-sub">{sub}</span>
        </span>
        <span className="hub-row-chevron" aria-hidden="true">
          {open ? '⌄' : '›'}
        </span>
      </button>
      {/* Rendered only once opened — these tables run to 160 rows. */}
      {open && (
        <div className="draft-panel table-wrap" id={`panel-${id}`}>
          {children}
        </div>
      )}
    </>
  );
}
