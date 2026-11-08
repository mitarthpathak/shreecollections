/**
 * Shree Collection — the one file for every brand fact and link.
 *
 * Unknown values are left empty (`null`). The site never shows a placeholder for them: a row
 * or button whose value is missing is simply hidden (no address line, no hours row, no Call
 * button; WhatsApp buttons become "Message on Instagram"). Fill a value in here and it appears
 * everywhere: header, footer, Visit page, product pages, JSON-LD and checkout.
 * What is still missing is listed in `brandTodos` below (and in docs/redesign-report.md).
 */

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
     * Set to true once the corrected master is in /public/brand/logo.png.
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
    /** Street address (unknown: the address row shows only city and state). */
    streetAddress: null as string | null,
    /** PIN code. */
    postalCode: null as string | null,
  },

  contact: {
    /** Phone, E.164 without spaces, e.g. "+919876543210" (unknown: no Call button). */
    phone: null as string | null,
    /**
     * WhatsApp number, international format, digits only, no "+", e.g. "919876543210".
     * Unknown: every WhatsApp button becomes "Message on Instagram" (lib/whatsapp.ts).
     */
    whatsapp: null as string | null,
  },

  /** Opening hours, e.g. [{ days: 'Mon–Sat', daysHi: 'सोम–शनि', open: '10:30', close: '20:30' }] (unknown: no hours row). */
  hours: null as { days: string; daysHi: string; open: string; close: string }[] | null,

  instagram: {
    handle: 'shreecollectionsbsw',
    url: 'https://www.instagram.com/shreecollectionsbsw/',
    /** Direct message link: the fallback for WhatsApp while no number is set. */
    dm: 'https://ig.me/m/shreecollectionsbsw',
  },

  /** The owner's story, two or three short paragraphs (unknown: /about shows the store introduction only). */
  ownerStory: null as string[] | null,

  policies: {
    /** Shipping policy (unknown: the interim terms on /policies/shipping apply). */
    shipping: null as string[] | null,
    /** Return and exchange policy (unknown: interim terms). */
    returns: null as string[] | null,
    /** Privacy policy (owner to confirm; the interim text describes what the site actually does). */
    privacy: null as string[] | null,
  },

  /**
   * Canonical origin for metadataBase, canonical URLs, og:image, sitemap, robots and JSON-LD.
   * Resolved at build time in next.config.ts: NEXT_PUBLIC_SITE_URL, else Vercel's production
   * URL (VERCEL_PROJECT_PRODUCTION_URL), else https://shreecollections.vercel.app.
   */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://shreecollections.vercel.app',

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
  !brand.contact.whatsapp && { key: 'whatsapp', label: 'WhatsApp number (until then, orders go to Instagram DMs)' },
  !brand.hours && { key: 'hours', label: 'Opening hours' },
  !brand.ownerStory && { key: 'story', label: 'Owner story' },
  !brand.policies.shipping && { key: 'shipping', label: 'Shipping policy' },
  !brand.policies.returns && { key: 'returns', label: 'Return and exchange policy' },
  !brand.policies.privacy && { key: 'privacy', label: 'Privacy policy (owner to confirm)' },
  !process.env.NEXT_PUBLIC_SITE_URL_SET && { key: 'domain', label: 'Production domain (NEXT_PUBLIC_SITE_URL), if not the Vercel URL' },
].filter(Boolean) as { key: string; label: string }[];

export const telHref = brand.contact.phone ? `tel:${brand.contact.phone}` : null;
