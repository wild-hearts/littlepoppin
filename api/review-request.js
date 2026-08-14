// api/review-request.js. Asks recent buyers for a photo and a few words.
//
// WHY: the site has no social proof at all, which is the most conspicuous gap for a
// brand asking strangers for $79. Reviews do not arrive on their own. They arrive when
// you ask, a few days after the thing has actually been printed and hung.
//
// Runs daily from a Vercel Cron. Idempotency comes from the WINDOW, not from tracking
// state: each run selects orders created between 5 and 6 days ago, so a given order
// falls inside exactly one daily run and nobody is asked twice. If a run is missed the
// window simply passes. Better a skipped ask than a duplicate one.
//
// Only digital orders are asked at 5 days (they are delivered instantly). Physical
// prints are excluded here: they are still in the post at that point.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fails closed, same as
// the Print Club sender. This endpoint emails customers and spends Resend quota.
import Stripe from 'stripe';
import { getDigital } from '../lib/products.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DAY = 24 * 3600;

/** Orders paid between 5 and 6 days ago, for this brand, that were delivered instantly. */
async function recentBuyers(now) {
  const out = [];
  const params = {
    created: { gte: Math.floor(now / 1000) - 6 * DAY, lt: Math.floor(now / 1000) - 5 * DAY },
    limit: 100,
  };
  for await (const s of stripe.checkout.sessions.list(params)) {
    if (s.payment_status !== 'paid') continue;
    const m = s.metadata || {};
    if (m.brand !== 'little_poppin') continue;
    // Instantly-delivered orders only. A posted print is still in transit at day five.
    if (!['digital', 'personalised'].includes(m.type)) continue;
    const email = s.customer_details?.email;
    if (!email) continue;
    out.push({ email, name: s.customer_details?.name || '', sku: m.sku, sessionId: s.id });
  }
  return out;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('Review request: CRON_SECRET is not set. Refusing to send.');
    return res.status(503).json({ error: 'Review requests are not configured' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  const dry = req.query.dry === '1';

  try {
    const buyers = await recentBuyers(Date.now());
    if (dry) return res.status(200).json({ dryRun: true, wouldEmail: buyers.length });
    if (!buyers.length) return res.status(200).json({ sent: 0, note: 'no orders in the window' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not set' });
    const from = process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>';
    const replyTo = process.env.ORDER_NOTIFY_EMAIL;

    let sent = 0;
    const failed = [];
    for (const b of buyers) {
      const product = getDigital(b.sku);
      const first = b.name ? b.name.split(' ')[0] : null;
      const text = [
        first ? `Hi ${first},` : 'Hello!',
        '',
        `A few days ago you bought ${product?.title ? `"${product.title}"` : 'one of our prints'}, I hope it printed beautifully.`,
        '',
        'Little Poppin is a small family business, and honestly the most useful thing',
        'anyone can do for us is say what they thought. If you have a moment:',
        '',
        '  • Did it print well? Anything we could do better?',
        '  • If it is up on the wall, we would love a photo. Seeing them in real homes',
        '    genuinely makes our week, and helps other parents know what they are getting.',
        '',
        'Just reply to this email. We read every one.',
        '',
        'And if something was not right, please tell us. We will fix it or refund you,',
        'no argument.',
        '',
        'Thank you for supporting a small business. 🌿',
        '. Little Poppin',
      ].join('\n');

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: [b.email], subject: 'How did your print turn out?',
          ...(replyTo ? { reply_to: replyTo } : {}),
          text,
        }),
      });
      if (resp.ok) sent++;
      else failed.push({ email: b.email, status: resp.status });
      await new Promise((r) => setTimeout(r, 600)); // Resend allows 2 req/s
    }

    if (failed.length) console.error('Review request failures:', JSON.stringify(failed));
    console.log(`Review requests: sent ${sent}/${buyers.length}`);
    return res.status(200).json({ candidates: buyers.length, sent, failed: failed.length });
  } catch (err) {
    console.error('Review request error:', err);
    return res.status(500).json({ error: 'Send failed' });
  }
}
