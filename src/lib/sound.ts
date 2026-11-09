'use client';
import { useShop } from './store';

/**
 * Sound is optional and owner-supplied (see public/audio/README.md). Build with
 * NEXT_PUBLIC_SOUND=on once bansuri-ambience.mp3 and tick.mp3 are in /public/audio.
 * Until then the sound toggle is hidden and no audio file is ever requested, so a
 * missing file can't cause 404s or console errors.
 */
export const SOUND_AVAILABLE = process.env.NEXT_PUBLIC_SOUND === 'on';

const AMBIENCE = '/audio/bansuri-ambience.mp3';
const TICK = '/audio/tick.mp3';

// Never autoplays: ambience starts only from the sound toggle (a user gesture).
let ambience: HTMLAudioElement | null = null;
let tick: HTMLAudioElement | null = null;
/** Files that failed to load once are never requested again this session. */
const failed = new Set<string>();

function load(src: string, opts: Partial<HTMLAudioElement>) {
  if (!SOUND_AVAILABLE || failed.has(src) || typeof Audio === 'undefined') return null;
  const a = Object.assign(new Audio(), opts);
  a.addEventListener(
    'error',
    () => {
      failed.add(src);
      if (ambience === a) ambience = null;
      if (tick === a) tick = null;
    },
    { once: true },
  );
  a.src = src;
  return a;
}

function play(a: HTMLAudioElement | null) {
  if (!a) return;
  try {
    a.play()?.catch(() => {});
  } catch {
    /* fail silently */
  }
}

export function setAmbience(on: boolean) {
  if (on) {
    ambience ??= load(AMBIENCE, { loop: true, volume: 0.35, preload: 'none' });
    play(ambience);
  } else {
    ambience?.pause();
  }
}

export function playTick() {
  if (!SOUND_AVAILABLE || !useShop.getState().sound) return;
  tick ??= load(TICK, { volume: 0.5 });
  if (!tick) return;
  tick.currentTime = 0;
  play(tick);
}
