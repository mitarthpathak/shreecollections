'use client';
import { brand, telHref } from '@/brand.config';
import { IconInstagram, IconPhone, IconPin } from '../icons';
import { ContactIcon } from '../ContactIcon';
import { useLang, useT } from '@/lib/i18n';
import { buildWhatsAppEnquiry, contactChannel } from '@/lib/whatsapp';

/** "20:00" → "8 pm", "10:30" → "10:30 am". */
function clock(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

export function StoreCard({ className = '', headingLevel = 3 }: { className?: string; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const t = useT();
  const lang = useLang();
  return (
    <div className={`panel rounded-3xl p-6 md:p-8 ${className}`}>
      <p className="label text-gold-text">{lang === 'hi' ? 'दुकान' : 'The store'}</p>
      <H className="mt-2 font-editorial font-medium text-3xl text-fg">{brand.name}</H>
      <p className="mt-1 text-sm text-fg-muted">{lang === 'hi' ? brand.taglineHi : brand.tagline}</p>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="label mb-1 text-gold-text">{lang === 'hi' ? 'पता' : 'Address'}</dt>
          <dd>
            {brand.location.streetAddress && (
              <>
                {brand.location.streetAddress}
                <br />
              </>
            )}
            {brand.location.city}, {brand.location.state}
            {brand.location.postalCode && ` ${brand.location.postalCode}`}
          </dd>
        </div>
        {brand.hours && (
          <div>
            <dt className="label mb-1 text-gold-text">{lang === 'hi' ? 'समय' : 'Hours'}</dt>
            <dd>
              <ul>{brand.hours.map((h) => <li key={h.days}>{lang === 'hi' ? h.daysHi : h.days}: {clock(h.open)} – {clock(h.close)}</li>)}</ul>
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-7 grid grid-cols-2 gap-2">
        {telHref && (
          <a href={telHref} className="btn btn-ghost !px-3"><IconPhone size={18} /> {t('call')}</a>
        )}
        <a
          href={buildWhatsAppEnquiry(`Namaste ${brand.name}! I would like to visit the store.`)}
          target="_blank"
          rel="noopener noreferrer"
          className={`btn btn-ghost !px-3 ${telHref ? '' : 'col-span-2'}`}
        >
          <ContactIcon /> {contactChannel === 'whatsapp' ? 'WhatsApp' : t('messageInstagram')}
        </a>
        <a href={brand.location.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold col-span-2" data-magnetic>
          <IconPin size={18} /> {t('getDirections')}
        </a>
        <a href={brand.instagram.url} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 text-sm text-fg-muted hover:text-gold-text">
          <IconInstagram size={18} /> @{brand.instagram.handle}
        </a>
      </div>
    </div>
  );
}
