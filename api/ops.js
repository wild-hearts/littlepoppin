// api/ops.js. A plain-text operations view. The one place to answer "did that actually work?"
//
//   /api/ops?key=<CRON_SECRET>            recent activity across all event types
//   /api/ops?key=...&type=download        just one type
//
// Reuses CRON_SECRET rather than inventing another secret to lose. Fails CLOSED: without
// the secret set, it refuses rather than exposing customer emails to anyone who guesses
// the URL. Plain text on purpose. It is meant to be readable on a phone at a glance.
import { readEvents } from '../lib/events.js';

const TYPES = [
  'download',
  'printify-submitted',
  'printify-failed',
  'printify-order-shipment-created',
  'shipping-email',
];

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).send('Ops view is not configured (CRON_SECRET unset).');
  const key = String(req.query.key || '');
  // Constant-time-ish: compare lengths first, then content.
  if (key.length !== secret.length || key !== secret) return res.status(401).send('Unauthorised');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const wanted = req.query.type ? [String(req.query.type)] : TYPES;
  const lines = [`Little Poppin. Operations  (${new Date().toISOString()})`, ''];

  for (const type of wanted) {
    let blobs = [];
    try { blobs = await readEvents(type, 25); }
    catch (err) { lines.push(`${type}: could not read (${err.message})`, ''); continue; }
    lines.push(`${type.toUpperCase()}, ${blobs.length} recent`);
    if (!blobs.length) lines.push('  (none)');
    for (const b of blobs) {
      // The pathname carries the timestamp, so a listing is readable without fetching bodies.
      const when = (b.pathname.split('/').pop() || '').slice(0, 19).replace('T', ' ');
      lines.push(`  ${when}  ${(b.size / 1).toFixed(0).padStart(4)}b  ${b.pathname}`);
    }
    lines.push('');
  }

  lines.push('Notes:');
  lines.push('  download            = a buyer actually collected their file');
  lines.push('  printify-submitted  = the print order reached Printify');
  lines.push('  printify-failed     = PAID BUT NOT PRODUCED. Needs placing by hand');
  lines.push('  shipping-email      = tracking sent to the buyer');
  return res.status(200).send(lines.join('\n'));
}
