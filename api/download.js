// api/download.js
// Payment-gated download for digital prints and gallery sets. Verifies the Stripe session
// is paid for this exact SKU, then delivers the file(s) from the PRIVATE Vercel Blob store
// via short-lived presigned URLs (the store rejects unauthenticated fetches entirely).
//   Single print: GET /api/download?session_id=cs_..._&sku=print-...  -> 302 to a presigned URL
//   Gallery set:  same URL with a set sku                             -> a small download page
import Stripe from 'stripe';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { getDigital, setComponents } from '../lib/products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// product.file holds the private blob PATHNAME -> mint a 1-hour presigned GET URL.
// (Backwards compatible: a full http(s) URL is passed through unchanged.)
async function fileUrl(file) {
  if (!file) return null;
  if (/^https?:\/\//.test(file)) return file;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not set');
  const st = await issueSignedToken({ token, pathname: file, operations: ['get'], validUntil: Date.now() + 3600e3 });
  const { presignedUrl } = await presignUrl(st, { operation: 'get', pathname: file, access: 'private' });
  return presignedUrl;
}

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

    // Gallery set → simple page listing each print's presigned download link.
    if (product.items) {
      const comps = setComponents(product);
      if (!comps.length || comps.some((c) => !c.file)) return res.status(404).send('Files not found');
      const urls = await Promise.all(comps.map((c) => fileUrl(c.file)));
      const links = comps.map((c, i) =>
        `<a class="dl" href="${esc(urls[i])}" download>⬇ ${esc((c.name || c.sku).replace(' — Art Print', ''))}</a>`).join('\n');
      return res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Your prints — Little Poppin</title>
<style>body{font-family:system-ui,sans-serif;background:#FDFAF7;color:#2C2C2C;text-align:center;padding:60px 20px}
h1{font-weight:600}.dl{display:block;max-width:420px;margin:12px auto;padding:16px;background:#B5223E;color:#fff;
border-radius:12px;text-decoration:none;font-weight:700}.dl:hover{background:#8C1A30}p{color:#6B6B6B}</style></head>
<body><h1>Your ${esc(product.title || 'Little Poppin')} is ready 🌙</h1>
<p>Tap each to download and save your high-resolution prints. These links stay fresh for an hour —
just revisit this page from your email any time for new ones.</p>${links}
<p style="margin-top:30px">🌿 A portion of your purchase supports children's charities. Thank you!</p></body></html>`);
    }

    // Single print → redirect to a presigned URL.
    if (!product.file) return res.status(404).send('File not found');
    return res.redirect(302, await fileUrl(product.file));
  } catch (err) {
    console.error('download error:', err);
    return res.status(404).send('Order not found');
  }
}
