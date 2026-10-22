import type { CoinSide } from '../types';

const UINT32_RANGE = 0x1_0000_0000;

function randomUint32(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

/** Unbiased integer in [0, maxExclusive) from crypto.getRandomValues. */
export function randomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new RangeError(`randomInt: bad max ${maxExclusive}`);
  }
  // Rejection sampling: throw away the top sliver of values that would make
  // some results slightly more likely than others with a plain modulo.
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  for (;;) {
    const n = randomUint32();
    if (n < limit) return n % maxExclusive;
  }
}

/** Integer in [min, max], inclusive. */
export function randomRange(min: number, max: number): number {
  return min + randomInt(max - min + 1);
}

/** Float in [0, 1). */
export function randomFloat(): number {
  return randomUint32() / UINT32_RANGE;
}

export function coinFlip(): CoinSide {
  return randomInt(2) === 0 ? 'heads' : 'tails';
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Random id. Avoids crypto.randomUUID, which is missing on plain-http LAN dev URLs. */
export function uid(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}
