import type { TransitionEvent } from 'react';
import { polar, segmentColours, segmentSize, slicePath, truncate } from '../lib/wheelMath';
import styles from './Wheel.module.css';

export interface WheelItem {
  id: string;
  text: string;
}

const PALETTE = [
  { fill: '#FF2882', ink: '#FFFFFF' },
  { fill: '#04F5FF', ink: '#37003C' },
  { fill: '#4B0A52', ink: '#FFFFFF' },
  { fill: '#00FF85', ink: '#37003C' },
];

const R = 94;
const LIGHTS = 24;

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
  const n = items.length;
  const colours = segmentColours(n, PALETTE.length);
  const fontSize = Math.min(9, Math.max(5, 10 - n * 0.25));
  const maxChars = Math.min(24, Math.floor(62 / (fontSize * 0.46)));

  const handleEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'transform') onSpinEnd?.();
  };

  return (
    <div className={styles.wrap} style={size ? { width: size } : undefined}>
      <div
        className={styles.disc}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: durationMs > 0 ? `transform ${durationMs}ms cubic-bezier(0.12, 0.72, 0.1, 1)` : 'none',
        }}
        onTransitionEnd={handleEnd}
      >
        <svg viewBox="-110 -110 220 220" className={styles.svg} role="img" aria-label={`Wheel with ${n} consequences`}>
          <defs>
            <linearGradient id="wheel-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#04F5FF" />
              <stop offset="0.5" stopColor="#FF2882" />
              <stop offset="1" stopColor="#00FF85" />
            </linearGradient>
            <radialGradient id="wheel-shade">
              <stop offset="0.55" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.28" />
            </radialGradient>
          </defs>

          <circle r="106" fill="#1c001f" />
          <circle r="103" fill="none" stroke="url(#wheel-rim)" strokeWidth="5" />

          {n === 0 && <circle r={R} fill="#2a0030" />}
          {items.map((item, i) => {
            const c = PALETTE[colours[i]];
            const dim = highlightId !== undefined && item.id !== highlightId;
            const centre = (i + 0.5) * segmentSize(n);
            return (
              <g key={item.id} opacity={dim ? 0.35 : 1} className={styles.segment}>
                {n === 1 ? (
                  <circle r={R} fill={c.fill} />
                ) : (
                  <path d={slicePath(i, n, R)} fill={c.fill} stroke="#1c001f" strokeWidth="0.8" />
                )}
                <text
                  transform={`rotate(${centre - 90})`}
                  x={R - 7}
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
          <circle r={R} fill="url(#wheel-shade)" pointerEvents="none" />

          {Array.from({ length: LIGHTS }, (_, i) => {
            const [x, y] = polar(99.5, (i * 360) / LIGHTS);
            return <circle key={i} cx={x} cy={y} r="1.8" className={i % 2 ? styles.lightA : styles.lightB} />;
          })}

          {/* Hub */}
          <circle r="19" fill="#37003C" stroke="#fff" strokeWidth="2.5" />
          <path d="M-9 3 -7 -7 -3 -2 0 -10 3 -2 7 -7 9 3z" fill="#00FF85" />
          <rect x="-9" y="5" width="18" height="3" rx="1" fill="#FF2882" />
        </svg>
      </div>

      <svg viewBox="-110 -110 220 220" className={styles.pointer} aria-hidden="true">
        <path d="M-11 -112 L11 -112 L0 -86 Z" fill="#FF2882" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="0" cy="-106" r="3" fill="#fff" />
      </svg>
    </div>
  );
}
