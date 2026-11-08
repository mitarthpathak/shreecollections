'use client';
import { useShop, type Lang } from './store';

const dict = {
  shop: { en: 'Shop', hi: 'शॉप' },
  home: { en: 'Home', hi: 'होम' },
  sarees: { en: 'Sarees', hi: 'साड़ियाँ' },
  suits: { en: 'Suits', hi: 'सूट' },
  search: { en: 'Search', hi: 'खोजें' },
  wishlist: { en: 'Wishlist', hi: 'पसंदीदा' },
  bag: { en: 'Bag', hi: 'बैग' },
  lookbook: { en: 'Lookbook', hi: 'लुकबुक' },
  visit: { en: 'Visit', hi: 'आइए' },
  about: { en: 'About', hi: 'हमारे बारे में' },
  shopSarees: { en: 'Shop Sarees', hi: 'साड़ियाँ देखें' },
  shopSuits: { en: 'Shop Suits', hi: 'सूट देखें' },
  skipToShop: { en: 'Skip to shop', hi: 'सीधे शॉप पर' },
  skipIntro: { en: 'Skip intro', hi: 'इंट्रो छोड़ें' },
  addToBag: { en: 'Add to bag', hi: 'बैग में डालें' },
  added: { en: 'Added', hi: 'जुड़ गया' },
  quickAdd: { en: 'Quick add', hi: 'जल्दी जोड़ें' },
  buyOnWhatsApp: { en: 'Buy on WhatsApp', hi: 'WhatsApp पर खरीदें' },
  checkoutWhatsApp: { en: 'Order on WhatsApp', hi: 'WhatsApp पर ऑर्डर करें' },
  payOnline: { en: 'Pay online', hi: 'ऑनलाइन भुगतान' },
  comingSoon: { en: 'Coming soon — Razorpay', hi: 'जल्द आ रहा है — Razorpay' },
  subtotal: { en: 'Subtotal', hi: 'कुल' },
  emptyBag: { en: 'Your bag is waiting for its first thread.', hi: 'आपका बैग पहले धागे का इंतज़ार कर रहा है।' },
  emptyWish: { en: 'Nothing saved yet. Tap the heart on anything you love.', hi: 'अभी कुछ सेव नहीं है। पसंद आए तो दिल दबाइए।' },
  continueShopping: { en: 'Continue shopping', hi: 'खरीदारी जारी रखें' },
  viewBag: { en: 'View bag', hi: 'बैग देखें' },
  remove: { en: 'Remove', hi: 'हटाएँ' },
  size: { en: 'Size', hi: 'साइज़' },
  qty: { en: 'Qty', hi: 'मात्रा' },
  unstitched: { en: 'Unstitched', hi: 'अनसिला' },
  stitched: { en: 'Stitched', hi: 'सिला हुआ' },
  inStock: { en: 'In stock', hi: 'स्टॉक में' },
  outOfStock: { en: 'Sold out', hi: 'बिक गया' },
  coupon: { en: 'Coupon code', hi: 'कूपन कोड' },
  apply: { en: 'Apply', hi: 'लगाएँ' },
  shippingNote: {
    en: 'Shipping is confirmed on WhatsApp with your pincode.',
    hi: 'शिपिंग आपके पिनकोड के साथ WhatsApp पर तय होगी।',
  },
  yourName: { en: 'Your name', hi: 'आपका नाम' },
  pincode: { en: 'Pincode', hi: 'पिनकोड' },
  check: { en: 'Check', hi: 'जाँचें' },
  filters: { en: 'Filters', hi: 'फ़िल्टर' },
  category: { en: 'Category', hi: 'श्रेणी' },
  fabric: { en: 'Fabric', hi: 'कपड़ा' },
  colour: { en: 'Colour', hi: 'रंग' },
  occasion: { en: 'Occasion', hi: 'मौका' },
  price: { en: 'Price', hi: 'कीमत' },
  sort: { en: 'Sort', hi: 'क्रम' },
  clear: { en: 'Clear all', hi: 'सब हटाएँ' },
  all: { en: 'All', hi: 'सभी' },
  results: { en: 'pieces', hi: 'पीस' },
  noResults: { en: 'No pieces match. Loosen a filter or two.', hi: 'कुछ नहीं मिला। कुछ फ़िल्टर हटाइए।' },
  completeLook: { en: 'Complete the look', hi: 'लुक पूरा करें' },
  recentlyViewed: { en: 'Recently viewed', hi: 'हाल ही में देखे' },
  feelFabric: { en: 'Feel the fabric', hi: 'कपड़ा महसूस करें' },
  fabricCare: { en: 'Fabric & care', hi: 'कपड़ा और देखभाल' },
  details: { en: 'Details', hi: 'विवरण' },
  delivery: { en: 'Delivery', hi: 'डिलीवरी' },
  searchPlaceholder: { en: 'Search Banarasi, Anarkali, red…', hi: 'बनारसी, अनारकली, लाल… खोजें' },
  recent: { en: 'Recent', hi: 'हाल के' },
  close: { en: 'Close', hi: 'बंद करें' },
  menu: { en: 'Menu', hi: 'मेन्यू' },
  getDirections: { en: 'Get directions', hi: 'रास्ता देखें' },
  call: { en: 'Call', hi: 'कॉल' },
  follow: { en: 'Follow', hi: 'फ़ॉलो' },
  shopThisFabric: { en: 'Shop this fabric', hi: 'यह कपड़ा देखें' },
  viewAll: { en: 'View all', hi: 'सब देखें' },
  findColour: { en: 'Find your colour', hi: 'अपना रंग चुनें' },
  sound: { en: 'Sound', hi: 'आवाज़' },
  updates: { en: 'Get new arrivals on WhatsApp', hi: 'नए कलेक्शन की खबर WhatsApp पर' },
  subscribe: { en: 'Notify me', hi: 'मुझे बताएँ' },
  policies: { en: 'Policies', hi: 'नीतियाँ' },
  backToShop: { en: 'Back to the shop', hi: 'शॉप पर लौटें' },
  goHome: { en: 'Back to the film', hi: 'फ़िल्म पर लौटें' },
  mrp: { en: 'MRP', hi: 'एमआरपी' },
  off: { en: 'off', hi: 'छूट' },
  new: { en: 'New', hi: 'नया' },
  bestseller: { en: 'Bestseller', hi: 'बेस्टसेलर' },
  limited: { en: 'Limited', hi: 'सीमित' },
} as const;

export type TKey = keyof typeof dict;

export const translate = (lang: Lang, k: TKey) => dict[k][lang];

export function useLang() {
  return useShop((s) => s.lang);
}

export function useT() {
  const lang = useLang();
  return (k: TKey) => dict[k][lang];
}
