import { describe, expect, it } from 'vitest';
import { coinFlip, randomInt, randomRange, shuffle, uid } from './random';

describe('randomInt', () => {
  it('stays in range and hits every value', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      seen.add(n);
    }
    expect(seen.size).toBe(7);
  });

  it('is roughly uniform', () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) counts[randomInt(3)]++;
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(600);
  });

  it('rejects bad bounds', () => {
    expect(() => randomInt(0)).toThrow();
    expect(() => randomInt(1.5)).toThrow();
  });
});

describe('randomRange', () => {
  it('is inclusive at both ends', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randomRange(5, 8));
    expect([...seen].sort()).toEqual([5, 6, 7, 8]);
  });
});

describe('coinFlip', () => {
  it('is close to 50/50', () => {
    let heads = 0;
    for (let i = 0; i < 20000; i++) if (coinFlip() === 'heads') heads++;
    expect(Math.abs(heads - 10000)).toBeLessThan(500);
  });
});

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input);
    expect(out.slice().sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('uid', () => {
  it('makes distinct hex ids', () => {
    const ids = new Set(Array.from({ length: 500 }, uid));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});
