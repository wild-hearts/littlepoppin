// api/download.js
// Payment-gated download for digital prints. Verifies the Stripe session is paid for
// this exact SKU, then 302-redirects to the private Blob file URL (kept server-side in
// lib/products.js until payment is confirmed).
//   GET /api/download?session_id=cs_..._&sku=print-...
import Stripe from 'stripe';
import { getDigital } from '../lib/products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    if (!product || !product.file) return res.status(404).send('File not found');

    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, product.file);
  } catch (err) {
    console.error('download error:', err);
    return res.status(404).send('Order not found');
  }
}
