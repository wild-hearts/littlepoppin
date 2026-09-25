// api/invite-page.js. Serves the invitation page itself.
//   /i/<code>            (rewritten here by vercel.json) the live invitation, with real
//                        Open Graph tags so WhatsApp / iMessage / Facebook show the artwork
//   /i/<code>?key=...    the host's private RSVP page
//   /invite-preview      the builder's live preview frame (no data; config by postMessage)
// Server-rendered on purpose: share previews are read by crawlers that do not run JS.
import { getLive, publicView, shellHtml, isCode } from '../lib/invites.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.query.preview) {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
    return res.status(200).send(shellHtml({ config: null, preview: true }));
  }
  const code = String(req.query.code || '').toLowerCase();
  if (!isCode(code)) return res.status(404).send(notFound());
  let live;
  try { live = await getLive(code); } catch (err) { console.error('invite-page read failed:', err.message); }
  if (!live) return res.status(404).send(notFound());
  if (live.expiresAt && Date.parse(live.expiresAt) < Date.now()) return res.status(410).send(notFound('This invitation has expired.'));
  const manage = !!req.query.key;
  res.setHeader('Cache-Control', live.demo ? 'public, max-age=0, s-maxage=86400' : (manage ? 'private, no-store' : 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'));
  return res.status(200).send(shellHtml({ config: publicView(live), manage }));
}

function notFound(msg = 'We couldn’t find that invitation.') {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invitation not found</title>
<meta name="robots" content="noindex"><style>body{margin:0;font-family:Georgia,serif;background:#fbf3f5;color:#3a2a31;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:30px}a{color:#b8607e}</style></head>
<body><div><p style="font-size:1.4rem">${msg}</p><p>Check the link you were sent, or <a href="/invites.html">make your own at Little Poppin</a>.</p></div></body></html>`;
}
