import type { AppState, Consequence, GameWeekEntry, PlayerId } from '../types';
import { PLAYER_IDS } from '../types';

export const LIVES = 5;
export const MAX_GAME_WEEK = 38;
export const MIN_WHEEL_PRE_TOSS = 4;
export const TOSS_REMOVALS = 3;

export function lossesByPlayer(gameWeeks: readonly GameWeekEntry[]): Record<PlayerId, number> {
  const out = { ronaldo: 0, kyle: 0, keanan: 0 } as Record<PlayerId, number>;
  for (const gw of gameWeeks) out[gw.loser] += 1;
  return out;
}

/** Hearts left this cycle. Shows a full 5 straight after an elimination. */
export function heartsLeft(losses: number): number {
  return LIVES - (losses % LIVES);
}

export function revealsDue(losses: number): number {
  return Math.floor(losses / LIVES);
}

export function isElimination(losses: number): boolean {
  return losses > 0 && losses % LIVES === 0;
}

/** Last GW + 1, or null once GW38 is in the book. */
export function nextGameWeek(gameWeeks: readonly GameWeekEntry[]): number | null {
  const last = gameWeeks.reduce((max, gw) => Math.max(max, gw.gameWeek), 0);
  return last >= MAX_GAME_WEEK ? null : last + 1;
}

export interface LeaderboardRow {
  id: PlayerId;
  losses: number;
  /** Tied for most losses (and has at least one). */
  biggestLoser: boolean;
}

export function leaderboard(gameWeeks: readonly GameWeekEntry[]): LeaderboardRow[] {
  const losses = lossesByPlayer(gameWeeks);
  const max = Math.max(...PLAYER_IDS.map((id) => losses[id]));
  return PLAYER_IDS.map((id) => ({ id, losses: losses[id], biggestLoser: max > 0 && losses[id] === max }))
    .sort((a, b) => b.losses - a.losses);
}

export function wheelItems(consequences: readonly Consequence[]): Consequence[] {
  return consequences.filter((c) => c.onWheel && !c.archived);
}

export function sortedNewestFirst(gameWeeks: readonly GameWeekEntry[]): GameWeekEntry[] {
  return gameWeeks.slice().sort((a, b) => b.gameWeek - a.gameWeek);
}

/** GW of a player's nth loss (1-based), in game-week order. */
export function gameWeekOfNthLoss(gameWeeks: readonly GameWeekEntry[], player: PlayerId, n: number): number | undefined {
  const mine = gameWeeks.filter((gw) => gw.loser === player).sort((a, b) => a.gameWeek - b.gameWeek);
  return mine[n - 1]?.gameWeek;
}

export interface OwedReveal {
  player: PlayerId;
  /** GW of the loss that earned it. */
  gameWeek: number;
}

/**
 * The next reveal each player has earned but not had: e.g. a ritual cancelled
 * before the reveal, a History edit, or no photos uploaded at the time.
 */
export function owedReveals(state: Pick<AppState, 'players' | 'gameWeeks'>): OwedReveal[] {
  const losses = lossesByPlayer(state.gameWeeks);
  const out: OwedReveal[] = [];
  for (const id of PLAYER_IDS) {
    const shown = state.players[id].revealedPhotos.length;
    if (revealsDue(losses[id]) > shown) {
      const gameWeek = gameWeekOfNthLoss(state.gameWeeks, id, (shown + 1) * LIVES);
      if (gameWeek !== undefined) out.push({ player: id, gameWeek });
    }
  }
  return out;
}
