import { CHAPTERS, type ChapterId } from '../chapters';

/**
 * Poster frames, one per shot. Shown for tier 0 (no WebGL, Save-Data, reduced motion) and on
 * slow networks until the 3D stage is ready; the active chapter's frame crossfades in with CSS.
 * Never a blank screen.
 *
 * Raat (dark): the captured renders (made by hand with the debug `?capture` hook; dark only).
 * The hero's frame has no coin: Hero draws the coin as a still in its slot (PosterCoin), at the
 * size and place the 3D coin will take on this screen.
 * Kagaz (light): no light renders exist yet, so each chapter shows its tint with a gold line
 * motif instead of a black frame on an ivory page. (Owner / designer TODO: light posters.)
 */
export function Posters({ hidden }: { hidden: boolean }) {
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 ${hidden ? 'opacity-0' : 'opacity-100'}`}>
      {CHAPTERS.map((c, i) => (
        <div key={c.id} data-poster={c.id} className="absolute inset-0 opacity-0 transition-opacity duration-700">
          <picture data-poster-render className="hidden dark:block">
            <source media="(max-width: 767px)" srcSet={`/posters/m-${c.id}.webp`} />
            { }
            <img
              src={`/posters/d-${c.id}.webp`}
              alt=""
              // lazy even for the hero: in the light theme the render is display:none and must not
              // compete with first paint; in the dark one it is in view and loads at once
              loading="lazy"
              fetchPriority={i === 0 ? 'auto' : 'low'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 grid place-items-center dark:hidden" style={{ background: `var(${c.tint})` }}>
            <svg viewBox="0 0 200 200" className="h-[min(56vmin,520px)] w-[min(56vmin,520px)] text-gold-line opacity-60 md:translate-x-[18vw]" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round">
              {MOTIF[c.id]}
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One line drawing per chapter, in the spirit of its 3D shot. */
const MOTIF: Record<ChapterId, React.ReactNode> = {
  hero: null, // the coin itself is drawn by Hero (PosterCoin)
  thread: <path d="M20 150 C 60 40, 90 170, 120 90 S 170 40, 185 70" />,
  weave: (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <path key={`w${i}`} d={`M${40 + i * 15} 40 V160`} strokeWidth="0.5" />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <path key={`f${i}`} d={`M40 ${40 + i * 15} H160`} strokeWidth="0.5" />
      ))}
    </>
  ),
  sarees: (
    <>
      <path d="M50 40 H150" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${58 + i * 21} 40 C ${50 + i * 21} 90, ${66 + i * 21} 120, ${56 + i * 21} 165`} strokeWidth="0.6" />
      ))}
      <path d="M50 150 C 80 158, 120 142, 150 152" />
    </>
  ),
  mor: (
    <>
      <path d="M100 185 C 98 140, 100 110, 100 30" strokeWidth="0.6" />
      <ellipse cx="100" cy="70" rx="34" ry="44" />
      <ellipse cx="100" cy="74" rx="20" ry="27" />
      <ellipse cx="100" cy="78" rx="9" ry="12" />
    </>
  ),
  suits: (
    <>
      <path d="M60 170 V80 C 60 45, 140 45, 140 80 V170" />
      <path d="M100 60 C 88 75, 80 110, 70 165 M100 60 C 112 75, 120 110, 130 165" strokeWidth="0.5" />
    </>
  ),
  chakra: (
    <>
      <circle cx="100" cy="100" r="78" />
      <circle cx="100" cy="100" r="46" />
      <circle cx="100" cy="100" r="22" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <path key={i} d={`M${100 + Math.cos(a) * 46} ${100 + Math.sin(a) * 46} L${100 + Math.cos(a) * 78} ${100 + Math.sin(a) * 78}`} strokeWidth="0.5" />;
      })}
    </>
  ),
  picks: (
    <>
      <path d="M72 62 C 40 76, 38 130, 72 150 C 88 160, 112 160, 128 150 C 162 130, 160 76, 128 62 Z" />
      <path d="M74 62 H126 M80 54 H120" />
      <path d="M60 110 C 90 120, 110 120, 140 110" strokeWidth="0.5" />
    </>
  ),
  lookbook: (
    <>
      <rect x="30" y="50" width="42" height="56" rx="3" />
      <rect x="79" y="40" width="42" height="56" rx="3" />
      <rect x="128" y="50" width="42" height="56" rx="3" />
      <rect x="55" y="112" width="42" height="56" rx="3" strokeWidth="0.5" />
      <rect x="104" y="112" width="42" height="56" rx="3" strokeWidth="0.5" />
    </>
  ),
  visit: (
    <>
      <path d="M100 170 C 80 140, 66 120, 66 98 a 34 34 0 0 1 68 0 c 0 22 -14 42 -34 72Z" />
      <circle cx="100" cy="98" r="11" />
      <ellipse cx="100" cy="176" rx="36" ry="6" strokeWidth="0.5" />
    </>
  ),
  knot: (
    <>
      <circle cx="100" cy="100" r="72" />
      <path d="M40 120 C 70 60, 130 60, 150 100 C 165 130, 120 150, 100 120 C 85 95, 120 70, 160 80" />
    </>
  ),
};
