'use client';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { select } from 'd3-selection';
import 'd3-transition';
import { pie, arc, type PieArcDatum } from 'd3-shape';
import { interpolate } from 'd3-interpolate';
import { Section, ranges } from './Section';
import { getAllProducts, COLOR_FAMILIES, type Category } from '@/lib/catalog';
import { gsap, Flip, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { hexToRgb01 } from '@/lib/palette';
import { useLang, useT } from '@/lib/i18n';
import { ProductCard } from '@/components/ProductCard';

type Seg = { key: string; value: number; color: string; label: string };
type Arc = PieArcDatum<Seg> & { _cur?: { startAngle: number; endAngle: number } };

const R = 200;

/**
 * Rang Chakra: inner ring = Sarees / Suits, outer ring = colour families sized by real counts.
 * D3 owns this <svg> (React never re-renders it) and tweens the arcs on every change.
 */
function Wheel({ onChange, lang }: { onChange: (cat: Category | null, color: string | null) => void; lang: 'en' | 'hi' }) {
  const ref = useRef<SVGSVGElement>(null);
  const langRef = useRef(lang);
  const redraw = useRef<() => void>(() => {});
  useEffect(() => {
    langRef.current = lang;
    redraw.current();
  }, [lang]);

  useEffect(() => {
    const svg = select(ref.current!);
    const rot = svg.append('g').attr('class', 'rot');
    const gInner = rot.append('g');
    const gOuter = rot.append('g');
    const center = svg.append('g').attr('pointer-events', 'none');
    const cTitle = center.append('text').attr('text-anchor', 'middle').attr('dy', -4).attr('fill', '#E9C46A').attr('font-size', 22).style('font-family', 'var(--font-cinzel)').style('letter-spacing', '3px');
    const cSub = center.append('text').attr('text-anchor', 'middle').attr('dy', 22).attr('fill', '#C9BFAB').attr('font-size', 13);
    const products = getAllProducts();
    let cat: Category | null = null;
    let color: string | null = null;
    const innerArc = arc<Arc>().innerRadius(62).outerRadius(110).cornerRadius(4).padAngle(0.02);
    const outerArc = arc<Arc>().innerRadius(118).outerRadius(R).cornerRadius(5).padAngle(0.012);
    const outerOn = arc<Arc>().innerRadius(116).outerRadius(R + 14).cornerRadius(5).padAngle(0.012);
    const p = pie<Seg>().value((d) => d.value).sort(null);

    const tweenArc = (gen: (a: Arc) => string | null) =>
      function (this: SVGPathElement, d: Arc) {
        const prev = (this as unknown as { _cur?: Arc })._cur ?? { ...d, startAngle: d.startAngle, endAngle: d.startAngle };
        const i = interpolate({ startAngle: prev.startAngle, endAngle: prev.endAngle }, { startAngle: d.startAngle, endAngle: d.endAngle });
        (this as unknown as { _cur?: Arc })._cur = d;
        return (t: number) => gen({ ...d, ...i(t) }) ?? '';
      };

    const draw = () => {
      const L = langRef.current;
      const inner: Seg[] = (['saree', 'suit'] as Category[]).map((k) => ({
        key: k,
        value: products.filter((x) => x.category === k).length,
        color: k === 'saree' ? '#8A1F2E' : '#14505A',
        label: k === 'saree' ? (L === 'hi' ? 'साड़ियाँ' : 'SAREES') : L === 'hi' ? 'सूट' : 'SUITS',
      }));
      const counts = new Map<string, number>();
      products.filter((x) => !cat || x.category === cat).forEach((x) => counts.set(x.colorFamily, (counts.get(x.colorFamily) ?? 0) + 1));
      const outer: Seg[] = Object.keys(COLOR_FAMILIES).map((k) => ({
        key: k,
        value: counts.get(k) ?? 0,
        color: COLOR_FAMILIES[k].hex,
        label: L === 'hi' ? COLOR_FAMILIES[k].hi : k,
      }));

      const ip = gInner.selectAll<SVGPathElement, Arc>('path').data(p(inner) as Arc[], (d) => d.data.key);
      ip.join('path')
        .attr('tabindex', 0)
        .attr('role', 'button')
        .attr('aria-label', (d) => d.data.label)
        .attr('aria-pressed', (d) => String(cat === d.data.key))
        .attr('fill', (d) => d.data.color)
        .attr('stroke', (d) => (cat === d.data.key ? '#FFF1C1' : '#07060A'))
        .attr('stroke-width', 1.5)
        .attr('opacity', (d) => (cat && cat !== d.data.key ? 0.45 : 1))
        .style('cursor', 'pointer')
        .attr('data-kind', 'cat')
        .transition()
        .duration(650)
        .attrTween('d', tweenArc(innerArc));

      const il = gInner.selectAll<SVGTextElement, Arc>('text').data(p(inner) as Arc[], (d) => d.data.key);
      il.join('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('fill', '#F3EAD8')
        .attr('font-size', 11)
        .attr('pointer-events', 'none')
        .style('letter-spacing', '2px')
        .style('font-family', L === 'hi' ? 'var(--font-mukta)' : 'var(--font-cinzel)')
        .text((d) => d.data.label)
        .transition()
        .duration(650)
        .attr('transform', (d) => `translate(${innerArc.centroid(d)})`);

      const op = gOuter.selectAll<SVGPathElement, Arc>('path').data(p(outer) as Arc[], (d) => d.data.key);
      op.join('path')
        .attr('tabindex', (d) => (d.data.value ? 0 : -1))
        .attr('role', 'button')
        .attr('aria-label', (d) => `${d.data.label}: ${d.data.value}`)
        .attr('aria-pressed', (d) => String(color === d.data.key))
        .attr('fill', (d) => d.data.color)
        .attr('stroke', (d) => (color === d.data.key ? '#FFF1C1' : '#07060A'))
        .attr('stroke-width', (d) => (color === d.data.key ? 2 : 1))
        .attr('opacity', (d) => (color && color !== d.data.key ? 0.4 : 1))
        .style('cursor', 'pointer')
        .attr('data-kind', 'color')
        .transition()
        .duration(650)
        .attrTween('d', function (d) {
          return tweenArc(color === d.data.key ? outerOn : outerArc).call(this, d);
        });

      cTitle.text(color ? (L === 'hi' ? COLOR_FAMILIES[color].hi : color.toUpperCase()) : 'RANG');
      cSub.text(cat ? (cat === 'saree' ? (L === 'hi' ? 'साड़ियाँ' : 'Sarees') : L === 'hi' ? 'सूट' : 'Suits') : L === 'hi' ? 'रंग चुनें' : 'Choose a colour');
    };
    redraw.current = draw;

    const pick = (el: Element | null) => {
      const node = el?.closest('path');
      if (!node) return;
      const d = select<SVGPathElement, Arc>(node as SVGPathElement).datum();
      if ((node as SVGPathElement).dataset.kind === 'cat') cat = cat === d.data.key ? null : (d.data.key as Category);
      else if (d.data.value) color = color === d.data.key ? null : d.data.key;
      draw();
      onChange(cat, color);
    };

    // rotate under the thumb; a tap (little movement) selects
    let start: { x: number; y: number; a: number; r: number } | null = null;
    let rotation = 0;
    const angleOf = (e: PointerEvent) => {
      const b = ref.current!.getBoundingClientRect();
      return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
    };
    const node = ref.current!;
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, a: angleOf(e), r: rotation };
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerType === 'mouse') return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
      rotation = start.r + ((angleOf(e) - start.a) * 180) / Math.PI;
      rot.attr('transform', `rotate(${rotation})`);
    };
    const up = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) pick(e.target as Element);
      start = null;
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick(e.target as Element);
      }
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('keydown', key);
    draw();
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('keydown', key);
      svg.selectAll('*').remove();
    };
  }, [onChange]);

  return (
    <svg
      ref={ref}
      viewBox={`${-R - 20} ${-R - 20} ${2 * R + 40} ${2 * R + 40}`}
      className="aspect-square w-full max-w-[560px] touch-none select-none"
      role="group"
      aria-label="Rang Chakra colour wheel"
    />
  );
}

export function Chakra() {
  const root = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);
  const lang = useLang();
  const t = useT();
  const [sel, setSel] = useState<{ cat: Category | null; color: string | null }>({ cat: null, color: null });
  const items = useMemo(
    () => getAllProducts().filter((p) => (!sel.cat || p.category === sel.cat) && (!sel.color || p.colorFamily === sel.color)).slice(0, 8),
    [sel],
  );

  const onChange = useMemo(
    () => (cat: Category | null, color: string | null) => {
      if (strip.current) flip.current = Flip.getState(strip.current.querySelectorAll(':scope > [data-strip]'));
      setSel({ cat, color });
      const hex = color ? COLOR_FAMILIES[color].hex : null;
      document.documentElement.style.setProperty('--accent', hex ?? 'var(--gold-300)');
      const [r, g, b] = hexToRgb01(hex ?? '#E9C46A');
      gsap.to(film.u.chakra.tint, { 0: r, 1: g, 2: b, duration: 0.9, ease: 'silk' });
      gsap.to(film.u.chakra, { tintAmt: hex ? 0.85 : 0, duration: 0.9, ease: 'silk' });
    },
    [],
  );

  useLayoutEffect(() => {
    const s = flip.current;
    if (!s || !strip.current) return;
    flip.current = null;
    Flip.from(s, {
      targets: strip.current.querySelectorAll(':scope > [data-strip]'),
      duration: 0.6,
      ease: 'power2.inOut',
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45 }),
    });
  }, [items]);

  useEffect(() => () => void document.documentElement.style.removeProperty('--accent'), []);

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.fromTo(film.u.chakra, { show: 0 }, { show: 1, ease: 'none', scrollTrigger: ranges.enter(el) });
      gsap.to(film.u.chakra, { show: 0, ease: 'none', scrollTrigger: ranges.exit(el), immediateRender: false });
      gsap.from('[data-chakra-head] > *', { y: 40, opacity: 0, stagger: 0.08, scrollTrigger: { ...ranges.enter(el), end: 'top 25%' } });
    },
    { scope: root },
  );

  return (
    <Section index={6} ref={root} label="Rang Chakra: find your colour" className="!h-auto min-h-[var(--m)] md:min-h-[var(--d)]">
      <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-5 py-[16svh] md:grid-cols-[1fr_1.1fr] md:px-12">
        <header data-chakra-head>
          <p className="label mb-3 text-gold-500">Rang Chakra</p>
          <h2 className="font-display text-[clamp(2.6rem,7vw,7rem)] leading-[0.95] text-gold">{t('findColour')}</h2>
          <p lang="hi" className="font-hindi-display mt-2 text-xl text-ivory/80 md:text-2xl">अपना रंग चुनें</p>
          <p className="mt-6 max-w-md text-ivory-dim">
            {lang === 'hi'
              ? 'भीतरी घेरा: साड़ी या सूट। बाहरी घेरा: रंग। फ़ोन पर पहिया घुमाइए, टैप करके चुनिए।'
              : 'Inner ring: sarees or suits. Outer ring: colours, sized by how many pieces we have. On a phone, spin the wheel and tap to choose.'}
          </p>
        </header>
        <div className="grid place-items-center">
          <Wheel onChange={onChange} lang={lang} />
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-5 pb-[14svh] md:px-12">
        <div className="mb-5 flex items-baseline justify-between">
          <p className="text-sm text-ivory-dim" aria-live="polite">
            <span className="text-[color:var(--accent)]">●</span> {items.length} {t('results')}
          </p>
          <Link href={`/shop${sel.cat ? (sel.cat === 'saree' ? '/sarees' : '/suits') : ''}${sel.color ? `?color=${sel.color}` : ''}`} className="text-sm text-gold-300 underline underline-offset-4">
            {t('viewAll')} →
          </Link>
        </div>
        <div ref={strip} className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {items.map((p) => (
            <div key={p.slug} data-strip className="w-[62vw] shrink-0 snap-start md:w-auto">
              <ProductCard product={p} sizes="(min-width: 768px) 22vw, 62vw" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
