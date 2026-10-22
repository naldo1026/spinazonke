import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AppState, CoinToss, GameWeekEntry, PlayerId, RitualState } from '../types';
import { PLAYER_IDS } from '../types';
import { createSeedState, STATE_VERSION } from '../data/seed';
import { PHOTO_MANIFEST } from '../data/photos';
import { nextPhoto, syncPool } from '../lib/photoPool';
import { uid } from '../lib/random';
import { LIVES, MAX_GAME_WEEK } from './selectors';

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

export type RecordResult = { ok: true; eliminated: boolean } | { ok: false; error: string };

interface Actions {
  recordLoss(gameWeek: number, loser: PlayerId): RecordResult;
  updateLoser(gameWeek: number, loser: PlayerId): void;
  deleteGameWeek(gameWeek: number): void;

  /** Adds to the bank (on the wheel). Pass `gameWeek` when it's the pay-to-play add. Returns the id. */
  addConsequence(text: string, createdBy?: PlayerId, gameWeek?: number): string;
  editConsequence(id: string, text: string): void;
  setOnWheel(id: string, onWheel: boolean): void;
  archiveConsequence(id: string): void;
  restoreConsequence(id: string): void;
  deleteConsequence(id: string): void;

  applyCoinToss(gameWeek: number, toss: CoinToss): void;
  commitSpin(gameWeek: number, consequenceId: string): void;
  /** Records the next photo for the player. Returns its path, or null if they have no photos. */
  revealPhoto(player: PlayerId, gameWeek: number): string | null;
  syncPhotoPools(): void;

  startRitual(gameWeek: number): void;
  updateRitual(patch: Partial<RitualState>): void;
  endRitual(): void;

  setMuted(muted: boolean): void;
  setVolume(volume: number): void;

  importState(state: AppState): void;
  resetAll(): void;
}

export type Store = AppState & Actions;

export function gameWeekError(gameWeek: number, gameWeeks: readonly GameWeekEntry[]): string | null {
  if (!Number.isInteger(gameWeek) || gameWeek < 1 || gameWeek > MAX_GAME_WEEK) {
    return `Game week must be between 1 and ${MAX_GAME_WEEK}.`;
  }
  if (gameWeeks.some((gw) => gw.gameWeek === gameWeek)) return `GW${gameWeek} already has a loser.`;
  return null;
}

/** Recomputes `triggeredReveal` so it stays right after edits: true on each player's 5th, 10th… loss. */
function withRevealFlags(gameWeeks: GameWeekEntry[]): GameWeekEntry[] {
  const counts = { ronaldo: 0, kyle: 0, keanan: 0 } as Record<PlayerId, number>;
  const flagged = new Set<number>();
  for (const gw of gameWeeks.slice().sort((a, b) => a.gameWeek - b.gameWeek)) {
    counts[gw.loser] += 1;
    if (counts[gw.loser] % LIVES === 0) flagged.add(gw.gameWeek);
  }
  return gameWeeks
    .map((gw) => {
      const triggered = flagged.has(gw.gameWeek);
      if (Boolean(gw.triggeredReveal) === triggered) return gw;
      const { triggeredReveal: _, ...rest } = gw;
      return triggered ? { ...rest, triggeredReveal: true } : rest;
    })
    .sort((a, b) => a.gameWeek - b.gameWeek);
}

function mapGameWeek(gameWeeks: GameWeekEntry[], gameWeek: number, fn: (gw: GameWeekEntry) => GameWeekEntry) {
  return gameWeeks.map((gw) => (gw.gameWeek === gameWeek ? fn(gw) : gw));
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

      recordLoss(gameWeek, loser) {
        const error = gameWeekError(gameWeek, get().gameWeeks);
        if (error) return { ok: false, error };
        const entry: GameWeekEntry = {
          gameWeek,
          loser,
          recordedAt: new Date().toISOString(),
          addedConsequenceIds: [],
        };
        const gameWeeks = withRevealFlags([...get().gameWeeks, entry]);
        set({ gameWeeks });
        const saved = gameWeeks.find((gw) => gw.gameWeek === gameWeek);
        return { ok: true, eliminated: Boolean(saved?.triggeredReveal) };
      },

      updateLoser(gameWeek, loser) {
        set((s) => ({ gameWeeks: withRevealFlags(mapGameWeek(s.gameWeeks, gameWeek, (gw) => ({ ...gw, loser }))) }));
      },

      deleteGameWeek(gameWeek) {
        set((s) => ({ gameWeeks: withRevealFlags(s.gameWeeks.filter((gw) => gw.gameWeek !== gameWeek)) }));
      },

      addConsequence(text, createdBy, gameWeek) {
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
            gameWeek === undefined
              ? s.gameWeeks
              : mapGameWeek(s.gameWeeks, gameWeek, (gw) => ({
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

      applyCoinToss(gameWeek, toss) {
        const removed = new Set(toss.removedConsequenceIds);
        set((s) => ({
          // Removed items go back to the bank, off the wheel. Never deleted.
          consequences: s.consequences.map((c) => (removed.has(c.id) ? { ...c, onWheel: false } : c)),
          gameWeeks: mapGameWeek(s.gameWeeks, gameWeek, (gw) => ({ ...gw, coinToss: toss })),
        }));
      },

      commitSpin(gameWeek, consequenceId) {
        const entry = get().gameWeeks.find((gw) => gw.gameWeek === gameWeek);
        if (!entry || entry.landedConsequenceId) return; // already counted
        set((s) => ({
          consequences: s.consequences.map((c) =>
            c.id === consequenceId ? { ...c, timesLanded: c.timesLanded + 1 } : c,
          ),
          gameWeeks: mapGameWeek(s.gameWeeks, gameWeek, (gw) => ({ ...gw, landedConsequenceId: consequenceId })),
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
