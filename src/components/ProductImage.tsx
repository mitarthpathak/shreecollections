'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { Product } from '@/lib/catalog';
import { productMedia, hasPhotos } from '@/lib/catalog';

/**
 * A product's picture in a 4:5 frame: the first photo, and the second on hover (desktop) or on
 * a sideways swipe (touch). Products without photos fall back to their drawn placeholders.
 * The swipe dots follow the visible image.
 */
export function ProductImage({
  product: p,
  sizes,
  priority = false,
  className = '',
  ref,
}: {
  product: Product;
  sizes: string;
  priority?: boolean;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  const shots = productMedia(p).slice(0, 2);
  const [slide, setSlide] = useState(0);
  const photo = hasPhotos(p);
  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
          if (i !== slide) setSlide(i);
        }}
        className={`no-scrollbar relative flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-lg bg-surface [@media(hover:hover)]:overflow-hidden ${className}`}
      >
        {shots.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={i === 0 ? `${p.name} — ${p.fabric} ${p.category}` : `${p.name}, ${photo ? 'second view' : 'fabric detail'}`}
            width={800}
            height={1000}
            sizes={sizes}
            priority={priority && i === 0}
            quality={75}
            className={`h-full w-full shrink-0 snap-center object-cover transition-[opacity,transform] duration-700 [transition-timing-function:var(--ease-out-expo)] ${
              i === 1
                ? '[@media(hover:hover)]:absolute [@media(hover:hover)]:inset-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                : '[@media(hover:hover)]:group-hover:scale-[1.03]'
            }`}
          />
        ))}
      </div>
      {/* swipe dots (touch only): the current image is the long one */}
      {shots.length > 1 && (
        <div aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 [@media(hover:hover)]:hidden">
          {shots.map((src, i) => (
            <span
              key={src}
              data-on={i === slide}
              className="h-1 w-1.5 rounded-full bg-fg-muted/40 transition-all duration-300 data-[on=true]:w-3 data-[on=true]:bg-gold-text"
            />
          ))}
        </div>
      )}
    </div>
  );
}
