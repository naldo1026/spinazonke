import { useEffect, useRef, type CSSProperties } from 'react';
import type { CoinSide } from '../types';
import { Anim, hasLottie } from './Anim';
import styles from './Coin.module.css';

export const FLIP_MS = 2600;

interface Props {
  /** Face to land on (and show when idle). */
  result?: CoinSide;
  flipping: boolean;
  onDone?: () => void;
}

function Face({ side }: { side: CoinSide }) {
  return (
    <div className={`${styles.face} ${side === 'heads' ? styles.heads : styles.tails}`}>
      {side === 'heads' ? (
        <svg viewBox="0 0 100 100" className={styles.emblem} aria-hidden="true">
          <path d="M22 62 27 34l12 13 11-23 11 23 12-13 5 28z" fill="#00FF85" />
          <rect x="22" y="66" width="56" height="8" rx="3" fill="#fff" />
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" className={styles.emblem} aria-hidden="true">
          <circle cx="50" cy="50" r="26" fill="#fff" />
          <path d="M50 36 62 45 58 59H42L38 45z" fill="#37003C" />
          <path d="M50 24v12M62 45l12-4M58 59l7 10M42 59l-7 10M38 45l-12-4" stroke="#37003C" strokeWidth="3" />
        </svg>
      )}
      <span className={styles.word}>{side}</span>
    </div>
  );
}

export function Coin({ result = 'heads', flipping, onDone }: Props) {
  const lottie = flipping && hasLottie('coin');
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!lottie) return;
    const t = setTimeout(() => doneRef.current?.(), FLIP_MS);
    return () => clearTimeout(t);
  }, [lottie]);

  if (lottie) return <Anim name="coin" className={styles.lottie} fallback={null} />;

  const finalTurn = 360 * 6 + (result === 'tails' ? 180 : 0);
  return (
    <div className={styles.stage}>
      <div
        className={`${styles.coin} ${flipping ? styles.flipping : ''}`}
        style={
          {
            '--final': `${finalTurn}deg`,
            '--flip-ms': `${FLIP_MS}ms`,
            transform: flipping ? undefined : `rotateX(${result === 'tails' ? 180 : 0}deg)`,
          } as CSSProperties
        }
        onAnimationEnd={() => onDone?.()}
      >
        <Face side="heads" />
        <Face side="tails" />
      </div>
      <div className={`${styles.shadow} ${flipping ? styles.shadowFlip : ''}`} />
    </div>
  );
}
