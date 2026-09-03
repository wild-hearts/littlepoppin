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

const __filenameish = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(REPO);
process.env.STRIPE_SECRET_KEY ||= 'sk_test_dummy_for_tests';

let passed = 0;
const failures = [];
const skipped = [];
let currentGroup = '';

const group = (name) => { currentGroup = name; console.log(`\n${name}`); };
// A SKIP is not a pass. It is recorded and reported at the end, so a suite that could not
// check something never reads as a suite that checked it and was happy.
function skip(what, why) {
  skipped.push(`${currentGroup} \u2192 ${what}: ${why}`);
  console.log(`  \u25CB SKIPPED ${what}\n      ${why}`);
}
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

// The master artwork lives in ~/Downloads/LittlePoppin-Designs, which is NOT in the repo
// and is not present on every machine. Until 3 Sep 2026 a missing file threw ENOENT and
// killed the whole run here, a third of the way in, so every check below this point
// (including the charity-claim check) silently never ran. A missing local asset must
// SKIP, loudly, and let the rest of the suite finish.
const ART = path.join(process.env.HOME, 'Downloads/LittlePoppin-Designs/collection-01/05-sleepy-moon-and-stars.png');
if (!fs.existsSync(ART)) {
  skip('PDF rendering checks', `master artwork not on this machine: ${ART}`);
} else {
  const art = fs.readFileSync(ART);
  const font = fs.readFileSync('assets/fonts/CormorantGaramond.ttf');
  const pdf = await personalise.renderPersonalisedPdf(art, { name: 'Willow Rose', line2: 'Born 3rd March 2026', line3: '3.2kg' }, { regular: font });
  check('renders a PDF', pdf.length > 10000 && Buffer.from(pdf.slice(0, 5)).toString() === '%PDF-');

  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.load(pdf);
  check(`PDF has ${personalise.PAGE_SIZES.length} page sizes`, doc.getPageCount() === personalise.PAGE_SIZES.length);
  const sizes = doc.getPages().map((p) => `${(p.getWidth() / 72).toFixed(2)}x${(p.getHeight() / 72).toFixed(2)}`);
  check('page sizes are 8x10, A4 and 16x20', sizes.join(' ') === '8.00x10.00 8.27x11.69 16.00x20.00', sizes.join(' '));
}

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

// NO CHARITY CLAIM, ON ANY RANGE. brand.yaml sets `charity_claims.permitted: false`
// outright from 13 Aug 2026, superseding the earlier "swaddles only" position. An
// unsubstantiated donation claim is misleading conduct under Australian Consumer Law.
//
// This check was rewritten on 3 Sep 2026 because the old one was green while a live
// charity claim sat on llms.txt. It failed in three ways, all worth remembering:
//   1. it only matched the exact phrase "A portion of", so "funds the shop's charitable
//      giving" sailed straight past it;
//   2. it only walked .html, and the live claim was in llms.txt;
//   3. it PASSED anything containing the word "swaddle", which is no longer permitted.
// A test that encodes a superseded rule is worse than no test, because it is mistaken
// for coverage.
{
  const CHARITY = /\b(charit(y|ies|able)|donation|donates?|proceeds|good cause|fundrais)/i;
  // Lines that talk ABOUT the prohibition rather than making the claim.
  const META = /(permitted: false|prohibit|misleading conduct|no charitable claim|NO CHARITY|never state or imply|Medaria)/i;
  const SCAN = ['.html', '.txt', '.json', '.js', '.mjs'];
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'docs' || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (SCAN.includes(path.extname(e.name))) files.push(full);
    }
  };
  walk(REPO);
  const bad = [];
  for (const f of files) {
    if (path.resolve(f) === path.resolve(__filenameish)) continue;
    const src = fs.readFileSync(f, 'utf8');
    // A scanner has to name the words it looks for. Files that declare themselves as
    // scanners are exempt; nothing else is.
    if (src.includes('LP-CHARITY-SCANNER')) continue;
    for (const line of src.split('\n')) {
      if (!CHARITY.test(line) || META.test(line)) continue;
      bad.push(`${path.relative(REPO, f)}: "${line.trim().slice(0, 80)}"`);
    }
  }
  check('no charity, donation or proceeds claim anywhere', bad.length === 0, bad.slice(0, 8).join('\n      '));
}


// ---------------------------------------------------------------------------
// PUBLISHED PRICE vs CHARGED PRICE. Added 3 Sep 2026 after custom.html was found
// publishing JSON-LD offers of $15, $29 and $49 for products that charge $45, $55 and
// $85. Nothing owned this: "custom.html prices match lib/products.js" above checks the
// VISIBLE price only, and structured data is what Google shows in a rich result. A price
// advertised below what is charged is a misleading price representation under Australian
// Consumer Law, and it is the dangerous direction of the error.
//
// Every JSON-LD Offer with a price, on every page, resolved by product name back to the
// catalogue. Names that do not resolve are reported, not silently passed, because an
// unresolvable name is how a mismatch hides.
group('Published price matches charged price');
{
  const truth = new Map();
  const key = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const add = (n, c) => { if (n && c != null) truth.set(key(n), c); };
  const { PRODUCTS: PHYS, CUSTOM_PRODUCTS: CUST, DIGITAL_PRODUCTS: DIG } = await import('../lib/products.js');
  for (const p of Object.values(CUST || {})) add(p.name, p.price);
  for (const p of Object.values(PHYS || {})) add(p.name, p.price);
  for (const p of Object.values({ ...DIG, ...GENERATED_DIGITAL_PRODUCTS })) {
    add(p.name, p.price); add(p.title, p.price);
    if (p.items) add(`${p.title}, ${p.items.length} Digital Prints`, p.price);
  }
  add(PRINT_CLUB.name, PRINT_CLUB.price);
  // Personalised prints price from lib/personalise.js, not the products catalogue.
  add('Personalised Name Print. Little Poppin', personalise.PERSONALISE_PRICE);

  const htmls = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'docs', '.git', '.vercel', 'etsy-stage'].includes(e.name) || e.name.startsWith('.')) continue;
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f); else if (e.name.endsWith('.html')) htmls.push(f);
    }
  })(REPO);

  let checkedOffers = 0; const mismatch = []; const unresolved = new Set(); let unparseable = 0;
  for (const f of htmls) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let json; try { json = JSON.parse(m[1]); } catch { unparseable++; continue; }
      (function walkNode(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walkNode);
        if (node.name && node.offers) {
          for (const o of [].concat(node.offers)) {
            if (o.price == null) continue;
            checkedOffers++;
            const cents = Math.round(parseFloat(o.price) * 100);
            const real = truth.get(key(node.name));
            if (real == null) unresolved.add(`${path.relative(REPO, f)}: "${node.name}"`);
            else if (real !== cents) mismatch.push(`${path.relative(REPO, f)}: "${node.name}" schema $${o.price} but charged $${(real / 100).toFixed(2)}`);
          }
        }
        for (const v of Object.values(node)) walkNode(v);
      })(json);
    }
  }
  check(`${checkedOffers} structured-data prices match the charged price`, mismatch.length === 0, mismatch.slice(0, 8).join('\n      '));
  check('all structured data parses as JSON', unparseable === 0, `${unparseable} unparseable ld+json block(s)`);
  check('every priced offer resolves to a catalogue product', unresolved.size === 0,
    [...unresolved].slice(0, 8).join('\n      ') + '\n      An unresolvable name cannot be price-checked, so it is not covered.');
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
if (skipped.length) {
  console.log(`${skipped.length} SKIPPED, not checked:\n`);
  skipped.forEach((sk) => console.log(`  \u25CB ${sk}`));
  console.log('');
}
if (failures.length) {
  console.log(`${passed} passed, ${failures.length} FAILED, ${skipped.length} skipped\n`);
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`All ${passed} checks passed${skipped.length ? `, ${skipped.length} skipped (see above)` : ''}.`);
