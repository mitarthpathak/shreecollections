/**
 * Scroll state without re-renders. ScrollTrigger and Lenis write this module-level
 * object; useFrame reads it and damps toward it. Never setState on scroll.
 */
export const film = {
  progress: 0,
  velocity: 0,
  direction: 1 as 1 | -1,
  chapter: 0,
  chapterProgress: 0,
  /** per-chapter progress 0..1, indexed like CHAPTERS */
  chapters: new Array<number>(11).fill(0),
  pointer: { x: 0, y: 0 },
  /** the canvas is hidden behind an opaque section or the tab is hidden */
  covered: false,
  mobile: false,
  /** Values tweened by the chapter timelines and read by the shots. */
  u: {
    hero: { turn: 0, lift: 0, fade: 1 },
    thread: { glow: 0 },
    weave: { assemble: 0, sheet: 0, fabric: 0, fade: 0 },
    ribbon: { flow: 0, show: 0 },
    mor: { sweep: 0 },
    chakra: { show: 0, tint: [0.91, 0.77, 0.42] as [number, number, number], tintAmt: 0 },
    picks: { pour: 0, show: 0 },
    lookbook: { show: 0, spin: 0 },
    knot: { tie: 0, shri: 0 },
  },
};

export type Film = typeof film;
