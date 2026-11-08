'use client';
import { formatINR, discountPct } from '@/lib/format';
import { useT } from '@/lib/i18n';

export function Price({ price, mrp, size = 'md' }: { price: number; mrp?: number; size?: 'sm' | 'md' | 'lg' }) {
  const t = useT();
  const off = discountPct(price, mrp);
  const cls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${cls}`}>
      <span className="font-semibold text-gold-100 tabular-nums">{formatINR(price)}</span>
      {off > 0 && (
        <>
          <s className="text-[0.8em] text-ivory-dim/70 tabular-nums" aria-label={`${t('mrp')} ${formatINR(mrp!)}`}>
            {formatINR(mrp!)}
          </s>
          <span className="text-[0.75em] font-semibold text-pitambar">
            {off}% {t('off')}
          </span>
        </>
      )}
    </p>
  );
}
