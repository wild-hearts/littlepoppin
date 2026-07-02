// printify-setup.mjs — connect Little Poppin prints to Printify.
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
const COLLS = ['collection-01', 'collection-02', 'collection-03', 'collection-05', 'collection-06'];

// ── FILL THIS after discovery, then run `build`. Prices are RETAIL cents (base cost + margin). ──
const CHOICES = {
  shopId: null,
  formats: {
    // poster: { blueprintId: 0, providerId: 0, label: 'Poster (matte)',
    //   sizes: [ { key:'a4', label:'A4', variantId:0, price:3500 }, { key:'a3', label:'A3', variantId:0, price:4500 } ] },
    // framed: { blueprintId: 0, providerId: 0, label: 'Framed Print', sizes: [ ... ] },
    // canvas: { blueprintId: 0, providerId: 0, label: 'Canvas', sizes: [ ... ] },
  },
};

const TOKEN = (() => {
  if (process.env.PRINTIFY_API_TOKEN) return process.env.PRINTIFY_API_TOKEN;
  const p = path.join(REPO, '.env.local');
  if (fs.existsSync(p)) { const m = fs.readFileSync(p, 'utf8').match(/PRINTIFY_API_TOKEN\s*=\s*(.+)/); if (m) return m[1].trim().replace(/^["']|["']$/g, ''); }
  return null;
})();
if (!TOKEN) { console.error('Set PRINTIFY_API_TOKEN in .env.local'); process.exit(1); }

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
    const products = {};
    for (const a of art) {
      const contents = fs.readFileSync(a.file).toString('base64');
      const up = await pf('/uploads/images.json', { method: 'POST', body: JSON.stringify({ file_name: a.sku + '.png', contents }) });
      products[a.sku] = {};
      for (const [fmt, cfg] of Object.entries(CHOICES.formats)) {
        const variants = cfg.sizes.map(s => ({ id: s.variantId, price: s.price, is_enabled: true }));
        const print_areas = [{ variant_ids: cfg.sizes.map(s => s.variantId), placeholders: [{ position: 'front', images: [{ id: up.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }];
        const prod = await pf(`/shops/${CHOICES.shopId}/products.json`, { method: 'POST', body: JSON.stringify({
          title: `${a.sku.replace('print-', '').replace(/-/g, ' ')} — ${cfg.label}`,
          description: 'Little Poppin art print.', blueprint_id: cfg.blueprintId, print_provider_id: cfg.providerId, variants, print_areas,
        }) });
        products[a.sku][fmt] = prod.id;
        process.stdout.write('.');
      }
    }
    const config = { shopId: CHOICES.shopId, formats: Object.fromEntries(Object.entries(CHOICES.formats).map(([f, c]) => [f, { blueprintId: c.blueprintId, providerId: c.providerId, label: c.label, sizes: c.sizes.map(s => ({ key: s.key, label: s.label, variantId: s.variantId, price: s.price })) }])), products };
    fs.writeFileSync(path.join(REPO, 'lib', 'printify-config.generated.js'),
      `// AUTO-GENERATED by scripts/printify-setup.mjs.\nexport const PRINTIFY_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
    console.log(`\nDone — created products for ${art.length} prints. Config written. Commit + push.`);
  } else {
    console.log('Commands: shops | blueprints <kw> | providers <bp> | variants <bp> <prov> | build');
  }
} catch (e) { console.error('✗', e.message); process.exit(1); }
