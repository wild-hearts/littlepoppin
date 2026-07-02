// lib/printify.js — physical print fulfilment via the Printify API.
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

export function printifyConfigured() {
  return !!PRINTIFY_CONFIG.shopId && Object.keys(PRINTIFY_CONFIG.formats || {}).length > 0;
}

// Submit a paid order to Printify for production + shipping.
export async function submitPrintifyOrder({ externalId, productId, variantId, address, email, phone }) {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = PRINTIFY_CONFIG.shopId;
  if (!token || !shopId || !productId || !variantId) throw new Error('Printify not configured');

  const body = {
    external_id: externalId,
    label: 'Little Poppin print',
    line_items: [{ product_id: productId, variant_id: Number(variantId), quantity: 1 }],
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
