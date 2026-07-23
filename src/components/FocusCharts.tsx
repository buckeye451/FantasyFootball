'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Chart chrome (committed dark theme — mirrors globals.css)
const INK = '#ffffff';
const INK2 = '#c3c2b7';
const MUTED = '#898781';
const GRID = '#2c2c2a';
const BASELINE = '#383835';
const SURFACE_2 = '#212120';
const CONTEXT = '#4a4a45'; // unselected "context" lines
// First four validated dark categorical slots — assigned in selection order,
// and an entity keeps its slot for as long as it stays selected.
const SLOT_COLORS = ['#3987e5', '#008300', '#d55181', '#c98500'];
const MAX_SELECTED = SLOT_COLORS.length;

export interface ChartTeam {
  slug: string;
  name: string;
}

/** Phone-width media query — lets the charts trade margin/ticks for plot area. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

type Row = Record<string, number>;

interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string;
}

function ChartTooltip({
  active,
  label,
  payload,
  teams,
  selection,
  sortAsc,
  suffix,
}: {
  active?: boolean;
  label?: number;
  payload?: TooltipEntry[];
  teams: ChartTeam[];
  selection: Record<string, number>;
  sortAsc: boolean;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const names = new Map(teams.map((t) => [t.slug, t.name]));
  const rows = payload
    .filter((p) => typeof p.value === 'number')
    .map((p) => ({ slug: String(p.dataKey), value: p.value as number }))
    .sort((a, b) => (sortAsc ? a.value - b.value : b.value - a.value));
  return (
    <div
      style={{
        background: SURFACE_2,
        border: `1px solid ${BASELINE}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12.5,
        lineHeight: 1.55,
      }}
    >
      <div style={{ color: MUTED, marginBottom: 4 }}>Week {label}</div>
      {rows.map((r) => {
        const slot = selection[r.slug];
        const selected = slot !== undefined;
        return (
          <div key={r.slug} style={{ display: 'flex', gap: 14, justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: selected ? SLOT_COLORS[slot] : CONTEXT,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: selected ? INK : INK2, fontWeight: selected ? 650 : 400 }}>
                {names.get(r.slug) ?? r.slug}
              </span>
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: selected ? INK : INK2 }}>
              {sortAsc ? `#${r.value}` : r.value.toFixed(2)}
              {suffix}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function endLabel(name: string, lastIndex: number) {
  return function EndLabel(props: { x?: number; y?: number; index?: number }) {
    if (props.index !== lastIndex || props.x == null || props.y == null) return <g />;
    return (
      <text x={props.x + 8} y={props.y + 4} fontSize={12} fontWeight={650} fill={INK}>
        {name}
      </text>
    );
  };
}

function TeamsLineChart({
  data,
  teams,
  selection,
  reversed,
}: {
  data: Row[];
  teams: ChartTeam[];
  selection: Record<string, number>;
  reversed?: boolean;
}) {
  // Draw unselected context lines first so selected lines sit on top.
  const ordered = useMemo(
    () =>
      [...teams].sort(
        (a, b) => (selection[a.slug] !== undefined ? 1 : 0) - (selection[b.slug] !== undefined ? 1 : 0)
      ),
    [teams, selection]
  );
  const lastIndex = data.length - 1;
  const isMobile = useIsMobile();
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: isMobile ? 58 : 84, bottom: 4, left: 0 }}
          accessibilityLayer
        >
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={(w) => `W${w}`}
            tick={{ fill: MUTED, fontSize: isMobile ? 11 : 12 }}
            tickLine={false}
            axisLine={{ stroke: BASELINE }}
            interval={isMobile ? 1 : 0}
          />
          <YAxis
            reversed={reversed}
            domain={reversed ? [1, teams.length] : ['auto', 'auto']}
            ticks={reversed ? teams.map((_, i) => i + 1) : undefined}
            allowDecimals={false}
            tick={{ fill: MUTED, fontSize: isMobile ? 11 : 12 }}
            tickLine={false}
            axisLine={{ stroke: BASELINE }}
            width={isMobile ? 30 : 36}
            tickFormatter={reversed ? (v) => `#${v}` : undefined}
          />
          <Tooltip
            cursor={{ stroke: BASELINE }}
            content={<ChartTooltip teams={teams} selection={selection} sortAsc={!!reversed} />}
          />
          {ordered.map((t) => {
            const slot = selection[t.slug];
            const selected = slot !== undefined;
            return (
              <Line
                key={t.slug}
                type="monotone"
                dataKey={t.slug}
                stroke={selected ? SLOT_COLORS[slot] : CONTEXT}
                strokeWidth={selected ? 2.5 : 1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE_2 }}
                isAnimationActive={false}
                label={selected ? endLabel(t.name, lastIndex) : undefined}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DataTable({ data, teams, prefix }: { data: Row[]; teams: ChartTeam[]; prefix?: string }) {
  return (
    <details className="table-view">
      <summary>View as table</summary>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              {data.map((d) => (
                <th key={d.week} className="num">
                  W{d.week}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.slug}>
                <td className="team-cell">{t.name}</td>
                {data.map((d) => (
                  <td key={d.week} className="num">
                    {d[t.slug] != null ? `${prefix ?? ''}${d[t.slug]}` : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * The two league-wide charts with one shared selection: click up to four
 * teams to light them up in both charts; everyone else stays as context lines.
 */
export function LeagueChartsBoard({
  teams,
  scoreData,
  rankData,
}: {
  teams: ChartTeam[];
  scoreData: Row[];
  rankData: Row[];
}) {
  const [selection, setSelection] = useState<Record<string, number>>({
    [teams[0]?.slug ?? '']: 0,
  });

  function toggle(slug: string) {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[slug] !== undefined) {
        delete next[slug];
        return next;
      }
      if (Object.keys(next).length >= MAX_SELECTED) return next;
      const usedSlots = new Set(Object.values(next));
      for (let s = 0; s < MAX_SELECTED; s++) {
        if (!usedSlots.has(s)) {
          next[slug] = s;
          break;
        }
      }
      return next;
    });
  }

  return (
    <>
      <div className="chip-row" role="group" aria-label="Highlight teams">
        {teams.map((t) => {
          const slot = selection[t.slug];
          const selected = slot !== undefined;
          return (
            <button
              key={t.slug}
              type="button"
              className={`chip${selected ? ' selected' : ''}`}
              style={selected ? ({ '--chip-color': SLOT_COLORS[slot] } as React.CSSProperties) : undefined}
              aria-pressed={selected}
              onClick={() => toggle(t.slug)}
            >
              <span className="chip-dot" />
              {t.name}
            </button>
          );
        })}
        <span className="chip-hint">highlight up to {MAX_SELECTED} teams</span>
      </div>

      <section className="card">
        <h2 className="card-title">Weekly scores</h2>
        <p className="card-note">Points scored by each team, week by week.</p>
        <TeamsLineChart data={scoreData} teams={teams} selection={selection} />
        <DataTable data={scoreData} teams={teams} />
      </section>

      <section className="card">
        <h2 className="card-title">Standings, week by week</h2>
        <p className="card-note">League rank after each week&apos;s games (regular season).</p>
        <TeamsLineChart data={rankData} teams={teams} selection={selection} reversed />
        <DataTable data={rankData} teams={teams} prefix="#" />
      </section>
    </>
  );
}

/** Team page: one team's weekly points against the league median. */
export function TeamWeeklyChart({
  data,
  teamName,
}: {
  data: Array<{ week: number; points: number; median: number }>;
  teamName: string;
}) {
  const isMobile = useIsMobile();
  return (
    <>
      <div className="chip-row" aria-hidden>
        <span className="chip selected" style={{ '--chip-color': SLOT_COLORS[0] } as React.CSSProperties}>
          <span className="chip-dot" />
          {teamName}
        </span>
        <span className="chip">
          <span className="chip-dot" style={{ background: MUTED }} />
          League median
        </span>
      </div>
      <div className="chart-box" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="week"
              tickFormatter={(w) => `W${w}`}
              tick={{ fill: MUTED, fontSize: isMobile ? 11 : 12 }}
              tickLine={false}
              axisLine={{ stroke: BASELINE }}
              interval={isMobile ? 1 : 0}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: MUTED, fontSize: isMobile ? 11 : 12 }}
              tickLine={false}
              axisLine={{ stroke: BASELINE }}
              width={isMobile ? 34 : 40}
            />
            <Tooltip
              cursor={{ stroke: BASELINE }}
              contentStyle={{
                background: SURFACE_2,
                border: `1px solid ${BASELINE}`,
                borderRadius: 8,
                fontSize: 12.5,
              }}
              labelFormatter={(w) => `Week ${w}`}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                name === 'points' ? teamName : 'League median',
              ]}
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke={MUTED}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="points"
              stroke={SLOT_COLORS[0]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE_2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="table-view">
        <summary>View as table</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th className="num">{teamName}</th>
                <th className="num">League median</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.week}>
                  <td>W{d.week}</td>
                  <td className="num">{d.points.toFixed(2)}</td>
                  <td className="num">{d.median.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
