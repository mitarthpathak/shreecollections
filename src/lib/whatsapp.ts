import { waBase, brand } from '@/brand.config';
import { formatINR } from './format';
import type { Product } from './catalog';

export type OrderLine = { product: Product; size?: string; qty: number };

/** https://wa.me/<number>?text=<encoded order summary> — the number comes from brand.config. */
export function buildWhatsAppOrder(lines: OrderLine[], customer: { name?: string; pincode?: string }) {
  const total = lines.reduce((n, l) => n + l.product.price * l.qty, 0);
  const rows = lines.map(
    (l, i) =>
      `${i + 1}. ${l.product.name} (${l.product.id})${l.size ? ` · Size ${l.size}` : l.product.category === 'suit' && !l.product.stitched ? ' · Unstitched' : ''} · Qty ${l.qty} · ${formatINR(l.product.price * l.qty)}`,
  );
  const text = [
    `Namaste ${brand.name}! I would like to order:`,
    '',
    ...rows,
    '',
    `Total: ${formatINR(total)}`,
    `Name: ${customer.name?.trim() || '—'}`,
    `Pincode: ${customer.pincode?.trim() || '—'}`,
    '',
    'Jai Shree Krishna 🙏',
  ].join('\n');
  return `${waBase}?text=${encodeURIComponent(text)}`;
}

export function buildWhatsAppEnquiry(message: string) {
  return `${waBase}?text=${encodeURIComponent(message)}`;
}
