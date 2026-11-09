'use client';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { geoMercator, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { brand } from '@/brand.config';

const W = 600;
const H = 640;
type Props = { name: string };

export type MapGeometry = {
  state: string;
  districts: { name: string; d: string }[];
  banswara: { d: string; c: [number, number] };
  pin: [number, number];
};

let cache: Promise<MapGeometry> | null = null;

/** Rajasthan outline + districts only (never a national outline), projected once. */
export function loadMap(): Promise<MapGeometry> {
  cache ??= fetch('/geo/rajasthan.topo.json')
    .then((r) => r.json())
    .then((topo: Topology) => {
      const state = feature(topo, topo.objects.state as GeometryCollection) as FeatureCollection<Geometry, Props>;
      const districts = feature(topo, topo.objects.districts as GeometryCollection) as FeatureCollection<Geometry, Props>;
      const proj = geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], state as GeoPermissibleObjects);
      const path = geoPath(proj);
      const bsw = districts.features.find((f) => f.properties.name === 'Banswara') as Feature<Geometry, Props>;
      const pin = proj([brand.location.lng, brand.location.lat]) as [number, number];
      return {
        state: path(state as GeoPermissibleObjects) ?? '',
        districts: districts.features.map((f) => ({ name: f.properties.name, d: path(f as GeoPermissibleObjects) ?? '' })),
        banswara: { d: path(bsw as GeoPermissibleObjects) ?? '', c: path.centroid(bsw as GeoPermissibleObjects) as [number, number] },
        pin,
      };
    });
  return cache;
}

/**
 * React renders the SVG; the parent's GSAP timeline animates it through data hooks:
 * [data-map-zoom] [data-map-outline] [data-district] [data-banswara] [data-pin] [data-pulse].
 */
export const RajasthanMap = forwardRef<SVGSVGElement, { className?: string; onReady?: () => void }>(function RajasthanMap(
  { className = '', onReady },
  ref,
) {
  const [g, setG] = useState<MapGeometry | null>(null);
  useEffect(() => {
    let alive = true;
    loadMap().then((m) => alive && setG(m));
    return () => {
      alive = false;
    };
  }, []);
  // Tell the parent once the paths are in the DOM (next frame) — never after unmount.
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });
  useEffect(() => {
    if (!g) return;
    const id = requestAnimationFrame(() => ready.current?.());
    return () => cancelAnimationFrame(id);
  }, [g]);

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Map of Rajasthan with a pin on Banswara, in the south">
      <defs>
        <linearGradient id="map-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--metal-hi)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--metal)' }} />
          <stop offset="1" style={{ stopColor: 'var(--metal-lo)' }} />
        </linearGradient>
        <radialGradient id="map-glow">
          <stop offset="0" stopOpacity="0.55" style={{ stopColor: 'var(--metal)' }} />
          <stop offset="1" stopOpacity="0" style={{ stopColor: 'var(--metal)' }} />
        </radialGradient>
      </defs>
      {g && (
        <g data-map-zoom style={{ transformOrigin: '0 0' }} data-cx={g.banswara.c[0]} data-cy={g.banswara.c[1]} data-w={W} data-h={H}>
          <g>
            {g.districts.map((d) => (
              <path key={d.name} data-district d={d.d} strokeWidth={0.6} vectorEffect="non-scaling-stroke" style={{ fill: 'color-mix(in srgb, var(--gold-line) 6%, transparent)', stroke: 'color-mix(in srgb, var(--gold-line) 55%, transparent)' }}>
                <title>{d.name}</title>
              </path>
            ))}
          </g>
          <path data-banswara d={g.banswara.d} style={{ fill: 'color-mix(in srgb, var(--metal) 24%, transparent)' }} stroke="url(#map-gold)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          <path data-map-outline d={g.state} fill="none" stroke="url(#map-gold)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <g data-pin transform={`translate(${g.pin[0]} ${g.pin[1]})`}>
            <circle data-pulse r={14} fill="none" strokeWidth={1.2} vectorEffect="non-scaling-stroke" style={{ stroke: 'var(--metal)' }} />
            <circle r={22} fill="url(#map-glow)" />
            <g data-pin-head>
              <path d="M0 0 C -6 -8 -9 -12 -9 -16 a 9 9 0 0 1 18 0 c 0 4 -3 8 -9 16Z" fill="url(#map-gold)" strokeWidth={0.6} style={{ stroke: 'var(--metal-lo)' }} />
              <circle cy={-16} r={3.2} style={{ fill: 'var(--bg)' }} />
            </g>
          </g>
        </g>
      )}
    </svg>
  );
});

export const MAP_CREDIT =
  'District boundaries: geoBoundaries (gbOpen IND ADM2, 2021; source LGD / Pathways Data), ODbL 1.0. Rajasthan shown with its 33 districts as of that dataset.';
