import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AppState, CoinToss, GameWeekEntry, PlayerId, RitualState } from '../types';
import { PLAYER_IDS } from '../types';
import { createSeedState, STATE_VERSION } from '../data/seed';
import { PLAYERS } from '../data/players';
import { PHOTO_MANIFEST } from '../data/photos';
import { nextPhoto, syncPool } from '../lib/photoPool';
import { uid } from '../lib/random';
import { findEntry, LIVES, MAX_GAME_WEEK } from './selectors';

export const STORAGE_KEY = 'spinazonke:v1';

// localStorage can throw (private mode, storage full, blocked). Fall back to
// memory so the app still works for the session.
const memory = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};

/** `eliminated` lists the losers whose loss was their 5th, 10th… */
export type RecordResult = { ok: true; eliminated: PlayerId[] } | { ok: false; error: string };

/** One loser's entry. A tied game week has one entry per loser. */
export interface EntryKey {
  gameWeek: number;
  loser: PlayerId;
}

interface Actions {
  /** Records every loser for the week, or none of them if any would fail. */
  recordLoss(gameWeek: number, losers: PlayerId[]): RecordResult;
  updateLoser(gameWeek: number, from: PlayerId, to: PlayerId): void;
  deleteGameWeek(gameWeek: number, loser: PlayerId): void;

  /** Adds to the bank (on the wheel). Pass `entry` when it's the pay-to-play add. Returns the id. */
  addConsequence(text: string, createdBy?: PlayerId, entry?: EntryKey): string;
  editConsequence(id: string, text: string): void;
  setOnWheel(id: string, onWheel: boolean): void;
  archiveConsequence(id: string): void;
  restoreConsequence(id: string): void;
  deleteConsequence(id: string): void;

  applyCoinToss(entry: EntryKey, toss: CoinToss): void;
  commitSpin(entry: EntryKey, consequenceId: string): void;
  /** Records the next photo for the player. Returns its path, or null if they have no photos. */
  revealPhoto(player: PlayerId, gameWeek: number): string | null;
  syncPhotoPools(): void;

  startRitual(gameWeek: number): void;
  updateRitual(patch: Partial<RitualState>): void;
  /** Hands the ritual to the next tied loser, back at step 2. */
  nextLoser(): void;
  endRitual(): void;

  setMuted(muted: boolean): void;
  setVolume(volume: number): void;

  importState(state: AppState): void;
  resetAll(): void;
}

export type Store = AppState & Actions;

export function gameWeekError(gameWeek: number, loser: PlayerId, gameWeeks: readonly GameWeekEntry[]): string | null {
  if (!Number.isInteger(gameWeek) || gameWeek < 1 || gameWeek > MAX_GAME_WEEK) {
    return `Game week must be between 1 and ${MAX_GAME_WEEK}.`;
  }
  if (findEntry(gameWeeks, gameWeek, loser)) return `${PLAYERS[loser].name} already lost GW${gameWeek}.`;
  return null;
}

const entryId = (gw: EntryKey) => `${gw.gameWeek}:${gw.loser}`;

/** Recomputes `triggeredReveal` so it stays right after edits: true on each player's 5th, 10th… loss. */
function withRevealFlags(gameWeeks: GameWeekEntry[]): GameWeekEntry[] {
  const counts = { ronaldo: 0, kyle: 0, keanan: 0 } as Record<PlayerId, number>;
  const flagged = new Set<string>();
  for (const gw of gameWeeks.slice().sort((a, b) => a.gameWeek - b.gameWeek)) {
    counts[gw.loser] += 1;
    if (counts[gw.loser] % LIVES === 0) flagged.add(entryId(gw));
  }
  return gameWeeks
    .map((gw) => {
      const triggered = flagged.has(entryId(gw));
      if (Boolean(gw.triggeredReveal) === triggered) return gw;
      const { triggeredReveal: _, ...rest } = gw;
      return triggered ? { ...rest, triggeredReveal: true } : rest;
    })
    .sort((a, b) => a.gameWeek - b.gameWeek);
}

function mapEntry(gameWeeks: GameWeekEntry[], key: EntryKey, fn: (gw: GameWeekEntry) => GameWeekEntry) {
  return gameWeeks.map((gw) => (entryId(gw) === entryId(key) ? fn(gw) : gw));
}

function pickState(s: Store): AppState {
  return {
    version: s.version,
    players: s.players,
    consequences: s.consequences,
    gameWeeks: s.gameWeeks,
    ritualInProgress: s.ritualInProgress,
    settings: s.settings,
  };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createSeedState(),

      recordLoss(gameWeek, losers) {
        if (losers.length === 0) return { ok: false, error: 'Pick who lost.' };
        if (new Set(losers).size !== losers.length) return { ok: false, error: 'Someone is picked twice.' };
        for (const loser of losers) {
          const error = gameWeekError(gameWeek, loser, get().gameWeeks);
          if (error) return { ok: false, error };
        }
        const recordedAt = new Date().toISOString();
        const entries: GameWeekEntry[] = losers.map((loser) => ({ gameWeek, loser, recordedAt, addedConsequenceIds: [] }));
        const gameWeeks = withRevealFlags([...get().gameWeeks, ...entries]);
        set({ gameWeeks });
        const eliminated = losers.filter((loser) => findEntry(gameWeeks, gameWeek, loser)?.triggeredReveal);
        return { ok: true, eliminated };
      },

      updateLoser(gameWeek, from, to) {
        // A player can't lose the same week twice.
        if (findEntry(get().gameWeeks, gameWeek, to)) return;
        set((s) => ({
          gameWeeks: withRevealFlags(mapEntry(s.gameWeeks, { gameWeek, loser: from }, (gw) => ({ ...gw, loser: to }))),
        }));
      },

      deleteGameWeek(gameWeek, loser) {
        const key = entryId({ gameWeek, loser });
        set((s) => ({ gameWeeks: withRevealFlags(s.gameWeeks.filter((gw) => entryId(gw) !== key)) }));
      },

      addConsequence(text, createdBy, entry) {
        const id = uid();
        set((s) => ({
          consequences: [
            ...s.consequences,
            {
              id,
              text: text.trim(),
              ...(createdBy ? { createdBy } : {}),
              createdAt: new Date().toISOString(),
              onWheel: true,
              archived: false,
              timesLanded: 0,
            },
          ],
          gameWeeks:
            entry === undefined
              ? s.gameWeeks
              : mapEntry(s.gameWeeks, entry, (gw) => ({
                  ...gw,
                  addedConsequenceIds: [...gw.addedConsequenceIds, id],
                })),
        }));
        return id;
      },

      editConsequence(id, text) {
        set((s) => ({ consequences: s.consequences.map((c) => (c.id === id ? { ...c, text: text.trim() } : c)) }));
      },

      setOnWheel(id, onWheel) {
        set((s) => ({ consequences: s.consequences.map((c) => (c.id === id ? { ...c, onWheel } : c)) }));
      },

      archiveConsequence(id) {
        set((s) => ({
          consequences: s.consequences.map((c) => (c.id === id ? { ...c, archived: true, onWheel: false } : c)),
        }));
      },

      restoreConsequence(id) {
        set((s) => ({ consequences: s.consequences.map((c) => (c.id === id ? { ...c, archived: false } : c)) }));
      },

      deleteConsequence(id) {
        set((s) => ({ consequences: s.consequences.filter((c) => c.id !== id) }));
      },

      applyCoinToss(entry, toss) {
        const removed = new Set(toss.removedConsequenceIds);
        set((s) => ({
          // Removed items go back to the bank, off the wheel. Never deleted.
          consequences: s.consequences.map((c) => (removed.has(c.id) ? { ...c, onWheel: false } : c)),
          gameWeeks: mapEntry(s.gameWeeks, entry, (gw) => ({ ...gw, coinToss: toss })),
        }));
      },

      commitSpin(key, consequenceId) {
        const entry = findEntry(get().gameWeeks, key.gameWeek, key.loser);
        if (!entry || entry.landedConsequenceId) return; // already counted
        set((s) => ({
          consequences: s.consequences.map((c) =>
            c.id === consequenceId ? { ...c, timesLanded: c.timesLanded + 1 } : c,
          ),
          gameWeeks: mapEntry(s.gameWeeks, key, (gw) => ({ ...gw, landedConsequenceId: consequenceId })),
        }));
      },

      revealPhoto(player, gameWeek) {
        const p = get().players[player];
        const path = nextPhoto(p.photoPool, p.revealedPhotos);
        if (!path) return null;
        set((s) => ({
          players: {
            ...s.players,
            [player]: {
              ...p,
              revealedPhotos: [...p.revealedPhotos, { path, gameWeek, revealedAt: new Date().toISOString() }],
            },
          },
        }));
        return path;
      },

      syncPhotoPools() {
        const players = { ...get().players };
        let changed = false;
        for (const id of PLAYER_IDS) {
          const pool = syncPool(players[id].photoPool, PHOTO_MANIFEST[id]);
          if (pool.join('|') !== players[id].photoPool.join('|')) {
            players[id] = { ...players[id], photoPool: pool };
            changed = true;
          }
        }
        if (changed) set({ players });
      },

      startRitual(gameWeek) {
        set({ ritualInProgress: { gameWeek, step: 1, revealDue: false } });
      },

      updateRitual(patch) {
        set((s) => (s.ritualInProgress ? { ritualInProgress: { ...s.ritualInProgress, ...patch } } : {}));
      },

      nextLoser() {
        const r = get().ritualInProgress;
        const [loser, ...queue] = r?.queue ?? [];
        if (!r || !loser) return;
        const entry = findEntry(get().gameWeeks, r.gameWeek, loser);
        // Built fresh so the last loser's toss, spin and reveal don't carry over.
        set({
          ritualInProgress: {
            gameWeek: r.gameWeek,
            step: 2,
            loser,
            ...(queue.length > 0 ? { queue } : {}),
            revealDue: Boolean(entry?.triggeredReveal),
          },
        });
      },

      endRitual() {
        set({ ritualInProgress: undefined });
      },

      setMuted(muted) {
        set((s) => ({ settings: { ...s.settings, muted } }));
      },

      setVolume(volume) {
        set((s) => ({ settings: { ...s.settings, volume: Math.min(1, Math.max(0, volume)) } }));
      },

      importState(state) {
        set({ ...state, ritualInProgress: undefined });
        get().syncPhotoPools();
      },

      resetAll() {
        set({ ...createSeedState(), ritualInProgress: undefined });
        get().syncPhotoPools();
      },
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: pickState,
      // Only one version so far. Future shape changes get handled here.
      migrate: (persisted) => persisted as AppState,
    },
  ),
);

export function snapshot(): AppState {
  return pickState(useStore.getState());
}
