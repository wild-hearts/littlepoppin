// api/checkout.js
// Creates a Stripe Checkout Session for a single SKU and returns its hosted URL.
// The storefront POSTs { sku, quantity } and then redirects the buyer to session.url.
import Stripe from 'stripe';
import { getProduct, getDigital, isDeliverable, shippingFor, CURRENCY, SHIPPING } from '../lib/products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Resolve the site origin so success/cancel/image URLs work in preview AND production.
function baseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const sku = String(body.sku || '');
    const quantity = Math.max(1, Math.min(10, parseInt(body.quantity, 10) || 1));

    // --- Digital download: no shipping/phone; delivered as a gated link after payment ---
    const digital = getDigital(sku);
    if (digital) {
      // Safety: never take money for a print (or set) whose high-res file(s) aren't hosted yet.
      if (!isDeliverable(digital)) return res.status(409).json({ error: 'This print isn’t available for download yet — check back soon.' });
      const origin = baseUrl(req);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          digital.stripePriceId
            // Use the Stripe Product/Price if this print has been loaded onto Stripe...
            ? { price: digital.stripePriceId, quantity: 1 }
            // ...otherwise build the price inline (absolute image URL required by Stripe).
            : {
                quantity: 1,
                price_data: {
                  currency: CURRENCY,
                  unit_amount: digital.price,
                  product_data: {
                    name: digital.name,
                    description: digital.description,
                    ...(digital.preview ? { images: [digital.preview.startsWith('http') ? digital.preview : `${origin}${digital.preview}`] } : {}),
                    metadata: { sku: digital.sku, brand: 'little_poppin', type: 'digital' },
                  },
                },
              },
        ],
        success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel.html`,
        metadata: { brand: 'little_poppin', sku: digital.sku, type: 'digital' },
      });
      return res.status(200).json({ url: session.url });
    }

    const product = getProduct(sku);
    if (!product) return res.status(400).json({ error: 'Unknown product' });
    if (product.stock <= 0) return res.status(409).json({ error: 'Sold out' });

    const origin = baseUrl(req);
    const subtotal = product.price * quantity;
    const shipAmount = shippingFor(subtotal);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: product.price,
          product_data: {
            name: product.name,
            description: product.description,
            images: [`${origin}${product.image}`],
            metadata: { sku: product.sku, brand: 'little_poppin' },
          },
        },
      }],
      shipping_address_collection: { allowed_countries: SHIPPING.allowedCountries },
      phone_number_collection: { enabled: true },
      shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: shipAmount === 0 ? 'Free shipping' : 'Standard shipping (Australia)',
          fixed_amount: { amount: shipAmount, currency: CURRENCY },
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 7 },
          },
        },
      }],
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`,
      metadata: { brand: 'little_poppin', sku: product.sku, quantity: String(quantity) },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    return res.status(500).json({ error: 'Could not start checkout' });
  }
}
