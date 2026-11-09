import { IconInstagram, IconWhatsApp } from './icons';
import { contactChannel } from '@/lib/whatsapp';

/** The icon for the channel orders go to: WhatsApp, or Instagram while no number is set. */
export function ContactIcon({ size = 18 }: { size?: number }) {
  return contactChannel === 'whatsapp' ? <IconWhatsApp size={size} /> : <IconInstagram size={size} />;
}
