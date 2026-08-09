// api/printify-webhook.js — receives production and shipping updates from Printify.
//
// WHY: without this, a print buyer paid, got a confirmation, and then heard nothing until
// a parcel turned up — or didn't. Printify knows when an order is in production, shipped,
// and what the tracking number is; nothing was listening.
//
// Setup (once): Printify → Settings → Webhooks → add
//   https://www.littlepoppin.com/api/printify-webhook
// for the events order:created, order:updated, order:shipment:created, order:shipment:delivered.
// Printify signs each delivery with an HMAC-SHA256 of the raw body using the webhook secret;
// put that secret in PRINTIFY_WEBHOOK_SECRET.
//
// Fails CLOSED on signature: an unauthenticated caller could otherwise email arbitrary
// "your order shipped" messages to any address by posting a forged payload.
import crypto from 'node:crypto';
import { recordEvent } from '../lib/events.js';

export const config = { api: { bodyParser: false } };

const readRaw = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

async function emailBuyer({ to, trackingUrl, carrier, tracking }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return false;
  const from = process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>';
  const text = [
    'Good news — your print is on its way.',
    '',
    carrier ? `Carrier: ${carrier}` : null,
    tracking ? `Tracking: ${tracking}` : null,
    trackingUrl ? `Track it here: ${trackingUrl}` : null,
    '',
    'It was printed at the production partner closest to you, so it should not be long.',
    '',
    'Any problems at all, just reply to this email.',
    '— Little Poppin',
  ].filter(Boolean).join('\n');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: 'Your print has shipped 📦', text,
      ...(process.env.ORDER_NOTIFY_EMAIL ? { reply_to: process.env.ORDER_NOTIFY_EMAIL } : {}) }),
  });
  return r.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }

  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Printify webhook: PRINTIFY_WEBHOOK_SECRET is not set — refusing.');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  let raw;
  try { raw = await readRaw(req); } catch { return res.status(400).end(); }

  // Printify sends `sha256=<hex>`. Compare in constant time.
  const sent = String(req.headers['x-pfy-signature'] || '').replace(/^sha256=/, '');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(sent, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.error('Printify webhook: bad signature');
    return res.status(401).json({ error: 'Bad signature' });
  }

  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).end(); }

  const type = event.type || event.event || 'unknown';
  const data = event.resource?.data || event.data || {};
  const printifyOrderId = event.resource?.id || data.id || null;
  const shipment = (data.shipments && data.shipments[0]) || data.shipment || {};

  await recordEvent('printify-' + String(type).replace(/[^\w-]/g, '-'), {
    printifyOrderId,
    status: data.status || null,
    carrier: shipment.carrier || null,
    tracking: shipment.number || null,
    trackingUrl: shipment.url || null,
  });

  // Only a real shipment triggers an email, so "order updated" churn stays silent.
  if (/shipment/i.test(String(type)) && (shipment.number || shipment.url)) {
    const to = data.address_to?.email || data.metadata?.email || null;
    try {
      const sent = await emailBuyer({ to, trackingUrl: shipment.url, carrier: shipment.carrier, tracking: shipment.number });
      await recordEvent('shipping-email', { printifyOrderId, to, sent });
    } catch (err) {
      console.error('Shipping email failed:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}
