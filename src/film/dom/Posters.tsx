import { CHAPTERS } from '../chapters';

/**
 * Captured poster frames, one per shot (made with ?capture). Shown for tier 0 (no WebGL,
 * Save-Data, reduced motion) and on slow networks until the 3D stage is ready; the active
 * chapter's frame crossfades in with CSS. Never a blank black screen.
 */
export function Posters({ hidden }: { hidden: boolean }) {
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 ${hidden ? 'opacity-0' : 'opacity-100'}`}>
      {CHAPTERS.map((c, i) => (
        <picture key={c.id} data-poster={c.id} className="absolute inset-0 opacity-0 transition-opacity duration-700">
          <source media="(max-width: 767px)" srcSet={`/posters/m-${c.id}.webp`} />
          { }
          <img
            src={`/posters/d-${c.id}.webp`}
            alt=""
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
            className="h-full w-full object-cover"
          />
        </picture>
      ))}
    </div>
  );
}
