import { useSyncExternalStore } from 'react';
import type { Settings } from '../types';

export type Track = 'dramatic' | 'clown';
export type Sfx = 'coin' | 'whistle' | 'crowd' | 'celebrate';

const FADE_MS = 300;
const base = import.meta.env.BASE_URL;

/** Seconds into each track to start from, and to loop back to (skips slow intros). */
const START_AT: Record<Track, number> = { dramatic: 25, clown: 0 };

interface Channel {
  el: HTMLAudioElement;
  /** 0–1 level before the master volume, animated by fades. */
  gain: number;
  fadeId?: number;
  /** False once the file fails to load (e.g. not supplied yet). */
  available: boolean;
}

/**
 * Plays the two looping music tracks with short fades, plus one-shot SFX.
 * Missing or blocked files fail silently, so the app works with no audio at all.
 *
 * iOS ignores `volume` on media elements, so mute also sets `muted`, and
 * fades fall back to hard starts and stops there.
 */
class AudioManager {
  private channels = new Map<Track, Channel>();
  private listeners = new Set<() => void>();
  private ctx?: AudioContext;
  private muted = false;
  private volume = 0.8;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  applySettings({ muted, volume }: Settings): void {
    this.muted = muted;
    this.volume = volume;
    for (const ch of this.channels.values()) this.applyLevel(ch);
  }

  play(track: Track): void {
    const ch = this.channel(track);
    if (ch.el.paused) {
      this.seekToStart(track, ch.el);
      ch.gain = 0;
      this.applyLevel(ch);
      ch.el.play().then(
        () => this.notify(),
        () => this.notify(), // missing file or autoplay block: stay quiet
      );
    }
    this.fade(ch, 1);
  }

  stop(track: Track): void {
    const ch = this.channels.get(track);
    if (!ch || ch.el.paused) return;
    this.fade(ch, 0, () => {
      ch.el.pause();
      ch.el.currentTime = 0;
      this.notify();
    });
  }

  stopAll(): void {
    for (const track of this.channels.keys()) this.stop(track);
  }

  isPlaying(track: Track): boolean {
    const ch = this.channels.get(track);
    return Boolean(ch && !ch.el.paused);
  }

  /** True until the file has been tried and failed to load. */
  isAvailable(track: Track): boolean {
    return this.channels.get(track)?.available ?? true;
  }

  sfx(name: Sfx): void {
    if (this.muted) return;
    const el = new Audio(`${base}audio/sfx/${name}.mp3`);
    el.volume = this.volume;
    el.play().catch(() => {});
  }

  /**
   * Synthesised heartbeat (no file needed) that speeds up over `seconds`.
   * Call it from a click so the browser lets the AudioContext start.
   */
  heartbeat(seconds: number): void {
    if (this.muted || this.volume === 0) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx ??= new Ctx();
    const ctx = this.ctx;
    void ctx.resume();
    let at = ctx.currentTime + 0.05;
    let gap = 0.9;
    while (at < ctx.currentTime + seconds) {
      this.thump(ctx, at, 1);
      this.thump(ctx, at + 0.2, 0.65);
      at += gap;
      gap = Math.max(0.45, gap * 0.86);
    }
  }

  private thump(ctx: AudioContext, at: number, strength: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, strength * this.volume), at + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.3);
  }

  private channel(track: Track): Channel {
    let ch = this.channels.get(track);
    if (!ch) {
      const el = new Audio(`${base}audio/${track}.mp3`);
      // Looped by hand so it restarts from START_AT rather than 0.
      el.loop = false;
      el.preload = 'auto';
      el.addEventListener('ended', () => {
        el.currentTime = this.startOf(track, el);
        el.play().catch(() => {});
      });
      const created: Channel = { el, gain: 0, available: true };
      el.addEventListener('error', () => {
        created.available = false;
        this.notify();
      });
      ch = created;
      this.channels.set(track, ch);
    }
    return ch;
  }

  /** START_AT for the track, or 0 if the file turns out to be shorter than that. */
  private startOf(track: Track, el: HTMLAudioElement): number {
    const at = START_AT[track];
    return Number.isFinite(el.duration) && at >= el.duration ? 0 : at;
  }

  private seekToStart(track: Track, el: HTMLAudioElement): void {
    if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
      el.currentTime = this.startOf(track, el);
    } else {
      // First play: the file hasn't loaded yet, so seek as soon as its length is known.
      el.addEventListener('loadedmetadata', () => (el.currentTime = this.startOf(track, el)), { once: true });
    }
  }

  private applyLevel(ch: Channel): void {
    ch.el.muted = this.muted;
    ch.el.volume = Math.min(1, Math.max(0, ch.gain * this.volume));
  }

  private fade(ch: Channel, to: number, done?: () => void): void {
    if (ch.fadeId !== undefined) cancelAnimationFrame(ch.fadeId);
    const from = ch.gain;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      ch.gain = from + (to - from) * t;
      this.applyLevel(ch);
      if (t < 1) {
        ch.fadeId = requestAnimationFrame(step);
      } else {
        ch.fadeId = undefined;
        done?.();
      }
    };
    ch.fadeId = requestAnimationFrame(step);
  }
}

export const audio = new AudioManager();

/** Re-renders when the track starts, stops, or turns out to be missing. */
export function useTrack(track: Track): { playing: boolean; available: boolean } {
  const playing = useSyncExternalStore(audio.subscribe, () => audio.isPlaying(track));
  const available = useSyncExternalStore(audio.subscribe, () => audio.isAvailable(track));
  return { playing, available };
}
