// api/printclub-send.js. Delivers this month's Print Club print to every active member.
//
// Runs from a Vercel Cron at 21:00 UTC on the 1st of each month (see vercel.json), which
// lands around 7–8am on the 2nd in Canberra. A nice hour for it to arrive. The month is
// resolved from the UTC date, so the send and the label always agree. It needs no input
// and makes no decisions: lib/printclub.js derives the month's print deterministically,
// so a retry after a partial failure re-sends the SAME print rather than a different one.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. If CRON_SECRET is set,
// requests without it are rejected. Otherwise anyone could trigger a send.
//
// Manual/dry run:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "https://littlepoppin.com/api/printclub-send?dry=1"
import Stripe from 'stripe';
import { presignGet, MAX_TTL_MS } from '../lib/blob-link.js';
import { getDigital } from '../lib/products.js';
import { GENERATED_DIGITAL_PRODUCTS } from '../lib/digital-products.generated.js';
import { picksForMonth, monthLabel } from '../lib/printclub.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Members get the longest link the platform allows, rather than the 1 hour a purchase
// link gets. They should not have to be at their desk when the email lands.
const LINK_TTL_MS = MAX_TTL_MS;

/** Every active Little Poppin club subscription, following pagination. */
async function activeMembers() {
  const out = [];
  for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.customer'] })) {
    if (sub.metadata?.brand !== 'little_poppin' || sub.metadata?.type !== 'club') continue;
    const email = sub.customer?.email;
    if (email) out.push({ email, name: sub.customer?.name || '', subscriptionId: sub.id });
  }
  return out;
}

export default async function handler(req, res) {
  // FAIL CLOSED. This endpoint emails every paying member and spends Resend quota, so an
  // unset CRON_SECRET must disable it rather than leave it open to the world. The
  // tempting `if (secret && ...)` form does exactly the wrong thing when the env var is
  // missing, which is precisely when you are least likely to notice.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('Print Club: CRON_SECRET is not set. Refusing to send. Set it in Vercel → Settings → Environment Variables.');
    return res.status(503).json({ error: 'Print Club sending is not configured' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  const dry = req.query.dry === '1';

  try {
    const now = new Date();
    const prints = picksForMonth(GENERATED_DIGITAL_PRODUCTS, now)
      .map(getDigital).filter((p) => p?.file);
    if (!prints.length) {
      console.error('Print Club: no publishable prints for', monthLabel(now));
      return res.status(500).json({ error: 'No prints available for this month' });
    }

    const members = await activeMembers();
    const label = monthLabel(now);

    if (dry) {
      return res.status(200).json({
        dryRun: true, month: label, members: members.length,
        prints: prints.map((p) => p.title),
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not set' });
    const from = process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>';

    const urls = await Promise.all(prints.map((p) => presignGet(p.file, LINK_TTL_MS)));
    let sent = 0;
    const failed = [];

    for (const m of members) {
      const text = [
        `${m.name ? m.name.split(' ')[0] + ',' : 'Hello!'}`,
        '',
        `Your Print Club prints for ${label} are here. ${prints.length} of them:`,
        '',
        ...prints.flatMap((p, i) => [`${p.title}`, urls[i], '']),
        'The links stay live for 6 days, so save the files somewhere safe once you download them.',
        `Print them at home, or take them to any print shop. All high resolution and ready to frame.`,
        '',
        '',
        'Not feeling it this month? You can manage or cancel your membership any time, ',
        'just reply to this email and we\'ll sort it out.',
        '',
        '. Little Poppin',
      ].join('\n');

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [m.email], subject: `Your ${label} prints are here 🌙, ${prints.length} new designs`, text }),
      });
      if (resp.ok) sent++;
      else failed.push({ email: m.email, status: resp.status, body: (await resp.text()).slice(0, 200) });

      // Resend allows 2 requests/second; stay comfortably under it.
      await new Promise((r) => setTimeout(r, 600));
    }

    if (failed.length) console.error('Print Club send failures:', JSON.stringify(failed));
    console.log(`Print Club ${label}: sent ${sent}/${members.length}, ${prints.map((p) => p.title).join(', ')}`);
    return res.status(200).json({ month: label, prints: prints.map((p) => p.title), members: members.length, sent, failed: failed.length });
  } catch (err) {
    console.error('Print Club send error:', err);
    return res.status(500).json({ error: 'Send failed' });
  }
}
