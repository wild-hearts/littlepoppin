// api/keepsakes.js. The one function behind cards and invitations. Every operation is `?op=`, so the
// whole feature costs a single serverless function (Vercel caps those on the smaller plans).
//
//   POST op=create-card     save a card as pending, send the sender to Stripe → { sender_key, checkout_url }
//   GET  op=sent&key=       the sender's private page (+ &paid=<session> confirms payment on return)
//   GET  op=card&slug=      the recipient's card, only once paid
//   POST op=create-invite   save an invitation as pending, send the host to Stripe → { id, slug, host_key, checkout_url }
//   GET  op=host&key=       the private host link: checks the key, stores it in an HttpOnly cookie, redirects to /manage/<id>
//   GET  op=manage&id=      the host page (needs the cookie; + &paid= confirms payment on return)
//   PATCH op=manage&id=     edit the invitation
//   GET  op=csv&id=         the guest list as a spreadsheet
//   GET  op=invite&slug=    what a guest may see
//   POST op=rsvp            a guest's reply (idempotent on guest_key)
//   POST op=pay             start Checkout again for an unpaid card { key } or invitation { id }
import { card as cardOf, withCardFont, CARD_PRICE, INVITE_PRICE } from '../keepsakes/designs.js';
import { createCard, cardBySlug, cardBySenderKey, forSender, createEvent, eventById, eventBySlug, eventByHostKey, updateEvent, upsertRsvp, rsvpsFor, rsvpForHost, forHost, isLive, ID_RE, KEY_RE, setCardPaid } from '../lib/keepsakes/store.js';
import { cleanCard, cleanEvent, cleanRsvp } from '../lib/keepsakes/validate.js';
import { createCardCheckout, createEventCheckout, getSession, cardPaidFor, eventPaidFor, keepsakePaid, stripeReady, devUnpaid } from '../lib/keepsakes/pay.js';
import { send, savedCard, savedEvent } from '../lib/keepsakes/mail.js';

function baseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
const bodyOf = (req) => { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { return {}; } };
const json = (res, status, obj) => { res.setHeader('Cache-Control', 'no-store'); return res.status(status).json(obj); };

// Best-effort rate limiting per warm instance: enough to blunt a script, never a lock-out for a person.
const hits = new Map();
function limited(req, kind, max, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const k = `${kind}:${ip}`, now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(k, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

// Host access without a secret in the URL: the key lives in an HttpOnly cookie per event.
const cookieName = (id) => `lp_host_${id}`;
const cookieFor = (id, key) => `${cookieName(id)}=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${180 * 24 * 3600}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, v.join('=')]));
}
async function hostEventFor(req, id) {
  if (!ID_RE.test(String(id))) return null;
  const key = cookies(req)[cookieName(id)];
  if (!key || !KEY_RE.test(key)) return null;
  const ev = await eventByHostKey(key);
  return ev && ev.id === id ? ev : null;
}

// Only these fields ever reach a guest's browser. The host's email, keys and the internal id stay here.
const GUEST_FIELDS = ['slug', 'design', 'title', 'label', 'lede', 'date', 'time', 'tz', 'venue', 'address', 'dress', 'note', 'host_name', 'rsvp_by', 'ask_dietary', 'allow_plus_ones', 'max_plus_ones', 'question', 'question_choices', 'surprise_for', 'font'];
const publicEvent = (ev) => Object.fromEntries(GUEST_FIELDS.map((k) => [k, ev[k] ?? null]));

const csvCell = (v) => { const s = String(v ?? ''); return /^[=+\-@]/.test(s) ? `'${s}` : s; };   // no formula injection in a spreadsheet
const csvRow = (cells) => cells.map((c) => `"${csvCell(c).replace(/"/g, '""')}"`).join(',');

export default async function handler(req, res) {
  const op = String(req.query.op || '');
  try {
    // ---------------------------------------------------------------- cards
    if (op === 'create-card' && req.method === 'POST') {
      if (limited(req, 'card', 30, 3600e3)) return json(res, 429, { error: 'Too many cards from here. Try again later.' });
      const body = bodyOf(req);
      if (body.website) return json(res, 400, { error: 'Rejected.' });   // honeypot
      const { ok, value, errors } = cleanCard(body);
      if (!ok) return json(res, 422, { errors });
      if (!stripeReady && !devUnpaid) return json(res, 503, { error: 'Cards can’t be sent just now. Please try again soon.' });
      const origin = baseUrl(req);
      const c = await createCard(value, { status: devUnpaid ? 'live' : 'pending' });
      if (c.sender_email) send(c.sender_email, 'Your Little Poppin card is saved', savedCard({ to_name: c.to_name, mine: `${origin}/sent/${c.sender_key}` })).catch(() => {});
      if (devUnpaid) return json(res, 200, { sender_key: c.sender_key, checkout_url: null });
      const session = await createCardCheckout(c, origin, { toName: c.to_name, title: cardOf(c.card)?.greeting || 'Little Poppin' });
      return json(res, 200, { sender_key: c.sender_key, checkout_url: session.url });
    }
    if (op === 'sent' && req.method === 'GET') {
      let c = await cardBySenderKey(String(req.query.key || ''));
      if (!c) return json(res, 404, { error: 'No such card.' });
      // Back from Stripe: confirm straight away rather than waiting for the webhook.
      if (!isLive(c) && req.query.paid && stripeReady) {
        const s = await getSession(String(req.query.paid)).catch(() => null);
        if (cardPaidFor(s, c.id)) c = { ...c, ...(await keepsakePaid(s, baseUrl(req))) };
      }
      const k = withCardFont(cardOf(c.card), c.font);
      return json(res, 200, { ...forSender(c), link: `${baseUrl(req)}/c/${c.slug}`, card_slug: k?.slug, price: CARD_PRICE });
    }
    if (op === 'card' && req.method === 'GET') {
      const c = await cardBySlug(String(req.query.slug || ''));
      if (!c) return json(res, 404, { error: 'No such card.' });
      if (!isLive(c)) return json(res, 200, { status: 'pending' });
      if (!c.opened_at) setCardPaid(c.id, { opened_at: new Date().toISOString() }).catch(() => {});
      // Only the words on the card reach the browser; ids, email and payment stay here.
      return json(res, 200, { status: 'live', card: c.card, font: c.font || '', to_name: c.to_name, from_name: c.from_name, message: c.message });
    }

    // ---------------------------------------------------------------- invitations
    if (op === 'create-invite' && req.method === 'POST') {
      if (limited(req, 'create', 20, 3600e3)) return json(res, 429, { error: 'Too many invitations from here. Try again later.' });
      const body = bodyOf(req);
      if (body.website) return json(res, 400, { error: 'Rejected.' });
      const { ok, value, errors } = cleanEvent(body);
      if (!ok) return json(res, 422, { errors });
      if (!stripeReady && !devUnpaid) return json(res, 503, { error: 'Invitations can’t be made just now. Please try again soon.' });
      const origin = baseUrl(req);
      const ev = await createEvent(value, { status: devUnpaid ? 'live' : 'pending' });
      res.setHeader('Set-Cookie', cookieFor(ev.id, ev.host_key));
      if (ev.host_email) send(ev.host_email, 'Your Little Poppin invitation is saved', savedEvent({ title: ev.title, link: `${origin}/i/${ev.slug}`, host: `${origin}/host/${ev.host_key}` })).catch(() => {});
      if (devUnpaid) return json(res, 200, { id: ev.id, slug: ev.slug, host_key: ev.host_key, checkout_url: null });
      const session = await createEventCheckout(ev, origin);
      return json(res, 200, { id: ev.id, slug: ev.slug, host_key: ev.host_key, checkout_url: session.url });
    }
    if (op === 'host' && req.method === 'GET') {
      const key = String(req.query.key || '');
      const ev = KEY_RE.test(key) ? await eventByHostKey(key) : null;
      res.setHeader('Cache-Control', 'no-store');
      if (!ev) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.status(404).send('<!doctype html><meta charset="utf-8"><title>Not found</title><p style="font-family:sans-serif;padding:40px">That host link isn’t right. Check the link in your email, or <a href="/invitations.html">make a new invitation</a>.</p>'); }
      res.setHeader('Set-Cookie', cookieFor(ev.id, key));
      res.setHeader('Location', `/manage/${ev.id}`);
      return res.status(302).end();
    }
    if (op === 'manage' && req.method === 'GET') {
      const id = String(req.query.id || '');
      let ev = await hostEventFor(req, id);
      if (!ev) return json(res, 403, { error: 'This isn’t your invitation, or the link has changed. Open your private host link again.' });
      if (!isLive(ev) && req.query.paid && stripeReady) {
        const s = await getSession(String(req.query.paid)).catch(() => null);
        if (eventPaidFor(s, ev.id)) ev = { ...ev, ...(await keepsakePaid(s, baseUrl(req))) };
      }
      const rsvps = (await rsvpsFor(ev.id)).map(rsvpForHost);
      return json(res, 200, { event: forHost(ev), rsvps, link: `${baseUrl(req)}/i/${ev.slug}`, price: INVITE_PRICE });
    }
    if (op === 'manage' && req.method === 'PATCH') {
      const ev = await hostEventFor(req, String(req.query.id || ''));
      if (!ev) return json(res, 403, { error: 'Open your private host link again to edit.' });
      const body = bodyOf(req);
      const { ok, value, errors } = cleanEvent(body, { partial: true });
      if (!ok) return json(res, 422, { errors });
      delete value.design;   // the design is bought; the words can change
      const next = await updateEvent(ev.id, value);
      return json(res, 200, { event: forHost(next) });
    }
    if (op === 'csv' && req.method === 'GET') {
      const ev = await hostEventFor(req, String(req.query.id || ''));
      if (!ev) return json(res, 403, { error: 'Open your private host link again.' });
      const rows = await rsvpsFor(ev.id);
      const head = ['Name', 'Reply', 'Bringing', 'Dietary', ev.question ? ev.question : 'Answer', 'Message', 'Replied'];
      const lines = [csvRow(head), ...rows.map((r) => csvRow([r.name, { yes: 'Coming', no: 'Can’t come', maybe: 'Maybe' }[r.status] || r.status, r.plus_ones || 0, r.dietary, r.answer, r.message, r.updated_at]))];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${ev.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'guests'}-guest-list.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send('﻿' + lines.join('\r\n'));
    }
    if (op === 'invite' && req.method === 'GET') {
      const ev = await eventBySlug(String(req.query.slug || ''));
      if (!ev) return json(res, 404, { error: 'No such invitation.' });
      if (!isLive(ev)) return json(res, 200, { status: 'pending' });
      if (ev.archived_at) return json(res, 200, { status: 'archived', title: ev.title });
      return json(res, 200, { status: 'live', event: publicEvent(ev), link: `${baseUrl(req)}/i/${ev.slug}` });
    }
    if (op === 'rsvp' && req.method === 'POST') {
      if (limited(req, 'rsvp', 30, 3600e3)) return json(res, 429, { error: 'Too many replies from here. Try again later.' });
      const body = bodyOf(req);
      if (body.website) return json(res, 400, { error: 'Rejected.' });
      const ev = await eventBySlug(String(body.slug || ''));
      if (!ev) return json(res, 404, { error: 'This invitation no longer exists.' });
      if (!isLive(ev) || ev.archived_at) return json(res, 403, { error: 'This invitation isn’t taking replies.' });
      const { ok, value, errors } = cleanRsvp(body, ev);
      if (!ok) return json(res, 422, { errors });
      const r = await upsertRsvp(ev.id, value);
      return json(res, 200, { guest_key: r.guest_key, status: r.status });
    }

    // ---------------------------------------------------------------- pay again
    if (op === 'pay' && req.method === 'POST') {
      const body = bodyOf(req);
      const origin = baseUrl(req);
      if (!stripeReady) return json(res, 503, { error: 'Payments aren’t available just now. Please try again soon.' });
      if (body.kind === 'card') {
        const c = await cardBySenderKey(String(body.key || ''));
        if (!c) return json(res, 404, { error: 'No such card.' });
        if (isLive(c)) return json(res, 409, { error: 'Already paid.' });
        const session = await createCardCheckout({ ...c, sender_key: body.key }, origin, { toName: c.to_name, title: cardOf(c.card)?.greeting || 'Little Poppin' });
        return json(res, 200, { checkout_url: session.url });
      }
      const ev = await hostEventFor(req, String(body.id || ''));
      if (!ev) return json(res, 403, { error: 'Open your private host link again.' });
      if (isLive(ev)) return json(res, 409, { error: 'Already paid.' });
      const session = await createEventCheckout(ev, origin);
      return json(res, 200, { checkout_url: session.url });
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return json(res, op ? 405 : 404, { error: op ? 'Method not allowed' : 'Unknown operation' });
  } catch (err) {
    console.error('keepsakes error:', op, err);
    return json(res, 500, { error: 'Something went wrong on our side. Please try again.' });
  }
}
