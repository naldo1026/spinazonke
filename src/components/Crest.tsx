/** Original Spinazonke crest: a crown over a wheel. Not the PL lion. */
export function Crest({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="crest-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#04F5FF" />
          <stop offset="1" stopColor="#00FF85" />
        </linearGradient>
      </defs>
      <path d="M32 3 56 12v20c0 15-10.5 24.5-24 29C18.5 56.5 8 47 8 32V12z" fill="#37003C" stroke="url(#crest-g)" strokeWidth="3" />
      <path d="M18 30 21 17l6 7 5-11 5 11 6-7 3 13z" fill="#FF2882" />
      <circle cx="32" cy="42" r="10" fill="none" stroke="#fff" strokeWidth="2.5" />
      <path d="M32 32v20M22 42h20M25 35l14 14M39 35 25 49" stroke="#fff" strokeWidth="1.5" />
      <circle cx="32" cy="42" r="2.5" fill="#00FF85" />
    </svg>
  );
}
