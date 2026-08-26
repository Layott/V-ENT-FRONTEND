'use client';

import { useState } from 'react';
import styles from './AdminChart.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

/**
 * Lightweight inline-SVG chart component.
 * Supports `line` and `bar` types.
 *
 * Props:
 * - data: [{ label: string, value: number }]
 * - title: string
 * - subtitle: string
 * - type: 'line' | 'bar'
 * - color: stroke / fill color
 * - height: pixel height of plot area
 * - format: optional value formatter
 */
export default function AdminChart({
  data = [],
  title = '',
  subtitle = '',
  type = 'line',
  color = 'var(--v-ent-gold)',
  height = 160,
  format = v => v
}) {
  const tx = useTx();
  const tt = useT();
  const [hover, setHover] = useState(null);
  if (!data.length) {
    return <div className={styles.card}>
        <p className={styles.title}>{title}</p>
        <p className={styles.empty}>{tt("ui.no.data.944a", "No data.")}</p>
      </div>;
  }
  const W = 600;
  const H = height;
  const PAD_L = 40,
    PAD_R = 12,
    PAD_T = 14,
    PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const max = Math.max(1, ...data.map(d => d.value));
  const min = 0;
  const range = max - min || 1;
  const xFor = i => PAD_L + (data.length === 1 ? innerW / 2 : i / (data.length - 1) * innerW);
  const yFor = v => PAD_T + innerH - (v - min) / range * innerH;

  // Y-axis ticks (4 segments)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD_T + innerH - p * innerH,
    value: Math.round(min + p * range)
  }));

  // X-axis labels (every Nth)
  const xStep = Math.max(1, Math.ceil(data.length / 6));

  // Line path
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.value).toFixed(1)}`).join(' ');

  // Area path (for line chart fill)
  const areaPath = `${linePath} L ${xFor(data.length - 1)} ${PAD_T + innerH} L ${xFor(0)} ${PAD_T + innerH} Z`;
  const barW = innerW / data.length * 0.7;
  const barOffset = innerW / data.length * 0.15;
  return <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{title}</p>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`grad-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y-axis grid lines + labels */}
        {yTicks.map((t, i) => <g key={i}>
            <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={PAD_L - 6} y={t.y + 4} fontSize="10" textAnchor="end" fill="rgba(255,255,255,0.35)" fontFamily="Inter, sans-serif">
              {format(t.value)}
            </text>
          </g>)}

        {/* Bars */}
        {type === 'bar' && data.map((d, i) => {
        const x = PAD_L + i / data.length * innerW + barOffset;
        const y = yFor(d.value);
        const h = PAD_T + innerH - y;
        return <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill={color} opacity={hover === i ? 1 : 0.7} rx={2} onMouseEnter={() => setHover(i)} />
            </g>;
      })}

        {/* Area fill + line */}
        {type === 'line' && <>
            <path d={areaPath} fill={`url(#grad-${title.replace(/\s+/g, '-')})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => <circle key={i} cx={xFor(i)} cy={yFor(d.value)} r={hover === i ? 4 : 2.5} fill={color} stroke="#212225" strokeWidth={2} onMouseEnter={() => setHover(i)} style={{
          cursor: 'pointer'
        }} />)}
          </>}

        {/* X-axis labels */}
        {data.map((d, i) => (i % xStep === 0 || i === data.length - 1) && <text key={`xl-${i}`} x={xFor(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontFamily="Inter, sans-serif">
              {tx(d.label)}
            </text>)}

        {/* Hover tooltip */}
        {hover !== null && data[hover] && <g>
            <line x1={xFor(hover)} y1={PAD_T} x2={xFor(hover)} y2={PAD_T + innerH} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="2,2" />
            <rect x={Math.max(PAD_L, Math.min(W - 100, xFor(hover) - 50))} y={PAD_T + 2} width={100} height={36} fill="#303136" stroke="rgba(255,255,255,0.18)" rx={4} />
            <text x={Math.max(PAD_L + 50, Math.min(W - 50, xFor(hover)))} y={PAD_T + 16} fontSize="10" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontFamily="Inter, sans-serif">
              {tx(data[hover].label)}
            </text>
            <text x={Math.max(PAD_L + 50, Math.min(W - 50, xFor(hover)))} y={PAD_T + 30} fontSize="11" textAnchor="middle" fill="#fff" fontFamily="Fraunces, sans-serif" fontWeight="600">
              {format(data[hover].value)}
            </text>
          </g>}
      </svg>
    </div>;
}