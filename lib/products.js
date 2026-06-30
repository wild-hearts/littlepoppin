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

// --- Digital downloads ------------------------------------------------------
// Digital prints: no shipping, delivered as a payment-gated download link (shown
// on the success page + emailed via Resend). `file` is the PRIVATE high-res Vercel
// Blob URL (server-only — never put it in client HTML). `preview` is an optional
// PUBLIC thumbnail shown on the Stripe checkout page.
//
// Workflow: upload art with scripts/upload-to-blob.mjs → paste the returned URL as
// `file` here. Full steps in docs/DIGITAL-DOWNLOADS.md.
export const DIGITAL_PRODUCTS = {
  // EXAMPLE — after uploading, replace file/preview with your real Blob URLs and uncomment:
  // 'print-moon-goddess': {
  //   sku: 'print-moon-goddess',
  //   name: 'Moon Goddess — Digital Art Print',
  //   description: 'High-resolution digital download (4:5) for personal printing.',
  //   price: 1200,                                              // $12.00 AUD
  //   preview: 'https://<blob-host>/preview-moon-goddess.png',  // public thumbnail (optional)
  //   file: 'https://<blob-host>/prints/21-moon-goddess-XXXX.png', // PRIVATE high-res
  // },
};

export function getDigital(sku) {
  return DIGITAL_PRODUCTS[sku] || null;
}
