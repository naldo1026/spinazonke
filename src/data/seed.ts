import type { AppState, Consequence, GameWeekEntry, PlayerId } from '../types';
import { PLAYER_IDS } from '../types';
import { PLAYERS } from './players';

export const STATE_VERSION = 1;

// GW1–7 were played before the app existed. The real order isn't known, so
// this is a guess that adds up to Ronaldo 1, Kyle 2, Keanan 4. Fix it in History.
const LEGACY_LOSERS: PlayerId[] = ['keanan', 'kyle', 'keanan', 'ronaldo', 'keanan', 'kyle', 'keanan'];

const EXAMPLE_CONSEQUENCES = [
  'Cook dinner for the whole flat',
  "Wear a rival club's shirt for a full day",
  "Do everyone's washing up for a week",
  'Take the bins out for two weeks',
  'Buy the first round next time we go out',
  'Clean the bathroom top to bottom',
  'The others pick your FPL captain next GW',
  'Post "I\'m the worst FPL manager in the flat" on your story',
  'Make breakfast for the flat on Saturday',
  'Run a lap of the block in full kit',
];

export function createSeedState(now = new Date().toISOString()): AppState {
  const gameWeeks: GameWeekEntry[] = LEGACY_LOSERS.map((loser, i) => ({
    gameWeek: i + 1,
    loser,
    recordedAt: now,
    legacy: true,
    addedConsequenceIds: [],
  }));

  const consequences: Consequence[] = EXAMPLE_CONSEQUENCES.map((text, i) => ({
    id: `seed-${i + 1}`,
    text,
    createdAt: now,
    onWheel: true,
    archived: false,
    timesLanded: 0,
  }));

  const players = Object.fromEntries(
    PLAYER_IDS.map((id) => [id, { id, name: PLAYERS[id].name, photoPool: [], revealedPhotos: [] }]),
  ) as unknown as AppState['players'];

  return {
    version: STATE_VERSION,
    players,
    consequences,
    gameWeeks,
    settings: { muted: false, volume: 0.8 },
  };
}
