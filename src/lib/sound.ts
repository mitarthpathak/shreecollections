'use client';
import { useShop } from './store';

// Owner-supplied files in /public/audio. Missing files fail silently. Never autoplays:
// ambience starts only from the header toggle (a user gesture).
let ambience: HTMLAudioElement | null = null;
let tick: HTMLAudioElement | null = null;

export function setAmbience(on: boolean) {
  if (on) {
    ambience ??= Object.assign(new Audio('/audio/bansuri-ambience.mp3'), { loop: true, volume: 0.35, preload: 'none' });
    ambience.play().catch(() => {});
  } else {
    ambience?.pause();
  }
}

export function playTick() {
  if (!useShop.getState().sound) return;
  tick ??= Object.assign(new Audio('/audio/tick.mp3'), { volume: 0.5 });
  tick.currentTime = 0;
  tick.play().catch(() => {});
}
