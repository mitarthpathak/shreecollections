const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** ₹ with lakh grouping: 124999 → ₹1,24,999 */
export const formatINR = (n: number) => inr.format(n);

export const discountPct = (price: number, mrp?: number) =>
  mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
