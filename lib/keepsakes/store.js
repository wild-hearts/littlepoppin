// lib/keepsakes/store.js. Where cards, invitations and replies live. Server only.
//
// There is no database on this project, and the shop already keeps its order events as small JSON
// files in the private Vercel Blob store (lib/events.js). Cards and invitations are the same shape of
// thing: a few hundred bytes each, written once, read by their link. So they live there too, one
// file per record, with tiny index files so a link (a slug or a key) finds its record in one read.
//
//   keepsakes/cards/<id>.json          the card as the sender wrote it (never rewritten)
//   keepsakes/cards/<id>.paid.json     written only when Stripe says it is paid
//   keepsakes/events/<id>.json         the invitation; the host can edit it (one writer)
//   keepsakes/events/<id>.paid.json    as above
//   keepsakes/rsvps/<event>/<guest>.json  one file per guest, so two guests never overwrite each other
//   keepsakes/idx/<kind>/<value>.json  slug or key-hash → id
//
// Payment lives in its own file so a host editing details can never race the webhook and lose the
// payment, or vice versa. Keys are bearer credentials: only their SHA-256 is stored, the key itself
// is handed back once and lives only in the owner's link (the same rule as Tadavite).
//
// Local development without a Blob token uses files under .data/keepsakes/ instead. Production
// refuses to run without the token, so a missing env var can never silently lose a paid card.
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
export const useBlob = Boolean(TOKEN);
// Somewhere to keep records: the Blob store, or the dev file store outside production. A Vercel Preview
// without the token (the shop's token is set for Production) is the usual way this is false.
export const storeReady = useBlob || process.env.NODE_ENV !== 'production';
const PREFIX = 'keepsakes/';
const DEV_DIR = path.join(process.cwd(), '.data', 'keepsakes');

// URL-safe tokens without look-alike characters.
const ALPHA = 'abcdefghijkmnpqrstuvwxyz23456789';
export function token(n) {
  const b = randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHA[b[i] % ALPHA.length];
  return s;
}
export const hashKey = (k) => createHash('sha256').update(String(k)).digest('hex');
export const ID_RE = /^[a-km-z2-9]{12}$/, SLUG_RE = /^[a-km-z2-9]{10}$/, KEY_RE = /^[a-km-z2-9]{24}$/;

// ---------------------------------------------------------------- the two backends
let blobMod;
const blob = async () => (blobMod ||= await import('@vercel/blob'));

async function readJson(name) {
  if (useBlob) {
    const { get } = await blob();
    let r;
    try { r = await get(PREFIX + name, { access: 'private', token: TOKEN }); }
    catch (e) { if (e?.name === 'BlobNotFoundError' || /not.?found/i.test(e?.message || '')) return null; throw e; }
    if (!r || r.statusCode === 404) return null;
    const text = r.blob ? await r.blob.text() : await new Response(r.stream).text();
    return text ? JSON.parse(text) : null;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('BLOB_READ_WRITE_TOKEN must be set in production');
  try { return JSON.parse(await fs.readFile(path.join(DEV_DIR, name), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
async function writeJson(name, obj) {
  const body = JSON.stringify(obj);
  if (useBlob) {
    const { put } = await blob();
    await put(PREFIX + name, body, { access: 'private', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
    return;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('BLOB_READ_WRITE_TOKEN must be set in production');
  const file = path.join(DEV_DIR, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, body); await fs.rename(tmp, file);
}
async function listNames(prefix) {
  if (useBlob) {
    const { list } = await blob();
    const out = []; let cursor;
    do {
      const page = await list({ token: TOKEN, prefix: PREFIX + prefix, cursor, limit: 1000 });
      out.push(...page.blobs.map((b) => b.pathname.slice(PREFIX.length)));
      cursor = page.cursor;
    } while (cursor && out.length < 5000);
    return out;
  }
  try { return (await fs.readdir(path.join(DEV_DIR, prefix))).filter((f) => f.endsWith('.json')).map((f) => prefix + f); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
const idx = (kind, value) => `idx/${kind}/${value}.json`;
async function idFrom(kind, value) { return value ? (await readJson(idx(kind, value)))?.id || null : null; }

// ---------------------------------------------------------------- cards
export const CARD_FIELDS = ['card', 'to_name', 'from_name', 'message', 'sender_email', 'font'];
const pickFields = (o, fields) => Object.fromEntries(fields.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

// status "pending" until Stripe confirms payment; { status: "live" } when there is nothing to pay.
export async function createCard(data, { status = 'pending' } = {}) {
  const senderKey = token(24);
  const c = { id: token(12), slug: token(10), sender_key_hash: hashKey(senderKey), created_at: new Date().toISOString(), ...pickFields(data, CARD_FIELDS) };
  await writeJson(`cards/${c.id}.json`, c);
  await Promise.all([writeJson(idx('card-slug', c.slug), { id: c.id }), writeJson(idx('card-key', c.sender_key_hash), { id: c.id })]);
  if (status === 'live') await setCardPaid(c.id, { status: 'live', paid_at: c.created_at, paid_amount: 0 });
  return { ...c, status, sender_key: senderKey };
}
export async function cardById(id) {
  if (!ID_RE.test(String(id))) return null;
  const [c, paid] = await Promise.all([readJson(`cards/${id}.json`), readJson(`cards/${id}.paid.json`)]);
  return c ? { status: 'pending', ...c, ...(paid || {}) } : null;
}
export const cardBySlug = async (slug) => (SLUG_RE.test(String(slug)) ? cardById(await idFrom('card-slug', slug)) : null);
export const cardBySenderKey = async (key) => (KEY_RE.test(String(key)) ? cardById(await idFrom('card-key', hashKey(key))) : null);
export async function setCardPaid(id, patch) {
  const allowed = ['status', 'stripe_session', 'paid_at', 'paid_currency', 'paid_amount', 'opened_at'];
  const cur = (await readJson(`cards/${id}.paid.json`)) || {};
  const next = { ...cur, ...pickFields(patch, allowed) };
  await writeJson(`cards/${id}.paid.json`, next);
  return next;
}
// Mark a card paid from a Stripe Checkout Session (idempotent).
export async function markCardPaid(c, session) {
  if (c.status === 'live' && c.paid_at) return c;
  const paid = await setCardPaid(c.id, { status: 'live', stripe_session: session.id, paid_at: new Date().toISOString(), paid_currency: (session.currency || '').toLowerCase(), paid_amount: session.amount_total ?? null });
  return { ...c, ...paid };
}
// What the sender's browser may receive: never the key material or the Stripe session id.
export function forSender(c) { const { sender_key_hash, sender_key, stripe_session, ...rest } = c; return rest; }

// ---------------------------------------------------------------- invitations (events)
export const EVENT_FIELDS = ['design', 'title', 'lede', 'label', 'date', 'time', 'tz', 'venue', 'address', 'host_name', 'host_email', 'rsvp_by', 'dress', 'note', 'ask_dietary', 'allow_plus_ones', 'max_plus_ones', 'question', 'question_choices', 'surprise_for', 'font'];

export async function createEvent(data, { status = 'pending' } = {}) {
  const hostKey = token(24);
  const ev = { id: token(12), slug: token(10), host_key_hash: hashKey(hostKey), created_at: new Date().toISOString(), ...pickFields(data, EVENT_FIELDS) };
  await writeJson(`events/${ev.id}.json`, ev);
  await Promise.all([writeJson(idx('event-slug', ev.slug), { id: ev.id }), writeJson(idx('event-key', ev.host_key_hash), { id: ev.id })]);
  if (status === 'live') await setEventPaid(ev.id, { status: 'live', paid_at: ev.created_at, paid_amount: 0 });
  return { ...ev, status, host_key: hostKey };
}
export async function eventById(id) {
  if (!ID_RE.test(String(id))) return null;
  const [ev, paid] = await Promise.all([readJson(`events/${id}.json`), readJson(`events/${id}.paid.json`)]);
  return ev ? { status: 'pending', ...ev, ...(paid || {}) } : null;
}
export const eventBySlug = async (slug) => (SLUG_RE.test(String(slug)) ? eventById(await idFrom('event-slug', slug)) : null);
export const eventByHostKey = async (key) => (KEY_RE.test(String(key)) ? eventById(await idFrom('event-key', hashKey(key))) : null);
export async function updateEvent(id, patch) {
  const cur = await readJson(`events/${id}.json`);
  if (!cur) return null;
  const next = { ...cur, ...pickFields(patch, EVENT_FIELDS), updated_at: new Date().toISOString() };
  await writeJson(`events/${id}.json`, next);
  return eventById(id);
}
export async function setEventPaid(id, patch) {
  const allowed = ['status', 'stripe_session', 'paid_at', 'paid_currency', 'paid_amount', 'archived_at'];
  const cur = (await readJson(`events/${id}.paid.json`)) || {};
  const next = { ...cur, ...pickFields(patch, allowed) };
  await writeJson(`events/${id}.paid.json`, next);
  return next;
}
export async function markEventPaid(ev, session) {
  if (ev.status === 'live' && ev.paid_at) return ev;
  const paid = await setEventPaid(ev.id, { status: 'live', stripe_session: session.id, paid_at: new Date().toISOString(), paid_currency: (session.currency || '').toLowerCase(), paid_amount: session.amount_total ?? null });
  return { ...ev, ...paid };
}
export const isLive = (x) => (x?.status || 'pending') === 'live';
export function forHost(ev) { const { host_key, host_key_hash, stripe_session, ...rest } = ev; return rest; }

// ---------------------------------------------------------------- replies
// A guest's guest_key lives in their browser; sending it again rewrites the same file, so repeat
// submissions are idempotent and a guest can change their answer.
export async function upsertRsvp(eventId, r) {
  const now = new Date().toISOString();
  const key = r.guest_key && /^[a-km-z2-9]{16}$/.test(r.guest_key) ? r.guest_key : token(16);
  const existing = await readJson(`rsvps/${eventId}/${key}.json`);
  const row = {
    guest_key: key, event_id: eventId, name: r.name, status: r.status, plus_ones: r.plus_ones || 0,
    dietary: r.dietary || null, message: r.message || null, answer: r.answer || null,
    email: r.email || null, updates: Boolean(r.email && r.updates),
    created_at: existing?.created_at || now, updated_at: now,
  };
  await writeJson(`rsvps/${eventId}/${key}.json`, row);
  return row;
}
export async function rsvpsFor(eventId) {
  const names = await listNames(`rsvps/${eventId}/`);
  const rows = (await Promise.all(names.map((n) => readJson(n).catch(() => null)))).filter(Boolean);
  return rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}
// What the host sees of each reply: never the guest's email address.
export function rsvpForHost(r) { const { email, updates, ...rest } = r; return { ...rest, gets_updates: Boolean(email && updates) }; }
