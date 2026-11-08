'use client';
import { brand, telHref } from '@/brand.config';
import { Todo } from '../Todo';
import { IconInstagram, IconPhone, IconPin, IconWhatsApp } from '../icons';
import { useLang, useT } from '@/lib/i18n';
import { buildWhatsAppEnquiry } from '@/lib/whatsapp';

export function StoreCard({ className = '', headingLevel = 3 }: { className?: string; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const t = useT();
  const lang = useLang();
  return (
    <div className={`panel rounded-3xl p-6 md:p-8 ${className}`}>
      <p className="label text-gold-500">{lang === 'hi' ? 'दुकान' : 'The store'}</p>
      <H className="mt-2 font-display text-3xl text-gold">{brand.name}</H>
      <p className="mt-1 text-sm text-ivory-dim">{lang === 'hi' ? brand.taglineHi : brand.tagline}</p>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="label mb-1 text-gold-500">{lang === 'hi' ? 'पता' : 'Address'}</dt>
          <dd>
            {brand.location.streetAddress ?? <Todo label="street address" />}
            <br />
            {brand.location.city}, {brand.location.state} {brand.location.postalCode ?? ''}
          </dd>
        </div>
        <div>
          <dt className="label mb-1 text-gold-500">{lang === 'hi' ? 'समय' : 'Hours'}</dt>
          <dd>
            {brand.hours ? (
              <ul>{brand.hours.map((h) => <li key={h.days}>{lang === 'hi' ? h.daysHi : h.days}: {h.open}–{h.close}</li>)}</ul>
            ) : (
              <Todo label="opening hours" />
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-7 grid grid-cols-2 gap-2">
        {telHref ? (
          <a href={telHref} className="btn btn-ghost !px-3"><IconPhone size={18} /> {t('call')}</a>
        ) : (
          <span className="btn btn-ghost !px-3" aria-disabled="true" title="TODO(brand): phone"><IconPhone size={18} /> {t('call')}</span>
        )}
        <a href={buildWhatsAppEnquiry(`Namaste ${brand.name}! I would like to visit the store.`)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-3">
          <IconWhatsApp size={18} /> WhatsApp
        </a>
        <a href={brand.location.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold col-span-2" data-magnetic>
          <IconPin size={18} /> {t('getDirections')}
        </a>
        <a href={brand.instagram.url} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 text-sm text-ivory-dim hover:text-gold-100">
          <IconInstagram size={18} /> @{brand.instagram.handle}
        </a>
      </div>
      {!brand.contact.phone && <p className="mt-2 text-[11px] text-ivory-dim"><Todo label="phone & WhatsApp number" /></p>}
    </div>
  );
}
