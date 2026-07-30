// Charts, hand-rolled in SVG. No chart library and no CDN — the dashboard stays
// self-contained.
//
// Form was chosen before colour:
//   • Orders over time      -> line + area, ONE series      -> single hue, no legend
//   • Pipeline distribution -> horizontal bars, ORDINAL     -> one-hue ramp, light->dark
//     (the pipeline is a sequence: reordering the stages would change the meaning,
//      so the order lives in the colour rather than in eight unrelated hues)
//   • Agent collection      -> horizontal bars, NOMINAL     -> every bar the same hue
//     (bar length already encodes the value; spending hues on it would re-encode it)
//
// Every ramp step was checked against a white card with the palette validator:
// all seven clear 3:1, and the ramp is monotone in lightness. Bars carry direct
// value labels, so identity never rests on colour alone.

import { useState } from 'react';

import { useLang } from './i18n';
import { OrderStatus, STATUS_LABEL } from './status';

// Ordinal ramp, light -> dark. Validated: contrast >= 3:1 on #FFFFFF for all steps.
export const RAMP = ['#C97676', '#BC6060', '#AF4C4C', '#A23A3E', '#932A33', '#84202B', '#6E1622'];

const MUTED = '#7A716C';
const GRID = '#EDE3D6';
const ACCENT = '#A23A3E';

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

type Point = { date: string; orders: number; revenue: number };

/* ------------------------------------------------------------------ trend --- */

// A monotone cubic through the points: a smooth line that never overshoots into
// values the data does not contain (a plain spline would invent negative orders).
function smoothPath(points: [number, number][]) {
  if (points.length < 2) return points.length ? `M${points[0][0]},${points[0][1]}` : '';

  const d: string[] = [`M${points[0][0]},${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cx = (x0 + x1) / 2;
    d.push(`C${cx},${y0} ${cx},${y1} ${x1},${y1}`);
  }
  return d.join(' ');
}

export function TrendChart({ data }: { data: Point[] }) {
  const { t } = useLang();
  const [hover, setHover] = useState<number | null>(null);

  const W = 760, H = 250;
  const pad = { top: 16, right: 16, bottom: 30, left: 38 };
  const iw = W - pad.left - pad.right;
  const ih = H - pad.top - pad.bottom;

  if (!data.length) return <p className="muted">—</p>;

  const max = Math.max(1, ...data.map(d => d.orders));
  const x = (i: number) => pad.left + (data.length === 1 ? 0 : (i * iw) / (data.length - 1));
  const y = (v: number) => pad.top + ih - (v / max) * ih;

  const points = data.map((d, i) => [x(i), y(d.orders)] as [number, number]);
  const line = smoothPath(points);
  const area = `${line} L${x(data.length - 1)},${pad.top + ih} L${x(0)},${pad.top + ih} Z`;

  // Only the ticks worth reading: nothing, halfway, and the peak.
  const ticks = [...new Set([0, Math.round(max / 2), max])];
  const active = hover === null ? null : data[hover];
  const total = data.reduce((s, d) => s + d.orders, 0);

  return (
    <figure className="chart">
      <figcaption>
        <strong>{t('ordersTrend', data.length)}</strong>
        <span className="muted">{t('totalOrders', total)}</span>
      </figcaption>

      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t('ordersTrend', data.length)}
          onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.22" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive grid: present, never competing with the data. */}
          {ticks.map(tick => (
            <g key={tick}>
              <line
                x1={pad.left} x2={W - pad.right} y1={y(tick)} y2={y(tick)}
                stroke={GRID} strokeWidth="1" strokeDasharray="4 6"
              />
              <text x={pad.left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={MUTED}>
                {tick}
              </text>
            </g>
          ))}

          <path d={area} fill="url(#areaFill)" />
          <path d={line} fill="none" stroke={ACCENT} strokeWidth="2.25" strokeLinecap="round" />

          {active && (
            <line
              x1={x(hover!)} x2={x(hover!)} y1={pad.top} y2={pad.top + ih}
              stroke={ACCENT} strokeWidth="1" strokeDasharray="3 3" opacity="0.55"
            />
          )}

          {data.map((d, i) => (
            <circle
              key={d.date}
              cx={x(i)} cy={y(d.orders)} r={hover === i ? 5 : 0}
              fill={ACCENT} stroke="#fff" strokeWidth="2"
            />
          ))}

          {/* Hit targets wider than the marks, so hovering is not a game of skill. */}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.date}`}
              x={x(i) - iw / (data.length * 2)} y={pad.top}
              width={Math.max(8, iw / data.length)} height={ih}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}

          {data.map((d, i) => (
            // Label every third day: a label on every point is noise at 14 days.
            i % 3 === 0 || i === data.length - 1 ? (
              <text key={`t-${d.date}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill={MUTED}>
                {d.date.slice(8)}/{d.date.slice(5, 7)}
              </text>
            ) : null
          ))}
        </svg>

        {active && (
          <div
            className="tooltip"
            style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(active.orders) / H) * 100}%` }}>
            <strong>{active.date.split('-').reverse().join('/')}</strong>
            <span>{t('totalOrders', active.orders)}</span>
            <span className="muted">{money(active.revenue)}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

/* --------------------------------------------------------------- pipeline --- */

export function PipelineChart({ rows }: { rows: { status: OrderStatus; value: number }[] }) {
  const { t, lang } = useLang();
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...rows.map(r => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <figure className="chart">
      <figcaption>
        <strong>{t('pipeline')}</strong>
        <span className="muted">{t('totalOrders', total)}</span>
      </figcaption>

      <div className="bars">
        {rows.map((row, i) => (
          <div
            key={row.status}
            className="bar-row"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}>
            <span className="bar-label">{STATUS_LABEL[row.status][lang]}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  // Ordinal ramp: the reader sees the stage order in the colour.
                  width: `${Math.max(row.value ? 3 : 0, (row.value / max) * 100)}%`,
                  background: RAMP[Math.min(i, RAMP.length - 1)],
                  opacity: hover === null || hover === i ? 1 : 0.5,
                }}
              />
            </div>
            {/* Direct value label — identity never rests on colour alone. */}
            <span className="bar-value">{row.value}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ agents --- */

export function AgentChart({ rows }: {
  rows: { name: string; zone?: string; pickups: number; collected: number }[];
}) {
  const { t } = useLang();
  const [hover, setHover] = useState<number | null>(null);

  if (!rows.length) {
    return (
      <figure className="chart">
        <figcaption><strong>{t('agentCollection')}</strong></figcaption>
        <p className="muted">{t('noAgentOrders')}</p>
      </figure>
    );
  }

  const max = Math.max(1, ...rows.map(r => r.collected));

  return (
    <figure className="chart">
      <figcaption>
        <strong>{t('agentCollection')}</strong>
        <span className="muted">{money(rows.reduce((s, r) => s + r.collected, 0))}</span>
      </figcaption>

      <div className="bars">
        {rows.map((row, i) => (
          <div
            key={row.name}
            className="bar-row"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}>
            <span className="bar-label" title={row.zone}>{row.name}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  // Nominal: one hue for every bar. Length already encodes the value.
                  width: `${Math.max(row.collected ? 3 : 0, (row.collected / max) * 100)}%`,
                  background: ACCENT,
                  opacity: hover === null || hover === i ? 1 : 0.5,
                }}
              />
            </div>
            <span className="bar-value">{money(row.collected)}</span>
          </div>
        ))}
      </div>

      <p className="chart-note muted">
        {rows.map(r => `${r.name}: ${t('pickups', r.pickups)}`).join(' · ')}
      </p>
    </figure>
  );
}
