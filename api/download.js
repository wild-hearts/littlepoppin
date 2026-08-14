// api/download.js
// Payment-gated download for digital prints and gallery sets. Verifies the Stripe session
// is paid for this exact SKU, then delivers the file(s) from the PRIVATE Vercel Blob store
// via short-lived presigned URLs (the store rejects unauthenticated fetches entirely).
//   Single print: GET /api/download?session_id=cs_..._&sku=print-...  -> 302 to a presigned URL
//   Gallery set:  same URL with a set sku                             -> a small download page
import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';
import { presignGet } from '../lib/blob-link.js';
import { getDigital, setComponents } from '../lib/products.js';
import { recordEvent } from '../lib/events.js';
import { renderPersonalisedPdf, cleanField, LIMITS } from '../lib/personalise.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// product.file holds the private blob PATHNAME -> mint a short-lived presigned GET URL.
// (Backwards compatible: a full http(s) URL is passed through unchanged.)
async function fileUrl(file) {
  if (!file) return null;
  if (/^https?:\/\//.test(file)) return file;
  return presignGet(file);
}

// A filename the buyer will recognise in their downloads folder.
const safeFilename = (s) =>
  String(s).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'little-poppin-print';

export default async function handler(req, res) {
  const sessionId = String(req.query.session_id || '');
  const sku = String(req.query.sku || '');
  if (!sessionId || !sku) return res.status(400).send('Missing session_id or sku');

  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status !== 'paid') return res.status(403).send('Payment not completed');
    // Fire-and-forget: a failure here must never stop a paying customer getting their file.
    recordEvent('download', {
      sessionId, sku, email: s.customer_details?.email || null, kind: s.metadata?.type || null,
    }).catch(() => {});
    const kind = s.metadata?.type;
    if ((kind !== 'digital' && kind !== 'personalised') || s.metadata?.sku !== sku) {
      return res.status(403).send('This download is not authorised for that order');
    }
    const product = getDigital(sku);
    if (!product) return res.status(404).send('Not found');

    res.setHeader('Cache-Control', 'no-store');

    // Personalised print → render the keepsake PDF on demand from the paid session's
    // metadata. The buyer's text comes from Stripe, never from the request, so a link
    // cannot be edited to render different wording than was paid for.
    if (kind === 'personalised') {
      if (!product.file) return res.status(404).send('File not found');
      const fields = {
        name: cleanField(s.metadata.p_name, LIMITS.name),
        line2: cleanField(s.metadata.p_line2, LIMITS.line2),
        line3: cleanField(s.metadata.p_line3, LIMITS.line3),
      };
      if (!fields.name) return res.status(422).send('This order is missing its personalisation details. Please contact us.');

      const artResp = await fetch(await fileUrl(product.file));
      if (!artResp.ok) throw new Error(`art fetch failed: ${artResp.status}`);
      const art = Buffer.from(await artResp.arrayBuffer());

      const fontPath = path.join(process.cwd(), 'assets', 'fonts', 'CormorantGaramond.ttf');
      const pdf = await renderPersonalisedPdf(art, fields, { regular: fs.readFileSync(fontPath) });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename="${safeFilename(fields.name)}-little-poppin-print.pdf"`);
      return res.status(200).send(Buffer.from(pdf));
    }

    // Gallery set or collection bundle → a page of presigned links, one per print.
    // Collections run to 90+ prints, so this lays out as a grid rather than a long
    // stack of full-width buttons.
    if (product.items) {
      const comps = setComponents(product);
      if (!comps.length || comps.some((c) => !c.file)) return res.status(404).send('Files not found');
      const urls = await Promise.all(comps.map((c) => fileUrl(c.file)));
      const links = comps.map((c, i) =>
        `<a class="dl" href="${esc(urls[i])}" download>⬇ ${esc((c.name || c.sku).replace(' Art Print', ''))}</a>`).join('\n');
      const many = comps.length > 6;
      return res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Your prints. Little Poppin</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#FDFAF7;color:#2C2C2C;text-align:center;
     padding:56px 20px;margin:0}
h1{font-weight:600;font-size:1.8rem;margin:0 0 10px}
p{color:#6B6B6B;max-width:620px;margin:0 auto 8px}
.grid{display:grid;gap:10px;max-width:${many ? '900px' : '440px'};margin:28px auto 0;
      grid-template-columns:repeat(${many ? 'auto-fill,minmax(260px,1fr)' : '1,1fr'})}
.dl{display:block;padding:14px 16px;background:#B5223E;color:#fff;border-radius:12px;
    text-decoration:none;font-weight:700;font-size:0.94rem;text-align:left}
.dl:hover{background:#8C1A30}
.count{display:inline-block;background:#F0EDE9;color:#6B6B6B;border-radius:999px;
       padding:4px 14px;font-size:0.85rem;margin-top:6px}
</style></head>
<body><h1>Your ${esc(product.title || 'Little Poppin')} is ready 🌙</h1>
<span class="count">${comps.length} high-resolution print${comps.length === 1 ? '' : 's'}</span>
<p style="margin-top:14px">Tap each one to download and save it. These links stay fresh for an hour. Revisit this page from your email any time for new ones.</p>
<div class="grid">${links}</div>
</body></html>`);
    }

    // Single print → redirect to a presigned URL.
    if (!product.file) return res.status(404).send('File not found');
    return res.redirect(302, await fileUrl(product.file));
  } catch (err) {
    console.error('download error:', err);
    return res.status(404).send('Order not found');
  }
}
