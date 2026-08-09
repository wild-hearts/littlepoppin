// etsy-publish.mjs — create the staged listings on Etsy via the API.
//
//   node scripts/etsy-publish.mjs --dry     # show exactly what would be created, touch nothing
//   node scripts/etsy-publish.mjs           # create them as DRAFTS
//   node scripts/etsy-publish.mjs --publish # create and make them active (costs $0.20 each)
//
// WHY THE API AND NOT THE BROWSER: the digital files total 475 MB across 48 files over 5 MB
// each. Browser automation cannot carry that — the upload tool is sandboxed to shared
// folders, the extension blocks localhost fetches, and injecting the files as base64 would
// be hundreds of enormous calls. The API takes a file straight from disk.
//
// SAFE BY DEFAULT: creates DRAFTS unless --publish is passed, and is RESUMABLE — every
// created listing id is recorded immediately, so an interruption never double-charges or
// double-lists. Re-running skips anything already made.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAGE = path.join(REPO, 'etsy-stage');
const TOKENS = path.join(REPO, 'dist', '.etsy-tokens.json');
const PROGRESS = path.join(REPO, 'dist', '.etsy-publish-progress.json');
const DRY = process.argv.includes('--dry');
const PUBLISH = process.argv.includes('--publish');

const KEY = (() => {
  if (process.env.ETSY_KEYSTRING) return process.env.ETSY_KEYSTRING;
  const m = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').match(/^ETSY_KEYSTRING=(.+)$/m);
  return m ? m[1].trim() : null;
})();

let tokens = fs.existsSync(TOKENS) ? JSON.parse(fs.readFileSync(TOKENS, 'utf8')) : null;
if (!DRY && (!KEY || !tokens)) {
  console.error('Not connected to Etsy yet. Run: node scripts/etsy-auth.mjs');
  process.exit(1);
}

/** Refresh the hour-long access token when it is close to expiring. */
async function accessToken() {
  const age = (Date.now() - (tokens.obtained_at || 0)) / 1000;
  if (age < (tokens.expires_in || 3600) - 120) return tokens.access_token;
  const r = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', client_id: KEY, refresh_token: tokens.refresh_token }),
  });
  if (!r.ok) throw new Error('Token refresh failed: ' + (await r.text()).slice(0, 200));
  tokens = { ...(await r.json()), obtained_at: Date.now() };
  fs.writeFileSync(TOKENS, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  return tokens.access_token;
}

async function etsy(pathname, { method = 'GET', json, form } = {}) {
  const headers = { 'x-api-key': KEY, Authorization: `Bearer ${await accessToken()}` };
  let body;
  if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;                       // FormData sets its own boundary
  const r = await fetch('https://openapi.etsy.com/v3/application' + pathname, { method, headers, body });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${pathname}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// --- gather what to create ---------------------------------------------------
const listings = fs.readdirSync(STAGE)
  .filter((d) => fs.statSync(path.join(STAGE, d)).isDirectory())
  .map((sku) => {
    const dir = path.join(STAGE, sku);
    const files = fs.readdirSync(dir);
    return {
      sku, dir,
      meta: JSON.parse(fs.readFileSync(path.join(dir, 'listing.json'), 'utf8')),
      photos: files.filter((f) => f.startsWith('photo-')).sort(),
      digital: files.filter((f) => f.startsWith('file-')).sort(),
    };
  })
  .sort((a, b) => a.sku.localeCompare(b.sku));

if (DRY) {
  console.log(`DRY RUN — nothing will be created. ${listings.length} listings staged.\n`);
  let fees = 0;
  for (const l of listings) {
    const mb = l.digital.reduce((n, f) => n + fs.statSync(path.join(l.dir, f)).size, 0) / 1048576;
    fees += 0.2;
    console.log(`  ${l.sku}`);
    console.log(`    $${l.meta.price}  ·  ${l.photos.length} photos  ·  ${l.digital.length} file(s), ${mb.toFixed(1)} MB`);
    console.log(`    ${l.meta.title.slice(0, 96)}`);
    const bad = [];
    if (l.meta.title.length > 140) bad.push(`title ${l.meta.title.length} chars`);
    if (l.meta.tags.length !== 13) bad.push(`${l.meta.tags.length} tags`);
    if (l.meta.tags.some((t) => t.length > 20)) bad.push('a tag is over 20 chars');
    if (!l.photos.length) bad.push('NO PHOTOS');
    if (!l.digital.length) bad.push('NO DIGITAL FILE');
    if (l.digital.some((f) => fs.statSync(path.join(l.dir, f)).size > 20 * 1048576)) bad.push('a file is over 20MB');
    if (bad.length) console.log(`    ⚠ ${bad.join(' · ')}`);
  }
  console.log(`\n  Listing fees if published: about US$${fees.toFixed(2)} (${listings.length} x $0.20)`);
  process.exit(0);
}

// --- create ------------------------------------------------------------------
const shops = await etsy('/users/me/shops').catch(async () => {
  const me = await etsy('/users/me');
  return etsy(`/shops?shop_name=&user_id=${me.user_id}`);
});
const shopId = shops.shop_id || shops.results?.[0]?.shop_id;
if (!shopId) { console.error('Could not resolve your shop id.'); process.exit(1); }
console.log(`Shop ${shopId} · creating ${PUBLISH ? 'ACTIVE listings (fees apply)' : 'DRAFTS (no fee until published)'}\n`);

const done = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : {};
const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(done, null, 2));

for (const l of listings) {
  if (done[l.sku]?.listing_id) { console.log(`  = ${l.sku} already created (${done[l.sku].listing_id})`); continue; }
  try {
    const created = await etsy(`/shops/${shopId}/listings`, {
      method: 'POST',
      json: {
        quantity: 999,
        title: l.meta.title,
        description: l.meta.description,
        price: l.meta.price,
        who_made: 'i_did',
        when_made: 'made_to_order',
        taxonomy_id: 1027,            // Art & Collectibles > Prints > Digital Prints
        listing_type: 'download',
        state: PUBLISH ? 'active' : 'draft',
        tags: l.meta.tags,
      },
    });
    done[l.sku] = { listing_id: created.listing_id, state: created.state }; save();

    // Photos, in order — the framed mockup first, because it is what people see in search.
    for (const [i, p] of l.photos.entries()) {
      const fd = new FormData();
      fd.append('image', new Blob([fs.readFileSync(path.join(l.dir, p))]), p);
      fd.append('rank', String(i + 1));
      await etsy(`/shops/${shopId}/listings/${created.listing_id}/images`, { method: 'POST', form: fd });
    }
    // Then the digital files the buyer actually receives.
    for (const [i, f] of l.digital.entries()) {
      const fd = new FormData();
      fd.append('file', new Blob([fs.readFileSync(path.join(l.dir, f))]), f.replace(/^file-/, ''));
      fd.append('name', f.replace(/^file-/, ''));
      fd.append('rank', String(i + 1));
      await etsy(`/shops/${shopId}/listings/${created.listing_id}/files`, { method: 'POST', form: fd });
    }
    done[l.sku].complete = true; save();
    console.log(`  + ${l.sku} -> ${created.listing_id} (${l.photos.length} photos, ${l.digital.length} files)`);
  } catch (err) {
    console.log(`  x ${l.sku} — ${err.message.slice(0, 200)}`);
  }
}

const made = Object.values(done).filter((d) => d.complete).length;
console.log(`\n${made}/${listings.length} listings complete.`);
if (!PUBLISH) console.log('Created as drafts — review them in Etsy, then publish (or re-run with --publish).');
