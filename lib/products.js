// lib/products.js
// Little Poppin product catalogue. The single source of truth for pricing, copy and images.
// Prices are in AUD cents (Stripe expects integer minor units: $15.00 -> 1500).
//
// TODO seed real stock. These are placeholder counts so test checkout isn't blocked.
// For a live "Sold out" state, move `stock` to Supabase / Vercel KV and decrement it in
// api/stripe-webhook.js (the in-memory value here does not persist across invocations).

import { GENERATED_DIGITAL_PRODUCTS } from './digital-products.generated.js';
import { GENERATED_EXTRAS } from './extras-products.generated.js';
import { STRIPE_PRICES } from './stripe-prices.js';

export const CURRENCY = 'aud';

// Shipping for SWADDLES. Parcels Naomi posts herself. Still Australia-only: sending a
// swaddle overseas costs far more than $9.95 and she has no international rate set.
export const SHIPPING = {
  flatAmount: 995,        // $9.95 AUD
  freeOverAmount: 8000,   // free shipping once the item subtotal reaches $80.00
  allowedCountries: ['AU'],
};

// Shipping for PRINTIFY prints. A different problem entirely. Printify Choice prints the
// order near the buyer, but its postage still varies a lot by destination (USD 5.19 in the
// US up to 18.89 rest-of-world, and dearer for framed/canvas than for a rolled poster).
//
// So postage is charged separately rather than buried in the print price: burying the
// worst case would make every US buyer overpay by roughly AUD 30 and price the shop out
// of its biggest market. Rates below are AUD, set from Printify's own quotes with a
// buffer so the dearest item in each band (a framed 16x20) still ships at no loss.
export const PRINT_SHIPPING = {
  US: { amount: 1500, label: 'Standard shipping', countries: ['US'] },
  CA: { amount: 2500, label: 'Standard shipping', countries: ['CA'] },
  AU: { amount: 1500, label: 'Standard shipping', countries: ['AU', 'NZ'] },
  ROW: { amount: 3200, label: 'International shipping', countries: [
    'GB','IE','DE','FR','ES','IT','NL','BE','AT','PT','SE','DK','FI','NO','PL','CZ','GR',
    'CH','LU','HU','RO','BG','HR','SK','SI','EE','LV','LT','CY','MT','IS',
    'JP','SG','HK','KR','MY','TH','AE','IL','ZA','BR','MX','CL','AR','IN','PH','ID','VN','TW',
  ] },
};

/** Which shipping band a destination country falls into. Defaults to the safe one. */
export function printShippingFor(country) {
  const c = String(country || '').toUpperCase();
  for (const band of Object.values(PRINT_SHIPPING)) {
    if (band.countries.includes(c)) return band;
  }
  return PRINT_SHIPPING.ROW;
}

/** Every country a print can be shipped to. The union of the bands. */
export const PRINT_COUNTRIES = [...new Set(Object.values(PRINT_SHIPPING).flatMap((b) => b.countries))].sort();

export const PRODUCTS = {
  pink: {
    sku: 'pink',
    name: 'The Garden Dance. Pink Butterfly Swaddle',
    description: 'Premium 70% bamboo / 30% cotton baby swaddle, 47 x 47in. Pink butterfly design.',
    price: 1500,          // $15.00 AUD
    image: '/images/pink-design.jpg',
    stock: 999,           // TODO seed real stock
  },
  green: {
    sku: 'green',
    name: 'The Wild Garden. Teal Botanical Swaddle',
    description: 'Premium 70% bamboo / 30% cotton baby swaddle, 47 x 47in. Teal botanical design.',
    price: 1500,          // $15.00 AUD
    image: '/images/green-design.jpg',
    stock: 999,           // TODO seed real stock
  },
  bundle: {
    sku: 'bundle',
    name: 'The Pair. Pink + Teal Swaddle Bundle',
    description: 'Both signature swaddles: The Garden Dance (pink) and The Wild Garden (teal).',
    price: 2700,          // $27.00 AUD. TODO confirm bundle price with Naomi (2 x $15, save $3)
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
// Blob URL (server-only. Never put it in client HTML). `preview` is an optional
// PUBLIC thumbnail shown on the Stripe checkout page.
//
// Workflow: upload art with scripts/upload-to-blob.mjs → paste the returned URL as
// `file` here. Full steps in docs/DIGITAL-DOWNLOADS.md.
// Prints come from the auto-generated catalogue (build-prints-shop.mjs). Each has a public
// `preview` thumbnail but `file: null` until its high-res original is uploaded to Vercel Blob;
// checkout is blocked while file is null, so nothing sells without a deliverable.
// Prints, gallery sets and collection bundles, plus the printable ranges built from the
// same art (colouring books, milestone cards, calendar). Extras are ordinary digital
// products. One file, delivered by the same gated download. So they need no special
// handling in checkout or delivery.
export const DIGITAL_PRODUCTS = Object.fromEntries(
  Object.entries({ ...GENERATED_DIGITAL_PRODUCTS, ...GENERATED_EXTRAS }).map(([sku, p]) =>
    [sku, { ...p, stripePriceId: STRIPE_PRICES[sku] || null }]
  )
);

export function getDigital(sku) {
  return DIGITAL_PRODUCTS[sku] || null;
}

// --- Made-to-order custom products -------------------------------------------
// Buyer pays, fills in the brief via Stripe checkout custom fields (max 3), and the
// webhook emails Naomi the brief. Fulfilment is manual (AI-assisted), delivered by
// email within the stated turnaround. No shipping, no stock, no gating needed.
export const CUSTOM_PRODUCTS = {
  'custom-song': {
    sku: 'custom-song',
    name: "Your Child's Song. Custom Made",
    description: 'A one-of-a-kind song written and produced just for your little one. Their name sung out loud. Delivered by email as an MP3 within 5 days.',
    // $45.00. This is hand-made work that takes real time, and it was priced like a
    // digital file. Comparable services charge upwards of $200; $45 stays approachable
    // while no longer losing money on every order. Raise again before automating, // automation needs a PAID Suno plan for commercial rights.
    price: 4500,
    preview: '/images/prints/08-carousel-dreams.jpg',
    fields: [
      { key: 'child_name', label: "Child's name (as it should be sung)" },
      { key: 'occasion', label: 'Occasion (lullaby, birthday, big sister...)' },
      { key: 'style', label: 'Style or vibe (gentle lullaby, fun pop, folk...)', optional: true },
    ],
  },
  'custom-story': {
    sku: 'custom-story',
    name: 'Custom Bedtime Story. Illustrated PDF',
    description: 'A beautifully illustrated bedtime story starring your child. Delivered by email as a PDF within 5 days.',
    price: 1900, // $19.00 AUD
    preview: '/images/prints/08-magical-woodland.jpg',
    fields: [
      { key: 'child_name', label: "Child's name" },
      { key: 'about', label: 'About them (age, favourite things, pets...)' },
      { key: 'theme', label: 'Story theme (space, fairies, dinosaurs...)', optional: true },
    ],
  },
  'custom-birth-print': {
    sku: 'custom-birth-print',
    name: 'Birth Details Print. Personalised',
    description: "Your baby's star-sign art personalised with their name and birth details. High-res digital file by email within 5 days.",
    price: 1900, // $19.00 AUD
    preview: '/images/prints/05-little-leo.jpg',
    fields: [
      { key: 'child_name', label: "Baby's name" },
      { key: 'birth_details', label: 'Birth date, time & weight' },
      { key: 'style_notes', label: 'Which print? (star sign or any shop print)', optional: true },
    ],
  },
};

// Bundles & gifts (same made-to-order flow)
Object.assign(CUSTOM_PRODUCTS, {
  'custom-name-reveal': {
    sku: 'custom-name-reveal',
    name: 'Nursery Name Reveal. Animated Video',
    description: "A magical animated video revealing your baby's name. Perfect for social media announcements. MP4 by email within 5 days.",
    price: 2900, // $29.00 AUD
    preview: '/images/prints/10-dream-castle-in-the-clouds.jpg',
    fields: [
      { key: 'baby_name', label: "Baby's name (as it should appear)" },
      { key: 'theme', label: 'Theme & colours (stars, florals, soft pink...)' },
      { key: 'details', label: 'Any details (due date, sibling reveal...)', optional: true },
    ],
  },
  'bundle-song-story': {
    sku: 'bundle-song-story',
    name: 'Lullaby + Story Bundle',
    description: 'Their custom song AND an illustrated bedtime story starring them. The complete bedtime ritual. Both by email within 5 days.',
    price: 5500, // $55.00. Song $45 + story $19 = $64, so this saves $9
    preview: '/images/prints/04-little-fawn.jpg',
    fields: [
      { key: 'child_name', label: "Child's name" },
      { key: 'about', label: 'About them (age, loves, occasion...)' },
      { key: 'style', label: 'Song style & story theme', optional: true },
    ],
  },
  'bundle-first-year': {
    sku: 'bundle-first-year',
    name: "Baby's First Year Bundle",
    description: 'The keepsake trio: their custom lullaby, a personalised birth-details print, and an illustrated monthly milestone card set with their name. All by email within 5 days.',
    price: 8500, // $85.00. Contains the $45 song; at the old $49 the bundle undercut it
    preview: '/images/prints/05-sleepy-moon-and-stars.jpg',
    fields: [
      { key: 'baby_name', label: "Baby's name" },
      { key: 'birth_details', label: 'Birth date, time & weight' },
      { key: 'style_notes', label: 'Style/colours you love (or a shop print)', optional: true },
    ],
  },
  'gift-voucher-25': {
    sku: 'gift-voucher-25',
    name: 'Little Poppin Gift Voucher. $25',
    description: 'A beautifully designed gift voucher for anything at Little Poppin. The perfect baby-shower gift. Emailed within 48 hours.',
    price: 2500,
    preview: '/images/prints/01-butterfly-garden.jpg',
    fields: [
      { key: 'to_name', label: 'Who is it for? (their name)' },
      { key: 'from_message', label: 'From + your gift message' },
      { key: 'recipient_email', label: 'Send directly to them? (their email, optional)', optional: true },
    ],
  },
  'gift-voucher-50': {
    sku: 'gift-voucher-50',
    name: 'Little Poppin Gift Voucher. $50',
    description: 'A beautifully designed gift voucher for anything at Little Poppin. The perfect baby-shower gift. Emailed within 48 hours.',
    price: 5000,
    preview: '/images/prints/01-butterfly-garden.jpg',
    fields: [
      { key: 'to_name', label: 'Who is it for? (their name)' },
      { key: 'from_message', label: 'From + your gift message' },
      { key: 'recipient_email', label: 'Send directly to them? (their email, optional)', optional: true },
    ],
  },
});

export function getCustom(sku) {
  return CUSTOM_PRODUCTS[sku] || null;
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
