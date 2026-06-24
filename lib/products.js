// lib/products.js
// Little Poppin product catalogue — the single source of truth for pricing, copy and images.
// Prices are in AUD cents (Stripe expects integer minor units: $15.00 -> 1500).
//
// TODO seed real stock — these are placeholder counts so test checkout isn't blocked.
// For a live "Sold out" state, move `stock` to Supabase / Vercel KV and decrement it in
// api/stripe-webhook.js (the in-memory value here does not persist across invocations).

export const CURRENCY = 'aud';

// Shipping: AU flat rate, free over a threshold, Australia only to start.
export const SHIPPING = {
  flatAmount: 995,        // $9.95 AUD
  freeOverAmount: 8000,   // free shipping once the item subtotal reaches $80.00
  allowedCountries: ['AU'],
};

export const PRODUCTS = {
  pink: {
    sku: 'pink',
    name: 'The Garden Dance — Pink Butterfly Swaddle',
    description: 'Premium 70% bamboo / 30% cotton baby swaddle, 47 x 47in. Pink butterfly design.',
    price: 1500,          // $15.00 AUD
    image: '/images/pink-design.jpg',
    stock: 999,           // TODO seed real stock
  },
  green: {
    sku: 'green',
    name: 'The Wild Garden — Teal Botanical Swaddle',
    description: 'Premium 70% bamboo / 30% cotton baby swaddle, 47 x 47in. Teal botanical design.',
    price: 1500,          // $15.00 AUD
    image: '/images/green-design.jpg',
    stock: 999,           // TODO seed real stock
  },
  bundle: {
    sku: 'bundle',
    name: 'The Pair — Pink + Teal Swaddle Bundle',
    description: 'Both signature swaddles: The Garden Dance (pink) and The Wild Garden (teal).',
    price: 2700,          // $27.00 AUD — TODO confirm bundle price with Naomi (2 x $15, save $3)
    image: '/images/lifestyle-green.jpg',
    stock: 999,           // TODO seed real stock
  },
};

export function getProduct(sku) {
  return PRODUCTS[sku] || null;
}

// Shipping charge (cents) for a given item subtotal. Returns 0 when free shipping applies.
export function shippingFor(subtotal) {
  return subtotal >= SHIPPING.freeOverAmount ? 0 : SHIPPING.flatAmount;
}
