// api/invite.js. JSON view of an invitation.
//   GET ?code=            public config (what the engine renders)
//   GET ?code=&key=       host view: config + every RSVP. Key must match the manage key.
import { getLive, publicView, listRsvps, isCode } from '../lib/invites.js';

export default async function handler(req, res) {
  const code = String(req.query.code || '').toLowerCase();
  if (!isCode(code)) return res.status(400).json({ error: 'Bad code' });
  const live = await getLive(code).catch(() => null);
  if (!live) return res.status(404).json({ error: 'Not found' });
  const key = String(req.query.key || '');
  if (key) {
    if (live.demo || !live.manageKey || key !== live.manageKey) return res.status(403).json({ error: 'Invalid host key' });
    res.setHeader('Cache-Control', 'private, no-store');
    const rsvps = await listRsvps(code).catch(() => []);
    return res.status(200).json({ invite: publicView(live), rsvps, url: `${(process.env.SITE_URL || 'https://littlepoppin.com').replace(/\/$/, '')}/i/${code}` });
  }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  return res.status(200).json({ invite: publicView(live) });
}
