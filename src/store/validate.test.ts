import { describe, expect, it } from 'vitest';
import { createSeedState } from '../data/seed';
import { validateAppState } from './validate';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe('validateAppState', () => {
  it('accepts a seed state and drops any ritual in progress', () => {
    const state = { ...createSeedState(), ritualInProgress: { gameWeek: 8, step: 2, revealDue: false } };
    const res = validateAppState(clone(state));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.ritualInProgress).toBeUndefined();
  });

  it('rejects junk', () => {
    expect(validateAppState(null).ok).toBe(false);
    expect(validateAppState([]).ok).toBe(false);
    expect(validateAppState({ hello: 'world' }).ok).toBe(false);
  });

  it('rejects an unknown loser', () => {
    const state = clone(createSeedState()) as unknown as { gameWeeks: { loser: string }[] };
    state.gameWeeks[0].loser = 'gary';
    const res = validateAppState(state);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/loser/);
  });

  it('rejects duplicate game weeks', () => {
    const state = clone(createSeedState());
    state.gameWeeks[1].gameWeek = 1;
    const res = validateAppState(state);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/twice/);
  });

  it('rejects a missing player', () => {
    const state = clone(createSeedState()) as unknown as { players: Record<string, unknown> };
    delete state.players.kyle;
    expect(validateAppState(state).ok).toBe(false);
  });
});
