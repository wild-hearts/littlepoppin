// printify-setup.mjs. Connect Little Poppin prints to Printify.
// Needs PRINTIFY_API_TOKEN in .env.local (Printify → Account → Connections → API tokens,
// scopes: shops.read, catalog.read, products.read/write, uploads.read/write, orders.write).
//
// Run in phases:
//   node scripts/printify-setup.mjs shops                     # find your shop id
//   node scripts/printify-setup.mjs blueprints poster         # find poster/framed/canvas blueprints
//   node scripts/printify-setup.mjs providers <blueprintId>   # print providers (pick an AU one)
//   node scripts/printify-setup.mjs variants  <blueprintId> <providerId>   # sizes + variant ids
//   node scripts/printify-setup.mjs build                     # after filling CHOICES below
//
// The `build` step uploads every art file to Printify and creates poster/framed/canvas products
// for each, then writes lib/printify-config.generated.js. Physical checkout unblocks automatically.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(os.homedir(), 'Downloads', 'LittlePoppin-Designs');
// Every collection that appears in the shop. This previously stopped at collection-06,
// which silently left 42 of the 93 prints without any physical option.
const COLLS = ['collection-01', 'collection-02', 'collection-03', 'collection-05',
  'collection-06', 'collection-07', 'collection-08', 'collection-09', 'collection-10'];

// ── FILL THIS after discovery, then run `build`. Prices are RETAIL cents (base cost + margin). ──
const CHOICES = {
  // Naomi's Printify account (info@wildheartspublishing.com.au), shop "My new store".
  shopId: 28504147,
  // Provider 99 = "Printify Choice": Printify's own routing, which sends each order to the
  // nearest production partner. Verified to serve US, Canada and REST_OF_THE_WORLD, so a
  // buyer in Berlin is printed near Berlin rather than flown from Melbourne.
  //
  // This REPLACES provider 66 (Prima Printing, Noble Park North VIC), the only Australian
  // wall-art provider, which meant every order printed in Melbourne regardless of destination.
  //
  // PRICES are RETAIL in AUD cents and EXCLUDE postage. Shipping is charged separately at
  // checkout by destination (see PRINT_SHIPPING in lib/products.js), because postage runs
  // USD 5.19 in the US to 18.89 rest-of-world and burying the worst case would make every
  // US buyer overpay by about AUD 30.
  //
  // Costs are the REAL per-item costs read back from Printify (USD, via printify-costs.mjs),
  // converted at ~1.55 AUD/USD and marked up ~1.8-2x. Re-check if the rate moves far:
  //   poster 5.92 / 9.97 / 10.77   canvas 18.16 / 21.71 / 25.37   framed 35.89 / 38.53 / 47.76
  formats: {
    poster: {
      blueprintId: 282, providerId: 99, label: 'Poster (matte)',
      sizes: [
        { key: '11x14', label: '11" x 14"', variantId: 43135,  price: 1900 },
        { key: '12x16', label: '12" x 16"', variantId: 101110, price: 2900 },
        { key: '16x20', label: '16" x 20"', variantId: 43141,  price: 3200 },
      ],
    },
    canvas: {
      blueprintId: 937, providerId: 99, label: 'Stretched Canvas',
      sizes: [
        { key: '11x14', label: '11" x 14"', variantId: 82229, price: 5500 },
        { key: '12x16', label: '12" x 16"', variantId: 82230, price: 6500 },
        { key: '16x20', label: '16" x 20"', variantId: 82231, price: 7500 },
      ],
    },
    framed: {
      blueprintId: 540, providerId: 99, label: 'Framed Print (black)',
      sizes: [
        { key: '11x14', label: '11" x 14"', variantId: 69663, price: 9900 },
        { key: '12x16', label: '12" x 16"', variantId: 69664, price: 10900 },
        { key: '16x20', label: '16" x 20"', variantId: 69667, price: 13500 },
      ],
    },
  },
};

const TOKEN = (() => {
  if (process.env.PRINTIFY_API_TOKEN) return process.env.PRINTIFY_API_TOKEN;
  const p = path.join(REPO, '.env.local');
  if (fs.existsSync(p)) { const m = fs.readFileSync(p, 'utf8').match(/PRINTIFY_API_TOKEN\s*=\s*(.+)/); if (m) return m[1].trim().replace(/^["']|["']$/g, ''); }
  return null;
})();
if (!TOKEN) { console.error('Set PRINTIFY_API_TOKEN in .env.local'); process.exit(1); }

// presignGet() reads BLOB_READ_WRITE_TOKEN from the environment; load it from .env.local
// so this script works the same way the other publish scripts do.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  const m = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').match(/BLOB_READ_WRITE_TOKEN\s*=\s*(.+)/);
  if (m) process.env.BLOB_READ_WRITE_TOKEN = m[1].trim().replace(/^["']|["']$/g, '');
}

const API = 'https://api.printify.com/v1';
async function pf(pathname, opts = {}) {
  const r = await fetch(API + pathname, { ...opts, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${pathname}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const KEYWORDS = { poster: /poster/i, framed: /framed/i, canvas: /canvas/i };

function listArt() {
  const out = [];
  for (const c of COLLS) {
    const dir = path.join(SRC, c);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.png')).sort())
      out.push({ sku: 'print-' + f.replace(/\.png$/, '').replace(/^\d+-/, ''), file: path.join(dir, f) });
  }
  return out;
}

// High-res originals already live in the private Vercel Blob store; Printify can fetch
// them directly by presigned URL, which is far quicker than base64 from here.
const { GENERATED_DIGITAL_PRODUCTS } = await import('../lib/digital-products.generated.js');
const { presignGet, MAX_TTL_MS } = await import('../lib/blob-link.js');
const BLOB_PATHS = Object.fromEntries(
  Object.entries(GENERATED_DIGITAL_PRODUCTS).filter(([, p]) => p.file && !p.items).map(([sku, p]) => [sku, p.file])
);

const cmd = process.argv[2];
try {
  if (cmd === 'shops') {
    const shops = await pf('/shops.json');
    shops.forEach(s => console.log(`shopId ${s.id}  ${s.title} (${s.sales_channel})`));
  } else if (cmd === 'blueprints') {
    const kw = KEYWORDS[process.argv[3]] || new RegExp(process.argv[3] || '.', 'i');
    const bps = await pf('/catalog/blueprints.json');
    bps.filter(b => kw.test(b.title)).forEach(b => console.log(`blueprint ${b.id}  ${b.title}  [${b.brand}]`));
  } else if (cmd === 'providers') {
    const bp = process.argv[3];
    const provs = await pf(`/catalog/blueprints/${bp}/print_providers.json`);
    provs.forEach(p => console.log(`provider ${p.id}  ${p.title}`));
  } else if (cmd === 'variants') {
    const [bp, prov] = [process.argv[3], process.argv[4]];
    const data = await pf(`/catalog/blueprints/${bp}/print_providers/${prov}/variants.json`);
    data.variants.forEach(v => console.log(`variant ${v.id}  ${v.title}`));
  } else if (cmd === 'build') {
    if (!CHOICES.shopId || !Object.keys(CHOICES.formats).length) { console.error('Fill CHOICES first (run the discovery commands).'); process.exit(1); }
    const art = listArt();
    const fmts = Object.entries(CHOICES.formats);

    // RESUMABLE. This creates one product per design per format. Nearly 300 API writes
    // against a live account. Without a progress file, an interruption at #200 would mean
    // re-running duplicated everything already created, with no way to tell the copies
    // apart. Progress is flushed after every single write, so a re-run picks up exactly
    // where it stopped and never creates the same product twice.
    const PROGRESS = path.join(REPO, 'dist', '.printify-progress.json');
    fs.mkdirSync(path.dirname(PROGRESS), { recursive: true });
    const state = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : { uploads: {}, products: {} };
    const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(state));

    const doneAlready = Object.values(state.products).reduce((n, p) => n + Object.keys(p).length, 0);
    if (doneAlready) console.log(`resuming. ${doneAlready}/${art.length * fmts.length} products already created`);

    let created = 0, skipped = 0;
    for (const [i, a] of art.entries()) {
      // Upload the artwork once and remember its id, so a resume never re-sends it.
      //
      // Hand Printify a presigned URL rather than base64 `contents`. The originals are
      // ~7MB each, so base64 means pushing ~9MB per design up from this machine, // measured at roughly four minutes per design, i.e. six hours for the catalogue.
      // Passing a URL lets Printify pull straight from Vercel Blob instead, which is
      // both far faster and avoids holding the whole file in memory here.
      // Falls back to base64 if a design has no Blob copy.
      if (!state.uploads[a.sku]) {
        const blobPath = BLOB_PATHS[a.sku];
        let payload;
        if (blobPath) {
          payload = { file_name: a.sku + '.png', url: await presignGet(blobPath, MAX_TTL_MS) };
        } else {
          payload = { file_name: a.sku + '.png', contents: fs.readFileSync(a.file).toString('base64') };
        }
        const up = await pf('/uploads/images.json', { method: 'POST', body: JSON.stringify(payload) });
        state.uploads[a.sku] = up.id;
        save();
      }
      const uploadId = state.uploads[a.sku];
      state.products[a.sku] ||= {};

      for (const [fmt, cfg] of fmts) {
        if (state.products[a.sku][fmt]) { skipped++; continue; }
        const variants = cfg.sizes.map(s => ({ id: s.variantId, price: s.price, is_enabled: true }));
        const print_areas = [{ variant_ids: cfg.sizes.map(s => s.variantId), placeholders: [{ position: 'front', images: [{ id: uploadId, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }];
        const title = a.sku.replace('print-', '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const prod = await pf(`/shops/${CHOICES.shopId}/products.json`, { method: 'POST', body: JSON.stringify({
          title: `${title}, ${cfg.label}`,
          description: 'Little Poppin art print. Printed near you and posted worldwide.',
          blueprint_id: cfg.blueprintId, print_provider_id: cfg.providerId, variants, print_areas,
        }) });
        state.products[a.sku][fmt] = prod.id;
        save();
        created++;
      }
      process.stdout.write(`\r  ${i + 1}/${art.length} designs · ${created} created · ${skipped} already done   `);
    }

    const config = { shopId: CHOICES.shopId, formats: Object.fromEntries(fmts.map(([f, c]) => [f, { blueprintId: c.blueprintId, providerId: c.providerId, label: c.label, sizes: c.sizes.map(s => ({ key: s.key, label: s.label, variantId: s.variantId, price: s.price })) }])), products: state.products };
    fs.writeFileSync(path.join(REPO, 'lib', 'printify-config.generated.js'),
      `// AUTO-GENERATED by scripts/printify-setup.mjs. Do not edit by hand.\n// Physical prints via Printify. Prices are RETAIL AUD cents and EXCLUDE postage.\nexport const PRINTIFY_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
    console.log(`\n\nDone. ${created} products created (${skipped} already existed) across ${art.length} designs.`);
    console.log('Config written. Next: npm run build:site && npm test');
  } else {
    console.log('Commands: shops | blueprints <kw> | providers <bp> | variants <bp> <prov> | build');
  }
} catch (e) { console.error('✗', e.message); process.exit(1); }
