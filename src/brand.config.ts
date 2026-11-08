/**
 * Shree Collection — single source of truth for every brand fact, link and TODO.
 *
 * Anything set to `null` is unknown and renders on the site as a visible
 * TODO(brand) placeholder. Fill it in here and it updates everywhere:
 * header, footer, Visit page, product pages, JSON-LD and the WhatsApp checkout.
 */

export type BrandTodo = { todo: string };

export const brand = {
  name: 'Shree Collection',
  nameHi: 'श्री Collection',
  wordmark: { hi: 'श्री', en: 'COLLECTION' },
  /** The logo raster has a typo (GARAIENTS). This live-text tagline replaces it everywhere. */
  tagline: 'Ladies Garments · Suits · Sarees',
  taglineHi: 'लेडीज़ गारमेंट्स · सूट · साड़ियाँ',
  signOff: 'Jai Shree Krishna',
  signOffHi: 'जय श्री कृष्ण',

  logo: {
    src: '/brand/logo.png',
    /**
     * TODO(brand): set to true once the corrected master is in /public/brand/logo.png.
     * The supplied raster reads "LADIES GARAIENTS" and must never be displayed.
     */
    hasArtwork: false,
    alt: 'Shree Collection badge: Bal Krishna with a matki of makhan above a gold श्री COLLECTION wordmark',
  },

  location: {
    city: 'Banswara',
    state: 'Rajasthan',
    country: 'IN',
    lat: 23.5537819,
    lng: 74.4271211,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=23.5537819%2C74.4271211',
    /** TODO(brand): street address */
    streetAddress: null as string | null,
    /** TODO(brand): PIN code */
    postalCode: null as string | null,
  },

  contact: {
    /** TODO(brand): phone, in E.164 without spaces, e.g. "+919876543210" */
    phone: null as string | null,
    /** TODO(brand): WhatsApp number, digits only with country code, e.g. "919876543210" */
    whatsapp: null as string | null,
  },

  /** TODO(brand): opening hours, e.g. [{ days: 'Mon–Sat', open: '10:30', close: '20:30' }] */
  hours: null as { days: string; daysHi: string; open: string; close: string }[] | null,

  instagram: {
    handle: 'shreecollectionsbsw',
    url: 'https://www.instagram.com/shreecollectionsbsw/',
  },

  /** TODO(brand): the owner's story, two or three short paragraphs. */
  ownerStory: null as string[] | null,

  policies: {
    /** TODO(brand): shipping policy */
    shipping: null as string[] | null,
    /** TODO(brand): return and exchange policy */
    returns: null as string[] | null,
    /** TODO(brand): privacy policy (owner to confirm; a safe default is shown meanwhile) */
    privacy: null as string[] | null,
  },

  /** TODO(brand): production domain. Used for canonical URLs, sitemap and OG tags. */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shreecollection.example',

  /** Copy the owner can edit. */
  copy: {
    hero: { en: 'Draped in Devotion.', hi: 'हर धागे में श्रद्धा।' },
    thread: { en: 'It begins with a single thread.', hi: 'एक धागा, अनंत कहानियाँ।' },
    sarees: { en: 'Six yards of poetry.', hi: 'छह गज़ की कविता।' },
    suits: { en: 'Grace, tailored.', hi: 'सलीके से सिली शान।' },
    bestsellers: { en: 'So good, even Kanha would steal them.', hi: 'इतने प्यारे कि कान्हा भी चुरा ले।' },
    visit: { en: 'Come see them in Banswara.', hi: 'बांसवाड़ा में आपका इंतज़ार है।' },
    notFound: {
      en: 'Lagta hai kisi ne makhan chura liya — this page is missing.',
      hi: 'लगता है किसी ने माखन चुरा लिया — यह पेज नहीं मिला।',
    },
  },
} as const;

/** Every unknown fact, listed in one place (also rendered on /about for the owner). */
export const brandTodos: { key: string; label: string }[] = [
  !brand.logo.hasArtwork && { key: 'logo', label: 'Corrected logo master without the GARAIENTS typo (/public/brand/logo.png)' },
  !brand.location.streetAddress && { key: 'address', label: 'Street address' },
  !brand.location.postalCode && { key: 'pincode', label: 'PIN code' },
  !brand.contact.phone && { key: 'phone', label: 'Phone number' },
  !brand.contact.whatsapp && { key: 'whatsapp', label: 'WhatsApp number (orders currently open a WhatsApp contact picker)' },
  !brand.hours && { key: 'hours', label: 'Opening hours' },
  !brand.ownerStory && { key: 'story', label: 'Owner story' },
  !brand.policies.shipping && { key: 'shipping', label: 'Shipping policy' },
  !brand.policies.returns && { key: 'returns', label: 'Return and exchange policy' },
  !brand.policies.privacy && { key: 'privacy', label: 'Privacy policy (owner to confirm)' },
  brand.siteUrl.endsWith('.example') && { key: 'domain', label: 'Production domain (NEXT_PUBLIC_SITE_URL)' },
].filter(Boolean) as { key: string; label: string }[];

export const telHref = brand.contact.phone ? `tel:${brand.contact.phone}` : null;
export const waBase = brand.contact.whatsapp ? `https://wa.me/${brand.contact.whatsapp}` : 'https://wa.me/';
