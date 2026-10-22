import { Anim } from './Anim';

function FootballSvg({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ animation: 'spin 1s linear infinite', display: 'block' }}
    >
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#37003C" strokeWidth="4" />
      <path d="M50 30 69 44 62 66H38L31 44z" fill="#37003C" />
      <path
        d="M50 4v26M69 44l24-8M62 66l15 21M38 66 23 87M31 44 7 36"
        stroke="#37003C"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Spinning-football loader (Lottie slot: "football"). */
export function Football({ size = 48 }: { size?: number }) {
  return (
    <div role="status" aria-label="Loading" style={{ width: size, height: size, margin: '0 auto' }}>
      <Anim name="football" loop fallback={<FootballSvg size={size} />} />
    </div>
  );
}
