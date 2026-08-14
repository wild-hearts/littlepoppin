// test.mjs. Regression suite for the Little Poppin shop.  Run: npm test
//
// No framework, no dependencies: this has to stay runnable in a year by whoever opens
// the repo next. Every check here exists because the thing it checks actually broke
// during development. This is a net under the specific holes we fell through, not a
// box-ticking exercise. If a check fails, read the message: it says what broke and why
// it matters, not just "expected true".
//
// Covers: catalogue integrity, Print Club rotation rules, personalisation rendering,
// Blob link TTLs, page/asset links, JSON-LD validity, price agreement between code and
// copy, and the cron endpoint's fail-closed auth.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(REPO);
process.env.STRIPE_SECRET_KEY ||= 'sk_test_dummy_for_tests';

let passed = 0;
const failures = [];
let currentGroup = '';

const group = (name) => { currentGroup = name; console.log(`\n${name}`); };
function check(what, ok, detail = '') {
  if (ok) { passed++; console.log(`  ✓ ${what}`); }
  else { failures.push(`${currentGroup} → ${what}${detail ? `\n      ${detail}` : ''}`); console.log(`  ✗ ${what}${detail ? `\n      ${detail}` : ''}`); }
}

const { DIGITAL_PRODUCTS, getDigital, isDeliverable, CUSTOM_PRODUCTS } = await import('../lib/products.js');
const { GENERATED_DIGITAL_PRODUCTS } = await import('../lib/digital-products.generated.js');
const { rotationOrder, picksForMonth, PRINT_CLUB } = await import('../lib/printclub.js');
const { MAX_TTL_MS } = await import('../lib/blob-link.js');
const personalise = await import('../lib/personalise.js');
const { FREE_PRINT } = await import('../lib/freeprint.js');

// ---------------------------------------------------------------------------
group('Catalogue');

const prints = Object.values(GENERATED_DIGITAL_PRODUCTS);
const withFile = prints.filter((p) => p.file && !p.items);
check(`${withFile.length} prints have a Blob file path`, withFile.length >= 93,
  'A rebuild that resets `file` to null silently blocks checkout on every print.');

const undeliverable = Object.values(DIGITAL_PRODUCTS).filter((p) => !isDeliverable(p));
check('every product is deliverable', undeliverable.length === 0,
  undeliverable.map((p) => p.sku).join(', '));

const setsMissingParts = Object.values(DIGITAL_PRODUCTS)
  .filter((p) => p.items)
  .filter((p) => p.items.some((sku) => !getDigital(sku)?.file));
check('every set/bundle has all its component files', setsMissingParts.length === 0,
  setsMissingParts.map((p) => p.sku).join(', '));

const dupPrices = Object.values(DIGITAL_PRODUCTS).filter((p) => typeof p.price !== 'number' || p.price <= 0);
check('every product has a positive price', dupPrices.length === 0, dupPrices.map((p) => p.sku).join(', '));

check('free welcome print exists and is deliverable',
  !!getDigital(FREE_PRINT.sku)?.file, `${FREE_PRINT.sku} has no file`);

// ---------------------------------------------------------------------------
group('Print Club rotation');

const rot = rotationOrder(DIGITAL_PRODUCTS);
check('rotation is non-empty', rot.length > 0);
check('rotation excludes printables (colouring books etc.)', !rot.some((s) => s.startsWith('extra-')),
  'Extras carry no `section`; without an explicit section check they group under "undefined" and get mailed as the month\'s print.');
check('rotation excludes sets and bundles',
  !rot.some((s) => s.startsWith('set-') || s.startsWith('bundle-')));
check('rotation excludes festive prints',
  !rot.some((s) => DIGITAL_PRODUCTS[s]?.section === 'festive'),
  'Festive is held back for December; a Christmas robin arriving in May reads as a bug.');

// Structural checks over 36 months: right count, no duplicate inside a month, only real
// prints, and festive strictly in December.
let rotationProblems = [];
const festivePool = Object.values(DIGITAL_PRODUCTS).filter((p) => !p.items && p.file && p.section === 'festive');
const seenOrdinary = new Map();
const seenFestive = new Map();
let ordinaryMonths = 0;
let decembers = 0;

// A finite catalogue must eventually cycle. What matters is that it uses EVERY print
// before reusing any. The rotation should exhaust the pool, not orbit a subset. So we
// assert uniqueness only up to capacity, and separately that capacity is actually reached.
const ordinaryCapacity = Math.floor(rot.length / PRINT_CLUB.printsPerMonth);
const festiveCapacity = Math.floor(festivePool.length / PRINT_CLUB.printsPerMonth);

for (let i = 0; i < 36; i++) {
  const d = new Date(Date.UTC(2026, 7 + i, 1));
  const picks = picksForMonth(DIGITAL_PRODUCTS, d);
  const isDec = d.getUTCMonth() + 1 === 12;
  if (picks.length !== PRINT_CLUB.printsPerMonth) rotationProblems.push(`month ${i}: ${picks.length} picks`);
  if (new Set(picks).size !== picks.length) rotationProblems.push(`month ${i}: duplicate within the month`);
  for (const sku of picks) {
    const p = DIGITAL_PRODUCTS[sku];
    if (!p || !p.section || p.items) rotationProblems.push(`month ${i}: bad pick ${sku}`);
    if (isDec !== (p?.section === 'festive')) rotationProblems.push(`month ${i}: festive/December mismatch (${sku})`);
  }
  const bucket = isDec ? seenFestive : seenOrdinary;
  const withinCapacity = isDec ? decembers < festiveCapacity : ordinaryMonths < ordinaryCapacity;
  for (const sku of picks) {
    if (withinCapacity && bucket.has(sku)) {
      rotationProblems.push(`month ${i}: early repeat of ${sku} (first sent month ${bucket.get(sku)}). The pool should be exhausted first`);
    }
    bucket.set(sku, i);
  }
  if (isDec) decembers++; else ordinaryMonths++;
}
check('36 months of picks are well-formed and seasonal', rotationProblems.length === 0,
  rotationProblems.slice(0, 5).join('\n      '));
check(`no print repeats before the catalogue is exhausted (~${ordinaryCapacity} months of unique picks)`,
  !rotationProblems.some((p) => p.includes('early repeat')));
check('the rotation uses the whole catalogue, not a subset',
  seenOrdinary.size >= Math.min(rot.length, ordinaryCapacity * PRINT_CLUB.printsPerMonth),
  `only ${seenOrdinary.size} distinct prints used across ${ordinaryMonths} ordinary months`);

const a = picksForMonth(DIGITAL_PRODUCTS, new Date(Date.UTC(2027, 2, 1)));
const b = picksForMonth(DIGITAL_PRODUCTS, new Date(Date.UTC(2027, 2, 28)));
check('a given month always resolves to the same prints', JSON.stringify(a) === JSON.stringify(b),
  'A retry after a partial send must re-send the same prints, not a different set.');

check('no picks before the club launch date',
  picksForMonth(DIGITAL_PRODUCTS, new Date(Date.UTC(2026, 0, 1))).length === 0);

// ---------------------------------------------------------------------------
group('Print Club pricing');

check('price is a positive whole number of cents',
  Number.isInteger(PRINT_CLUB.price) && PRINT_CLUB.price > 0);
const clubValue = PRINT_CLUB.printsPerMonth * 1200;
check(`membership gives more value than it costs ($${clubValue / 100} of prints for $${PRINT_CLUB.price / 100})`,
  clubValue > PRINT_CLUB.price,
  'At or below the price of the prints it contains there is no reason to subscribe.');

const clubHtml = fs.readFileSync('printclub.html', 'utf8');
check('printclub.html headline price matches the code',
  clubHtml.includes(`$${PRINT_CLUB.price / 100} <span>AUD / month</span>`),
  `lib says $${PRINT_CLUB.price / 100}`);
check('printclub.html structured data price matches the code',
  clubHtml.includes(`"price":"${(PRINT_CLUB.price / 100).toFixed(2)}"`));

// ---------------------------------------------------------------------------
group('Blob download links');

check('max TTL is within the platform limit', MAX_TTL_MS <= 7 * 24 * 3600e3,
  'Vercel Blob rejects validUntil more than 7 days out; delivery is wrapped in try/catch so an over-long TTL fails SILENTLY and the customer just never receives their file.');
check('free print TTL is within the max', FREE_PRINT.ttlMs <= MAX_TTL_MS);

const blobLinkSrc = fs.readFileSync('lib/blob-link.js', 'utf8');
check('presigning is clamped, not merely documented', /Math\.min\(\s*ttlMs\s*,\s*MAX_TTL_MS\s*\)/.test(blobLinkSrc));

const strayPresign = ['api', 'lib'].flatMap((d) =>
  fs.readdirSync(d).filter((f) => f.endsWith('.js')).map((f) => `${d}/${f}`))
  .filter((f) => f !== 'lib/blob-link.js')
  .filter((f) => fs.readFileSync(f, 'utf8').includes('issueSignedToken'));
check('all presigning goes through lib/blob-link.js', strayPresign.length === 0,
  `bypassing it re-opens the TTL bug: ${strayPresign.join(', ')}`);

// ---------------------------------------------------------------------------
group('Personalisation');

const parsed = personalise.parsePersonalisation({ name: '  Willow   Rose  ', line2: 'Born 3 March', line3: '' });
check('input is normalised', parsed.ok && parsed.data.name === 'Willow Rose', JSON.stringify(parsed));
check('a blank name is rejected', personalise.parsePersonalisation({ name: '   ' }).ok === false);
check('newlines cannot be injected into the print',
  personalise.parsePersonalisation({ name: 'A\nB' }).data.name === 'A B');
check('over-long input is truncated, not rejected',
  personalise.parsePersonalisation({ name: 'x'.repeat(200) }).data.name.length === personalise.LIMITS.name);

const art = fs.readFileSync(path.join(process.env.HOME, 'Downloads/LittlePoppin-Designs/collection-01/05-sleepy-moon-and-stars.png'));
const font = fs.readFileSync('assets/fonts/CormorantGaramond.ttf');
const pdf = await personalise.renderPersonalisedPdf(art, { name: 'Willow Rose', line2: 'Born 3rd March 2026', line3: '3.2kg' }, { regular: font });
check('renders a PDF', pdf.length > 10000 && Buffer.from(pdf.slice(0, 5)).toString() === '%PDF-');

const { PDFDocument } = await import('pdf-lib');
const doc = await PDFDocument.load(pdf);
check(`PDF has ${personalise.PAGE_SIZES.length} page sizes`, doc.getPageCount() === personalise.PAGE_SIZES.length);
const sizes = doc.getPages().map((p) => `${(p.getWidth() / 72).toFixed(2)}x${(p.getHeight() / 72).toFixed(2)}`);
check('page sizes are 8x10, A4 and 16x20', sizes.join(' ') === '8.00x10.00 8.27x11.69 16.00x20.00', sizes.join(' '));

// Glyph coverage: fontkit's subsetter silently drops glyphs from this variable font,
// which rendered "Willow Rose" as "llow o". A subset font produces a much smaller file.
const personaliseSrc = fs.readFileSync('lib/personalise.js', 'utf8');
check('font is embedded without subsetting', /subset:\s*false/.test(personaliseSrc),
  'subset:true silently drops most glyphs from the variable Cormorant. Verify by rendering, never by byte count.');

// ---------------------------------------------------------------------------
group('Cron endpoint auth');

const sendSrc = fs.readFileSync('api/printclub-send.js', 'utf8');
check('sender refuses to run without CRON_SECRET', /if\s*\(\s*!secret\s*\)/.test(sendSrc),
  '`if (secret && ...)` fails OPEN: with the env var unset the endpoint becomes a public trigger for a mass email.');

const sendMod = await import('../api/printclub-send.js');
const reviewMod = await import('../api/review-request.js');
const reviewSrc = fs.readFileSync('api/review-request.js', 'utf8');
check('review-request also fails closed without CRON_SECRET', /if\s*\(\s*!secret\s*\)/.test(reviewSrc),
  'It emails customers and spends Resend quota. An unset secret must disable it, not open it.');
const mkRes = () => { const r = {}; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
delete process.env.CRON_SECRET;
let r1 = mkRes(); await sendMod.default({ headers: {}, query: {} }, r1);
check('unset secret → 503', r1.code === 503, `got ${r1.code}`);
let rr = mkRes(); await reviewMod.default({ headers: {}, query: {} }, rr);
check('review-request unset secret → 503', rr.code === 503, `got ${rr.code}`);
process.env.CRON_SECRET = 'unit-test-secret';
let r2 = mkRes(); await sendMod.default({ headers: {}, query: {} }, r2);
check('missing auth header → 401', r2.code === 401, `got ${r2.code}`);
let r3 = mkRes(); await sendMod.default({ headers: { authorization: 'Bearer wrong' }, query: {} }, r3);
check('wrong token → 401', r3.code === 401, `got ${r3.code}`);
delete process.env.CRON_SECRET;

// ---------------------------------------------------------------------------
group('Pages, assets and structured data');

const pages = [
  ...fs.readdirSync('.').filter((f) => f.endsWith('.html')),
  ...['print', 'set'].flatMap((d) => fs.existsSync(d) ? fs.readdirSync(d).map((f) => `${d}/${f}`) : []),
];
let broken = [];
let refCount = 0;
const seenRef = new Set();
for (const pg of pages) {
  const html = fs.readFileSync(pg, 'utf8');
  const dir = path.dirname(pg);
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    const key = `${pg}|${clean}`;
    if (seenRef.has(key)) continue;
    seenRef.add(key);
    refCount++;
    const target = clean.startsWith('/') ? path.join('.', clean) : path.join(dir, clean);
    if (!fs.existsSync(target)) broken.push(`${pg} → ${ref}`);
  }
}
check(`${refCount} local references across ${pages.length} pages all resolve`, broken.length === 0,
  broken.slice(0, 5).join('\n      '));

let badJson = [];
let jsonBlocks = 0;
for (const pg of pages) {
  for (const m of fs.readFileSync(pg, 'utf8').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    jsonBlocks++;
    try { JSON.parse(m[1]); } catch (e) { badJson.push(`${pg}: ${e.message}`); }
  }
}
check(`${jsonBlocks} JSON-LD blocks parse`, badJson.length === 0, badJson.slice(0, 3).join('\n      '));

const noNav = pages.filter((pg) => {
  const html = fs.readFileSync(pg, 'utf8');
  return html.includes('nav__links') && !html.includes('nav__toggle');
});
check('every page with a nav has a mobile menu button', noNav.length === 0,
  `unreachable navigation on mobile: ${noNav.join(', ')}`);

// ---------------------------------------------------------------------------
group('Social proof');

const testimonials = JSON.parse(fs.readFileSync('data/testimonials.json', 'utf8'));
check('testimonials.json is an array', Array.isArray(testimonials));
const badT = testimonials.filter((t) => !t.quote || !t.name);
check('every testimonial has a quote and a name', badT.length === 0, JSON.stringify(badT).slice(0, 200));
const home = fs.readFileSync('index.html', 'utf8');
check('testimonials section starts hidden', /<section class="lp-says" id="says" hidden>/.test(home),
  'An empty "What People Say" heading is worse than none at all.');
check('every product page carries the guarantee',
  fs.readdirSync('print').every((f) => fs.readFileSync(`print/${f}`, 'utf8').includes('Our promise:')));

// ---------------------------------------------------------------------------
group('Physical prints (Printify)');

const { printifyConfigured, PRINTIFY_CONFIG } = await import('../lib/printify.js');
const opts = JSON.parse(fs.readFileSync('data/print-options.json', 'utf8'));
check('print-options.json agrees with the Printify config',
  opts.configured === printifyConfigured(),
  `json says ${opts.configured}, lib says ${printifyConfigured()}`);
check('no Printify ids leak to the browser',
  !JSON.stringify(opts).match(/blueprintId|providerId|variantId/),
  'data/print-options.json is public. It must carry labels and prices only.');

const sampleProduct = fs.readFileSync('print/sleepy-moon-and-stars.html', 'utf8');
check('product pages carry the physical picker', sampleProduct.includes('data-physical-for'));
check('the picker starts hidden', /data-physical-for="[^"]+" hidden/.test(sampleProduct),
  'It must not show a control that 409s while Printify is unconfigured.');
if (!printifyConfigured()) {
  check('picker stays hidden while Printify is unconfigured', opts.formats.length === 0 && opts.availableFor.length === 0);
}

// ---------------------------------------------------------------------------
group('Custom (made-to-order) products');

const badFields = Object.values(CUSTOM_PRODUCTS).flatMap((p) =>
  p.fields.filter((f) => f.label.length > 50).map((f) => `${p.sku}: "${f.label}"`));
check('Stripe custom_field labels are within the 50-char limit', badFields.length === 0,
  badFields.join(', '));

// Buttons on custom.html must quote what Stripe will actually charge.
const customHtml = fs.readFileSync('custom.html', 'utf8');
const priceDrift = [];
for (const p of Object.values(CUSTOM_PRODUCTS)) {
  if (p.sku.startsWith('gift-voucher')) continue;
  const m = customHtml.match(new RegExp(`data-sku="${p.sku}"[^>]*>([^<]*)<`));
  if (!m) continue;                              // not displayed is fine
  const want = `$${(p.price / 100).toFixed(0)}`;
  if (!m[1].includes(want)) priceDrift.push(`${p.sku}: page says "${m[1].trim()}", code says ${want}`);
}
check('custom.html prices match lib/products.js', priceDrift.length === 0, priceDrift.join('\n      '));

// A bundle must cost more than any single item inside it, or it undercuts its own parts.
const song = CUSTOM_PRODUCTS['custom-song'].price;
check('bundles containing the song cost more than the song alone',
  CUSTOM_PRODUCTS['bundle-song-story'].price > song && CUSTOM_PRODUCTS['bundle-first-year'].price > song,
  `song $${song / 100}, song+story $${CUSTOM_PRODUCTS['bundle-song-story'].price / 100}, first-year $${CUSTOM_PRODUCTS['bundle-first-year'].price / 100}`);

// Charity claims must stay scoped to the swaddles, which are the only range that funds
// the giving. An unqualified "a portion of every sale" across a shop that is now mostly
// digital is misleading conduct under Australian Consumer Law, not loose copy. And it
// was live on ~130 pages until August 2026. Anything that reintroduces it fails here.
{
  const pages = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.html')) pages.push(full);
    }
  };
  walk(REPO);
  const bad = [];
  for (const f of pages) {
    const html = fs.readFileSync(f, 'utf8');
    for (const m of html.matchAll(/A portion of[^.<"]{0,120}/g)) {
      // "swaddle" anywhere in the sentence makes the scope explicit and truthful.
      // "this sale" is fine only on the two swaddle product pages.
      const sent = m[0];
      if (/swaddle/i.test(sent)) continue;
      if (/this sale/i.test(sent) && /swaddle/.test(path.basename(f))) continue;
      bad.push(`${path.relative(REPO, f)}: "${sent.trim().slice(0, 70)}"`);
    }
  }
  check('charity claims are scoped to swaddles', bad.length === 0, bad.slice(0, 6).join('\n      '));
}

// Every symbol an api/ handler uses from a lib must actually be imported. `node --check`
// only parses syntax, so a missing import is a ReferenceError that surfaces at RUNTIME, on
// a real customer. That is exactly how the physical-print checkout shipped broken: an edit
// to the import line silently no-op'd because the search string was stale, and nothing
// caught it until Stripe returned 500 in production.
{
  const libExports = {};
  for (const f of fs.readdirSync(path.join(REPO, 'lib')).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(REPO, 'lib', f), 'utf8');
    for (const m of src.matchAll(/export (?:const|function|async function|class) (\w+)/g)) {
      (libExports[m[1]] ||= []).push('lib/' + f);
    }
  }
  const missing = [];
  for (const f of fs.readdirSync(path.join(REPO, 'api')).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(REPO, 'api', f), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const imported = new Set();
    for (const m of code.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
      for (const n of m[1].split(',')) imported.add(n.trim().split(/\s+as\s+/).pop().trim());
    }
    // Anything declared locally is fine too.
    for (const m of code.matchAll(/(?:const|let|var|function|async function)\s+(\w+)/g)) imported.add(m[1]);
    for (const name of Object.keys(libExports)) {
      const used = new RegExp(`\\b${name}\\s*\\(|\\b${name}\\.|\\b${name}\\b`).test(code);
      if (used && !imported.has(name)) missing.push(`api/${f} uses ${name} (${libExports[name][0]}) without importing it`);
    }
  }
  check('api handlers import every lib symbol they use', missing.length === 0, missing.join('\n      '));
}

// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(60)}`);
if (failures.length) {
  console.log(`${passed} passed, ${failures.length} FAILED\n`);
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`All ${passed} checks passed.`);
