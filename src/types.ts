export type PlayerId = 'ronaldo' | 'kyle' | 'keanan';

export const PLAYER_IDS: readonly PlayerId[] = ['ronaldo', 'kyle', 'keanan'];

export interface RevealedPhoto {
  path: string;
  gameWeek: number;
  revealedAt: string;
}

export interface Player {
  id: PlayerId;
  name: string;
  photoPool: string[];
  revealedPhotos: RevealedPhoto[];
}

export interface Consequence {
  id: string;
  text: string;
  createdBy?: PlayerId;
  createdAt: string;
  onWheel: boolean;
  archived: boolean;
  timesLanded: number;
}

export type CoinSide = 'heads' | 'tails';
export type TossWinner = 'loser' | 'others';

export interface CoinToss {
  played: boolean;
  call?: CoinSide;
  result?: CoinSide;
  winner?: TossWinner;
  removedConsequenceIds: string[];
}

export interface GameWeekEntry {
  gameWeek: number;
  loser: PlayerId;
  recordedAt: string;
  legacy?: boolean;
  addedConsequenceIds: string[];
  coinToss?: CoinToss;
  landedConsequenceId?: string;
  triggeredReveal?: boolean;
}

export type RitualStep = 1 | 2 | 3 | 4 | 5 | 6;

export type TossPhase = 'intro' | 'call' | 'flip' | 'pick';

/** In-progress ritual, persisted so a refresh lands you back where you were. */
export interface RitualState {
  gameWeek: number;
  step: RitualStep;
  loser?: PlayerId;
  /** The loss in step 1 hit a multiple of 5. */
  revealDue: boolean;
  toss?: {
    phase: TossPhase;
    call?: CoinSide;
    result?: CoinSide;
    winner?: TossWinner;
  };
  /** Decided the moment SPIN is pressed, so refreshing can't re-roll the wheel. */
  spin?: {
    segmentIds: string[];
    targetId: string;
    rotation: number;
    durationMs: number;
    committed: boolean;
  };
  /** Set once the photo is picked, so a refresh shows the same one. null = no photo available. */
  reveal?: { path: string | null };
}

export interface Settings {
  muted: boolean;
  volume: number;
}

export interface AppState {
  version: number;
  players: Record<PlayerId, Player>;
  consequences: Consequence[];
  gameWeeks: GameWeekEntry[];
  ritualInProgress?: RitualState;
  settings: Settings;
}
