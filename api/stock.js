// api/stock.js
// Returns current stock per SKU so the storefront can disable + relabel "Sold out" buttons.
import { PRODUCTS } from '../lib/products.js';

export default function handler(req, res) {
  const out = {};
  for (const [sku, p] of Object.entries(PRODUCTS)) out[sku] = p.stock;
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  return res.status(200).json(out);
}
