import { describe, expect, it } from 'vitest';
import type { RevealedPhoto } from '../types';
import { nextPhoto, syncPool } from './photoPool';

const shown = (...paths: string[]): RevealedPhoto[] =>
  paths.map((path, i) => ({ path, gameWeek: i + 1, revealedAt: '2026-01-01T00:00:00Z' }));

describe('syncPool', () => {
  it('fills an empty pool with every photo on disk', () => {
    const pool = syncPool([], ['a', 'b', 'c']);
    expect(pool.slice().sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps existing order, drops deleted files and adds new ones', () => {
    const pool = syncPool(['c', 'a', 'b'], ['a', 'c', 'd']);
    expect(pool.filter((p) => p !== 'd')).toEqual(['c', 'a']);
    expect(pool).toContain('d');
    expect(pool).toHaveLength(3);
  });
});

describe('nextPhoto', () => {
  it('returns null with no photos', () => {
    expect(nextPhoto([], [])).toBeNull();
  });

  it('takes the first unrevealed photo in pool order', () => {
    expect(nextPhoto(['x', 'y', 'z'], shown('x'))).toBe('y');
  });

  it('never repeats until the pool is used up', () => {
    const pool = ['a', 'b', 'c'];
    const revealed: RevealedPhoto[] = [];
    for (let i = 0; i < 3; i++) {
      const p = nextPhoto(pool, revealed)!;
      expect(revealed.map((r) => r.path)).not.toContain(p);
      revealed.push(...shown(p));
    }
  });

  it('repeats the least-shown photo once exhausted', () => {
    const p = nextPhoto(['a', 'b'], shown('a', 'b', 'a'));
    expect(p).toBe('b');
  });
});
