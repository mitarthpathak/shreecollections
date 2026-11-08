'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { brand } from '@/brand.config';
import { BadgeMark } from './BadgeMark';
import { LangToggle } from './Header';
import { ThemeChoice } from './Theme';
import { Todo } from './Todo';
import { IconInstagram, IconWhatsApp } from './icons';
import { useLang, useT } from '@/lib/i18n';
import { buildWhatsAppEnquiry } from '@/lib/whatsapp';

export function FooterContent() {
  const t = useT();
  const lang = useLang();
  const [name, setName] = useState('');
  const join = buildWhatsAppEnquiry(
    `Namaste ${brand.name}! Please add me to new-arrival updates.${name.trim() ? ` — ${name.trim()}` : ''}`,
  );
  const cols = [
    { h: t('shop'), links: [['/shop/sarees', t('sarees')], ['/shop/suits', t('suits')], ['/shop', t('viewAll')], ['/wishlist', t('wishlist')]] },
    { h: brand.name, links: [['/lookbook', t('lookbook')], ['/visit', t('visit')], ['/about', t('about')]] },
    { h: t('policies'), links: [['/policies/shipping', lang === 'hi' ? 'शिपिंग' : 'Shipping'], ['/policies/returns', lang === 'hi' ? 'वापसी' : 'Returns'], ['/policies/privacy', lang === 'hi' ? 'गोपनीयता' : 'Privacy']] },
  ];

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-4 py-16 md:grid-cols-[1.3fr_2fr] md:px-8">
      <div className="min-w-0 space-y-6">
        <div className="flex items-center gap-4">
          <BadgeMark size={64} />
          <div className="min-w-0">
            <p className="font-editorial text-2xl font-medium text-fg">{brand.name}</p>
            <p className="label text-fg-muted">{lang === 'hi' ? brand.taglineHi : brand.tagline}</p>
          </div>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            window.open(join, '_blank', 'noopener');
          }}
        >
          <label htmlFor="footer-updates" className="block text-sm text-fg">{t('updates')}</label>
          <div className="flex gap-2">
            <input
              id="footer-updates"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('yourName')}
              autoComplete="name"
              className="min-h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-base text-fg ring-1 ring-field-line placeholder:text-fg-muted focus:ring-focus md:text-sm"
            />
            <button type="submit" className="btn btn-ghost !px-4" data-magnetic aria-label={t('subscribe')}>
              <IconWhatsApp size={18} />
              <span className="hidden sm:inline">{t('subscribe')}</span>
            </button>
          </div>
        </form>
        <a href={brand.instagram.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm text-fg-muted hover:text-gold-text">
          <IconInstagram size={20} /> @{brand.instagram.handle}
        </a>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-8 sm:grid-cols-3">
        {cols.map((c) => (
          <nav key={c.h} aria-label={c.h}>
            <p className="label mb-4 text-gold-text">{c.h}</p>
            <ul className="space-y-1">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="inline-flex min-h-11 items-center text-sm text-fg-muted hover:text-gold-text">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="col-span-2 space-y-2 text-sm text-fg-muted sm:col-span-3">
          <p>
            {brand.location.city}, {brand.location.state} · {brand.location.streetAddress ?? <Todo label="street address" />}
          </p>
        </div>
      </div>
      <div className="md:col-span-2">
        <div className="hairline mb-8 opacity-60" />
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-start">
          <LangToggle />
          <ThemeChoice />
        </div>
        <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
          <p className="text-xs text-fg-muted">© {new Date().getFullYear()} {brand.name}, {brand.location.city}</p>
          <p className="font-editorial text-2xl font-medium italic text-gold-text">
            {brand.signOff} · <span lang="hi" className="font-hindi-display">{brand.signOffHi}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  const pathname = usePathname();
  if (pathname === '/') return null; // the film ends with its own knot + footer
  return (
    <footer data-site-footer className="relative border-t border-divider bg-surface/40 pb-tabbar">
      <FooterContent />
    </footer>
  );
}
