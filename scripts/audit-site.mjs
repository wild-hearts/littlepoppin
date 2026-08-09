// audit-site.mjs — whole-site sweep after the "go global" change.
//
// This is deliberately separate from scripts/test.mjs: test.mjs guards invariants during
// normal development, this answers "is the site actually consistent right now?" across
// every generated page, the catalogue, the Printify config and the live deployment.
//
// It reports rather than asserts, because some hits are CORRECT and must survive:
//   • swaddles genuinely ship Australia-only
//   • the Australian Consumer Law wording is a real obligation, not stale copy
//   • Australian ARTWORK (koalas, gum blossom, "an Aussie lullaby") describes the pictures
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'etsy-stage', '.vercel'].includes(e.name)) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel);
    else if (e.name.endsWith('.html')) pages.push(rel);
  }
})('.');

const section = (t) => console.log(`\n${t}\n${'─'.repeat(t.length)}`);
let problems = 0;
const bad = (msg) => { problems++; console.log(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log(`Auditing ${pages.length} pages\n${'='.repeat(60)}`);

// ── 1. Australia references ──────────────────────────────────────────────────
section('1. Australia references');
const ALLOWED = [
  /swaddle/i,                              // swaddles really are AU-only
  /Australian Consumer Law/i,              // a real legal obligation
  /based in Australia, shipping worldwide/i,
  /Little Australians|koala|gum blossom|eucalyptus|Aussie lullaby|Australian twilight/i,
  /misleading conduct under Australian/i,  // internal code comment
  /data-physical-country|<option value="AU">/,  // Australia as a DELIVERY DESTINATION is correct
  /Privacy Act|Australian Privacy Principles/i,   // the privacy law that actually binds her
  /little-australians/,                           // artwork set name, incl. its canonical URL
];
// Whole files where an Australia reference is the correct answer, not a leftover:
// the two swaddle product pages (AU-only postage is a real constraint) and the legal
// pages (governing law, currency, and the privacy/consumer statutes that actually bind
// an Australian company regardless of where the buyer lives).
const ALLOWED_FILES = /^(pink-swaddle|green-swaddle|terms|privacy|refunds|shipping)\.html$/;
const auHits = [];
for (const f of pages) {
  if (ALLOWED_FILES.test(path.basename(f))) continue;
  for (const line of read(f).split('\n')) {
    if (!/Australia|Aussie|Officeworks|Kmart|Big W\b|Snapfish/i.test(line)) continue;
    if (ALLOWED.some((re) => re.test(line))) continue;
    auHits.push(`${f}: ${line.trim().replace(/\s+/g, ' ').slice(0, 95)}`);
  }
}
if (auHits.length) { for (const h of auHits.slice(0, 15)) bad(h); if (auHits.length > 15) bad(`…and ${auHits.length - 15} more`); }
else ok('no stray Australia/retailer references (swaddle, ACL and artwork mentions kept by design)');

// ── 2. Charity claims ────────────────────────────────────────────────────────
section('2. Charity claims scoped to swaddles');
const charity = [];
for (const f of pages) {
  for (const m of read(f).matchAll(/A portion of[^.<"]{0,120}/g)) {
    const s = m[0];
    if (/swaddle/i.test(s)) continue;
    if (/this sale/i.test(s) && /swaddle/.test(path.basename(f))) continue;
    charity.push(`${f}: "${s.trim().slice(0, 70)}"`);
  }
}
charity.length ? charity.forEach(bad) : ok('every charity claim is swaddle-scoped');

// ── 3. Printify / physical prints ────────────────────────────────────────────
section('3. Physical prints (Printify)');
const { PRINTIFY_CONFIG } = await import('../lib/printify-config.generated.js');
const { GENERATED_DIGITAL_PRODUCTS: P } = await import('../lib/digital-products.generated.js');
const prints = Object.values(P).filter((p) => !p.items && p.section);
const provs = new Set(Object.values(PRINTIFY_CONFIG.formats).map((f) => f.providerId));
provs.has(66) ? bad('config still points at provider 66 (Prima Printing, Australia-only)')
              : ok(`providers in use: ${[...provs].join(', ')} (99 = Printify Choice, routes globally)`);
const withProducts = Object.keys(PRINTIFY_CONFIG.products || {});
withProducts.length === prints.length
  ? ok(`all ${prints.length} prints have physical products`)
  : bad(`${withProducts.length}/${prints.length} prints have physical products`);
const totalProducts = Object.values(PRINTIFY_CONFIG.products || {}).reduce((n, o) => n + Object.keys(o).length, 0);
totalProducts === prints.length * 3
  ? ok(`${totalProducts} products = ${prints.length} designs x 3 formats`)
  : bad(`${totalProducts} products, expected ${prints.length * 3}`);
for (const [k, f] of Object.entries(PRINTIFY_CONFIG.formats)) {
  console.log(`    ${k.padEnd(7)} blueprint ${f.blueprintId} / provider ${f.providerId} · ${f.sizes.length} sizes · ${f.sizes.map((s) => '$' + (s.price / 100)).join(', ')}`);
}

// ── 4. Shipping model ────────────────────────────────────────────────────────
section('4. Shipping');
const { SHIPPING, PRINT_SHIPPING, PRINT_COUNTRIES, printShippingFor } = await import('../lib/products.js');
ok(`swaddles: ${SHIPPING.allowedCountries.join(',')} only, $${SHIPPING.flatAmount / 100} flat (deliberate)`);
ok(`prints: ${PRINT_COUNTRIES.length} countries, bands ${Object.entries(PRINT_SHIPPING).map(([k, v]) => `${k} $${v.amount / 100}`).join(' · ')}`);
printShippingFor('ZZ').amount === PRINT_SHIPPING.ROW.amount
  ? ok('unknown country falls back to rest-of-world (never under-charges)')
  : bad('unknown country does not fall back safely');
const co = read('api/checkout.js');
/allowed_countries: shipTo/.test(co) ? ok('checkout restricts shipping to the chosen country') : bad('checkout still uses the swaddle country list for prints');
/band\.amount/.test(co) ? ok('checkout charges postage by destination') : bad('checkout is not charging destination postage');

// ── 5. Product pages carry the destination selector ──────────────────────────
section('5. Product pages');
const printPages = pages.filter((f) => f.startsWith('print/'));
const noCountry = printPages.filter((f) => !/data-physical-country/.test(read(f)));
noCountry.length ? bad(`${noCountry.length} print pages lack the destination selector`) : ok(`all ${printPages.length} print pages have a destination selector`);
const auNote = printPages.filter((f) => /Australia-wide shipping/.test(read(f)));
auNote.length ? bad(`${auNote.length} print pages still say "Australia-wide shipping"`) : ok('no page still promises Australia-wide shipping');
/country: countrySel/.test(read('physical.js')) ? ok('physical.js sends the country to checkout') : bad('physical.js does not send a country');

// ── 6. Success page order types ──────────────────────────────────────────────
section('6. Success page');
const su = read('success.html');
/o\.type === 'physical'/.test(su) ? ok("charity note tests type === 'physical' (swaddle only)") : bad('charity note may fire for print orders');
/o\.type !== 'digital' && o\.type !== 'personalised'/.test(su) && bad("still uses the exclusion test that swept in 'print'");
/o\.type === 'print'/.test(su) ? ok('print orders get their own confirmation wording') : bad('print orders get swaddle wording');

// ── 7. Links ─────────────────────────────────────────────────────────────────
section('7. Internal links');
let refs = 0; const broken = [];
for (const f of pages) {
  const dir = path.dirname(f);
  for (const m of read(f).matchAll(/(?:href|src)="([^"]+)"/g)) {
    const h = m[1];
    if (/^(https?:|mailto:|tel:|#|data:|\/\/)/.test(h)) continue;
    refs++;
    const target = h.split('#')[0].split('?')[0];
    if (!target) continue;
    const abs = target.startsWith('/') ? path.join(REPO, target) : path.join(REPO, dir, target);
    if (!fs.existsSync(abs)) broken.push(`${f} -> ${h}`);
  }
}
broken.length ? broken.slice(0, 10).forEach(bad) : ok(`${refs} local references across ${pages.length} pages, none broken`);

console.log(`\n${'='.repeat(60)}`);
console.log(problems ? `${problems} problem(s) found` : 'Clean — no problems found');
process.exit(problems ? 1 : 0);
