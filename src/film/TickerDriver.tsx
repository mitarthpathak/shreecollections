'use client';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { onFrame } from '@/lib/clock';

/**
 * Canvases run with frameloop="never"; this drives them from gsap.ticker so
 * Lenis, ScrollTrigger and WebGL share one clock. `active()` lets a canvas skip
 * frames while it is fully covered or off-screen.
 */
export function TickerDriver({ active }: { active?: () => boolean }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => onFrame((t) => (!active || active()) && advance(t / 1000)), [advance, active]);
  return null;
}
