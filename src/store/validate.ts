import type { AppState, Consequence, GameWeekEntry, Player, PlayerId } from '../types';
import { PLAYER_IDS } from '../types';
import { MAX_GAME_WEEK } from './selectors';

export type ValidationResult = { ok: true; state: AppState } | { ok: false; error: string };

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isPlayerId = (v: unknown): v is PlayerId => PLAYER_IDS.includes(v as PlayerId);
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

class Invalid extends Error {}

function check(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Invalid(msg);
}

function checkPlayer(v: unknown, id: PlayerId): Player {
  check(isObj(v), `players.${id} is missing`);
  check(v.id === id && isStr(v.name), `players.${id} has a bad id or name`);
  check(isStrArray(v.photoPool), `players.${id}.photoPool must be a list of paths`);
  check(Array.isArray(v.revealedPhotos), `players.${id}.revealedPhotos must be a list`);
  for (const r of v.revealedPhotos) {
    check(isObj(r) && isStr(r.path) && isNum(r.gameWeek) && isStr(r.revealedAt), `players.${id} has a bad revealed photo`);
  }
  return v as unknown as Player;
}

function checkConsequence(v: unknown, i: number): Consequence {
  const at = `consequences[${i}]`;
  check(isObj(v), `${at} is not an object`);
  check(isStr(v.id) && v.id.length > 0, `${at}.id is missing`);
  check(isStr(v.text), `${at}.text is missing`);
  check(isStr(v.createdAt), `${at}.createdAt is missing`);
  check(v.createdBy === undefined || isPlayerId(v.createdBy), `${at}.createdBy isn't a player`);
  check(isBool(v.onWheel) && isBool(v.archived), `${at} needs onWheel and archived flags`);
  check(isNum(v.timesLanded) && v.timesLanded >= 0, `${at}.timesLanded must be a number`);
  return v as unknown as Consequence;
}

function checkGameWeek(v: unknown, i: number): GameWeekEntry {
  const at = `gameWeeks[${i}]`;
  check(isObj(v), `${at} is not an object`);
  check(
    isNum(v.gameWeek) && Number.isInteger(v.gameWeek) && v.gameWeek >= 1 && v.gameWeek <= MAX_GAME_WEEK,
    `${at}.gameWeek must be 1–${MAX_GAME_WEEK}`,
  );
  check(isPlayerId(v.loser), `${at}.loser isn't a player`);
  check(isStr(v.recordedAt), `${at}.recordedAt is missing`);
  check(isStrArray(v.addedConsequenceIds), `${at}.addedConsequenceIds must be a list`);
  if (v.coinToss !== undefined) {
    const t = v.coinToss;
    check(isObj(t) && isBool(t.played) && isStrArray(t.removedConsequenceIds), `${at}.coinToss is malformed`);
  }
  check(v.landedConsequenceId === undefined || isStr(v.landedConsequenceId), `${at}.landedConsequenceId is malformed`);
  return v as unknown as GameWeekEntry;
}

/** Checks an imported backup has the right shape. Drops any in-progress ritual. */
export function validateAppState(input: unknown): ValidationResult {
  try {
    check(isObj(input), "That file isn't a Spinazonke backup.");
    check(isNum(input.version), 'Missing version number.');
    check(isObj(input.players), 'Missing players.');
    check(Array.isArray(input.consequences), 'Missing consequences.');
    check(Array.isArray(input.gameWeeks), 'Missing game weeks.');
    check(isObj(input.settings), 'Missing settings.');

    const playersIn = input.players;
    const players = Object.fromEntries(PLAYER_IDS.map((id) => [id, checkPlayer(playersIn[id], id)])) as Record<
      PlayerId,
      Player
    >;
    const consequences = input.consequences.map(checkConsequence);
    const gameWeeks = input.gameWeeks.map(checkGameWeek);

    const seen = new Set<number>();
    for (const gw of gameWeeks) {
      check(!seen.has(gw.gameWeek), `GW${gw.gameWeek} appears twice.`);
      seen.add(gw.gameWeek);
    }

    const s = input.settings;
    check(isBool(s.muted) && isNum(s.volume), 'Settings are malformed.');

    return {
      ok: true,
      state: {
        version: input.version,
        players,
        consequences,
        gameWeeks: gameWeeks.slice().sort((a, b) => a.gameWeek - b.gameWeek),
        settings: { muted: s.muted, volume: s.volume },
      },
    };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}
