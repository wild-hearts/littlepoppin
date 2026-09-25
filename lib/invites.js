// lib/invites.js. Server side of Little Poppin Website Invitations.
//
// Storage is the same private Vercel Blob store the artwork lives in (there is no database
// on this project, see lib/events.js for the reasoning). Layout:
//   invites/draft/<draftId>.json   what the buyer built, saved just before Stripe checkout
//   invites/live/<code>.json       the paid, published invitation (+ hostEmail, manageKey)
//   invites/session/<sessionId>.json  { code } so activation is idempotent per payment
//   invites/rsvp/<code>/<iso>-<rand>.json   one file per reply, never overwritten
//
// Activation (draft -> live) runs from BOTH the Stripe webhook and /api/order (the success
// page), whichever gets there first, and is idempotent, so the buyer never stares at a
// success page with no link because a webhook was slow.
import { put, get, head, list } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { THEMES, EVENTS, INVITE_PRICE, INVITE_SKU, INVITE_HOSTED_MONTHS, themeById, eventById, demoConfig } from '../invite-themes.js';

export { INVITE_PRICE, INVITE_SKU, INVITE_HOSTED_MONTHS, demoConfig, themeById };

const SITE = () => (process.env.SITE_URL || 'https://littlepoppin.com').replace(/\/$/, '');
const token = () => { const t = process.env.BLOB_READ_WRITE_TOKEN; if (!t) throw new Error('BLOB_READ_WRITE_TOKEN not set'); return t; };

/* ---------- validation ---------- */
const LIMITS = { title: 60, intro: 120, honouree: 60, hosts: 120, venue: 100, address: 200, message: 600, giftTitle: 60, giftText: 500,
                 registryUrl: 300, dress: 120, hostName: 60, hostEmail: 120, tz: 60 };
const clean = (v, max) => String(v ?? '').replace(/[\r\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max);
const cleanMulti = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isTime = (s) => /^\d{2}:\d{2}$/.test(s);
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Normalise + validate what the builder sends. Returns { ok, data } or { ok:false, error }. */
export function normaliseInvite(input = {}) {
  const theme = THEMES.some((t) => t.id === input.theme) ? input.theme : null;
  if (!theme) return { ok: false, error: 'Please choose a design.' };
  const event = EVENTS[input.event] ? input.event : themeById(theme).event;
  const ev = EVENTS[event];
  const d = {
    theme, event,
    title: clean(input.title, LIMITS.title), intro: clean(input.intro, LIMITS.intro) || ev.intro,
    honouree: clean(input.honouree, LIMITS.honouree), hosts: clean(input.hosts, LIMITS.hosts),
    date: clean(input.date, 10), time: clean(input.time, 5), endTime: clean(input.endTime, 5), tz: clean(input.tz, LIMITS.tz),
    startsAt: Number(input.startsAt) || 0,
    venue: clean(input.venue, LIMITS.venue), address: clean(input.address, LIMITS.address),
    message: cleanMulti(input.message, LIMITS.message),
    giftTitle: clean(input.giftTitle, LIMITS.giftTitle), giftText: cleanMulti(input.giftText, LIMITS.giftText),
    registryUrl: clean(input.registryUrl, LIMITS.registryUrl), rsvpBy: clean(input.rsvpBy, 10), dress: clean(input.dress, LIMITS.dress),
    hostName: clean(input.hostName, LIMITS.hostName), hostEmail: clean(input.hostEmail, LIMITS.hostEmail).toLowerCase(),
    showCountdown: input.showCountdown !== false && !!ev.countdown, showRsvp: input.showRsvp !== false && !!ev.rsvp,
    showMap: input.showMap !== false, showGift: input.showGift !== false,
  };
  if (!d.title) return { ok: false, error: 'Please give the invitation a title (for example "Baby in Bloom").' };
  if (!d.honouree) return { ok: false, error: 'Please enter who the celebration is for.' };
  if (!isDate(d.date)) return { ok: false, error: 'Please choose the date.' };
  if (d.time && !isTime(d.time)) return { ok: false, error: 'The start time does not look right.' };
  if (d.endTime && !isTime(d.endTime)) d.endTime = '';
  if (d.rsvpBy && !isDate(d.rsvpBy)) d.rsvpBy = '';
  if (d.registryUrl && !/^https?:\/\//i.test(d.registryUrl)) return { ok: false, error: 'The registry link needs to start with https://' };
  if (!isEmail(d.hostEmail)) return { ok: false, error: 'Please enter your email so RSVPs can reach you.' };
  if (!d.hostName) d.hostName = d.hosts || 'the host';
  // The builder computes startsAt in the host's own timezone. If it is missing or absurd,
  // fall back to a UTC guess so the countdown still exists rather than the section vanishing.
  const guess = Date.parse(`${d.date}T${d.time || '12:00'}:00Z`);
  if (!d.startsAt || Math.abs(d.startsAt - guess) > 2 * 864e5) d.startsAt = guess;
  return { ok: true, data: d };
}

/* ---------- storage ----------
 * Production: the private Vercel Blob store. Local development: the same four calls
 * against a folder, switched on by INVITES_FS_STORE=<dir>. The Blob token is sensitive
 * and cannot be pulled to a laptop, and without a store nothing past the builder can be
 * exercised. Never set INVITES_FS_STORE on Vercel. */
const FS_DIR = process.env.INVITES_FS_STORE;
let fsMod, pathMod;
async function fsStore() {
  if (!fsMod) { fsMod = await import('node:fs/promises'); pathMod = await import('node:path'); }
  return { fs: fsMod, path: pathMod };
}
async function readJson(pathname) {
  if (FS_DIR) {
    const { fs, path } = await fsStore();
    try { return JSON.parse(await fs.readFile(path.join(FS_DIR, pathname), 'utf8')); } catch { return null; }
  }
  const r = await get(pathname, { access: 'private', token: token() });
  if (!r || r.statusCode !== 200) return null;
  const text = await new Response(r.stream).text();
  return JSON.parse(text);
}
async function writeJson(pathname, obj) {
  if (FS_DIR) {
    const { fs, path } = await fsStore();
    const full = path.join(FS_DIR, pathname);
    await fs.mkdir(path.dirname(full), { recursive: true });
    return fs.writeFile(full, JSON.stringify(obj));
  }
  await put(pathname, JSON.stringify(obj), { access: 'private', token: token(), contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
}
async function exists(pathname) {
  if (FS_DIR) { const { fs, path } = await fsStore(); try { await fs.access(path.join(FS_DIR, pathname)); return true; } catch { return false; } }
  try { await head(pathname, { token: token() }); return true; } catch { return false; }
}
/** Pathnames under a prefix, any order. */
async function listPaths(prefix) {
  if (FS_DIR) {
    const { fs, path } = await fsStore();
    try { return (await fs.readdir(path.join(FS_DIR, prefix))).filter((f) => f.endsWith('.json')).map((f) => prefix + f); } catch { return []; }
  }
  const out = []; let cursor;
  do {
    const page = await list({ token: token(), prefix, cursor, limit: 1000 });
    out.push(...page.blobs.map((b) => b.pathname)); cursor = page.cursor;
  } while (cursor && out.length < 5000);
  return out;
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i: codes get read out loud and typed from cards
function rand(n) { const b = randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += ALPHABET[b[i] % ALPHABET.length]; return s; }
function slug(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'party'; }
export const isCode = (c) => /^[a-z0-9-]{3,40}$/.test(String(c || ''));

/* ---------- drafts & activation ---------- */
export async function saveDraft(data) {
  const id = rand(20);
  await writeJson(`invites/draft/${id}.json`, { ...data, createdAt: new Date().toISOString() });
  return id;
}

/**
 * Turn a paid draft into a live invitation. Idempotent per Stripe session: a second call
 * (webhook after success page, or a Stripe retry) returns the same code and key.
 */
export async function activateInvite(session) {
  const draftId = session.metadata?.draft;
  if (!draftId || !/^[a-z0-9]{20}$/.test(draftId)) throw new Error('Invite session has no draft id');
  const mapPath = `invites/session/${session.id}.json`;
  const existing = await readJson(mapPath).catch(() => null);
  if (existing?.code) return links(existing.code, existing.key);

  const draft = await readJson(`invites/draft/${draftId}.json`);
  if (!draft) throw new Error(`Invite draft ${draftId} not found`);
  let code = `${slug(draft.honouree.split(' ')[0])}-${rand(5)}`;
  while (await exists(`invites/live/${code}.json`)) code = `${slug(draft.honouree.split(' ')[0])}-${rand(6)}`;
  const key = rand(24);
  const live = { ...draft, code, manageKey: key, sessionId: session.id, paidAt: new Date().toISOString(),
                 expiresAt: new Date(Date.now() + INVITE_HOSTED_MONTHS * 30.5 * 864e5).toISOString(),
                 buyerEmail: session.customer_details?.email || draft.hostEmail };
  await writeJson(`invites/live/${code}.json`, live);
  await writeJson(mapPath, { code, key, at: live.paidAt });
  return links(code, key);
}
/**
 * Activate + email the host, exactly once. Both the webhook and /api/order call this; the
 * emailedAt flag is set BEFORE sending so a slow email cannot trigger a second copy.
 */
export async function publishInvite(session) {
  const l = await activateInvite(session);
  const live = await readJson(`invites/live/${l.code}.json`);
  if (live && !live.emailedAt) {
    await writeJson(`invites/live/${l.code}.json`, { ...live, emailedAt: new Date().toISOString() });
    await emailHostLinks(live, l);
    l.emailed = true;
  }
  return l;
}

function links(code, key) {
  return { code, key, url: `${SITE()}/i/${code}`, manageUrl: `${SITE()}/i/${code}?key=${key}` };
}

export async function getLive(code) {
  if (!isCode(code)) return null;
  if (code.startsWith('demo-')) { const t = THEMES.find((x) => x.id === code.slice(5)); return t ? { ...demoConfig(t.id), code, demo: true } : null; }
  return readJson(`invites/live/${code}.json`).catch(() => null);
}

/** What guests are allowed to see. Never the host's email or the manage key. */
export function publicView(live) {
  const { manageKey, hostEmail, buyerEmail, sessionId, ...rest } = live;
  return rest;
}

/* ---------- RSVPs ---------- */
export async function addRsvp(code, rsvp) {
  const at = new Date().toISOString();
  await writeJson(`invites/rsvp/${code}/${at}-${rand(4)}.json`, { ...rsvp, at });
  return at;
}
export async function listRsvps(code) {
  const out = [];
  for (const p of await listPaths(`invites/rsvp/${code}/`)) { const j = await readJson(p).catch(() => null); if (j) out.push(j); }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}
export async function countRsvps(code) {
  return (await listPaths(`invites/rsvp/${code}/`)).length;
}

/* ---------- email ---------- */
async function sendEmail(payload) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.log('[invite email. Set RESEND_API_KEY]\n' + JSON.stringify(payload, null, 1)); return; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>', ...payload }),
  });
  if (!r.ok) console.error('Resend (invite) error:', r.status, await r.text());
}

export async function emailHostLinks(live, l) {
  const to = [live.hostEmail]; if (live.buyerEmail && live.buyerEmail !== live.hostEmail) to.push(live.buyerEmail);
  await sendEmail({
    to, subject: `Your invitation is live: ${live.title}`,
    text: [
      `Your Little Poppin invitation for ${live.honouree} is published and ready to share.`, '',
      'SHARE THIS LINK WITH YOUR GUESTS:', l.url, '',
      'YOUR PRIVATE HOST PAGE (do not share this one):', l.manageUrl, '',
      'The host page shows every RSVP as it arrives, with a running count. Each reply is also emailed to you.',
      `Your invitation stays live for ${INVITE_HOSTED_MONTHS} months.`, '',
      'Need a change to the wording or date? Reply to this email and we will update it for you.', '',
      'Little Poppin', 'https://littlepoppin.com',
    ].join('\n'),
  });
  if (process.env.ORDER_NOTIFY_EMAIL) {
    await new Promise((r) => setTimeout(r, 700)); // Resend 2 req/s
    await sendEmail({ to: [process.env.ORDER_NOTIFY_EMAIL], subject: `New invitation sold: ${live.title} (${live.theme})`,
      text: `Theme: ${live.theme}\nEvent: ${live.event}\nFor: ${live.honouree}\nHost: ${live.hostName} <${live.hostEmail}>\nDate: ${live.date} ${live.time}\n\nGuest link: ${l.url}\nHost page: ${l.manageUrl}\nStripe session: ${live.sessionId}` });
  }
}

export async function emailRsvpToHost(live, rsvp, tally) {
  const coming = rsvp.attending === 'yes';
  await sendEmail({
    to: [live.hostEmail], subject: `${coming ? '✓' : '✗'} RSVP from ${rsvp.name}: ${coming ? 'coming' : 'can’t make it'} (${live.title})`,
    text: [
      `${rsvp.name} has replied to your invitation "${live.title}".`, '',
      `Reply: ${coming ? `Coming, ${rsvp.guests} ${rsvp.guests === 1 ? 'guest' : 'guests'}` : 'Can’t make it'}`,
      rsvp.note ? `Note: ${rsvp.note}` : '', '',
      `Running total: ${tally.yes} replies coming (${tally.heads} guests), ${tally.no} can’t make it.`, '',
      `See everyone on your host page: ${SITE()}/i/${live.code}?key=${live.manageKey}`,
    ].filter((l) => l !== null).join('\n'),
  });
}

/* ---------- HTML shell for /i/<code> ---------- */
const escAttr = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function shellHtml({ config, preview = false, manage = false }) {
  const theme = themeById(config?.theme);
  const ev = eventById(config?.event);
  const title = config ? `${config.title} · ${ev.label} for ${config.honouree}` : 'Invitation preview';
  const desc = config ? `You’re invited! Tap to open the invitation${config.date ? ' and RSVP' : ''}.` : 'Little Poppin website invitation preview.';
  const image = `${SITE()}${theme.art}`;
  const url = config?.code ? `${SITE()}/i/${config.code}` : `${SITE()}/invites.html`;
  const data = config ? JSON.stringify(config).replace(/</g, '\\u003c') : 'null';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${escAttr(title)}</title>
<meta name="robots" content="noindex, nofollow" />
<meta name="description" content="${escAttr(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Little Poppin Invitations" />
<meta property="og:title" content="${escAttr(config ? `You’re invited: ${config.title}` : title)}" />
<meta property="og:description" content="${escAttr(desc)}" />
<meta property="og:url" content="${escAttr(url)}" />
<meta property="og:image" content="${escAttr(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="${escAttr(theme.colors.bg)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<style>body{margin:0;background:${escAttr(theme.colors.bg)}}</style>
</head>
<body>
<div id="app"></div>
<script>window.__INVITE=${data};window.__INVITE_MODE=${JSON.stringify(preview ? 'preview' : manage ? 'manage' : 'live')};</script>
<script type="module">
import { renderInvite, renderManage } from '/invite-engine.js';
const app = document.getElementById('app');
const mode = window.__INVITE_MODE;
if (mode === 'preview') {
  // The builder posts a fresh config on every keystroke. Re-render without the cover so
  // the host can see their words change live; a "show envelope" toggle re-adds it.
  let cover = false;
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'lp-invite') return;
    if (typeof e.data.cover === 'boolean') cover = e.data.cover;
    renderInvite(app, e.data.config, { preview: true, cover });
  });
  window.parent.postMessage({ type: 'lp-invite-ready' }, '*');
} else if (mode === 'manage') {
  const key = new URLSearchParams(location.search).get('key');
  fetch('/api/invite?code=' + encodeURIComponent(window.__INVITE.code) + '&key=' + encodeURIComponent(key))
    .then((r) => r.ok ? r.json() : Promise.reject(r))
    .then((d) => renderManage(app, d))
    .catch(() => { app.innerHTML = '<p style="font-family:system-ui;padding:40px;text-align:center">This host link is not valid.</p>'; });
} else if (window.__INVITE) {
  renderInvite(app, window.__INVITE, {});
}
</script>
</body>
</html>`;
}
