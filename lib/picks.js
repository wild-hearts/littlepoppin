// lib/picks.js. "Pick any 3": the standing multi-buy rule for single digital prints.
//
// WHY: every comparable shop runs a standing multi-buy ("any 3 prints, save 20%"), and
// Little Poppin had none. A buyer who wanted three prints that were not one of the curated
// sets paid full price three times over.
//
// The rule is priced to agree with the curated sets, not to undercut them: a curated set
// of 3 is $30, so three picks are also $30 ($10 each instead of $12). If picks were 20%
// off ($28.80) every set page would look like a worse deal than building your own.
// Change PICK_PRICE and the sets' prices together or not at all.
//
// A pick order is ONE Stripe line item with the chosen SKUs in session metadata
// (`p_items`). /api/download and the webhook turn that metadata back into a virtual
// gallery set so delivery reuses the existing multi-print download page unchanged.

import { getDigital, isDeliverable } from './products.js';

export const PICKS = {
  sku: 'pick',          // metadata sku becomes `pick-<n>`
  minForDeal: 3,        // picks at or above this count get the deal price
  max: 6,               // metadata is capped at 500 chars; six SKUs sit well inside it
  dealPrice: 1000,      // AUD cents per print once the deal applies
  fullPrice: 1200,      // AUD cents per print below the threshold
};

/** Price in cents for `n` picked prints. */
export function pickPrice(n) {
  const per = n >= PICKS.minForDeal ? PICKS.dealPrice : PICKS.fullPrice;
  return n * per;
}

/** Saving in cents versus buying each print alone. */
export function pickSaving(n) {
  return n * PICKS.fullPrice - pickPrice(n);
}

/**
 * Validate a list of picked SKUs from the browser. Returns { ok, error } or
 * { ok, items } where items are the resolved single-print products, de-duplicated and
 * in the order chosen.
 */
export function parsePicks(input) {
  if (!Array.isArray(input)) return { ok: false, error: 'No prints were picked.' };
  const skus = [...new Set(input.map((s) => String(s || '').trim()).filter(Boolean))];
  if (!skus.length) return { ok: false, error: 'No prints were picked.' };
  if (skus.length > PICKS.max) return { ok: false, error: `You can pick up to ${PICKS.max} prints at a time.` };
  const items = [];
  for (const sku of skus) {
    const p = getDigital(sku);
    if (!p || p.items || !sku.startsWith('print-')) return { ok: false, error: 'Only single prints can be picked.' };
    if (!isDeliverable(p)) return { ok: false, error: `"${p.title || p.name}" isn’t available for download yet.` };
    items.push(p);
  }
  return { ok: true, items };
}

/** The metadata written to the Stripe session for a pick order. */
export function pickMetadata(items) {
  return { sku: `${PICKS.sku}-${items.length}`, p_items: items.map((p) => p.sku).join(',') };
}

/**
 * Turn a paid session's metadata back into a product for delivery. Returns the ordinary
 * catalogue product for a normal order, a virtual set for a pick order, or null.
 */
export function productFromMetadata(meta = {}) {
  const sku = String(meta.sku || '');
  if (sku.startsWith(`${PICKS.sku}-`) && meta.p_items) {
    const items = String(meta.p_items).split(',').filter(Boolean);
    if (!items.length) return null;
    return {
      sku, items, name: `Your ${items.length} picked prints`, title: `${items.length} picked prints`,
      price: pickPrice(items.length),
    };
  }
  return getDigital(sku);
}
