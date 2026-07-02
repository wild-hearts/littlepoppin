// api/subscribe.js — join the Little Poppin list (stored as a Resend Audience).
// Uses the existing RESEND_API_KEY; lazily creates the "Little Poppin" audience on first
// signup, then adds each contact. POST { email } -> { ok: true }.

const AUDIENCE_NAME = 'Little Poppin';

async function resend(pathname, opts = {}) {
  const r = await fetch('https://api.resend.com' + pathname, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function audienceId() {
  const list = await resend('/audiences');
  const found = (list.data || []).find((a) => a.name === AUDIENCE_NAME);
  if (found) return found.id;
  const created = await resend('/audiences', { method: 'POST', body: JSON.stringify({ name: AUDIENCE_NAME }) });
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
    await resend(`/audiences/${id}/contacts`, { method: 'POST', body: JSON.stringify({ email, unsubscribed: false }) });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('subscribe error:', err.message);
    return res.status(500).json({ error: 'Something hiccuped — please try again in a moment.' });
  }
}
