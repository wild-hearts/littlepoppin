// lib/printify.js. Physical print fulfilment via the Printify API.
// Config is filled by scripts/printify-setup.mjs (reads your Printify catalogue, creates the
// Little Poppin poster/framed/canvas products, writes lib/printify-config.generated.js).
import { PRINTIFY_CONFIG } from './printify-config.generated.js';

export { PRINTIFY_CONFIG };

// Look up a physical print option -> price (cents) + Printify ids, or null if not orderable.
export function getPrintOption(artSku, format, sizeKey) {
  const fmt = PRINTIFY_CONFIG.formats?.[format];
  const size = fmt?.sizes?.find((s) => s.key === sizeKey);
  const productId = PRINTIFY_CONFIG.products?.[artSku]?.[format];
  if (!fmt || !size || !size.variantId || !productId || !PRINTIFY_CONFIG.shopId) return null;
  return {
    price: size.price,
    productId,
    variantId: size.variantId,
    label: `${size.label} ${fmt.label}`,
  };
}

// A gallery SET printed physically: the same format/size for each of its three prints,
// as one Printify order. Sets are the natural physical upsell. They were designed to hang
// together. Whereas a 93-print collection obviously is not, so only sets get this.
// SET_PRINT_SAVING keeps the physical set slightly cheaper than three separate orders,
// mirroring the digital set discount, without inventing a margin that is not there.
const SET_PRINT_SAVING = 0.10;

/** Beyond this many prints a physical "set" stops being a product anyone wants posted. */
export const MAX_PHYSICAL_SET = 5;

export function getSetPrintOption(itemSkus, format, sizeKey) {
  // Enforced HERE as well as in the page, so a hand-crafted request cannot order 93
  // framed prints just because the button is absent from the page.
  if (!itemSkus || itemSkus.length > MAX_PHYSICAL_SET) return null;
  const opts = itemSkus.map((sku) => getPrintOption(sku, format, sizeKey));
  if (!opts.length || opts.some((o) => !o)) return null;
  const gross = opts.reduce((n, o) => n + o.price, 0);
  return {
    price: Math.round(gross * (1 - SET_PRINT_SAVING) / 100) * 100,   // round to whole dollars
    items: opts.map((o) => ({ productId: o.productId, variantId: o.variantId })),
    label: `${opts[0].label} x${opts.length}`,
  };
}

export function printifyConfigured() {
  return !!PRINTIFY_CONFIG.shopId && Object.keys(PRINTIFY_CONFIG.formats || {}).length > 0;
}

// Submit a paid order to Printify for production + shipping.
// Accepts either a single {productId, variantId} or an `items` array, so one code path
// covers a single print and a three-print gallery set.
export async function submitPrintifyOrder({ externalId, productId, variantId, items, address, email, phone }) {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = PRINTIFY_CONFIG.shopId;
  const lineItems = (items && items.length ? items : [{ productId, variantId }])
    .filter((i) => i && i.productId && i.variantId);
  if (!token || !shopId || !lineItems.length) throw new Error('Printify not configured');

  const body = {
    external_id: externalId,
    label: 'Little Poppin print',
    line_items: lineItems.map((i) => ({ product_id: i.productId, variant_id: Number(i.variantId), quantity: i.quantity || 1 })),
    shipping_method: 1, // standard
    send_shipping_notification: true,
    address_to: {
      first_name: (address.name || 'Customer').split(' ')[0],
      last_name: (address.name || '').split(' ').slice(1).join(' ') || '.',
      email: email || '',
      phone: phone || '',
      country: address.country || 'AU',
      region: address.state || '',
      city: address.city || '',
      address1: address.line1 || '',
      address2: address.line2 || '',
      zip: address.postal_code || '',
    },
  };

  const resp = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Printify order failed ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  return resp.json();
}
