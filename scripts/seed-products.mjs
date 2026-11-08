// Writes data/products.json — 24 seed products (12 sarees, 12 suits).
// Edit this file (or the JSON directly) to change the seed catalogue.
// Run: node scripts/seed-products.mjs
import { writeFileSync } from 'node:fs';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const care = {
  silk: ['Dry clean only', 'Store folded in a muslin cloth', 'Refold every few months to protect the zari'],
  cotton: ['Gentle hand wash in cold water', 'Wash dark colours separately', 'Dry in shade, iron on medium'],
  georgette: ['Dry clean recommended', 'Steam iron on low', 'Hang away from direct sunlight'],
  bandhani: ['Dry clean for the first wash', 'Cold hand wash after, no wringing', 'Dry in shade to keep the dots bright'],
};

const s = (o) => ({ category: 'saree', stitched: false, inStock: true, ...o });
const u = (o) => ({ category: 'suit', stitched: true, inStock: true, sizes: SIZES, ...o });

const products = [
  s({ slug: 'gulabi-banarasi-katan-silk-saree', name: 'Gulabi Banarasi Katan Silk Saree', nameHi: 'गुलाबी बनारसी कटान सिल्क साड़ी', subcategory: 'Banarasi', fabric: 'Banarasi', colorFamily: 'Pink', colorHex: '#C2185B', occasion: ['wedding', 'festive'], price: 18999, mrp: 22999, badges: ['bestseller'], description: 'Pure katan silk woven in Varanasi, with a dense gold zari jaal of kairi buttas and a heavy pallu that catches every lamp in the room.', care: care.silk }),
  s({ slug: 'neelambari-banarasi-tanchoi-saree', name: 'Neelambari Banarasi Tanchoi Saree', nameHi: 'नीलाम्बरी बनारसी तनछोई साड़ी', subcategory: 'Banarasi', fabric: 'Banarasi', colorFamily: 'Blue', colorHex: '#2A3F9D', occasion: ['wedding'], price: 24999, badges: ['limited'], description: 'A midnight-blue tanchoi with self-coloured florals and a temple border in antique gold. Only a handful are woven each season.', care: care.silk }),
  s({ slug: 'chandni-chanderi-silk-cotton-saree', name: 'Chandni Chanderi Silk-Cotton Saree', nameHi: 'चाँदनी चंदेरी सिल्क-कॉटन साड़ी', subcategory: 'Chanderi', fabric: 'Chanderi', colorFamily: 'Ivory', colorHex: '#EFE6D2', occasion: ['office', 'daily', 'festive'], price: 4299, mrp: 4999, badges: ['new'], description: 'Feather-light Chanderi in moonlit ivory, scattered with tiny gold coin buttis and finished with a slim zari border.', care: care.silk }),
  s({ slug: 'mehendi-chanderi-butti-saree', name: 'Mehendi Chanderi Butti Saree', nameHi: 'मेहंदी चंदेरी बूटी साड़ी', subcategory: 'Chanderi', fabric: 'Chanderi', colorFamily: 'Green', colorHex: '#6B8E23', occasion: ['festive', 'daily'], price: 3799, description: 'Mehendi green Chanderi with hand-placed gold buttis — made for haldi mornings and festive afternoons.', care: care.silk }),
  s({ slug: 'rangeela-bandhani-gaji-silk-saree', name: 'Rangeela Bandhani Gaji Silk Saree', nameHi: 'रंगीला बांधनी गजी सिल्क साड़ी', subcategory: 'Bandhani', fabric: 'Bandhani', colorFamily: 'Red', colorHex: '#B3122B', occasion: ['festive', 'wedding'], price: 8499, mrp: 9999, badges: ['bestseller'], description: 'Thousands of hand-tied dots on gaji silk, in the deep sindoor red of a Rajasthani wedding, with a woven zari pallu.', care: care.bandhani }),
  s({ slug: 'kesariya-bandhani-georgette-saree', name: 'Kesariya Bandhani Georgette Saree', nameHi: 'केसरिया बांधनी जॉर्जेट साड़ी', subcategory: 'Bandhani', fabric: 'Bandhani', colorFamily: 'Orange', colorHex: '#E07B1A', occasion: ['festive', 'party'], price: 5299, description: 'Kesariya georgette tied in fine bandhani clusters, light enough to dance in all night.', care: care.bandhani }),
  s({ slug: 'saawan-leheriya-chiffon-saree', name: 'Saawan Leheriya Chiffon Saree', nameHi: 'सावन लहरिया शिफॉन साड़ी', subcategory: 'Leheriya', fabric: 'Leheriya', colorFamily: 'Green', colorHex: '#4F9D69', occasion: ['festive', 'daily'], price: 3299, mrp: 3999, badges: ['new'], description: 'Monsoon leheriya waves in green and gold on soft chiffon — the saree of Teej.', care: care.georgette }),
  s({ slug: 'panchrang-leheriya-saree', name: 'Panchrang Leheriya Saree', nameHi: 'पंचरंग लहरिया साड़ी', subcategory: 'Leheriya', fabric: 'Leheriya', colorFamily: 'Yellow', colorHex: '#E0A800', occasion: ['festive'], price: 4499, description: 'Five auspicious colours dyed in rippling diagonals, finished with a gota border.', care: care.georgette }),
  s({ slug: 'midnight-sequin-georgette-saree', name: 'Midnight Sequin Georgette Saree', nameHi: 'मिडनाइट सीक्विन जॉर्जेट साड़ी', subcategory: 'Georgette', fabric: 'Georgette', colorFamily: 'Black', colorHex: '#15121A', occasion: ['party'], price: 6999, mrp: 8499, badges: ['new'], description: 'Inky georgette strewn with gold sequins that glitter like a night sky over the Mahi.', care: care.georgette }),
  s({ slug: 'peach-blush-georgette-saree', name: 'Peach Blush Georgette Saree', nameHi: 'पीच ब्लश जॉर्जेट साड़ी', subcategory: 'Georgette', fabric: 'Georgette', colorFamily: 'Peach', colorHex: '#F2A07B', occasion: ['party', 'office'], price: 3499, description: 'A fluid peach georgette with a fine zari edge — easy elegance from office to evening.', care: care.georgette }),
  s({ slug: 'kota-doria-cotton-saree', name: 'Kota Doria Cotton Saree', nameHi: 'कोटा डोरिया कॉटन साड़ी', subcategory: 'Cotton', fabric: 'Cotton', colorFamily: 'Blue', colorHex: '#8FB8DE', occasion: ['daily', 'office'], price: 1899, description: 'Airy Kota doria checks in sky blue, woven in Kaithoon — cool through a Rajasthan summer.', care: care.cotton }),
  s({ slug: 'indigo-dabu-cotton-saree', name: 'Indigo Dabu Cotton Saree', nameHi: 'इंडिगो दाबू कॉटन साड़ी', subcategory: 'Cotton', fabric: 'Cotton', colorFamily: 'Blue', colorHex: '#2E3A6B', occasion: ['daily'], price: 1499, mrp: 1799, description: 'Mud-resist dabu print from Akola, dyed in indigo, soft from the first wear.', care: care.cotton }),

  u({ slug: 'gulnaar-anarkali-suit-set', name: 'Gulnaar Anarkali Suit Set', nameHi: 'गुलनार अनारकली सूट सेट', subcategory: 'Anarkali', fabric: 'Georgette', colorFamily: 'Wine', colorHex: '#7B1E3A', occasion: ['wedding', 'festive'], price: 7999, mrp: 9499, badges: ['bestseller'], description: 'A 24-kali wine georgette Anarkali with zardozi yoke, churidar and a scalloped net dupatta.', care: care.georgette }),
  u({ slug: 'shehzadi-velvet-anarkali', name: 'Shehzadi Velvet Anarkali', nameHi: 'शहज़ादी वेलवेट अनारकली', subcategory: 'Anarkali', fabric: 'Other', colorFamily: 'Green', colorHex: '#0E6B4F', occasion: ['wedding'], price: 12999, badges: ['limited'], description: 'Emerald micro-velvet with antique gold dabka work — a winter-wedding heirloom in the making.', care: care.silk }),
  u({ slug: 'noor-chanderi-anarkali-suit', name: 'Noor Chanderi Anarkali Suit', nameHi: 'नूर चंदेरी अनारकली सूट', subcategory: 'Anarkali', fabric: 'Chanderi', colorFamily: 'Teal', colorHex: '#5FB3A1', occasion: ['festive', 'party'], price: 5499, badges: ['new'], description: 'Mint Chanderi Anarkali with gota-patti hem and a sheer organza dupatta.', care: care.silk }),
  u({ slug: 'mohini-sharara-set', name: 'Mohini Sharara Set', nameHi: 'मोहिनी शरारा सेट', subcategory: 'Sharara', fabric: 'Georgette', colorFamily: 'Pink', colorHex: '#D8A39D', occasion: ['wedding', 'party'], price: 9999, mrp: 11999, badges: ['bestseller'], description: 'Rose-gold short kurta with mirror work, flared sharara and a sequinned dupatta.', care: care.georgette }),
  u({ slug: 'rajwadi-gota-patti-sharara', name: 'Rajwadi Gota Patti Sharara', nameHi: 'राजवाड़ी गोटा पत्ती शरारा', subcategory: 'Sharara', fabric: 'Silk', colorFamily: 'Yellow', colorHex: '#D4A017', occasion: ['wedding', 'festive'], price: 14999, description: 'Mustard silk sharara set edged in hand-applied gota patti, as worn in the palaces of Mewar.', care: care.silk }),
  u({ slug: 'leheriya-cotton-salwar-suit', name: 'Leheriya Cotton Salwar Suit', nameHi: 'लहरिया कॉटन सलवार सूट', subcategory: 'Salwar', fabric: 'Leheriya', colorFamily: 'Pink', colorHex: '#E8638B', occasion: ['daily', 'festive'], price: 2499, description: 'Pink-and-orange leheriya on breathable cotton, with a straight kurta and Patiala salwar.', care: care.cotton }),
  u({ slug: 'bandhani-straight-salwar-suit', name: 'Bandhani Straight Salwar Suit', nameHi: 'बांधनी स्ट्रेट सलवार सूट', subcategory: 'Salwar', fabric: 'Bandhani', colorFamily: 'Red', colorHex: '#8B1E2D', occasion: ['festive', 'daily'], price: 3299, mrp: 3799, badges: ['bestseller'], description: 'Maroon bandhani kurta with a gota neckline, straight salwar and a matching dupatta.', care: care.bandhani }),
  u({ slug: 'chikankari-cotton-salwar-suit', name: 'Chikankari Cotton Salwar Suit', nameHi: 'चिकनकारी कॉटन सलवार सूट', subcategory: 'Salwar', fabric: 'Cotton', colorFamily: 'Ivory', colorHex: '#F4F1EA', occasion: ['daily', 'office'], price: 2999, description: 'Ivory mulmul hand-embroidered in Lucknowi chikankari, with a cotton salwar and dupatta.', care: care.cotton }),
  u({ slug: 'banarasi-silk-unstitched-suit-piece', name: 'Banarasi Silk Unstitched Suit Piece', nameHi: 'बनारसी सिल्क अनसिला सूट पीस', subcategory: 'Salwar', fabric: 'Banarasi', colorFamily: 'Wine', colorHex: '#6E1423', occasion: ['festive', 'wedding'], price: 4999, stitched: false, sizes: undefined, description: 'Kurta, bottom and dupatta lengths in maroon Banarasi silk with gold zari — tailor it exactly your way.', care: care.silk }),
  u({ slug: 'zari-chanderi-unstitched-suit-piece', name: 'Zari Chanderi Unstitched Suit Piece', nameHi: 'ज़री चंदेरी अनसिला सूट पीस', subcategory: 'Salwar', fabric: 'Chanderi', colorFamily: 'Teal', colorHex: '#0E7C7B', occasion: ['festive', 'office'], price: 3999, stitched: false, sizes: undefined, badges: ['limited'], description: 'Peacock-teal Chanderi suit lengths with zari buttis and a woven border dupatta.', care: care.silk }),
  u({ slug: 'indigo-block-print-co-ord-set', name: 'Indigo Block-Print Co-ord Set', nameHi: 'इंडिगो ब्लॉक-प्रिंट को-ऑर्ड सेट', subcategory: 'Co-ord', fabric: 'Cotton', colorFamily: 'Blue', colorHex: '#2E3A6B', occasion: ['daily', 'office'], price: 2199, badges: ['new'], description: 'Hand block-printed indigo cotton, a relaxed shirt-kurta and straight trousers.', care: care.cotton }),
  u({ slug: 'sage-linen-blend-co-ord-set', name: 'Sage Linen-Blend Co-ord Set', nameHi: 'सेज लिनन-ब्लेंड को-ऑर्ड सेट', subcategory: 'Co-ord', fabric: 'Other', colorFamily: 'Green', colorHex: '#8FA98F', occasion: ['office', 'daily'], price: 2799, mrp: 3299, description: 'A sage linen-blend co-ord with pintucks and a hint of zari at the cuffs.', care: care.cotton }),
];

const out = products.map((p, i) => {
  const { sizes, mrp, badges, ...rest } = p;
  const o = {
    id: `SC-${String(i + 1).padStart(3, '0')}`,
    ...rest,
    images: [1, 2, 3].map((n) => `/products/${p.slug}/${n}.webp`),
    fabricTexture: `/products/${p.slug}/fabric.webp`,
  };
  if (mrp) o.mrp = mrp;
  if (sizes) o.sizes = sizes;
  if (badges) o.badges = badges;
  return o;
});

writeFileSync(new URL('../data/products.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${out.length} products`);
