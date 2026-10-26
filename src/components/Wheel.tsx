import { useEffect, useId, useRef, type TransitionEvent } from 'react';
import { polar, segmentColours, segmentSize, slicePath, wrapLabel } from '../lib/wheelMath';
import { audio } from '../audio/audioManager';
import styles from './Wheel.module.css';

export interface WheelItem {
  id: string;
  text: string;
}

// Matchday broadcast colours: pink, purple, cyan, green.
const PALETTE = [
  { fill: '#ff2882', ink: '#ffffff' },
  { fill: '#37003c', ink: '#ffffff' },
  { fill: '#04f5ff', ink: '#37003c' },
  { fill: '#00ff85', ink: '#37003c' },
];

const R = 94;
const LEDS = 40;
/** Degrees the pointer flicks back each time a segment edge passes under it. */
const KICK = -9;
const PIVOT = '0 -124';

interface Props {
  items: WheelItem[];
  /** Clockwise degrees. */
  rotation?: number;
  /** Transition length. 0 jumps straight to `rotation`. */
  durationMs?: number;
  onSpinEnd?: () => void;
  /** Glow on this segment, dim the rest. */
  highlightId?: string;
  /** Shown on the hub, e.g. GW8. Without it the hub shows the crest's crown. */
  gameWeek?: number;
  /** CSS width, e.g. "min(80vw, 320px)". */
  size?: string;
}

/** Current rotation of an element mid-transition, 0–360. */
function angleOf(el: HTMLElement): number {
  const m = getComputedStyle(el).transform.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const [a, b] = m[1].split(',').map(Number);
  return (((Math.atan2(b, a) * 180) / Math.PI) % 360 + 360) % 360;
}

export function Wheel({ items, rotation = 0, durationMs = 0, onSpinEnd, highlightId, gameWeek, size }: Props) {
  // SVG ids must be unique per wheel on the page.
  const uid = useId().replace(/:/g, '');
  const discRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<SVGGElement>(null);
  const n = items.length;
  const colours = segmentColours(n, PALETTE.length);
  const fontSize = Math.min(9, Math.max(5, 10 - n * 0.25));
  const maxChars = Math.min(18, Math.floor(56 / (fontSize * 0.46)));
  // Thin segments only have room for one line.
  const maxLines = n > 16 ? 1 : 2;
  const spinning = durationMs > 0;
  const landedIndex = highlightId === undefined ? -1 : items.findIndex((it) => it.id === highlightId);

  // Tick and flick the pointer whenever a segment edge passes it.
  useEffect(() => {
    const disc = discRef.current;
    const pointer = pointerRef.current;
    if (!spinning || n < 2 || !disc || !pointer) return;
    const seg = segmentSize(n);
    let prev = angleOf(disc);
    let total = prev;
    let edge = Math.floor(total / seg);
    let kick = 0;
    let lastTick = 0;
    let raf = 0;
    const frame = (now: number) => {
      const a = angleOf(disc);
      total += ((a - prev + 540) % 360) - 180;
      prev = a;
      const e = Math.floor(total / seg);
      if (e !== edge) {
        edge = e;
        kick = KICK;
        // Early on several edges pass per frame; one tick is enough.
        if (now - lastTick > 40) {
          lastTick = now;
          audio.tick();
        }
      }
      kick = Math.abs(kick) < 0.05 ? 0 : kick * 0.78;
      if (kick) pointer.setAttribute('transform', `rotate(${kick.toFixed(2)} ${PIVOT})`);
      else pointer.removeAttribute('transform');
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      pointer.removeAttribute('transform');
    };
  }, [spinning, n]);

  const handleEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.propertyName === 'transform') onSpinEnd?.();
  };

  return (
    <div
      className={`${styles.wrap} ${spinning ? styles.spinning : ''} ${landedIndex >= 0 ? styles.landed : ''}`}
      style={size ? { width: size } : undefined}
    >
      <div
        ref={discRef}
        className={styles.disc}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${durationMs}ms cubic-bezier(0.12, 0.72, 0.1, 1)` : 'none',
        }}
        onTransitionEnd={handleEnd}
      >
        <svg viewBox="-124 -124 248 248" className={styles.svg} role="img" aria-label={`Wheel with ${n} consequences`}>
          <defs>
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle r={R + 2} fill="#12001a" />
          {n === 0 && <circle r={R} fill="#37003c" />}
          {items.map((item, i) => {
            const c = PALETTE[colours[i]];
            const dim = landedIndex >= 0 && i !== landedIndex;
            const centre = (i + 0.5) * segmentSize(n);
            const lines = wrapLabel(item.text, maxChars, maxLines);
            const lineHeight = fontSize * 1.08;
            const y0 = (-(lines.length - 1) * lineHeight) / 2;
            return (
              <g key={item.id} opacity={dim ? 0.28 : 1} className={styles.segment}>
                {n === 1 ? <circle r={R} fill={c.fill} /> : <path d={slicePath(i, n, R)} fill={c.fill} />}
                <g transform={`rotate(${centre - 90})`}>
                  {lines.map((line, k) => (
                    <text
                      key={k}
                      x={R - 8}
                      y={y0 + k * lineHeight}
                      textAnchor="end"
                      dominantBaseline="central"
                      fill={c.ink}
                      fontSize={fontSize}
                      className={styles.label}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </g>
            );
          })}

          {/* Board ring, white spokes and the cyan trim */}
          <circle r="99" fill="none" stroke="#24002a" strokeWidth="10" />
          {n > 1 &&
            items.map((item, i) => {
              const [x0, y0] = polar(20, i * segmentSize(n));
              const [x1, y1] = polar(R, i * segmentSize(n));
              return <path key={item.id} d={`M${x0} ${y0}L${x1} ${y1}`} stroke="#fff" strokeWidth="1.4" />;
            })}
          <circle r={R} fill="none" stroke="#fff" strokeWidth="1.4" />
          <circle r="104" fill="none" stroke="#04f5ff" strokeWidth="1.4" />

          {landedIndex >= 0 && n > 1 && (
            <path
              d={slicePath(landedIndex, n, R)}
              fill="none"
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinejoin="round"
              filter={`url(#${uid}-glow)`}
            />
          )}
        </svg>
      </div>

      {/* Fixed on top: sheen, LED board, hub and pointer */}
      <svg viewBox="-124 -124 248 248" className={styles.overlay} aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-sheen`} cx="0.36" cy="0.26" r="0.75">
            <stop offset="0" stopColor="#fff" stopOpacity="0.24" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-hub`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff2882" />
            <stop offset="0.5" stopColor="#9b4dff" />
            <stop offset="1" stopColor="#04f5ff" />
          </linearGradient>
          <filter id={`${uid}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        <circle r={R} fill={`url(#${uid}-sheen)`} />

        <g>
          {Array.from({ length: LEDS }, (_, k) => {
            const [x, y] = polar(99, (k * 360) / LEDS);
            return (
              <circle
                key={k}
                cx={x}
                cy={y}
                r="1.5"
                className={styles.led}
                style={{ animationDelay: `${(-(k / LEDS) * 0.7).toFixed(3)}s` }}
              />
            );
          })}
        </g>

        <circle r="23" fill={`url(#${uid}-hub)`} />
        <circle r="18" fill="#37003c" />
        {gameWeek !== undefined ? (
          <text y="1" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="12" className={styles.hubText}>
            GW{gameWeek}
          </text>
        ) : (
          // The crown from the Spinazonke crest.
          <path d="M18 30 21 17l6 7 5-11 5 11 6-7 3 13z" transform="translate(-22.4 -15) scale(0.7)" fill="#ff2882" />
        )}

        <g ref={pointerRef} filter={`url(#${uid}-shadow)`}>
          <path d="M-10 -126 L10 -126 L0 -96 Z" fill="#ff2882" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="0" cy="-121" r="2.4" fill="#fff" />
        </g>
      </svg>
    </div>
  );
}
