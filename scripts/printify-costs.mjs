// printify-costs.mjs. Find the REAL production cost of each candidate variant.
//
// Printify's catalog API does not expose variant cost; it is only returned once a product
// exists. So this creates one throwaway product per format in the (disconnected) store,
// reads back `variants[].cost`, prints it, and DELETES the product. Nothing is published
// and nothing is charged. But it means retail prices come from real numbers rather than
// a guess, which matters because postage alone ranges $5.19 (US) to $18.89 (rest of world).
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
const API = 'https://api.printify.com/v1';
const pf = async (p, o = {}) => {
  const r = await fetch(API + p, { ...o, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(o.headers || {}) } });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${p}: ${txt.slice(0, 250)}`);
  return txt ? JSON.parse(txt) : {};
};

// Reuse an image already uploaded by the earlier run rather than uploading another.
const uploads = await pf('/uploads.json?limit=1');
const image = uploads.data?.[0];
if (!image) { console.error('No uploaded images on the Printify account to probe with.'); process.exit(1); }
console.log(`probing with existing upload: ${image.file_name}\n`);

const CANDIDATES = [
  { name: 'poster', blueprintId: 282, providerId: 99, variants: [43135, 101110, 43141] },       // 11x14, 12x16, 16x20
  { name: 'framed', blueprintId: 540, providerId: 99, variants: [69663, 69664, 69667] },        // 11x14, 12x16, 16x20 black
  { name: 'canvas', blueprintId: 937, providerId: 99, variants: [] },                            // filled below (vertical)
];

// Canvas variants list horizontals first; pick the vertical ones by title.
const cv = await pf('/catalog/blueprints/937/print_providers/99/variants.json');
CANDIDATES[2].variants = cv.variants
  .filter((v) => /Vertical/i.test(v.title) && /(11″ x 14″|11" x 14"|16″ x 20″|16" x 20"|12″ x 16″|12" x 16")/.test(v.title))
  .slice(0, 3).map((v) => v.id);

for (const c of CANDIDATES) {
  if (!c.variants.length) { console.log(`${c.name}: no matching variants found`); continue; }
  let created;
  try {
    created = await pf(`/shops/${SHOP}/products.json`, {
      method: 'POST',
      body: JSON.stringify({
        title: `__cost probe ${c.name} (delete me)`,
        description: 'temporary',
        blueprint_id: c.blueprintId,
        print_provider_id: c.providerId,
        variants: c.variants.map((id) => ({ id, price: 9999, is_enabled: true })),
        print_areas: [{ variant_ids: c.variants, placeholders: [{ position: 'front', images: [{ id: image.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }],
      }),
    });
    console.log(`${c.name}  (blueprint ${c.blueprintId} / provider ${c.providerId})`);
    for (const v of created.variants.filter((v) => c.variants.includes(v.id))) {
      console.log(`  ${String(v.id).padEnd(8)} ${String(v.title).padEnd(28)} cost ${(v.cost / 100).toFixed(2)}`);
    }
  } catch (e) {
    console.log(`${c.name}: FAILED. ${e.message.slice(0, 200)}`);
  } finally {
    if (created?.id) {
      try { await pf(`/shops/${SHOP}/products/${created.id}.json`, { method: 'DELETE' }); console.log('  (probe product deleted)'); }
      catch (e) { console.log(`  !! could not delete probe product ${created.id}, remove it manually`); }
    }
  }
  console.log('');
}
