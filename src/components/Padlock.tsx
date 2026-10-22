import { Anim } from './Anim';
import styles from './Padlock.module.css';

function PadlockSvg({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 120 150" className={`${styles.svg} ${open ? styles.open : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id="lock-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF2882" />
          <stop offset="1" stopColor="#a3004f" />
        </linearGradient>
        <linearGradient id="lock-open" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#00FF85" />
          <stop offset="1" stopColor="#00a85a" />
        </linearGradient>
      </defs>
      <g className={styles.shackle}>
        <path d="M32 70V46a28 28 0 0 1 56 0v24" fill="none" stroke="#e8e8f0" strokeWidth="12" strokeLinecap="round" />
      </g>
      <rect x="14" y="66" width="92" height="74" rx="14" fill={open ? 'url(#lock-open)' : 'url(#lock-body)'} />
      <rect x="14" y="66" width="92" height="74" rx="14" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="60" cy="96" r="9" fill="#37003C" />
      <rect x="56" y="100" width="8" height="20" rx="3" fill="#37003C" />
    </svg>
  );
}

/** Locked until `open`. The Lottie slot plays once when it opens. */
export function Padlock({ open }: { open: boolean }) {
  return (
    <div className={styles.wrap} aria-label={open ? 'Wheel unlocked' : 'Wheel locked'} role="img">
      {open ? <Anim name="padlock" className={styles.lottie} fallback={<PadlockSvg open />} /> : <PadlockSvg open={false} />}
    </div>
  );
}
