import { describe, expect, it } from 'vitest';
import { segmentAtPointer, segmentColours, targetRotation, truncate } from './wheelMath';

describe('targetRotation', () => {
  it('lands the pointer on the chosen segment for every wheel size', () => {
    for (let n = 1; n <= 20; n++) {
      for (let index = 0; index < n; index++) {
        for (const jitter of [-0.5, -0.25, 0, 0.25, 0.4999]) {
          for (const turns of [5, 6, 8]) {
            const r = targetRotation(index, n, turns, jitter);
            expect(segmentAtPointer(r, n)).toBe(index);
          }
        }
      }
    }
  });

  it('always spins forward by at least the requested turns', () => {
    for (let n = 2; n <= 12; n++) {
      const from = 1234.5;
      const r = targetRotation(n - 1, n, 5, 0, from);
      expect(r - from).toBeGreaterThanOrEqual(5 * 360);
      expect(r - from).toBeLessThan(6 * 360);
      expect(segmentAtPointer(r, n)).toBe(n - 1);
    }
  });
});

describe('segmentAtPointer', () => {
  it('reads segment 0 at rest', () => {
    expect(segmentAtPointer(0.01, 4)).toBe(3); // nudged clockwise: last segment slides under the pointer
    expect(segmentAtPointer(-0.01, 4)).toBe(0);
    expect(segmentAtPointer(-45, 4)).toBe(0);
  });
});

describe('segmentColours', () => {
  it('never puts the same colour next to itself, including the wrap-around', () => {
    for (let n = 2; n <= 21; n++) {
      const c = segmentColours(n, 4);
      for (let i = 0; i < n; i++) expect(c[i]).not.toBe(c[(i + 1) % n]);
    }
  });
});

describe('truncate', () => {
  it('adds an ellipsis only when needed', () => {
    expect(truncate('Short one', 20)).toBe('Short one');
    const cut = truncate('Wear a rival shirt for a whole day', 12);
    expect(cut).toBe('Wear a riva…');
    expect(cut.length).toBeLessThanOrEqual(12);
  });
});
