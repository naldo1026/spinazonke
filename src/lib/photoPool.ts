import type { RevealedPhoto } from '../types';
import { randomInt, shuffle } from './random';

/**
 * Brings a player's shuffled pool in line with the photos on disk. Existing
 * order is kept (so the next photo doesn't change between visits), deleted
 * files are dropped, and new files are dropped in at random spots.
 */
export function syncPool(pool: readonly string[], manifest: readonly string[]): string[] {
  const onDisk = new Set(manifest);
  const out = pool.filter((p) => onDisk.has(p));
  const known = new Set(out);
  for (const path of shuffle(manifest.filter((p) => !known.has(p)))) {
    out.splice(randomInt(out.length + 1), 0, path);
  }
  return out;
}

/**
 * Next photo to reveal: the first one in the pool not yet shown. Once every
 * photo has been shown, repeats start with the least-shown ones (picked at
 * random). null if the pool is empty.
 */
export function nextPhoto(pool: readonly string[], revealed: readonly RevealedPhoto[]): string | null {
  if (pool.length === 0) return null;
  const counts = new Map<string, number>();
  for (const r of revealed) counts.set(r.path, (counts.get(r.path) ?? 0) + 1);

  const fresh = pool.find((p) => !counts.has(p));
  if (fresh) return fresh;

  const min = Math.min(...pool.map((p) => counts.get(p) ?? 0));
  const leastShown = pool.filter((p) => (counts.get(p) ?? 0) === min);
  return leastShown[randomInt(leastShown.length)];
}
