import type { PlayerId } from '../types';

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  /** Accent used on their card and badges. */
  colour: string;
  /** Text colour that reads on top of `colour`. */
  ink: string;
}

export const PLAYERS: Record<PlayerId, PlayerInfo> = {
  ronaldo: { id: 'ronaldo', name: 'Ronaldo', colour: '#FF2882', ink: '#FFFFFF' },
  kyle: { id: 'kyle', name: 'Kyle', colour: '#04F5FF', ink: '#37003C' },
  keanan: { id: 'keanan', name: 'Keanan', colour: '#00FF85', ink: '#37003C' },
};

export function playerName(id: PlayerId): string {
  return PLAYERS[id].name;
}

/** "Kyle & Keanan" style list. */
export function joinNames(ids: PlayerId[]): string {
  const names = ids.map(playerName);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}
