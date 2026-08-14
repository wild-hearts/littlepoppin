// api/printify-webhook.js. Receives production and shipping updates from Printify.
//
// WHY: without this, a print buyer paid, got a confirmation, and then heard nothing until
// a parcel turned up. Or didn't. Printify knows when an order ships and what the tracking
// number is; nothing was listening.
//
// AUTHENTICATION. Printify does NOT sign webhooks. The webhook object it returns has only
// {topic, url, shop_id, id}: no secret, no signature header. (An earlier version of this
// file verified an HMAC, which meant it rejected every real delivery.) So authenticity is
// established two ways instead:
//
//   1. A shared key in the registered URL (?key=...). Printify calls the URL exactly as
//      registered, so anyone POSTing without the key is turned away immediately.
//   2. More importantly, NOTHING in the request body is trusted for anything that leaves
//      the system. Before emailing a customer we re-fetch the order from Printify's API by
//      id and use the address and tracking from THAT response. A forged payload therefore
//      cannot make us email an arbitrary address. The worst it can do is make us look up
//      an order id, which either exists or doesn't.
//
// Fails closed: no key configured, no processing.
import crypto from 'node:crypto';
import { recordEvent } from '../lib/events.js';
import { PRINTIFY_CONFIG } from '../lib/printify.js';

export const config = { api: { bodyParser: true } };

async function fetchOrder(orderId) {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = PRINTIFY_CONFIG.shopId;
  if (!token || !shopId || !orderId) return null;
  const r = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders/${orderId}.json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return r.json();
}

async function emailBuyer({ to, trackingUrl, carrier, tracking }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return false;
  const from = process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>';
  const text = [
    'Good news. Your print is on its way.',
    '',
    carrier ? `Carrier: ${carrier}` : null,
    tracking ? `Tracking: ${tracking}` : null,
    trackingUrl ? `Track it here: ${trackingUrl}` : null,
    '',
    'It was printed at the production partner closest to you, so it should not be long.',
    '',
    'Any problems at all, just reply to this email.',
    '. Little Poppin',
  ].filter(Boolean).join('\n');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], subject: 'Your print has shipped 📦', text,
      ...(process.env.ORDER_NOTIFY_EMAIL ? { reply_to: process.env.ORDER_NOTIFY_EMAIL } : {}),
    }),
  });
  return r.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }

  const expected = process.env.PRINTIFY_WEBHOOK_SECRET;
  if (!expected) {
    console.error('Printify webhook: PRINTIFY_WEBHOOK_SECRET is not set. Refusing.');
    return res.status(503).json({ error: 'Webhook not configured' });
  }
  const given = String(req.query.key || '');
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const event = req.body || {};
  const type = String(event.type || event.event || 'unknown');
  const payload = event.resource?.data || event.data || {};
  const orderId = event.resource?.id || payload.id || null;

  // Re-fetch from Printify: the body is a hint about WHICH order changed, never the source
  // of truth about who to email.
  const order = await fetchOrder(orderId);
  const shipment = (order?.shipments && order.shipments[0]) || {};

  await recordEvent('printify-' + type.replace(/[^\w-]/g, '-'), {
    printifyOrderId: orderId,
    verified: !!order,
    status: order?.status || payload.status || null,
    carrier: shipment.carrier || null,
    tracking: shipment.number || null,
    trackingUrl: shipment.url || null,
  });

  // Only a shipment we could confirm against the API triggers an email.
  if (/shipment/i.test(type) && order && (shipment.number || shipment.url)) {
    const to = order.address_to?.email || null;
    try {
      const sent = await emailBuyer({ to, trackingUrl: shipment.url, carrier: shipment.carrier, tracking: shipment.number });
      await recordEvent('shipping-email', { printifyOrderId: orderId, to, sent });
    } catch (err) {
      console.error('Shipping email failed:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}
