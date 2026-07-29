'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme, type Theme } from '@/components/ThemeToggle';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Chart chrome. Recharts writes these as SVG attributes, which don't resolve
// CSS variables, so the palette is mirrored here and picked by theme.
interface Palette {
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  baseline: string;
  surface2: string; // opaque tooltip background
  context: string; // unselected "context" lines
  // First four categorical slots — assigned in selection order, and an entity
  // keeps its slot for as long as it stays selected.
  slots: string[];
}

const PALETTES: Record<Theme, Palette> = {
  dark: {
    ink: '#ffffff',
    ink2: '#c3c2b7',
    muted: '#a79bc4',
    grid: '#40305f',
    baseline: '#55447e',
    surface2: '#241a38',
    context: '#5b4c78',
    slots: ['#3987e5', '#008300', '#d55181', '#c98500'],
  },
  light: {
    ink: '#16160f',
    ink2: '#3b3930',
    muted: '#6d6756',
    grid: '#ddd4c0',
    baseline: '#c8bea7',
    surface2: '#faf7ef',
    context: '#cec5b1',
    slots: ['#1e6b42', '#2f6fd0', '#b23a6b', '#a9700d'],
  },
};

const MAX_SELECTED = 4;

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
  pal,
}: {
  active?: boolean;
  label?: number;
  payload?: TooltipEntry[];
  teams: ChartTeam[];
  selection: Record<string, number>;
  sortAsc: boolean;
  suffix?: string;
  pal: Palette;
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
        background: pal.surface2,
        border: `1px solid ${pal.baseline}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12.5,
        lineHeight: 1.55,
      }}
    >
      <div style={{ color: pal.muted, marginBottom: 4 }}>Week {label}</div>
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
                  background: selected ? pal.slots[slot] : pal.context,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: selected ? pal.ink : pal.ink2, fontWeight: selected ? 650 : 400 }}>
                {names.get(r.slug) ?? r.slug}
              </span>
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: selected ? pal.ink : pal.ink2 }}>
              {sortAsc ? `#${r.value}` : r.value.toFixed(2)}
              {suffix}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function endLabel(name: string, lastIndex: number, pal: Palette) {
  return function EndLabel(props: { x?: number; y?: number; index?: number }) {
    if (props.index !== lastIndex || props.x == null || props.y == null) return <g />;
    return (
      <text x={props.x + 8} y={props.y + 4} fontSize={12} fontWeight={650} fill={pal.ink}>
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
  const p = PALETTES[useTheme()];
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 12, right: isMobile ? 58 : 84, bottom: 4, left: 0 }}
          accessibilityLayer
        >
          <CartesianGrid stroke={p.grid} vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={(w) => `W${w}`}
            tick={{ fill: p.muted, fontSize: isMobile ? 11 : 12 }}
            tickLine={false}
            axisLine={{ stroke: p.baseline }}
            interval={isMobile ? 1 : 0}
          />
          <YAxis
            reversed={reversed}
            domain={reversed ? [1, teams.length] : ['auto', 'auto']}
            ticks={reversed ? teams.map((_, i) => i + 1) : undefined}
            allowDecimals={false}
            tick={{ fill: p.muted, fontSize: isMobile ? 11 : 12 }}
            tickLine={false}
            axisLine={{ stroke: p.baseline }}
            width={isMobile ? 30 : 36}
            tickFormatter={reversed ? (v) => `#${v}` : undefined}
          />
          <Tooltip
            cursor={{ stroke: p.baseline }}
            content={<ChartTooltip teams={teams} selection={selection} sortAsc={!!reversed} pal={p} />}
          />
          {ordered.map((t) => {
            const slot = selection[t.slug];
            const selected = slot !== undefined;
            return (
              <Line
                key={t.slug}
                type="monotone"
                dataKey={t.slug}
                stroke={selected ? p.slots[slot] : p.context}
                strokeWidth={selected ? 2.5 : 1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: p.surface2 }}
                isAnimationActive={false}
                label={selected ? endLabel(t.name, lastIndex, p) : undefined}
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

  const p = PALETTES[useTheme()];
  return (
    <>
      <div className="chip-block">
        <h2 className="card-title">Highlight up to {MAX_SELECTED} teams</h2>
        <div className="chip-row" role="group" aria-label="Highlight teams">
          {teams.map((t) => {
            const slot = selection[t.slug];
            const selected = slot !== undefined;
            return (
              <button
                key={t.slug}
                type="button"
                className={`chip${selected ? ' selected' : ''}`}
                style={
                  selected ? ({ '--chip-color': p.slots[slot] } as React.CSSProperties) : undefined
                }
                aria-pressed={selected}
                onClick={() => toggle(t.slug)}
              >
                <span className="chip-dot" />
                {t.name}
              </button>
            );
          })}
        </div>
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
  const p = PALETTES[useTheme()];
  return (
    <>
      <div className="chip-row" aria-hidden>
        <span className="chip selected" style={{ '--chip-color': p.slots[0] } as React.CSSProperties}>
          <span className="chip-dot" />
          {teamName}
        </span>
        <span className="chip">
          <span className="chip-dot" style={{ background: p.muted }} />
          League median
        </span>
      </div>
      <div className="chart-box" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke={p.grid} vertical={false} />
            <XAxis
              dataKey="week"
              tickFormatter={(w) => `W${w}`}
              tick={{ fill: p.muted, fontSize: isMobile ? 11 : 12 }}
              tickLine={false}
              axisLine={{ stroke: p.baseline }}
              interval={isMobile ? 1 : 0}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: p.muted, fontSize: isMobile ? 11 : 12 }}
              tickLine={false}
              axisLine={{ stroke: p.baseline }}
              width={isMobile ? 34 : 40}
            />
            <Tooltip
              cursor={{ stroke: p.baseline }}
              contentStyle={{
                background: p.surface2,
                border: `1px solid ${p.baseline}`,
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
              stroke={p.muted}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="points"
              stroke={p.slots[0]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: p.surface2 }}
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

/** Lifetime page: league-wide actual vs best-possible points, season by season. */
// Bar colours for the season-points chart. These two are fixed rather than
// pulled from the palette: the pairing (actual vs best-possible) reads the same
// way in either theme, so it shouldn't shift with it.
const POINTS_BARS = { actual: '#f08080', optimal: '#228b22' };

interface PointsAxis {
  floor: number;
  ceil: number;
  major: number[];
  minor: number[];
}

/**
 * Truncated y-axis for the season-points chart.
 *
 * Starting at zero squashes every season into the same band near the top, so
 * the axis starts just below the smallest bar instead and the chart draws a
 * break mark at the origin to say so. Majors land on a 500-point grid (1000 if
 * that would crowd the axis), with a minor line halfway between each pair.
 */
function pointsAxis(data: Array<{ actual: number; optimal: number }>): PointsAxis {
  const values = data.flatMap((d) => [d.actual, d.optimal]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  let step = 500;
  let floor = 0;
  let ceil = 0;
  for (;;) {
    // Leave a third of the spread below the shortest bar so it still reads as
    // a bar rather than a sliver sitting on the axis.
    floor = Math.max(0, Math.floor((min - span * 0.35) / step) * step);
    ceil = Math.ceil((max + span * 0.12) / step) * step;
    if ((ceil - floor) / step <= 9) break;
    step += 500;
  }

  const major: number[] = [];
  for (let v = floor; v <= ceil + 1e-6; v += step) major.push(v);
  const minor = major.slice(0, -1).map((v) => v + step / 2);
  return { floor, ceil, major, minor };
}

/**
 * The "//" break drawn where the y-axis meets the x-axis, marking that the
 * scale starts above zero. Recharts hands `Customized` the plot offset, which
 * is the only reliable way to find that corner.
 */
function AxisBreak({ stroke, muted, offset }: { stroke: string; muted: string; offset?: { left: number; top: number; height: number } }) {
  if (!offset) return null;
  const x = offset.left;
  const y = offset.top + offset.height;
  return (
    <g pointerEvents="none">
      <line x1={x - 5} y1={y - 1} x2={x + 5} y2={y - 9} stroke={stroke} strokeWidth={1.5} />
      <line x1={x - 5} y1={y + 4} x2={x + 5} y2={y - 4} stroke={stroke} strokeWidth={1.5} />
      <text x={x - 9} y={y + 11} textAnchor="end" fill={muted} fontSize={10}>
        0
      </text>
    </g>
  );
}

export function SeasonPointsChart({
  data,
}: {
  data: Array<{ season: string; actual: number; optimal: number }>;
}) {
  const isMobile = useIsMobile();
  const p = PALETTES[useTheme()];
  const axis = pointsAxis(data);
  const barLabel = (v: number) =>
    isMobile ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toLocaleString();
  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 0 }} accessibilityLayer>
          <CartesianGrid stroke={p.grid} vertical={false} />
          {axis.minor.map((v) => (
            <ReferenceLine key={v} y={v} stroke={p.grid} strokeOpacity={0.45} strokeWidth={1} />
          ))}
          <XAxis
            dataKey="season"
            tick={{ fill: p.muted, fontSize: isMobile ? 11 : 12 }}
            tickLine={false}
            axisLine={{ stroke: p.baseline }}
          />
          <YAxis
            tick={{ fill: p.muted, fontSize: isMobile ? 11 : 12 }}
            tickLine={false}
            axisLine={{ stroke: p.baseline }}
            width={isMobile ? 44 : 56}
            domain={[axis.floor, axis.ceil]}
            ticks={axis.major}
            allowDataOverflow
            tickFormatter={(v: number) =>
              v % 1000 === 0 ? `${v / 1000}k` : `${(v / 1000).toFixed(1)}k`
            }
          />
          <Customized component={<AxisBreak stroke={p.baseline} muted={p.muted} />} />
          <Tooltip
            cursor={{ fill: p.grid, opacity: 0.35 }}
            contentStyle={{
              background: p.surface2,
              border: `1px solid ${p.baseline}`,
              borderRadius: 8,
              fontSize: 12.5,
            }}
            labelStyle={{ color: p.muted }}
            labelFormatter={(season) => `${season} season`}
            formatter={(value: number, name: string) => [
              value.toLocaleString(undefined, { maximumFractionDigits: 1 }),
              name === 'optimal' ? 'Best possible' : 'Actual',
            ]}
          />
          <Legend
            formatter={(name) => (
              <span style={{ color: p.ink2, fontSize: 12.5 }}>
                {name === 'optimal' ? 'Best possible' : 'Actual'}
              </span>
            )}
          />
          <Bar
            dataKey="actual"
            fill={POINTS_BARS.actual}
            fillOpacity={0.9}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="actual"
              position="top"
              fill={p.ink2}
              fontSize={isMobile ? 9 : 11}
              formatter={barLabel}
            />
          </Bar>
          <Bar
            dataKey="optimal"
            fill={POINTS_BARS.optimal}
            fillOpacity={0.9}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="optimal"
              position="top"
              fill={p.ink2}
              fontSize={isMobile ? 9 : 11}
              formatter={barLabel}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
