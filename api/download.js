// api/download.js
// Payment-gated download for digital prints and gallery sets. Verifies the Stripe session
// is paid for this exact SKU, then delivers the private Blob file(s) — kept server-side in
// lib/products.js until payment is confirmed.
//   Single print: GET /api/download?session_id=cs_..._&sku=print-...  -> 302 to the file
//   Gallery set:  same URL with a set sku                             -> a small download page
import Stripe from 'stripe';
import { getDigital, setComponents } from '../lib/products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async function handler(req, res) {
  const sessionId = String(req.query.session_id || '');
  const sku = String(req.query.sku || '');
  if (!sessionId || !sku) return res.status(400).send('Missing session_id or sku');

  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status !== 'paid') return res.status(403).send('Payment not completed');
    if (s.metadata?.type !== 'digital' || s.metadata?.sku !== sku) {
      return res.status(403).send('This download is not authorised for that order');
    }
    const product = getDigital(sku);
    if (!product) return res.status(404).send('Not found');

    res.setHeader('Cache-Control', 'no-store');

    // Gallery set → simple page listing each print's download link.
    if (product.items) {
      const comps = setComponents(product);
      if (!comps.length || comps.some((c) => !c.file)) return res.status(404).send('Files not found');
      const links = comps.map((c) =>
        `<a class="dl" href="${esc(c.file)}" download>⬇ ${esc((c.name || c.sku).replace(' — Art Print', ''))}</a>`).join('\n');
      return res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Your prints — Little Poppin</title>
<style>body{font-family:system-ui,sans-serif;background:#FDFAF7;color:#2C2C2C;text-align:center;padding:60px 20px}
h1{font-weight:600}.dl{display:block;max-width:420px;margin:12px auto;padding:16px;background:#B5223E;color:#fff;
border-radius:12px;text-decoration:none;font-weight:700}.dl:hover{background:#8C1A30}p{color:#6B6B6B}</style></head>
<body><h1>Your ${esc(product.title || 'Little Poppin')} is ready 🌙</h1>
<p>Tap each to download and save your high-resolution prints.</p>${links}
<p style="margin-top:30px">🌿 A portion of your purchase supports children's charities. Thank you!</p></body></html>`);
    }

    // Single print → redirect to the file.
    if (!product.file) return res.status(404).send('File not found');
    return res.redirect(302, product.file);
  } catch (err) {
    console.error('download error:', err);
    return res.status(404).send('Order not found');
  }
}
