// api/stripe-webhook.js
// Verifies Stripe webhook signatures and acts on completed orders.
// Endpoint to register: Stripe -> Developers -> Webhooks -> add endpoint
//   URL:   https://littlepoppin.com/api/stripe-webhook
//   Event: checkout.session.completed
// Copy that endpoint's signing secret into STRIPE_WEBHOOK_SECRET.
import Stripe from 'stripe';
import { getProduct } from '../lib/products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe signature verification needs the raw, unparsed request body.
export const config = { api: { bodyParser: false } };

async function rawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method not allowed');
  }

  let event;
  try {
    const buf = await rawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // This Stripe account is shared across Wild Hearts brands, so every brand's webhook
    // receives every checkout event. Only act on Little Poppin orders, ignore the rest.
    if (session.metadata?.brand === 'little_poppin') {
      try {
        await onOrderPaid(session);
      } catch (err) {
        // The payment already succeeded — never 500 here or Stripe will retry the whole event.
        // Log loudly so a failed notice/stock update can be reconciled by hand.
        console.error('Fulfilment handling error:', err);
      }
    }
  }

  return res.status(200).json({ received: true });
}

async function onOrderPaid(session) {
  const sku = session.metadata?.sku;
  const qty = parseInt(session.metadata?.quantity, 10) || 1;

  // Pull the full record (shipping address + contact details) for the fulfilment notice.
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items'],
  });

  await notifyOrder(full, sku, qty);   // 1) email Naomi so she can ship it
  await decrementStock(sku, qty);      // 2) reduce stock (see TODO below)
}

// --- 1) Order notification --------------------------------------------------
async function notifyOrder(session, sku, qty) {
  const to = process.env.ORDER_NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const product = getProduct(sku);
  const d = session.customer_details || {};
  const ship = session.shipping_details || {};
  const addr = ship.address || d.address || {};
  const amount = ((session.amount_total || 0) / 100).toFixed(2);

  const body = [
    'New Little Poppin order',
    '',
    `Product: ${product?.name || sku} x${qty}`,
    `Total paid: $${amount} ${(session.currency || 'aud').toUpperCase()}`,
    '',
    `Ship to: ${ship.name || d.name || ''}`,
    `${addr.line1 || ''} ${addr.line2 || ''}`.trim(),
    `${addr.city || ''} ${addr.state || ''} ${addr.postal_code || ''}`.trim(),
    `${addr.country || ''}`,
    '',
    `Email: ${d.email || ''}`,
    `Phone: ${d.phone || ''}`,
    '',
    `Stripe session: ${session.id}`,
  ].join('\n');

  // If Resend isn't configured yet, log the notice so nothing is lost during testing.
  if (!apiKey || !to) {
    console.log('[order notice — set RESEND_API_KEY + ORDER_NOTIFY_EMAIL to email this]\n' + body);
    return;
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // NOTE: the "from" domain must be verified in Resend, e.g. orders@littlepoppin.com
      from: 'Little Poppin Orders <orders@littlepoppin.com>',
      to: [to],
      subject: `New order — ${product?.name || sku} x${qty} ($${amount})`,
      text: body,
    }),
  });
  if (!resp.ok) console.error('Resend error:', resp.status, await resp.text());
}

// --- 2) Stock ---------------------------------------------------------------
async function decrementStock(sku, qty) {
  // TODO seed real stock + persistence. The catalogue in lib/products.js is in-memory,
  // so this cannot truly decrement across serverless invocations. To power a live
  // "Sold out": store stock in Supabase / Vercel KV and run something like
  //   UPDATE products SET stock = stock - $qty WHERE sku = $sku AND stock >= $qty;
  console.log(`Stock: would decrement ${sku} by ${qty}`);
}
