// Angles are in degrees, measured clockwise from 12 o'clock, where the pointer sits.
// Segment i covers [i * seg, (i + 1) * seg) on the unrotated wheel.

export function segmentSize(count: number): number {
  return 360 / count;
}

function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Which segment sits under the pointer after the wheel is rotated clockwise by `rotation`. */
export function segmentAtPointer(rotation: number, count: number): number {
  // Turning the wheel clockwise by R brings the wheel angle -R up to the pointer.
  const underPointer = mod360(-rotation);
  return Math.floor(underPointer / segmentSize(count)) % count;
}

/**
 * Final rotation that spins `fullTurns` times past `from` and stops with the
 * pointer inside segment `index`. `jitter` in [-0.5, 0.5) nudges the stop
 * point off-centre (scaled to stay clear of the segment edges) so it doesn't
 * always land dead centre.
 */
export function targetRotation(index: number, count: number, fullTurns: number, jitter = 0, from = 0): number {
  const seg = segmentSize(count);
  const stopAngle = (index + 0.5 + jitter * 0.8) * seg;
  const base = from + fullTurns * 360;
  const delta = mod360(mod360(-stopAngle) - mod360(base));
  return base + delta;
}

/** Point on a circle of radius r at `deg` clockwise from 12 o'clock (SVG coords, y down). */
export function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
}

/** SVG path for a pie slice. */
export function slicePath(index: number, count: number, r: number): string {
  const seg = segmentSize(count);
  const [x0, y0] = polar(r, index * seg);
  const [x1, y1] = polar(r, (index + 1) * seg);
  const largeArc = seg > 180 ? 1 : 0;
  return `M0 0 L${x0.toFixed(3)} ${y0.toFixed(3)} A${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`;
}

/**
 * Colour index per segment, cycling through `paletteSize` colours without the
 * last segment matching the first (they touch at 12 o'clock).
 */
export function segmentColours(count: number, paletteSize: number): number[] {
  const out = Array.from({ length: count }, (_, i) => i % paletteSize);
  if (count > 1 && out[count - 1] === out[0]) {
    // Pick a colour unlike both neighbours.
    const prev = out[count - 2];
    out[count - 1] = [...Array(paletteSize).keys()].find((c) => c !== out[0] && c !== prev) ?? out[count - 1];
  }
  return out;
}

export function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/**
 * Breaks a label between words into at most `maxLines` lines of `max`
 * characters. Whatever doesn't fit ends the last line with an ellipsis.
 */
export function wrapLabel(text: string, max: number, maxLines = 2): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= max || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return lines.map((l) => truncate(l, max));
  const kept = lines.slice(0, maxLines - 1).map((l) => truncate(l, max));
  return [...kept, truncate(lines.slice(maxLines - 1).join(' '), max)];
}
