import { useSyncExternalStore } from 'react';
import type { Settings } from '../types';

export type Track = 'dramatic' | 'clown';
export type Sfx = 'coin' | 'whistle' | 'crowd';

const FADE_MS = 300;
const base = import.meta.env.BASE_URL;

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

  private channel(track: Track): Channel {
    let ch = this.channels.get(track);
    if (!ch) {
      const el = new Audio(`${base}audio/${track}.mp3`);
      el.loop = true;
      el.preload = 'auto';
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
