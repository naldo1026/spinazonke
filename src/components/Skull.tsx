interface Props {
  /** Drawn about 38 units wide, centred on 0,0. */
  scale?: number;
  bone?: string;
  socket?: string;
  eyes?: string;
}

/** Skull for the coin and the wheel hub. Place it with a parent <g transform>. */
export function SkullGlyph({ scale = 1, bone = '#e8dcc4', socket = '#120a06', eyes = '#ff1f2f' }: Props) {
  return (
    <g transform={`scale(${scale})`}>
      <path
        d="M0 -20c-11 0-19 7.5-19 17.5 0 6 3 10 7 12.5V16h24v-6c4-2.5 7-6.5 7-12.5C19 -12.5 11 -20 0 -20z"
        fill={bone}
      />
      <path d="M-3 -18.5l2 5-3 4 1.5 3" stroke={socket} strokeWidth="0.8" fill="none" opacity="0.55" />
      <ellipse cx="-7" cy="-2" rx="4.6" ry="5.2" fill={socket} />
      <ellipse cx="7" cy="-2" rx="4.6" ry="5.2" fill={socket} />
      <circle cx="-7" cy="-1.5" r="1.4" fill={eyes} />
      <circle cx="7" cy="-1.5" r="1.4" fill={eyes} />
      <path d="M0 3l-2.6 5h5.2z" fill={socket} />
      <path d="M-6 16v-4.5M-2 16v-4.5M2 16v-4.5M6 16v-4.5" stroke={socket} strokeWidth="1.2" />
    </g>
  );
}
