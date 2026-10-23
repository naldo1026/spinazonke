import { useEffect, useId, useRef, type CSSProperties } from 'react';
import type { CoinSide } from '../types';
import { Anim, hasLottie } from './Anim';
import { SkullGlyph } from './Skull';
import styles from './Coin.module.css';

export const FLIP_MS = 3600;

interface Props {
  /** Face to land on (and show when idle). */
  result?: CoinSide;
  flipping: boolean;
  /** Hover and sway while waiting for the call. */
  idle?: boolean;
  onDone?: () => void;
}

function Face({ side }: { side: CoinSide }) {
  const id = `${useId().replace(/:/g, '')}-${side}`;
  const word = side.toUpperCase();
  return (
    <div className={`${styles.face} ${side === 'tails' ? styles.back : ''}`}>
      <svg viewBox="0 0 100 100" className={styles.faceSvg} aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-metal`} cx="0.38" cy="0.32" r="0.8">
            <stop offset="0" stopColor="#6e5c45" />
            <stop offset="0.45" stopColor="#2f241a" />
            <stop offset="1" stopColor="#0b0806" />
          </radialGradient>
          <path id={`${id}-arc`} d="M50 50m-39 0a39 39 0 1 1 78 0a39 39 0 1 1-78 0" />
        </defs>
        <circle cx="50" cy="50" r="49.5" fill="#160e09" />
        <circle cx="50" cy="50" r="47.5" fill={`url(#${id}-metal)`} stroke="#6d0f12" strokeWidth="1.4" />
        {/* Milled edge */}
        {Array.from({ length: 72 }, (_, i) => (
          <line
            key={i}
            x1="50"
            y1="3.2"
            x2="50"
            y2="6"
            stroke="#000"
            strokeOpacity="0.55"
            strokeWidth="0.7"
            transform={`rotate(${i * 5} 50 50)`}
          />
        ))}
        <text className={styles.rimText}>
          <textPath href={`#${id}-arc`} textLength="240" lengthAdjust="spacing">
            {`${word} ✝ ${word} ✝ ${word} ✝ ${word} ✝`}
          </textPath>
        </text>
        <circle cx="50" cy="50" r="32" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="1.1" />
        <circle cx="50" cy="50" r="31" fill="none" stroke="#a88a5f" strokeOpacity="0.25" strokeWidth="0.6" />
        {side === 'heads' ? (
          <g transform="translate(50 51)">
            <SkullGlyph scale={0.95} bone="#d8c8a8" socket="#0d0704" />
          </g>
        ) : (
          <g className={styles.spiral}>
            <path
              d="M50 50a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0a8 8 0 0 1-16 0a10 10 0 0 1 20 0a12 12 0 0 1-24 0a14 14 0 0 1 28 0"
              fill="none"
              stroke="#c4001e"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </g>
        )}
        {/* Scratches */}
        <path d="M22 30l14 6M64 72l12-9M30 70l6 3" stroke="#000" strokeOpacity="0.35" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

export function Coin({ result = 'heads', flipping, idle, onDone }: Props) {
  const lottie = flipping && hasLottie('coin');
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!lottie) return;
    const t = setTimeout(() => doneRef.current?.(), FLIP_MS);
    return () => clearTimeout(t);
  }, [lottie]);

  if (lottie) return <Anim name="coin" className={styles.lottie} fallback={null} />;

  const finalTurn = 360 * 7 + (result === 'tails' ? 180 : 0);
  return (
    <div className={styles.stage}>
      <div className={styles.spotlight} />
      <div className={`${styles.lift} ${idle && !flipping ? styles.hover : ''}`}>
        <div
          className={`${styles.coin} ${flipping ? styles.flipping : ''}`}
          style={
            {
              '--final': `${finalTurn}deg`,
              '--flip-ms': `${FLIP_MS}ms`,
              transform: flipping ? undefined : `rotateX(${result === 'tails' ? 180 : 0}deg)`,
            } as CSSProperties
          }
          onAnimationEnd={(e) => e.target === e.currentTarget && doneRef.current?.()}
        >
          <Face side="heads" />
          <Face side="tails" />
        </div>
      </div>
      <div className={`${styles.shadow} ${flipping ? styles.shadowFlip : ''}`} />
    </div>
  );
}
