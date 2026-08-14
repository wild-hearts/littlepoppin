// api/stripe-webhook.js
// Verifies Stripe webhook signatures and acts on completed orders.
// Endpoint to register: Stripe -> Developers -> Webhooks -> add endpoint
//   URL:   https://littlepoppin.com/api/stripe-webhook
//   Event: checkout.session.completed
// Copy that endpoint's signing secret into STRIPE_WEBHOOK_SECRET.
import Stripe from 'stripe';
import { presignGet, MAX_TTL_MS } from '../lib/blob-link.js';
import { getProduct, getDigital, getCustom } from '../lib/products.js';
import { recordEvent } from '../lib/events.js';
import { getPrintOption, getSetPrintOption, submitPrintifyOrder } from '../lib/printify.js';
import { GENERATED_DIGITAL_PRODUCTS } from '../lib/digital-products.generated.js';
import { picksForMonth, monthLabel } from '../lib/printclub.js';

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
        // The payment already succeeded. Never 500 here or Stripe will retry the whole event.
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

  if (session.metadata?.type === 'custom') {
    await handleCustomOrder(full, sku);  // made-to-order: brief to Naomi + confirmation to buyer
    return;
  }
  if (session.metadata?.type === 'club') {
    await handleClubSignup(full);        // subscription: welcome + this month's print now
    return;
  }
  await notifyOrder(full, sku, qty);   // 1) email Naomi so she can fulfil it
  if (session.metadata?.type === 'digital' || session.metadata?.type === 'personalised') {
    // Personalised prints are rendered on demand by /api/download, so they need no
    // manual work. The same gated link delivers them.
    await emailDownloadLink(full, sku, session.metadata); // 2a) email the buyer their link
  } else if (session.metadata?.fulfil === 'printify') {
    await fulfilPrintify(full);         // 2b) send physical print to Printify for production
  } else {
    await decrementStock(sku, qty);     // 2c) reduce stock (physical swaddles; see TODO)
  }
}

// --- Printify fulfilment for physical prints ---
async function fulfilPrintify(session) {
  const { sku, format, size } = session.metadata || {};
  // A gallery set resolves to three line items; a single print to one.
  const art = getDigital(sku);
  const opt = art?.items ? getSetPrintOption(art.items, format, size) : getPrintOption(sku, format, size);
  if (!opt) { console.error('Printify: no option for', sku, format, size); return; }
  const d = session.customer_details || {};
  const ship = session.shipping_details || {};
  const addr = ship.address || d.address || {};
  try {
    const order = await submitPrintifyOrder({
      externalId: session.id,
      productId: opt.productId,
      variantId: opt.variantId,
      items: opt.items,
      address: { name: ship.name || d.name, ...addr },
      email: d.email,
      phone: d.phone,
    });
    console.log('Printify order created:', order.id || JSON.stringify(order).slice(0, 120));
    await recordEvent('printify-submitted', {
      sessionId: session.id, sku, format, size, printifyOrderId: order.id || null,
      country: (addr.country || null), email: d.email || null,
    });
  } catch (err) {
    console.error('Printify fulfilment error (reconcile by hand):', err.message);
    // Record the FAILURE too. Otherwise a paid order that never reached Printify leaves
    // no trace anywhere except a log line nobody reads.
    await recordEvent('printify-failed', {
      sessionId: session.id, sku, format, size, error: err.message.slice(0, 300), email: d.email || null,
    });
  }
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
    console.log('[order notice. Set RESEND_API_KEY + ORDER_NOTIFY_EMAIL to email this]\n' + body);
    return;
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // ORDER_FROM_EMAIL lets you start with Resend's onboarding sender (works immediately,
      // only delivers to your own Resend account email) and switch to a verified domain
      // address like "Little Poppin Orders <orders@littlepoppin.com>" once DNS is set up.
      from: process.env.ORDER_FROM_EMAIL || 'Little Poppin Orders <onboarding@resend.dev>',
      to: [to],
      subject: `New order. ${product?.name || sku} x${qty} ($${amount})`,
      text: body,
    }),
  });
  if (!resp.ok) console.error('Resend error:', resp.status, await resp.text());
}

// --- Made-to-order custom products: emailed brief + buyer confirmation -------
async function handleCustomOrder(session, sku) {
  const apiKey = process.env.RESEND_API_KEY;
  const product = getCustom(sku);
  const d = session.customer_details || {};
  const amount = ((session.amount_total || 0) / 100).toFixed(2);
  const brief = (session.custom_fields || [])
    .map((f) => `  ${f.label?.custom || f.key}: ${f.text?.value || '(blank)'}`)
    .join('\n');

  const naomiText = [
    `🎨 CUSTOM ORDER. ${product?.name || sku}`,
    '',
    `Paid: $${amount} AUD`,
    `Buyer: ${d.name || ''} <${d.email || ''}>`,
    '',
    'THE BRIEF:',
    brief || '  (no fields captured)',
    '',
    `Deliver by email within 5 days to: ${d.email || ''}`,
    `Stripe session: ${session.id}`,
  ].join('\n');

  const buyerText = [
    `Thank you for your order! 🌙`,
    '',
    `We've received your brief for "${product?.name || sku}" and we're getting started.`,
    'Your finished creation will arrive at this email address within 5 days.',
    '',
    '. Little Poppin',
  ].join('\n');

  if (!apiKey) { console.log('[custom order. Set RESEND_API_KEY]\n' + naomiText); return; }
  const from = process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>';
  const send = (payload) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const r1 = await send({ from, to: [process.env.ORDER_NOTIFY_EMAIL], subject: `🎨 Custom order. ${product?.name || sku} ($${amount})`, text: naomiText });
  if (!r1.ok) console.error('Resend (custom brief) error:', r1.status, await r1.text());
  await new Promise((r) => setTimeout(r, 700)); // Resend 2 req/s limit
  if (d.email) {
    const r2 = await send({ from, to: [d.email], subject: 'Your Little Poppin custom order is underway 🌙', text: buyerText });
    if (!r2.ok) console.error('Resend (custom confirm) error:', r2.status, await r2.text());
  }
}

// --- Print Club signup: welcome + this month's print, immediately ------------
// New members should not have to wait until the 1st to get anything, so the same print
// the monthly cron would send is delivered on the spot.
async function handleClubSignup(session) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = session.customer_details?.email;
  const name = session.customer_details?.name || '';
  const from = process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>';

  const now = new Date();
  const prints = picksForMonth(GENERATED_DIGITAL_PRODUCTS, now).map(getDigital).filter((p) => p?.file);
  const label = monthLabel(now);

  let links = [];
  if (prints.length && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      links = await Promise.all(prints.map((p) => presignGet(p.file, MAX_TTL_MS)));
    } catch (err) {
      console.error('Print Club welcome: presign failed', err.message);
    }
  }

  const buyerText = [
    `${name ? 'Welcome, ' + name.split(' ')[0] + '!' : 'Welcome to the Print Club!'}`,
    '',
    'You\'re in. And you don\'t have to wait until next month to start.',
    ...(links.length
      ? ['', `Here are your ${label} prints. All ${prints.length} of them:`, '',
         ...prints.flatMap((p, i) => [p.title, links[i], '']),
         'The links stay live for 6 days, so save the files somewhere safe.']
      : ['', 'Your first prints are on their way. We\'ll email them shortly.']),
    '',
    `From now on ${prints.length || 3} new prints will land in your inbox at the start of every month.`,
    'Nothing to remember, nothing to claim. It just arrives.',
    '',
    '',
    'Want to stop? Reply to any Print Club email and we\'ll cancel it right away.',
    '',
    '. Little Poppin',
  ].join('\n');

  if (!apiKey) { console.log('[print club signup. Set RESEND_API_KEY]\n' + buyerText); return; }

  const send = (payload) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (to) {
    const r = await send({ from, to: [to], subject: `Welcome to the Print Club 🌙, your ${label} prints are inside`, text: buyerText });
    if (!r.ok) console.error('Resend (club welcome) error:', r.status, await r.text());
  }
  await new Promise((r) => setTimeout(r, 700)); // Resend 2 req/s limit
  if (process.env.ORDER_NOTIFY_EMAIL) {
    await send({
      from, to: [process.env.ORDER_NOTIFY_EMAIL],
      subject: '🌙 New Print Club member',
      text: `New Print Club member: ${name} <${to}>\nFirst prints sent: ${prints.map((p) => p.title).join(', ') || '(none available)'}\nStripe session: ${session.id}`,
    });
  }
}

// --- 1b) Digital download link to the buyer ---------------------------------
async function emailDownloadLink(session, sku, meta = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = session.customer_details?.email;
  const product = getDigital(sku);
  if (!to || !product) return;
  const origin = (process.env.SITE_URL || 'https://www.littlepoppin.com').replace(/\/$/, '');
  const link = `${origin}/api/download?session_id=${session.id}&sku=${encodeURIComponent(sku)}`;
  const personalised = meta.type === 'personalised';
  const label = personalised ? `${product.title || product.name}, personalised for ${meta.p_name}` : product.name;

  const text = [
    'Thank you for your Little Poppin order!',
    '',
    personalised
      ? `Your personalised print for ${meta.p_name} is ready to download:`
      : `Your digital print "${product.name}" is ready to download:`,
    link,
    '',
    ...(personalised
      ? ['Your PDF contains the same design at three print-ready sizes. 8×10 inch, A4 and',
         '16×20 inch (in that order). Print whichever suits your frame; matte paper looks loveliest.',
         '']
      : []),
    'Tip: download and save the file to your device. The link is tied to your order.',
  ].join('\n');

  if (!apiKey) { console.log('[digital download link. Set RESEND_API_KEY to email it]\n' + link); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>',
      to: [to],
      subject: `Your Little Poppin download. ${label}`,
      text,
    }),
  });
  if (!resp.ok) console.error('Resend (download) error:', resp.status, await resp.text());
}

// --- 2) Stock ---------------------------------------------------------------
async function decrementStock(sku, qty) {
  // TODO seed real stock + persistence. The catalogue in lib/products.js is in-memory,
  // so this cannot truly decrement across serverless invocations. To power a live
  // "Sold out": store stock in Supabase / Vercel KV and run something like
  //   UPDATE products SET stock = stock - $qty WHERE sku = $sku AND stock >= $qty;
  console.log(`Stock: would decrement ${sku} by ${qty}`);
}
