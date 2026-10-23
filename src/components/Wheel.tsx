import { useId, type TransitionEvent } from 'react';
import { polar, segmentColours, segmentSize, slicePath, truncate } from '../lib/wheelMath';
import { SkullGlyph } from './Skull';
import styles from './Wheel.module.css';

export interface WheelItem {
  id: string;
  text: string;
}

// Blood, black, bruise, bone.
const PALETTE = [
  { fill: '#8b0a1a', ink: '#f3e7d3' },
  { fill: '#150307', ink: '#e9d9c0' },
  { fill: '#3d0b2b', ink: '#f3e7d3' },
  { fill: '#d6c6a8', ink: '#2a0006' },
];

const R = 94;
const BULBS = 24;
const SPIKES = 36;

interface Props {
  items: WheelItem[];
  /** Clockwise degrees. */
  rotation?: number;
  /** Transition length. 0 jumps straight to `rotation`. */
  durationMs?: number;
  onSpinEnd?: () => void;
  /** Glow on this segment, dim the rest. */
  highlightId?: string;
  /** CSS width, e.g. "min(80vw, 320px)". */
  size?: string;
}

export function Wheel({ items, rotation = 0, durationMs = 0, onSpinEnd, highlightId, size }: Props) {
  // SVG ids must be unique per wheel on the page.
  const uid = useId().replace(/:/g, '');
  const n = items.length;
  const colours = segmentColours(n, PALETTE.length);
  const fontSize = Math.min(9, Math.max(5, 10 - n * 0.25));
  const maxChars = Math.min(24, Math.floor(62 / (fontSize * 0.46)));
  const spinning = durationMs > 0;
  const landedIndex = highlightId === undefined ? -1 : items.findIndex((it) => it.id === highlightId);

  const handleEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'transform') onSpinEnd?.();
  };

  return (
    <div
      className={`${styles.wrap} ${spinning ? styles.spinning : ''} ${landedIndex >= 0 ? styles.landed : ''}`}
      style={size ? { width: size } : undefined}
    >
      <div
        className={styles.disc}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${durationMs}ms cubic-bezier(0.12, 0.72, 0.1, 1)` : 'none',
        }}
        onTransitionEnd={handleEnd}
      >
        <svg viewBox="-124 -124 248 248" className={styles.svg} role="img" aria-label={`Wheel with ${n} consequences`}>
          <defs>
            <radialGradient id={`${uid}-iron`}>
              <stop offset="0.85" stopColor="#3b3b41" />
              <stop offset="0.93" stopColor="#1b1b1f" />
              <stop offset="1" stopColor="#060607" />
            </radialGradient>
            <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6b6b73" />
              <stop offset="0.5" stopColor="#2c2c31" />
              <stop offset="1" stopColor="#111114" />
            </linearGradient>
            <radialGradient id={`${uid}-shade`}>
              <stop offset="0.35" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.55" />
            </radialGradient>
            <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" />
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.6 -0.62" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Spikes round the outside, blood on the tips */}
          {Array.from({ length: SPIKES }, (_, k) => {
            const a = (k + 0.5) * (360 / SPIKES);
            const [ax, ay] = polar(104, a - 3.4);
            const [tx, ty] = polar(118, a);
            const [bx, by] = polar(104, a + 3.4);
            const [rx1, ry1] = polar(113, a - 1.3);
            const [rx2, ry2] = polar(113, a + 1.3);
            return (
              <g key={k}>
                <path d={`M${ax} ${ay}L${tx} ${ty}L${bx} ${by}Z`} fill={`url(#${uid}-steel)`} stroke="#000" strokeWidth="0.6" />
                <path d={`M${rx1} ${ry1}L${tx} ${ty}L${rx2} ${ry2}Z`} fill="#9b0012" />
              </g>
            );
          })}

          {/* Iron rim */}
          <circle r="107" fill={`url(#${uid}-iron)`} stroke="#000" strokeWidth="1.2" />
          <circle r="100.5" fill="none" stroke="#66666e" strokeOpacity="0.45" strokeWidth="0.8" />

          {n === 0 && <circle r={R} fill="#150307" />}
          {items.map((item, i) => {
            const c = PALETTE[colours[i]];
            const dim = landedIndex >= 0 && i !== landedIndex;
            const centre = (i + 0.5) * segmentSize(n);
            return (
              <g key={item.id} opacity={dim ? 0.3 : 1} className={styles.segment}>
                {n === 1 ? (
                  <circle r={R} fill={c.fill} />
                ) : (
                  <path d={slicePath(i, n, R)} fill={c.fill} stroke="#000" strokeWidth="1.2" />
                )}
                <text
                  transform={`rotate(${centre - 90})`}
                  x={R - 8}
                  y={0}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={c.ink}
                  fontSize={fontSize}
                  className={styles.label}
                >
                  {truncate(item.text, maxChars)}
                </text>
              </g>
            );
          })}

          {/* Grime and shading */}
          <circle r={R} fill="#000" filter={`url(#${uid}-grain)`} opacity="0.5" pointerEvents="none" />
          <circle r={R} fill={`url(#${uid}-shade)`} pointerEvents="none" />

          {landedIndex >= 0 && n > 1 && (
            <path
              d={slicePath(landedIndex, n, R)}
              fill="none"
              stroke="#ff2236"
              strokeWidth="2.6"
              strokeLinejoin="round"
              filter={`url(#${uid}-glow)`}
            />
          )}

          {/* Flickering red bulbs */}
          <g>
            {Array.from({ length: BULBS }, (_, i) => {
              const [x, y] = polar(103.5, (i * 360) / BULBS);
              return <circle key={i} cx={x} cy={y} r="3.6" fill="#ff1a2e" opacity="0.18" />;
            })}
          </g>
          <g className={styles.bulbs}>
            {Array.from({ length: BULBS }, (_, i) => {
              const [x, y] = polar(103.5, (i * 360) / BULBS);
              return <circle key={i} cx={x} cy={y} r="1.9" />;
            })}
          </g>

          {/* Hub: riveted iron with a skull */}
          <circle r="27" fill="#0b0306" stroke="#8b0a1a" strokeWidth="2.6" />
          {Array.from({ length: 8 }, (_, i) => {
            const [x, y] = polar(23, i * 45 + 22.5);
            return <circle key={i} cx={x} cy={y} r="1.3" fill="#55555c" />;
          })}
          <g transform="translate(0 1)">
            <SkullGlyph scale={0.5} />
          </g>
        </svg>
      </div>

      {/* Dagger pointer, fixed at 12 o'clock */}
      <svg viewBox="-124 -124 248 248" className={styles.pointer} aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8e8e96" />
            <stop offset="0.5" stopColor="#f4f4f6" />
            <stop offset="1" stopColor="#6c6c74" />
          </linearGradient>
        </defs>
        <circle cx="0" cy="-125" r="3.6" fill="#7a1010" stroke="#000" strokeWidth="0.6" />
        <rect x="-3.4" y="-123" width="6.8" height="10" rx="1.5" fill="#2a1a12" stroke="#000" strokeWidth="0.6" />
        <path d="M-3.4 -120.5h6.8M-3.4 -117.5h6.8" stroke="#000" strokeWidth="0.6" opacity="0.6" />
        <rect x="-11" y="-114" width="22" height="4" rx="2" fill="#3a3a40" stroke="#000" strokeWidth="0.6" />
        <path d="M-5 -110 L5 -110 L4 -96 L0 -84 L-4 -96 Z" fill={`url(#${uid}-blade)`} stroke="#222" strokeWidth="0.6" />
        <path d="M0 -109 V-97" stroke="#8a8a92" strokeWidth="0.8" />
        <path d="M-3.6 -97.5 L3.6 -97.5 L0 -84 Z" fill="#a00014" opacity="0.92" />
        <path d="M0 -84.5q-1.8 3.2 0 5q1.8-1.8 0-5z" fill="#a00014" className={styles.drip} />
      </svg>
    </div>
  );
}
