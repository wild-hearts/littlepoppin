// api/rsvp.js. A guest replies. Stored as one small file per reply, emailed to the host.
import { getLive, addRsvp, countRsvps, listRsvps, emailRsvpToHost, isCode } from '../lib/invites.js';

const MAX_PER_INVITE = 600; // a party is not a stadium; this caps abuse of the email relay

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (body.website) return res.status(200).json({ ok: true }); // honeypot filled: pretend success, store nothing
  const code = String(body.code || '').toLowerCase();
  if (!isCode(code) || code.startsWith('demo-')) return res.status(400).json({ error: 'This is a preview. Real invitations take RSVPs.' });
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Please tell us your name.' });
  const rsvp = { name, attending: body.attending === 'yes' ? 'yes' : 'no',
                 guests: Math.max(1, Math.min(10, parseInt(body.guests, 10) || 1)), note: String(body.note || '').trim().slice(0, 400) };
  const live = await getLive(code).catch(() => null);
  if (!live || !live.manageKey) return res.status(404).json({ error: 'Invitation not found.' });
  if (live.expiresAt && Date.parse(live.expiresAt) < Date.now()) return res.status(410).json({ error: 'This invitation has expired.' });
  if (live.showRsvp === false) return res.status(400).json({ error: 'This invitation is not taking RSVPs.' });
  if ((await countRsvps(code)) >= MAX_PER_INVITE) return res.status(429).json({ error: 'This invitation has had too many replies. Please contact the host directly.' });
  await addRsvp(code, rsvp);
  try {
    const all = await listRsvps(code);
    const yes = all.filter((r) => r.attending === 'yes');
    await emailRsvpToHost(live, rsvp, { yes: yes.length, no: all.length - yes.length, heads: yes.reduce((n, r) => n + (Number(r.guests) || 1), 0) });
  } catch (err) { console.error('RSVP email failed (reply is stored):', err.message); }
  return res.status(200).json({ ok: true });
}
