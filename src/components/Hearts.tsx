import { LIVES } from '../store/selectors';
import { Anim } from './Anim';
import { HeartShape } from './Icons';
import styles from './Hearts.module.css';

interface Props {
  /** Full hearts left. */
  filled: number;
  /** Index of a heart that's breaking right now (plays once). */
  breakingIndex?: number;
  size?: number;
}

function BrokenHeart({ size }: { size: number }) {
  return (
    <span className={styles.breaking} style={{ width: size, height: size }}>
      <HeartShape size={size} filled={false} className={styles.empty} />
      <HeartShape size={size} filled className={`${styles.half} ${styles.left}`} />
      <HeartShape size={size} filled className={`${styles.half} ${styles.right}`} />
    </span>
  );
}

export function Hearts({ filled, breakingIndex, size = 22 }: Props) {
  return (
    <div className={styles.hearts} role="img" aria-label={`${filled} of ${LIVES} lives left`}>
      {Array.from({ length: LIVES }, (_, i) =>
        i === breakingIndex ? (
          <Anim
            key={i}
            name="heartbreak"
            className={styles.lottie}
            fallback={<BrokenHeart size={size} />}
          />
        ) : (
          <HeartShape key={i} size={size} filled={i < filled} className={i < filled ? styles.full : styles.empty} />
        ),
      )}
    </div>
  );
}
