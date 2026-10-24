import { beforeEach, describe, expect, it } from 'vitest';
import { createSeedState } from '../data/seed';
import { snapshot, useStore } from './store';
import { lossesByPlayer, wheelItems } from './selectors';
import { validateAppState } from './validate';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState({ ...createSeedState(), ritualInProgress: undefined });
});

describe('recordLoss', () => {
  it('records GW8 and flags Keanen’s 5th loss as an elimination', () => {
    const res = s().recordLoss(8, 'keanan');
    expect(res).toEqual({ ok: true, eliminated: true });
    expect(lossesByPlayer(s().gameWeeks).keanan).toBe(5);
    expect(s().gameWeeks.find((g) => g.gameWeek === 8)?.triggeredReveal).toBe(true);
  });

  it('is not an elimination for anyone else', () => {
    expect(s().recordLoss(8, 'kyle')).toEqual({ ok: true, eliminated: false });
  });

  it('rejects duplicates and out-of-range weeks', () => {
    expect(s().recordLoss(7, 'kyle').ok).toBe(false);
    expect(s().recordLoss(0, 'kyle').ok).toBe(false);
    expect(s().recordLoss(39, 'kyle').ok).toBe(false);
  });
});

describe('history edits', () => {
  it('recalculates totals and elimination flags', () => {
    s().recordLoss(8, 'keanan');
    // Move one of Keanen's legacy losses to Kyle: GW8 is now only his 4th.
    const legacyKeanen = s().gameWeeks.find((g) => g.loser === 'keanan' && g.legacy)!.gameWeek;
    s().updateLoser(legacyKeanen, 'kyle');
    expect(lossesByPlayer(s().gameWeeks)).toEqual({ ronaldo: 1, kyle: 3, keanan: 4 });
    expect(s().gameWeeks.find((g) => g.gameWeek === 8)?.triggeredReveal).toBeUndefined();

    s().deleteGameWeek(8);
    expect(s().gameWeeks).toHaveLength(7);
  });
});

describe('consequences', () => {
  it('links a pay-to-play add to the game week', () => {
    s().recordLoss(8, 'kyle');
    const id = s().addConsequence('  Sing in the kitchen  ', 'kyle', 8);
    const c = s().consequences.find((x) => x.id === id)!;
    expect(c).toMatchObject({ text: 'Sing in the kitchen', createdBy: 'kyle', onWheel: true, archived: false });
    expect(s().gameWeeks.find((g) => g.gameWeek === 8)?.addedConsequenceIds).toEqual([id]);
  });

  it('archives off the wheel and restores to the bank', () => {
    const id = s().consequences[0].id;
    s().archiveConsequence(id);
    expect(s().consequences[0]).toMatchObject({ archived: true, onWheel: false });
    s().restoreConsequence(id);
    expect(s().consequences[0]).toMatchObject({ archived: false, onWheel: false });
  });
});

describe('coin toss and spin', () => {
  it('takes the removed 3 off the wheel without deleting them', () => {
    s().recordLoss(8, 'kyle');
    const before = s().consequences.length;
    const removed = wheelItems(s().consequences)
      .slice(0, 3)
      .map((c) => c.id);
    s().applyCoinToss(8, { played: true, call: 'heads', result: 'tails', winner: 'others', removedConsequenceIds: removed });
    expect(s().consequences).toHaveLength(before);
    for (const id of removed) expect(s().consequences.find((c) => c.id === id)?.onWheel).toBe(false);
    expect(s().gameWeeks.find((g) => g.gameWeek === 8)?.coinToss?.removedConsequenceIds).toEqual(removed);
  });

  it('counts a landing once even if committed twice', () => {
    s().recordLoss(8, 'kyle');
    const id = s().consequences[2].id;
    s().commitSpin(8, id);
    s().commitSpin(8, id);
    expect(s().consequences[2].timesLanded).toBe(1);
    expect(s().gameWeeks.find((g) => g.gameWeek === 8)?.landedConsequenceId).toBe(id);
  });
});

describe('photo reveals', () => {
  it('returns null with no photos and records nothing', () => {
    expect(s().revealPhoto('keanan', 8)).toBeNull();
    expect(s().players.keanan.revealedPhotos).toEqual([]);
  });

  it('uses a different photo each time', () => {
    useStore.setState({
      players: { ...s().players, keanan: { ...s().players.keanan, photoPool: ['p/1.jpg', 'p/2.jpg'] } },
    });
    const a = s().revealPhoto('keanan', 8);
    const b = s().revealPhoto('keanan', 13);
    expect(a).not.toBeNull();
    expect(b).not.toBe(a);
    expect(s().players.keanan.revealedPhotos.map((r) => r.gameWeek)).toEqual([8, 13]);
  });
});

describe('export/import round trip', () => {
  it('validates its own snapshot', () => {
    s().recordLoss(8, 'keanan');
    const json = JSON.parse(JSON.stringify(snapshot()));
    const res = validateAppState(json);
    expect(res.ok).toBe(true);
  });
});
