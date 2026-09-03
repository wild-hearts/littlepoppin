// printify-webhooks.mjs. Register (or list, or remove) the Printify webhooks.
//
// Printify has NO dashboard page for webhooks. They are managed only through the API,
// which is why "Settings -> Webhooks" does not exist. This does it properly.
//
//   node scripts/printify-webhooks.mjs list
//   node scripts/printify-webhooks.mjs create      # registers the topics we handle
//   node scripts/printify-webhooks.mjs delete <id>
//
// Printify does NOT return a signing secret. We generate our own key, embed it in the
// registered URL, and store it in dist/.printify-webhook-secret (gitignored) so it can be
// piped into Vercel without being printed to a terminal or pasted into a chat.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = (() => {
  if (process.env.PRINTIFY_API_TOKEN) return process.env.PRINTIFY_API_TOKEN;
  const m = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').match(/PRINTIFY_API_TOKEN\s*=\s*(.+)/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
})();
const SHOP = 28504147;
const URL_BASE = process.env.SITE_URL || 'https://littlepoppin.com';
// Printify does not sign webhooks, so authenticity starts with a shared key in the URL it
// calls. Generated once and stored alongside the script's output so it can be piped into
// Vercel without ever being printed.
const KEY_FILE = path.join(REPO, 'dist', '.printify-webhook-secret');
const KEY = (() => {
  if (fs.existsSync(KEY_FILE)) return fs.readFileSync(KEY_FILE, 'utf8').trim();
  if (process.env.PRINTIFY_WEBHOOK_SECRET) return process.env.PRINTIFY_WEBHOOK_SECRET.trim();
  // dist/ is gitignored and routinely wiped, so a missing key file does NOT mean "first
  // run". Verified 4 Sep 2026: dist/ did not exist on this machine while
  // PRINTIFY_WEBHOOK_SECRET was live in Vercel. Silently minting a new key here would
  // register webhooks whose URL carries a key the deployed endpoint does not hold, so
  // every genuine delivery would 401 while `list` still showed four healthy webhooks.
  // Refuse, and make the operator say what they mean.
  if (!process.argv.includes('--new-key')) return null;
  const k = crypto.randomBytes(24).toString('base64url');
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, k, { mode: 0o600 });
  return k;
})();
const ENDPOINT = KEY ? `${URL_BASE}/api/printify-webhook?key=${KEY}` : null;

// Only the topics api/printify-webhook.js actually does something with. Subscribing to
// everything would just add noise and more chances to email a customer by accident.
const TOPICS = ['order:created', 'order:updated', 'order:shipment:created', 'order:shipment:delivered'];

const API = 'https://api.printify.com/v1';
const pf = async (p, o = {}) => {
  const r = await fetch(API + p, { ...o, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(o.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${p}: ${t.slice(0, 250)}`);
  return t ? JSON.parse(t) : {};
};

/** Delete a webhook. Printify REQUIRES ?host=<the url's host> and 400s without it. */
async function del(h) {
  const host = new URL(h.url).host;
  const r = await fetch(`${API}/shops/${SHOP}/webhooks/${h.id}.json?host=${encodeURIComponent(host)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` } });
  return r.ok;
}

const cmd = process.argv[2] || 'list';

if (cmd === 'list') {
  const hooks = await pf(`/shops/${SHOP}/webhooks.json`);
  console.log(`${hooks.length} webhook(s) registered:`);
  for (const h of hooks) console.log(`  ${h.id}  ${String(h.topic).padEnd(28)} ${h.url}`);
  if (!hooks.length) console.log('  (none. Run `create`)');

} else if (cmd === 'create') {
  if (!ENDPOINT) {
    console.error('No webhook key available.');
    console.error('  dist/.printify-webhook-secret is absent and PRINTIFY_WEBHOOK_SECRET is unset.');
    console.error('  Registering now would mint a NEW key that the deployed endpoint does not hold,');
    console.error('  and every Printify delivery would 401 while `list` looked healthy.');
    console.error('  Either export PRINTIFY_WEBHOOK_SECRET with the value already in Vercel, or');
    console.error('  pass --new-key to deliberately rotate (then update Vercel and redeploy).');
    process.exit(1);
  }
  const existing = await pf(`/shops/${SHOP}/webhooks.json`);
  const have = new Set(existing.filter((h) => h.url === ENDPOINT).map((h) => h.topic));
  for (const topic of TOPICS) {
    if (have.has(topic)) { console.log(`  = ${topic} already registered`); continue; }
    const h = await pf(`/shops/${SHOP}/webhooks.json`, {
      method: 'POST', body: JSON.stringify({ topic, url: ENDPOINT }),
    });
    console.log(`  + ${topic}  -> ${h.id}`);
  }
  // A webhook on this endpoint WITHOUT the key would walk straight past the gate, so any
  // keyless leftovers are removed here.
  for (const h of existing.filter((x) => x.url.startsWith(URL_BASE) && !x.url.includes('key='))) {
    console.log(`  - ${h.topic} (keyless) ${(await del(h)) ? 'removed' : 'COULD NOT REMOVE'}`);
  }
  console.log(`\n  key stored in dist/.printify-webhook-secret (never printed, never committed).`);
  console.log('  Put the SAME value in Vercel as PRINTIFY_WEBHOOK_SECRET, then redeploy.');

} else if (cmd === 'delete') {
  const id = process.argv[3];
  if (!id) { console.error('Usage: delete <webhookId>'); process.exit(1); }
  const all = await pf(`/shops/${SHOP}/webhooks.json`);
  const h = all.find((x) => x.id === id);
  if (!h) { console.error(`No webhook ${id}`); process.exit(1); }
  console.log(`  ${(await del(h)) ? 'deleted' : 'FAILED to delete'} ${id}`);

} else {
  console.log('Commands: list | create | delete <id>');
}
