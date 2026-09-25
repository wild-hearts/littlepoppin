// api/order.js
// Read-only: returns a safe summary of a completed Checkout Session for success.html.
// Never exposes secret data. Only payment status, masked email and the amount paid.
//
// One exception to "read-only": a paid website invitation is PUBLISHED here if the Stripe
// webhook has not got to it yet, so the buyer sees their link immediately. The operation
// is idempotent (lib/invites.js), so webhook and success page cannot double-publish.
import Stripe from 'stripe';
import { publishInvite } from '../lib/invites.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const id = req.query.session_id;
  if (!id) return res.status(400).json({ error: 'Missing session_id' });
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    const out = {
      paid: s.payment_status === 'paid',
      email: s.customer_details?.email || null,
      amount_total: s.amount_total,
      currency: s.currency,
      type: s.metadata?.type || 'physical',
      sku: s.metadata?.sku || null,
    };
    if (out.paid && out.type === 'invite') {
      try {
        const l = await publishInvite(s);
        out.invite = { url: l.url, manageUrl: l.manageUrl, code: l.code };
      } catch (err) {
        console.error('Invite activation from success page failed (webhook will retry):', err.message);
      }
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json(out);
  } catch {
    return res.status(404).json({ error: 'Order not found' });
  }
}
