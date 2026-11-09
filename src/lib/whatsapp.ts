import { brand } from '@/brand.config';
import { formatINR } from './format';
import type { Product } from './catalog';

export type OrderLine = { product: Product; size?: string; qty: number };

/** WhatsApp when a number is set in brand.config; otherwise Instagram direct messages. */
export const contactChannel: 'whatsapp' | 'instagram' = brand.contact.whatsapp ? 'whatsapp' : 'instagram';

/**
 * The one link builder for every "order / message us" button:
 * https://wa.me/<number>?text=<encoded> when the WhatsApp number is known, else the Instagram
 * DM link (https://ig.me/m/<handle>) — never WhatsApp's contact picker. Instagram can't prefill
 * a message, so buttons on that channel copy the text first (see copyForInstagram).
 */
export function whatsappLink(message: string) {
  const n = brand.contact.whatsapp?.replace(/\D/g, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : brand.instagram.dm;
}

/** On the Instagram channel, put the message on the clipboard so it can be pasted into the chat. */
export function copyForInstagram(message: string) {
  if (contactChannel !== 'instagram') return;
  navigator.clipboard?.writeText(message).catch(() => {});
}

export function orderMessage(lines: OrderLine[], customer: { name?: string; pincode?: string }) {
  const total = lines.reduce((n, l) => n + l.product.price * l.qty, 0);
  const rows = lines.map(
    (l, i) =>
      `${i + 1}. ${l.product.name} (${l.product.id})${l.size ? ` · Size ${l.size}` : l.product.category === 'suit' && !l.product.stitched ? ' · Unstitched' : ''} · Qty ${l.qty} · ${formatINR(l.product.price * l.qty)}`,
  );
  return [
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
}

export function buildWhatsAppOrder(lines: OrderLine[], customer: { name?: string; pincode?: string }) {
  return whatsappLink(orderMessage(lines, customer));
}

export function buildWhatsAppEnquiry(message: string) {
  return whatsappLink(message);
}
