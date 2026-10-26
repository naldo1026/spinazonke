import { beforeEach, describe, expect, it } from 'vitest';
import { createSeedState } from '../data/seed';
import { snapshot, useStore } from './store';
import type { PlayerId } from '../types';
import { findEntry, lossesByPlayer, wheelItems } from './selectors';
import { validateAppState } from './validate';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState({ ...createSeedState(), ritualInProgress: undefined });
});

const gw8 = (loser: PlayerId) => findEntry(s().gameWeeks, 8, loser);

describe('recordLoss', () => {
  it('records GW8 and flags Keanen’s 5th loss as an elimination', () => {
    const res = s().recordLoss(8, ['keanan']);
    expect(res).toEqual({ ok: true, eliminated: ['keanan'] });
    expect(lossesByPlayer(s().gameWeeks).keanan).toBe(5);
    expect(gw8('keanan')?.triggeredReveal).toBe(true);
  });

  it('is not an elimination for anyone else', () => {
    expect(s().recordLoss(8, ['kyle'])).toEqual({ ok: true, eliminated: [] });
  });

  it('rejects duplicates and out-of-range weeks', () => {
    // GW7's legacy loser is Keanen.
    expect(s().recordLoss(7, ['keanan']).ok).toBe(false);
    expect(s().recordLoss(0, ['kyle']).ok).toBe(false);
    expect(s().recordLoss(39, ['kyle']).ok).toBe(false);
    expect(s().recordLoss(8, []).ok).toBe(false);
    expect(s().recordLoss(8, ['kyle', 'kyle']).ok).toBe(false);
  });

  it('records a tie as one entry per loser', () => {
    const res = s().recordLoss(8, ['ronaldo', 'kyle']);
    expect(res).toEqual({ ok: true, eliminated: [] });
    expect(lossesByPlayer(s().gameWeeks)).toEqual({ ronaldo: 2, kyle: 3, keanan: 4 });
    expect(s().gameWeeks.filter((g) => g.gameWeek === 8).map((g) => g.loser)).toEqual(['ronaldo', 'kyle']);
  });

  it('lets a second loser join a week later, but not the same one twice', () => {
    s().recordLoss(8, ['ronaldo']);
    expect(s().recordLoss(8, ['ronaldo']).ok).toBe(false);
    expect(s().recordLoss(8, ['kyle']).ok).toBe(true);
  });

  it('records none of a tie if one of them fails', () => {
    s().recordLoss(8, ['kyle']);
    expect(s().recordLoss(8, ['ronaldo', 'kyle']).ok).toBe(false);
    expect(gw8('ronaldo')).toBeUndefined();
  });

  it('only flags the tied loser whose 5th loss it was', () => {
    const res = s().recordLoss(8, ['keanan', 'kyle']);
    expect(res).toEqual({ ok: true, eliminated: ['keanan'] });
    expect(gw8('keanan')?.triggeredReveal).toBe(true);
    expect(gw8('kyle')?.triggeredReveal).toBeUndefined();
  });
});

describe('history edits', () => {
  it('recalculates totals and elimination flags', () => {
    s().recordLoss(8, ['keanan']);
    // Move one of Keanen's legacy losses to Kyle: GW8 is now only his 4th.
    const legacyKeanen = s().gameWeeks.find((g) => g.loser === 'keanan' && g.legacy)!.gameWeek;
    s().updateLoser(legacyKeanen, 'keanan', 'kyle');
    expect(lossesByPlayer(s().gameWeeks)).toEqual({ ronaldo: 1, kyle: 3, keanan: 4 });
    expect(gw8('keanan')?.triggeredReveal).toBeUndefined();

    s().deleteGameWeek(8, 'keanan');
    expect(s().gameWeeks).toHaveLength(7);
  });

  it('edits one side of a tie without touching the other', () => {
    s().recordLoss(8, ['ronaldo', 'kyle']);
    // Can't move Ronaldo's loss onto Kyle, he already has one that week.
    s().updateLoser(8, 'ronaldo', 'kyle');
    expect(gw8('ronaldo')).toBeDefined();

    s().updateLoser(8, 'ronaldo', 'keanan');
    expect(gw8('ronaldo')).toBeUndefined();
    expect(gw8('keanan')).toBeDefined();

    s().deleteGameWeek(8, 'keanan');
    expect(gw8('kyle')).toBeDefined();
    expect(s().gameWeeks).toHaveLength(8);
  });
});

describe('consequences', () => {
  it('links a pay-to-play add to the game week', () => {
    s().recordLoss(8, ['ronaldo', 'kyle']);
    const id = s().addConsequence('  Sing in the kitchen  ', 'kyle', { gameWeek: 8, loser: 'kyle' });
    const c = s().consequences.find((x) => x.id === id)!;
    expect(c).toMatchObject({ text: 'Sing in the kitchen', createdBy: 'kyle', onWheel: true, archived: false });
    expect(gw8('kyle')?.addedConsequenceIds).toEqual([id]);
    expect(gw8('ronaldo')?.addedConsequenceIds).toEqual([]);
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
    s().recordLoss(8, ['kyle']);
    const before = s().consequences.length;
    const removed = wheelItems(s().consequences)
      .slice(0, 3)
      .map((c) => c.id);
    s().applyCoinToss(
      { gameWeek: 8, loser: 'kyle' },
      { played: true, call: 'heads', result: 'tails', winner: 'others', removedConsequenceIds: removed },
    );
    expect(s().consequences).toHaveLength(before);
    for (const id of removed) expect(s().consequences.find((c) => c.id === id)?.onWheel).toBe(false);
    expect(gw8('kyle')?.coinToss?.removedConsequenceIds).toEqual(removed);
  });

  it('counts a landing once even if committed twice', () => {
    s().recordLoss(8, ['kyle']);
    const id = s().consequences[2].id;
    s().commitSpin({ gameWeek: 8, loser: 'kyle' }, id);
    s().commitSpin({ gameWeek: 8, loser: 'kyle' }, id);
    expect(s().consequences[2].timesLanded).toBe(1);
    expect(gw8('kyle')?.landedConsequenceId).toBe(id);
  });

  it('gives each tied loser their own spin', () => {
    s().recordLoss(8, ['ronaldo', 'kyle']);
    const id = s().consequences[2].id;
    s().commitSpin({ gameWeek: 8, loser: 'ronaldo' }, id);
    s().commitSpin({ gameWeek: 8, loser: 'kyle' }, id);
    expect(s().consequences[2].timesLanded).toBe(2);
    expect(gw8('kyle')?.landedConsequenceId).toBe(id);
  });
});

describe('nextLoser', () => {
  it('hands a tie to the next loser at step 2 with a clean slate', () => {
    s().recordLoss(8, ['ronaldo', 'keanan']);
    s().startRitual(8);
    s().updateRitual({
      step: 6,
      loser: 'ronaldo',
      queue: ['keanan'],
      revealDue: false,
      toss: { phase: 'pick', call: 'heads', result: 'heads', winner: 'loser' },
      spin: { segmentIds: ['a'], targetId: 'a', rotation: 10, durationMs: 1, committed: true },
    });
    s().nextLoser();
    // GW8 was Keanen's 5th, so his turn ends in a reveal.
    expect(s().ritualInProgress).toEqual({ gameWeek: 8, step: 2, loser: 'keanan', revealDue: true });
  });

  it('does nothing without a queue', () => {
    s().startRitual(8);
    s().updateRitual({ step: 6, loser: 'kyle' });
    s().nextLoser();
    expect(s().ritualInProgress?.step).toBe(6);
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
    s().recordLoss(8, ['keanan', 'ronaldo']);
    const json = JSON.parse(JSON.stringify(snapshot()));
    const res = validateAppState(json);
    expect(res.ok).toBe(true);
  });
});
