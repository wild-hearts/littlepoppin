// lib/products.js
// Little Poppin product catalogue — the single source of truth for pricing, copy and images.
// Prices are in AUD cents (Stripe expects integer minor units: $15.00 -> 1500).
//
// TODO seed real stock — these are placeholder counts so test checkout isn't blocked.
// For a live "Sold out" state, move `stock` to Supabase / Vercel KV and decrement it in
// api/stripe-webhook.js (the in-memory value here does not persist across invocations).

import { GENERATED_DIGITAL_PRODUCTS } from './digital-products.generated.js';
import { STRIPE_PRICES } from './stripe-prices.js';

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
// Prints come from the auto-generated catalogue (build-prints-shop.mjs). Each has a public
// `preview` thumbnail but `file: null` until its high-res original is uploaded to Vercel Blob;
// checkout is blocked while file is null, so nothing sells without a deliverable.
export const DIGITAL_PRODUCTS = Object.fromEntries(
  Object.entries(GENERATED_DIGITAL_PRODUCTS).map(([sku, p]) =>
    [sku, { ...p, stripePriceId: STRIPE_PRICES[sku] || null }]
  )
);

export function getDigital(sku) {
  return DIGITAL_PRODUCTS[sku] || null;
}

// Gallery-set components (each set has an `items` array of print SKUs).
export function setComponents(product) {
  return (product?.items || []).map(getDigital).filter(Boolean);
}

// A product can be delivered only when its high-res file(s) are hosted. For a set,
// every component print must be uploaded. Used to block checkout until launch.
export function isDeliverable(product) {
  if (!product) return false;
  if (product.items) {
    const c = setComponents(product);
    return c.length === product.items.length && c.every((x) => x.file);
  }
  return !!product.file;
}
