// api/subscribe.js — join the Little Poppin list (stored as a Resend Audience).
// Uses the existing RESEND_API_KEY; lazily creates the "Little Poppin" audience on first
// signup, then adds each contact. POST { email } -> { ok: true }.

const AUDIENCE_NAME = 'Little Poppin';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cachedAudienceId = null; // survives warm invocations, avoids the list call

// Resend allows only 2 requests/second — retry once on 429 after a pause.
async function resend(pathname, opts = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch('https://api.resend.com' + pathname, {
      ...opts,
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (r.status === 429 && attempt < 2) { await sleep(800); continue; }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(data).slice(0, 200)}`);
    return data;
  }
}

async function audienceId() {
  if (cachedAudienceId) return cachedAudienceId;
  const list = await resend('/audiences');
  const found = (list.data || []).find((a) => a.name === AUDIENCE_NAME);
  if (found) { cachedAudienceId = found.id; return found.id; }
  await sleep(600); // stay under the 2 req/s limit before the next call
  const created = await resend('/audiences', { method: 'POST', body: JSON.stringify({ name: AUDIENCE_NAME }) });
  cachedAudienceId = created.id;
  return created.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Signups aren’t open just yet — please try again soon.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'That email doesn’t look right — mind checking it?' });

    const id = await audienceId();
    await sleep(600); // rate-limit spacing
    await resend(`/audiences/${id}/contacts`, { method: 'POST', body: JSON.stringify({ email, unsubscribed: false }) });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe error:', err.message);
    return res.status(500).json({ error: 'Something hiccuped — please try again in a moment.' });
  }
}
