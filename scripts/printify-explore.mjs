// printify-explore.mjs. Read-only. Inspect a blueprint/provider's variants AND their
// production cost, so retail prices are derived from real numbers instead of guessed.
//
// The catalog variants endpoint does not return cost. Cost lives on the shipping/profit
// side: /catalog/blueprints/{bp}/print_providers/{pp}/variants.json gives ids+titles, and
// /catalog/blueprints/{bp}/print_providers/{pp}/shipping.json gives postage. Actual item
// cost comes back when a product is created, so we create ONE throwaway product, read the
// costs, then delete it. Nothing is published to the store.
//
//   node scripts/printify-explore.mjs <blueprintId> <providerId> [filterRegex]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = (() => {
  if (process.env.PRINTIFY_API_TOKEN) return process.env.PRINTIFY_API_TOKEN;
  const m = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8').match(/PRINTIFY_API_TOKEN\s*=\s*(.+)/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
})();
if (!TOKEN) { console.error('No PRINTIFY_API_TOKEN'); process.exit(1); }

const API = 'https://api.printify.com/v1';
const pf = async (p, o = {}) => {
  const r = await fetch(API + p, { ...o, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(o.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${p}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const [bp, pp, filter] = process.argv.slice(2);
const re = filter ? new RegExp(filter, 'i') : null;

const { variants } = await pf(`/catalog/blueprints/${bp}/print_providers/${pp}/variants.json`);
const picked = variants.filter((v) => !re || re.test(v.title));
console.log(`blueprint ${bp} / provider ${pp}: ${variants.length} variants, ${picked.length} matching\n`);
for (const v of picked.slice(0, 20)) {
  console.log(`  ${String(v.id).padEnd(8)} ${v.title}`);
}

// Shipping profiles tell us which countries this provider actually serves.
try {
  const ship = await pf(`/catalog/blueprints/${bp}/print_providers/${pp}/shipping.json`);
  const profiles = ship.profiles || [];
  console.log(`\n  shipping profiles: ${profiles.length}`);
  for (const p of profiles.slice(0, 8)) {
    const c = p.countries || [];
    console.log(`    ${c.length > 20 ? c.slice(0, 6).join(',') + ` …(${c.length} countries)` : c.join(',') || 'REST_OF_THE_WORLD'}`
      + `  first item ${(p.first_item?.cost ?? '?')}${p.first_item?.currency || ''}`);
  }
} catch (e) { console.log('  shipping: ' + e.message.slice(0, 120)); }
