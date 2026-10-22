import { describe, expect, it } from 'vitest';
import type { GameWeekEntry, PlayerId } from '../types';
import { createSeedState } from '../data/seed';
import {
  heartsLeft,
  isElimination,
  leaderboard,
  lossesByPlayer,
  nextGameWeek,
  owedReveals,
  revealsDue,
} from './selectors';

const gw = (gameWeek: number, loser: PlayerId): GameWeekEntry => ({
  gameWeek,
  loser,
  recordedAt: '',
  addedConsequenceIds: [],
});

describe('seed state', () => {
  const seed = createSeedState();

  it('has Ronaldo 1, Kyle 2, Keanan 4 over GW1–7', () => {
    expect(lossesByPlayer(seed.gameWeeks)).toEqual({ ronaldo: 1, kyle: 2, keanan: 4 });
    expect(seed.gameWeeks.map((g) => g.gameWeek)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(seed.gameWeeks.every((g) => g.legacy)).toBe(true);
  });

  it('starts at GW8', () => {
    expect(nextGameWeek(seed.gameWeeks)).toBe(8);
  });

  it('leaves Keanan on a final heart', () => {
    expect(heartsLeft(4)).toBe(1);
    expect(heartsLeft(1)).toBe(4);
  });

  it('puts at least 4 consequences on the wheel', () => {
    expect(seed.consequences.filter((c) => c.onWheel).length).toBeGreaterThanOrEqual(4);
  });
});

describe('hearts and reveals', () => {
  it('refills to 5 straight after an elimination', () => {
    expect(heartsLeft(0)).toBe(5);
    expect(heartsLeft(5)).toBe(5);
    expect(heartsLeft(9)).toBe(1);
    expect(heartsLeft(10)).toBe(5);
  });

  it('flags every multiple of 5', () => {
    expect([4, 5, 6, 10, 15].map(isElimination)).toEqual([false, true, false, true, true]);
    expect(isElimination(0)).toBe(false);
    expect(revealsDue(14)).toBe(2);
  });
});

describe('nextGameWeek', () => {
  it('is last + 1, even with gaps', () => {
    expect(nextGameWeek([gw(1, 'kyle'), gw(5, 'kyle')])).toBe(6);
    expect(nextGameWeek([])).toBe(1);
  });

  it('is null after GW38', () => {
    expect(nextGameWeek([gw(38, 'kyle')])).toBeNull();
  });
});

describe('leaderboard', () => {
  it('sorts most losses first and marks ties for biggest loser', () => {
    const rows = leaderboard([gw(1, 'kyle'), gw(2, 'keanan'), gw(3, 'kyle'), gw(4, 'keanan')]);
    expect(rows.map((r) => r.id)).toEqual(['kyle', 'keanan', 'ronaldo']);
    expect(rows.map((r) => r.biggestLoser)).toEqual([true, true, false]);
  });
});

describe('owedReveals', () => {
  it('finds an unrevealed elimination and the GW it happened in', () => {
    const seed = createSeedState();
    const gameWeeks = [...seed.gameWeeks, gw(8, 'kyle'), gw(9, 'keanan')];
    expect(owedReveals({ players: seed.players, gameWeeks })).toEqual([{ player: 'keanan', gameWeek: 9 }]);
  });

  it('is empty once the photo is out', () => {
    const seed = createSeedState();
    const gameWeeks = [...seed.gameWeeks, gw(8, 'keanan')];
    const players = {
      ...seed.players,
      keanan: { ...seed.players.keanan, revealedPhotos: [{ path: 'x', gameWeek: 8, revealedAt: '' }] },
    };
    expect(owedReveals({ players, gameWeeks })).toEqual([]);
  });
});
