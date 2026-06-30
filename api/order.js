// api/order.js
// Read-only: returns a safe summary of a completed Checkout Session for success.html.
// Never exposes secret data — only payment status, masked email and the amount paid.
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const id = req.query.session_id;
  if (!id) return res.status(400).json({ error: 'Missing session_id' });
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    return res.status(200).json({
      paid: s.payment_status === 'paid',
      email: s.customer_details?.email || null,
      amount_total: s.amount_total,
      currency: s.currency,
      type: s.metadata?.type || 'physical',
      sku: s.metadata?.sku || null,
    });
  } catch {
    return res.status(404).json({ error: 'Order not found' });
  }
}
