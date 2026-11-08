// build-product-pages.mjs. One indexable page per print and per gallery set.
//
// WHY: prints.html holds ~97 products on a single URL, so Google only has one page to
// rank. A page per product gives each design its own shot at long-tail search
// ("capricorn constellation nursery print"), its own Product rich result, and a natural
// landing page to send ads or Etsy traffic to.
//
// Input:  data/prints.json (written by build-prints-shop.mjs)
// Output: print/<slug>.html, set/<slug>.html, printables.html + printables/<slug>.html (the
// free library, from data/free-printables.json), guides, and a regenerated sitemap.xml
//
// Re-runnable and safe: it only writes into print/ and set/, plus sitemap.xml.

import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_EXTRAS } from '../lib/extras-products.generated.js';
import { pinterestClaimTag } from './site-config.mjs';
import { PRINTIFY_CONFIG } from '../lib/printify-config.generated.js';
import { GUIDES } from './guides-content.mjs';

import { PRINT_COUNTRIES, PRINT_SHIPPING } from '../lib/products.js';
import { PICKS, pickPrice } from '../lib/picks.js';

// Destination is chosen BEFORE checkout because Stripe fixes shipping rates when the
// session is created. It cannot re-price after the buyer types an address. The list is
// exactly the countries PRINT_SHIPPING covers, so every option has a real rate behind it.
const countryName = (() => {
  const dn = new Intl.DisplayNames(['en'], { type: 'region' });
  return (c) => { try { return dn.of(c) || c; } catch { return c; } };
})();
// A physical 'set' is only sensible up to a handful of prints.
const MAX_PHYSICAL_SET = 5;
const countryOptions = ['AU', 'US', 'GB', 'CA', 'NZ']
  .filter((c) => PRINT_COUNTRIES.includes(c))
  .concat(PRINT_COUNTRIES.filter((c) => !['AU','US','GB','CA','NZ'].includes(c))
    .sort((a, b) => countryName(a).localeCompare(countryName(b))))
  .map((c) => `<option value="${c}">${countryName(c)}</option>`).join('');

const REPO = path.resolve(new URL('..', import.meta.url).pathname);

// The resolution lines on a product page come from the file's real pixel size.
// The original library is ~300 DPI at 8x10 and prints to 16x20; the photorealistic
// series are smaller files, so their pages must not make the same promise.
function fileBullets(p) {
  // The original library keeps the wording it has always had. Only files that are
  // smaller than the library standard get bullets computed from their real size.
  if (!p.px || p.px[0] >= 1800) {
    return `            <li>High-resolution PNG (4:5 ratio, ~300 DPI)</li>
            <li>Prints beautifully at 4×5&Prime;, 8×10&Prime; and 16×20&Prime;</li>`;
  }
  const [w, h] = p.px;
  const sizes = [[4, 5], [8, 10], [11, 14], [16, 20]].filter(([iw]) => w / iw >= 150).map(([iw, ih]) => `${iw}×${ih}&Prime;`);
  const dpiAt8 = Math.round(w / 8);
  const list = sizes.length > 1 ? sizes.slice(0, -1).join(', ') + ' and ' + sizes[sizes.length - 1] : (sizes[0] || '4×5&Prime;');
  return `            <li>High-resolution PNG, ${w} × ${h} px (4:5 ratio, ${dpiAt8 >= 280 ? '~300' : dpiAt8} DPI at 8×10&Prime;)</li>
            <li>Prints beautifully at ${list}</li>`;
}
const SITE = 'https://littlepoppin.com';

// --- Size guide, frames, delivery and FAQ -----------------------------------
// Every comparable shop puts the size guide and the frame advice beside the buy
// button; Little Poppin had them on prints.html and in the guides, two clicks from the
// decision. These blocks put the same facts on the product page itself, and the figures
// are read from the code that charges them (PRINTIFY_CONFIG, PRINT_SHIPPING, PICKS) so
// the copy cannot drift from the price.
const PRINT_SIZES = [
  { inch: '8 × 10 in', cm: '20 × 25 cm', frame: 'an 8 × 10 in frame, or A4 with a small mat', best: 'above a cot or change table, on a shelf', minW: 1200 },
  { inch: '11 × 14 in', cm: '28 × 36 cm', frame: 'an 11 × 14 in frame, or A3 with a mat', best: 'a feature wall, a reading corner', minW: 1650 },
  { inch: '16 × 20 in', cm: '40 × 50 cm', frame: 'a 16 × 20 in (40 × 50 cm) frame', best: 'a statement wall; a print shop will print this size from the file', minW: 2400 },
];
// Which sizes a file supports, by the same rule as fileBullets: the original library
// goes to 16 × 20; a smaller file is limited to what still prints at 150 DPI or better.
const sizesFor = (p) => (!p.px || p.px[0] >= 1800) ? PRINT_SIZES : PRINT_SIZES.filter((z) => p.px[0] / parseInt(z.inch, 10) >= 150);

const dollars = (cents) => (cents % 100 === 0) ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
const PRINTED_FORMATS = Object.values(PRINTIFY_CONFIG.formats || {}).map((f) => ({
  label: f.label, sizes: (f.sizes || []).filter((z) => z.variantId),
})).filter((f) => f.sizes.length);
const canBePrinted = (sku) => !!PRINTIFY_CONFIG.shopId && !!(PRINTIFY_CONFIG.products || {})[sku];
const postageLine = () => {
  const parts = [`Australia and New Zealand ${dollars(PRINT_SHIPPING.AU.amount)}`,
    `United States ${dollars(PRINT_SHIPPING.US.amount)}`, `Canada ${dollars(PRINT_SHIPPING.CA.amount)}`,
    `everywhere else ${dollars(PRINT_SHIPPING.ROW.amount)}`];
  return parts.join(', ');
};

const sizeTable = (p) => `            <table class="pd__table">
              <thead><tr><th>Print at</th><th>Frame to look for</th><th>Best for</th></tr></thead>
              <tbody>
${sizesFor(p).map((z) => `                <tr><td>${z.inch}<br/><small>${z.cm}</small></td><td>${z.frame}</td><td>${z.best}</td></tr>`).join('\n')}
              </tbody>
            </table>`;

// A set can be printed when it is small enough to post as one order and every print in
// it has a Printify product. The same rule puts the set's sku into print-options.json
// (below), which is what lets physical.js show the picker on a set page at all.
const setCanBePrinted = (s) => !!PRINTIFY_CONFIG.shopId && s.items.length <= MAX_PHYSICAL_SET && s.items.every(canBePrinted);
const printedTable = (sku, setCount = 0, set = null) => {
  const printed = set ? setCanBePrinted(set) : canBePrinted(sku);
  if (!printed) return '';
  const sizeKeys = PRINTED_FORMATS[0].sizes.map((z) => z.label);
  return `            <p class="pd__infoLead">Or have it printed and posted. Prices below are per print, in AUD, chosen in the "printed and posted" box above.${setCount ? ` A set of ${setCount} is 10% off the combined price.` : ''}</p>
            <table class="pd__table">
              <thead><tr><th>Format</th>${sizeKeys.map((k) => `<th>${k}</th>`).join('')}</tr></thead>
              <tbody>
${PRINTED_FORMATS.map((f) => `                <tr><td>${esc(f.label)}</td>${f.sizes.map((z) => `<td>${dollars(z.price)}</td>`).join('')}</tr>`).join('\n')}
              </tbody>
            </table>`;
};

// Q and A used both for the on-page accordion and the FAQPage structured data.
const productFaq = (p, isSet) => {
  const n = isSet ? p.items.length : 1;
  const qa = [
    ['What exactly do I get?',
      isSet ? `${n} high-resolution PNG files (4:5 ratio, around 300 DPI), one per print, delivered the moment you pay. A download page appears after checkout and the link is emailed to you as well. Nothing is posted and there is no shipping cost.`
            : 'A high-resolution PNG file (4:5 ratio, around 300 DPI) delivered the moment you pay. A download button appears after checkout and the link is emailed to you as well. Nothing is posted and there is no shipping cost.'],
    ['How do I print it?',
      'Print at home on good matte photo paper, upload the file to any online print service, or take it to a local print shop. Matte paper suits the soft style best. The 4:5 ratio prints at 8 × 10 in and 16 × 20 in without cropping, and sits in an A4 or A3 frame with a small mat.'],
    ['Can I print it more than once?',
      'Yes. Print it as often as you like for your own home or as a gift. The licence is personal use only, so the file cannot be resold, shared or used commercially.'],
    isSet
      ? ['Can I swap one of the prints in the set?',
         `Yes, in a way. Any single print page has an "add to my set" button: pick any ${PICKS.minForDeal} or more prints from the whole shop and they are ${dollars(PICKS.dealPrice)} each instead of ${dollars(PICKS.fullPrice)}, the same price per print as this set.`]
      : ['Is there a discount for more than one?',
         `Yes. Pick any ${PICKS.minForDeal} or more single prints and they are ${dollars(PICKS.dealPrice)} each instead of ${dollars(PICKS.fullPrice)}: three for ${dollars(pickPrice(3))}, which is what our curated sets cost too. Use the "add to my set" button under the price.`],
    ...(isSet ? [] : [['Can I add my child\'s name?',
      'Yes. Choose "add their name and personalise" under the price. You type the name and up to two more lines, see it rendered on the print as you type, and pay $19 for a print-ready PDF at 8 × 10 in, A4 and 16 × 20 in.']]),
    ['What if something is wrong with my file or my print?',
      'Tell us and we fix it or refund you, no forms and no argument. Digital files cannot be returned once downloaded, so change-of-mind refunds are not available on them, but Australian Consumer Law guarantees always apply. Printed orders that arrive damaged or misprinted are replaced.'],
  ];
  return qa;
};

const infoBlocks = (p, { isSet = false } = {}) => {
  const qa = productFaq(p, isSet);
  const sku = p.sku;
  const printed = isSet ? printedTable(sku, p.items.length, p) : printedTable(sku);
  return `
          <div class="pd__info faq">
            <details open>
              <summary>Sizes and printing</summary>
              <p class="pd__infoLead">Every file is 4:5, the shape of a classic 8 × 10 in frame. For a nursery, 8 × 10 in or A4 above a cot is the size most people choose.</p>
${sizeTable(isSet ? { px: null } : p)}
${printed}
            </details>
            <details>
              <summary>Where to buy frames</summary>
              <p>Look for an 8 × 10 in (20 × 25 cm) or 16 × 20 in (40 × 50 cm) frame: the print fits without cropping. In Australia those sizes are usually stocked at Kmart, Target, Big W, IKEA and Officeworks; in the United States at Target, Michaels and IKEA; in the United Kingdom at IKEA, Dunelm and The Range.</p>
              <p>An A4 or A3 frame works too. Ask the framer for a mat (mount) cut to 8 × 10 in or 11 × 14 in, or trim a few millimetres from the top and bottom of the print.</p>
${printed ? `              <p>Rather not frame it yourself? Choose "Framed Print" in the printed and posted box and it arrives in a black frame, ready to hang. Stretched canvas needs no frame at all.</p>` : ''}
            </details>
            <details>
              <summary>Delivery, paper and our promise</summary>
              <p><strong>Digital:</strong> the download appears the moment you pay and the link is emailed to you. Save the file to your device; the emailed link is tied to your order.</p>
${printed ? `              <p><strong>Printed:</strong> made to order by the production partner nearest you, not posted from Australia. Posters are printed on matte paper, canvas is stretched on a wooden frame, framed prints come in a black frame. Allow 2 to 5 business days for printing plus postage: 5 to 12 business days in total is typical, and tracking is emailed where available.</p>
              <p><strong>Postage</strong> is charged at cost and shown before you pay: ${postageLine()}.</p>` : ''}
              <p><strong>Our promise:</strong> anything wrong with the file or the print, tell us and we fix it or refund you. Australian Consumer Law guarantees apply. See <a href="${'../'}refunds.html">Refunds &amp; Returns</a>.</p>
            </details>
            <details>
              <summary>Common questions</summary>
${qa.map(([q, a]) => `              <h3 class="pd__q">${esc(q)}</h3>
              <p>${esc(a)}</p>`).join('\n')}
            </details>
          </div>`;
};

const faqJsonLd = (qa) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});


const data = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'prints.json'), 'utf8'));
const sectionTitle = Object.fromEntries(data.sections.map((s) => [s.id, s.nav]));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugOf = (sku) => sku.replace(/^(print|set)-/, '');
const money = (cents) => (cents / 100).toFixed(2);
// The 2:3 pin rendered by scripts/build-pins.mjs, when it exists (Pinterest's preferred shape); else the artwork.
const pinImage = (slug, fallback) => fs.existsSync(path.join(REPO, 'images', 'pins', `${slug}.jpg`)) ? `${SITE}/images/pins/${slug}.jpg` : fallback;

// Shared chrome so product pages look and navigate exactly like the rest of the site.
// `up` is the relative prefix back to the site root (product pages live one level down).
// `price` (AUD cents) adds the price tags Pinterest reads for product Rich Pins; listing pages leave it out
// and are plain `website` pages.
const head = ({ title, description, canonical, image, jsonLd, up, price = null }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${canonical}" />
  ${pinterestClaimTag()}
  <meta property="og:type" content="${price ? 'product' : 'website'}" />
  <meta property="og:site_name" content="Little Poppin" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${image}" />${price ? `
  <meta property="product:price:amount" content="${(price / 100).toFixed(2)}" />
  <meta property="product:price:currency" content="AUD" />
  <meta property="og:price:amount" content="${(price / 100).toFixed(2)}" />
  <meta property="og:price:currency" content="AUD" />
  <meta property="og:availability" content="instock" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${image}" />
${jsonLd.map((j) => `  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
  <link rel="stylesheet" href="${up}styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-TD4975MVCS"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-TD4975MVCS');
  </script>
  <style>
    .pd { padding: 34px 0 70px; }
    .pd__grid { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); gap: 50px; align-items: start; }
    @media (max-width: 860px) { .pd__grid { grid-template-columns: 1fr; gap: 28px; } }
    .pd__art { width: 100%; border-radius: var(--radius); box-shadow: var(--shadow-lg); display: block; }
    .pd__mockup { width: 100%; border-radius: var(--radius); box-shadow: var(--shadow); display: block; margin-top: 16px; }
    .pd__mockupNote { font-size: 0.78rem; color: var(--mid-grey); text-align: center; margin-top: 8px; }
    .pd__guarantee { background: var(--teal-light); border-radius: var(--radius); padding: 14px 16px;
                     font-size: 0.9rem; color: var(--charcoal); margin: 18px 0 0; line-height: 1.55; }
    .pd__body h1 { font-family: var(--font-serif); font-size: 2.4rem; font-weight: 600; margin: 0 0 12px; line-height: 1.15; }
    .pd__lead { font-size: 1.05rem; color: var(--mid-grey); margin: 0 0 22px; }
    .pd__price { font-family: var(--font-serif); font-size: 2rem; margin: 0 0 4px; }
    .pd__price span { font-family: var(--font-sans); font-size: 0.85rem; color: var(--mid-grey); }
    .pd__buy { margin: 18px 0 8px; }
    .pd__buy .btn { width: 100%; }
    .pd__alt { display: block; text-align: center; margin-top: 12px; font-size: 0.95rem; }
    .pd__list { list-style: none; padding: 0; margin: 26px 0 0; font-size: 0.92rem; color: var(--mid-grey); }
    .pd__list li { padding-left: 22px; position: relative; margin-bottom: 7px; }
    .pd__list li::before { content: '✓'; position: absolute; left: 0; color: var(--green); font-weight: 700; }
    .pd__sets { list-style: none; padding: 0; margin: 18px 0 0; }
    .pd__sets li { padding: 6px 0; border-bottom: 1px solid var(--light-grey); font-size: 0.95rem; }
    .pd__pick { width: 100%; margin-top: 10px; }
    .pd__pickNote { font-size: 0.82rem; color: var(--mid-grey); text-align: center; margin: 8px 0 0; }
    .pd__maths { background: var(--pink-light); border-radius: var(--radius); padding: 12px 16px; font-size: 0.92rem; margin: 14px 0 0; }
    .pd__info { margin-top: 30px; }
    .pd__info details { padding: 14px 18px; }
    .pd__info summary { font-size: 1.05rem; }
    .pd__infoLead { margin: 10px 0 6px; color: var(--mid-grey); font-size: 0.92rem; }
    .pd__table { width: 100%; border-collapse: collapse; font-size: 0.88rem; margin: 10px 0 6px; }
    .pd__table th, .pd__table td { text-align: left; padding: 8px 8px; border-bottom: 1px solid var(--light-grey); vertical-align: top; }
    .pd__table th { font-weight: 700; color: var(--charcoal); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .pd__table small { color: var(--mid-grey); }
    .pd__q { font-family: var(--font-sans); font-size: 0.95rem; font-weight: 700; margin: 16px 0 4px; }
    .pd__kind { margin: 18px 0 0; }
    .pd__promo { display: block; margin: 10px 0 0; font-size: 0.85rem; color: var(--mid-grey); }
    .pd__promo input { display: block; width: 100%; margin-top: 4px; padding: 10px 12px; border: 1px solid var(--light-grey); border-radius: 10px; font-family: var(--font-sans); font-size: 0.95rem; text-transform: uppercase; }
    .pd__promo input:focus { outline: none; border-color: var(--red); }
    .breadcrumb { font-size: 0.85rem; color: var(--mid-grey); margin-bottom: 18px; }
    .breadcrumb a { color: var(--mid-grey); }
    .breadcrumb a:hover { color: var(--red); }
    .related { background: var(--light-grey); padding: 56px 0; }
    .related h2 { font-family: var(--font-serif); font-size: 1.7rem; text-align: center; margin: 0 0 26px; font-weight: 600; }
    .related__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
    .related__card { background: #fff; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); display: block; }
    .related__card img { width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; }
    .related__card span { display: block; padding: 11px 12px; font-size: 0.9rem; text-align: center; color: var(--charcoal); }
    .guide { padding: 34px 0 80px; }
    .guide h1 { font-family: var(--font-serif); font-size: clamp(2rem, 4.5vw, 3rem); font-weight: 600; margin: 0 0 16px; line-height: 1.15; }
    .guide__intro { font-size: 1.12rem; color: var(--mid-grey); margin: 0 0 28px; }
    .guide__hero { width: 100%; border-radius: var(--radius); box-shadow: var(--shadow-lg); margin-bottom: 36px; }
    .guide h2 { font-family: var(--font-serif); font-size: 1.6rem; font-weight: 600; margin: 34px 0 12px; }
    .guide p { margin-bottom: 14px; color: var(--charcoal); }
    .guide__cta { background: var(--teal-light); border-radius: var(--radius); padding: 26px; margin: 38px 0; text-align: center; }
    .guide__cta p { color: var(--mid-grey); margin-bottom: 16px; }
    .lp-ways { padding: 70px 0 90px; }
    .lp-ways__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 22px; }
    .lp-way { display: flex; flex-direction: column; background: #fff; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); transition: transform var(--transition); }
    .lp-way:hover { transform: translateY(-4px); }
    .lp-way__img img { width: 100%; aspect-ratio: 3/2; object-fit: cover; display: block; }
    .lp-way__body { padding: 20px 22px 24px; }
    .lp-way__body h3 { font-family: var(--font-serif); font-size: 1.3rem; font-weight: 600; margin: 0 0 8px; }
    .lp-way__body p { color: var(--mid-grey); font-size: 0.92rem; margin: 0 0 14px; }
    .lp-way__go { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--red); }
  </style>
</head>
<body>
  <nav class="nav nav--scrolled" id="nav">
    <div class="nav__inner">
      <a href="${up}index.html" class="nav__logo"><img src="${up}images/logo.png" alt="Little Poppin" /></a>
      <button class="nav__toggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav__links">
        <li><a href="${up}index.html#products">Swaddles</a></li>
        <li><a href="${up}prints.html">Art Prints</a></li>
        <li><a href="${up}personalise.html">Personalise</a></li>
        <li><a href="${up}cards.html">Cards &amp; Invites</a></li>
        <li><a href="${up}printclub.html">Print Club</a></li>
        <li><a href="${up}printables.html">Printables</a></li>
        <li><a href="${up}guides.html">Guides</a></li>
        <li><a href="${up}custom.html">Made for You</a></li>
        <li><a href="${up}index.html#contact">Contact</a></li>
      </ul>
    </div>
  </nav>
`;

const foot = (up, viewItemSku = '') => `
  <footer class="footer">
    <div class="container">
      <div class="footer__bottom">
        <nav class="footer__legal" aria-label="Legal">
          <a href="${up}shipping.html">Shipping</a>
          <a href="${up}refunds.html">Refunds &amp; Returns</a>
          <a href="${up}privacy.html">Privacy</a>
          <a href="${up}terms.html">Terms</a>
        </nav>
        <p>&copy; 2025 Little Poppin. All rights reserved.</p>
      </div>
    </div>
  </footer>
  <script src="${up}store.js" defer></script>
  <script src="${up}physical.js" defer></script>${viewItemSku ? `
  <script>
    // GA4 view_item. No-ops without analytics configured.
    (function(){ try { if (typeof window.gtag === 'function') window.gtag('event', 'view_item', { items: [{ item_id: '${viewItemSku}' }] }); } catch(e){} })();
  </script>` : ''}
</body>
</html>
`;

const relatedGrid = (items, up) => !items.length ? '' : `
  <section class="related">
    <div class="container">
      <h2>You might also love</h2>
      <div class="related__grid">
${items.map((r) => `        <a class="related__card" href="${up}print/${slugOf(r.sku)}.html">
          <img src="${up}${r.preview.replace(/^\//, '')}" alt="${esc(r.title)}, magical art print" loading="lazy" />
          <span>${esc(r.title)}</span>
        </a>`).join('\n')}
      </div>
    </div>
  </section>`;

// --- single prints ----------------------------------------------------------
fs.mkdirSync(path.join(REPO, 'print'), { recursive: true });
fs.mkdirSync(path.join(REPO, 'set'), { recursive: true });

const up = '../';
let written = 0;

for (const p of data.prints) {
  const slug = slugOf(p.sku);
  const url = `${SITE}/print/${slug}.html`;
  const img = SITE + p.preview;
  const sectionName = sectionTitle[p.section] || 'Art Prints';
  const title = `${p.title}, ${sectionName} Print | Little Poppin`;

  // Related: the next four prints from the same collection, wrapping around.
  const pool = data.prints.filter((x) => x.section === p.section && x.available);
  const at = pool.findIndex((x) => x.sku === p.sku);
  const related = pool.length > 1
    ? Array.from({ length: Math.min(4, pool.length - 1) }, (_, i) => pool[(at + 1 + i) % pool.length])
    : [];

  const jsonLd = [
    faqJsonLd(productFaq(p, false)),
    {
      '@context': 'https://schema.org', '@type': 'Product',
      name: `${p.title} Art Print`, description: p.description, image: img, sku: p.sku,
      brand: { '@type': 'Brand', name: 'Little Poppin' },
      offers: {
        '@type': 'Offer', price: money(p.price), priceCurrency: 'AUD', url,
        availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        itemCondition: 'https://schema.org/NewCondition',
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Art Prints', item: `${SITE}/prints.html` },
        { '@type': 'ListItem', position: 3, name: p.title, item: url },
      ],
    },
  ];

  const body = `
  <main class="pd">
    <div class="container">
      <p class="breadcrumb"><a href="${up}index.html">Home</a> › <a href="${up}prints.html">Art Prints</a> ›
         <a href="${up}prints.html#${p.section}">${esc(sectionName)}</a> › ${esc(p.title)}</p>
      <div class="pd__grid">
        <div>
          <img class="pd__art" src="${up}${p.preview.replace(/^\//, '')}" alt="${esc(p.title)}, a magical art print by Little Poppin" />
${fs.existsSync(path.join(REPO, 'images', 'mockups', `${slug}.jpg`)) ? `          <img class="pd__mockup" src="${up}images/mockups/${slug}.jpg" loading="lazy"
               alt="${esc(p.title)} shown framed on a wall" />
          <p class="pd__mockupNote">Shown framed. The frame is not included with the digital download.</p>` : ''}
        </div>
        <div class="pd__body">
          <h1>${esc(p.title)}</h1>
          <p class="pd__lead">${esc(p.description)}</p>
          <p class="pd__price">$${(p.price / 100).toFixed(0)} <span>AUD · instant download</span></p>
${p.available ? `          <div class="pd__buy">
            <button type="button" data-sku="${p.sku}" class="btn btn--primary btn--lg">Download Print. $${(p.price / 100).toFixed(0)}</button>
          </div>
          <a class="pd__alt" href="${up}personalise.html?print=${encodeURIComponent(p.sku)}">✨ Or add their name and personalise this print for $19</a>
          <button type="button" class="btn btn--outline-dark pd__pick" data-pick-sku="${p.sku}" data-pick-title="${esc(p.title)}" data-pick-preview="${p.preview}">+ Add to my set</button>
          <p class="pd__pickNote">Pick any ${PICKS.minForDeal} or more prints from the shop and they are ${dollars(PICKS.dealPrice)} each instead of ${dollars(PICKS.fullPrice)}.</p>`
        : `          <div class="pd__buy">
            <button type="button" class="btn btn--primary btn--lg is-soldout" disabled>Coming soon</button>
          </div>
          <p class="pd__alt">This design is being prepared for download. Check back soon, or <a href="${up}prints.html#${p.section}">browse the rest of the collection</a>.</p>`}

          <!-- Printed copies. Hidden until Printify is configured; physical.js reveals it
               only when data/print-options.json says this design is orderable. -->
          <div class="pd__physical" data-physical-for="${p.sku}" hidden>
            <h2 class="pd__physicalTitle">Or have it printed and posted</h2>
            <div class="pd__physicalRow">
              <label>Format
                <select data-physical-format aria-label="Print format"></select>
              </label>
              <label>Size
                <select data-physical-size aria-label="Print size"></select>
              </label>
              <label>Deliver to
                <select data-physical-country aria-label="Delivery country">${countryOptions}</select>
              </label>
            </div>
            <label class="pd__promo">Have a code? <input type="text" data-physical-promo placeholder="Promo code" autocomplete="off" maxlength="20" /></label>
            <button type="button" class="btn btn--outline-dark pd__physicalBuy" data-physical-buy>Order a printed copy</button>
            <p class="pd__physicalNote">Printed close to you and posted &mdash; postage shown at checkout</p>
            <p class="pd__err" data-physical-err role="alert"></p>
          </div>
          <p class="pd__guarantee"><strong>Our promise:</strong> if your file isn't right. Wrong size, won't open, anything at all. Tell us and we'll fix it or refund you.
             No argument, no forms.</p>
          <ul class="pd__list">
${fileBullets(p)}
            <li>Instant download. Nothing is posted</li>
            <li>Personal-use licence for your home, nursery or as a gift</li>
          </ul>
          <div class="pd__kind" data-kind-words hidden></div>
${infoBlocks(p)}
        </div>
      </div>
    </div>
  </main>
${relatedGrid(related, up)}`;

  fs.writeFileSync(path.join(REPO, 'print', `${slug}.html`),
    head({ title, description: p.description, canonical: url, image: pinImage(`print-${slug}`, img), price: p.price, jsonLd, up }) + body + foot(up, p.sku));
  written++;
}

// --- gallery sets -----------------------------------------------------------
const bySku = Object.fromEntries(data.prints.map((p) => [p.sku, p]));

for (const s of data.sets) {
  const slug = slugOf(s.sku);
  const url = `${SITE}/set/${slug}.html`;
  const img = SITE + s.preview;
  const title = `${s.title} Set of 3 Art Prints | Little Poppin`;
  const comps = s.items.map((sku) => bySku[sku]).filter(Boolean);

  const jsonLd = [
    faqJsonLd(productFaq(s, true)),
    {
      '@context': 'https://schema.org', '@type': 'Product',
      name: `${s.title}, 3 Digital Prints`, description: s.description, image: img, sku: s.sku,
      brand: { '@type': 'Brand', name: 'Little Poppin' },
      offers: {
        '@type': 'Offer', price: money(s.price), priceCurrency: 'AUD', url,
        availability: s.available ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
        itemCondition: 'https://schema.org/NewCondition',
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Art Prints', item: `${SITE}/prints.html` },
        { '@type': 'ListItem', position: 3, name: 'Gallery Sets', item: `${SITE}/prints.html#sets` },
        { '@type': 'ListItem', position: 4, name: s.title, item: url },
      ],
    },
  ];

  const saving = comps.length * 1200 - s.price;
  const body = `
  <main class="pd">
    <div class="container">
      <p class="breadcrumb"><a href="${up}index.html">Home</a> › <a href="${up}prints.html">Art Prints</a> ›
         <a href="${up}prints.html#sets">Gallery Sets</a> › ${esc(s.title)}</p>
      <div class="pd__grid">
        <div>
          <img class="pd__art" src="${up}${s.preview.replace(/^\//, '')}" alt="${esc(s.title)}, set of magical art prints" />
          <img class="pd__mockup" src="${up}images/mockups/${s.sku}.jpg" loading="lazy"
               alt="${esc(s.title)} shown as a framed gallery wall" />
          <p class="pd__mockupNote">Shown framed. Frames not included with the digital download.</p>
        </div>
        <div class="pd__body">
          <h1>${esc(s.title)}</h1>
          <p class="pd__lead">${esc(s.description)}</p>
          <p class="pd__price">$${(s.price / 100).toFixed(0)} <span>AUD · ${comps.length} prints · instant download${saving > 0 ? ` · save $${(saving / 100).toFixed(0)}` : ''}</span></p>
          <div class="pd__buy">
            <button type="button" data-sku="${s.sku}" class="btn btn--primary btn--lg">Download Set. $${(s.price / 100).toFixed(0)}</button>
          </div>
          <ul class="pd__sets">
${comps.map((c) => `            <li><a href="${up}print/${slugOf(c.sku)}.html">${esc(c.title)}</a></li>`).join('\n')}
          </ul>
${saving > 0 ? `          <p class="pd__maths">${comps.length} prints bought one at a time would be $${(comps.length * 12).toFixed(0)}. This set is $${(s.price / 100).toFixed(0)}, so you save $${(saving / 100).toFixed(0)} (${Math.round(saving / (comps.length * 12))}%).</p>` : ''}

          <!-- All three prints, printed and posted as one order. Only SETS get this: they were
               designed to hang together, whereas a 41- or 93-print collection is not a physical
               product anyone wants posted (or could afford). Gated on size, not on sku naming. -->
          ${comps.length <= MAX_PHYSICAL_SET ? `<div class="pd__physical" data-physical-for="${s.sku}" data-physical-set="${comps.length}" hidden>
            <h2 class="pd__physicalTitle">Or have all ${comps.length} printed and posted</h2>
            <div class="pd__physicalRow">
              <label>Format
                <select data-physical-format aria-label="Print format"></select>
              </label>
              <label>Size
                <select data-physical-size aria-label="Print size"></select>
              </label>
              <label>Deliver to
                <select data-physical-country aria-label="Delivery country">${countryOptions}</select>
              </label>
            </div>
            <label class="pd__promo">Have a code? <input type="text" data-physical-promo placeholder="Promo code" autocomplete="off" maxlength="20" /></label>
            <button type="button" class="btn btn--outline-dark pd__physicalBuy" data-physical-buy>Order the printed set</button>
            <p class="pd__physicalNote">All ${comps.length} prints, printed close to you and posted together &mdash; postage shown at checkout</p>
            <p class="pd__err" data-physical-err role="alert"></p>
          </div>` : ''}
          <p class="pd__guarantee"><strong>Our promise:</strong> if any file isn't right. Wrong size, won't open, anything at all. Tell us and we'll fix it or refund you.
             No argument, no forms.</p>
          <ul class="pd__list">
            <li>${comps.length} high-resolution PNGs (4:5 ratio, ~300 DPI)</li>
            <li>A ready-made gallery wall, designed to hang together</li>
            <li>Instant download. Nothing is posted</li>
          </ul>
          <div class="pd__kind" data-kind-words hidden></div>
${infoBlocks(s, { isSet: true })}
        </div>
      </div>
    </div>
  </main>
${relatedGrid(comps, up)}`;

  fs.writeFileSync(path.join(REPO, 'set', `${slug}.html`),
    head({ title, description: s.description, canonical: url, image: pinImage(`set-${slug}`, img), price: s.price, jsonLd, up }) + body + foot(up, s.sku));
  written++;
}

// --- physical print options (Printify) --------------------------------------
// A browser-safe view of the Printify config: labels, sizes and prices only, never the
// blueprint/provider/variant ids. Written even when empty so the picker can ask for it
// unconditionally and simply render nothing until setup has run.
{
  const formats = Object.entries(PRINTIFY_CONFIG.formats || {}).map(([key, f]) => ({
    key,
    label: f.label || key,
    sizes: (f.sizes || []).filter((s) => s.variantId).map((s) => ({ key: s.key, label: s.label, price: s.price })),
  })).filter((f) => f.sizes.length);

  const configured = !!PRINTIFY_CONFIG.shopId && formats.length > 0;
  // Which art has a Printify product built for it. The picker only offers those. A
  // gallery set qualifies when it is small enough to post and every print in it does:
  // checkout and the webhook already handle a set sku (getSetPrintOption), but the
  // picker never showed on a set page because set skus were missing from this list.
  const availableFor = Object.keys(PRINTIFY_CONFIG.products || {})
    .concat(configured ? data.sets.filter(setCanBePrinted).map((s) => s.sku) : []);

  fs.mkdirSync(path.join(REPO, 'data'), { recursive: true });
  fs.writeFileSync(path.join(REPO, 'data', 'print-options.json'),
    JSON.stringify({ configured, formats, availableFor }));
  console.log(`wrote data/print-options.json (${configured ? `${formats.length} formats, ${availableFor.length} prints` : 'not configured yet. Picker stays hidden'})`);
}

// --- printables: the free library, then the paid books ---------------------
// The free library (scripts/build-printables.mjs → data/free-printables.json) is what
// brings families to the site and gives Pinterest something to pin, so it leads the
// page. The seven paid printables (lib/extras.js) sit underneath as "The bigger books".
// Every free printable also gets its own landing page at printables/<slug>.html: a PDF
// has no Open Graph tags, so the pin needs an HTML page to point at.
const FREE = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'free-printables.json'), 'utf8'));
const freeItems = FREE.items;
const freeCategories = FREE.categories.filter((c) => freeItems.some((i) => i.category === c.key));
const catLabel = (key) => (FREE.categories.find((c) => c.key === key) || {}).label || key;
const fmtBytes = (b) => b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

const printTips = (up) => `
  <aside class="pf-tips" aria-label="Print tips">
    <h3>Print tips</h3>
    <ul>
      <li><strong>A4, 100%.</strong> Every file is A4. In the print dialog choose “Actual size”, not “Fit to page”, so cut lines and cards come out true.</li>
      <li><strong>Paper.</strong> Plain 80 gsm is fine for colouring. Cards, pennants, tags and toppers want 200–250 gsm card so they hold their shape.</li>
      <li><strong>Ink.</strong> Colouring pages are pure black line art and print well in draft mode. Save the good ink for the party sets.</li>
      <li><strong>Trim.</strong> Cut just outside the dotted lines. A ruler and craft knife beats scissors on the straight ones.</li>
      <li><strong>Sharing.</strong> Free for your own family, school bag and party. Please send friends to <a href="${up}printables.html">this page</a> rather than the file; it keeps the library free.</li>
    </ul>
  </aside>`;

const freeCard = (i, up) => `          <article class="pf-card" data-category="${i.category}">
            <a class="pf-card__img" href="${up}printables/${i.slug}.html"><img src="${up}${i.preview.replace(/^\//, '')}" alt="${esc(i.title)}, free printable from Little Poppin" loading="lazy" width="900" height="1273" /></a>
            <div class="pf-card__body">
              <span class="pf-card__cat">${esc(catLabel(i.category))} · ${esc(i.age)}</span>
              <h3><a href="${up}printables/${i.slug}.html">${esc(i.title)}</a></h3>
              <p class="pf-card__desc">${esc(i.description)}</p>
              <a class="btn btn--primary pf-card__dl" href="${up}${i.pdf.replace(/^\//, '')}" download data-pf-download="${i.slug}">Download PDF <span>· ${i.pages} ${i.pages === 1 ? 'page' : 'pages'} · ${fmtBytes(i.bytes)}</span></a>
            </div>
          </article>`;

const pfStyles = `
    .pf { padding: 36px 0 60px; }
    .pf__intro { max-width: 680px; margin: 0 auto 22px; text-align: center; color: var(--mid-grey); font-size: 1.05rem; }
    .pf__chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 0 0 30px; }
    .pf__chip { border: 1px solid var(--light-grey); background: #fff; color: var(--charcoal); border-radius: 999px; padding: 7px 14px; font-family: var(--font-sans); font-size: 0.85rem; cursor: pointer; transition: all var(--transition); }
    .pf__chip:hover { border-color: var(--red); color: var(--red); }
    .pf__chip[aria-pressed="true"] { background: var(--red); border-color: var(--red); color: #fff; }
    .pf__chip small { opacity: 0.7; margin-left: 4px; }
    .pf__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 24px; }
    .pf-card { background: #fff; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); display: flex; flex-direction: column; transition: transform var(--transition), box-shadow var(--transition); }
    .pf-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
    .pf-card[hidden] { display: none; }
    .pf-card__img { display: block; background: var(--light-grey); border-bottom: 1px solid var(--light-grey); }
    .pf-card__img img { width: 100%; aspect-ratio: 1 / 1.414; object-fit: cover; object-position: top; display: block; }
    .pf-card__body { padding: 14px 16px 18px; display: flex; flex-direction: column; flex: 1; }
    .pf-card__cat { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--red); font-weight: 700; margin-bottom: 6px; }
    .pf-card__body h3 { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 600; margin: 0 0 6px; line-height: 1.2; }
    .pf-card__body h3 a { color: var(--charcoal); text-decoration: none; }
    .pf-card__body h3 a:hover { color: var(--red); }
    .pf-card__desc { color: var(--mid-grey); font-size: 0.85rem; line-height: 1.5; margin: 0 0 14px; flex: 1; }
    .pf-card__dl { width: 100%; text-decoration: none; justify-content: center; }
    .pf-card__dl span { font-weight: 400; font-size: 0.72rem; opacity: 0.85; }
    .pf__empty { text-align: center; color: var(--mid-grey); padding: 30px 0; }
    .pf-tips { background: var(--teal-light); border-radius: var(--radius); padding: 24px 28px; margin: 40px auto 0; max-width: 820px; }
    .pf-tips h3 { font-family: var(--font-serif); font-size: 1.4rem; font-weight: 600; margin: 0 0 10px; }
    .pf-tips ul { margin: 0; padding-left: 18px; color: var(--charcoal); font-size: 0.92rem; line-height: 1.6; }
    .pf-tips li { margin-bottom: 6px; }
    .pf-paid { background: var(--cream); padding: 60px 0 70px; }
    .pf-paid__head { text-align: center; max-width: 640px; margin: 0 auto 30px; }
    .pf-paid__head h2 { font-family: var(--font-serif); font-size: 2rem; font-weight: 600; margin: 6px 0 10px; }
    .pf-paid__head p { color: var(--mid-grey); }
    .pf-one { padding: 34px 0 70px; }
    .pf-one__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 46px; align-items: start; }
    @media (max-width: 860px) { .pf-one__grid { grid-template-columns: 1fr; gap: 26px; } }
    .pf-one__art { width: 100%; border-radius: var(--radius); box-shadow: var(--shadow-lg); display: block; background: #fff; }
    .pf-one__body h1 { font-family: var(--font-serif); font-size: 2.3rem; font-weight: 600; margin: 0 0 10px; line-height: 1.15; }
    .pf-one__free { font-family: var(--font-serif); font-size: 1.6rem; color: var(--red); margin: 0 0 6px; }
    .pf-one__free span { font-family: var(--font-sans); font-size: 0.85rem; color: var(--mid-grey); }
    .pf-one__lead { font-size: 1.05rem; color: var(--mid-grey); margin: 0 0 20px; }
    .pf-one__dl { width: 100%; justify-content: center; text-decoration: none; margin: 10px 0 8px; }
    .pf-one__list { list-style: none; padding: 0; margin: 22px 0 0; font-size: 0.92rem; color: var(--mid-grey); }
    .pf-one__list li { padding-left: 22px; position: relative; margin-bottom: 7px; }
    .pf-one__list li::before { content: '✓'; position: absolute; left: 0; color: var(--green); font-weight: 700; }
    .pf-one .pf-tips { margin-top: 26px; padding: 18px 22px; }
    .pf-one .pf-tips h3 { font-size: 1.15rem; }
    .pf-one .pf-tips ul { font-size: 0.86rem; }
    .breadcrumb { font-size: 0.85rem; color: var(--mid-grey); margin-bottom: 18px; }
    .breadcrumb a { color: var(--mid-grey); }
    .breadcrumb a:hover { color: var(--red); }
    .related { background: var(--light-grey); padding: 56px 0; }
    .related h2 { font-family: var(--font-serif); font-size: 1.7rem; text-align: center; margin: 0 0 26px; font-weight: 600; }
    .related__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
    .related__card { background: #fff; border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); display: block; }
    .related__card img { width: 100%; aspect-ratio: 1 / 1.3; object-fit: cover; object-position: top; display: block; }
    .related__card span { display: block; padding: 11px 12px; font-size: 0.9rem; text-align: center; color: var(--charcoal); }`;

// GA4 event on download. No-ops without analytics configured.
const pfDownloadScript = `
  <script>
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-pf-download]');
      if (!a) return;
      try { if (typeof window.gtag === 'function') window.gtag('event', 'file_download', { file_name: a.getAttribute('data-pf-download') + '.pdf', link_url: a.href, content_type: 'free_printable' }); } catch (err) {}
    });
  </script>`;

{
  const extras = Object.values(GENERATED_EXTRAS).filter((e) => e.file);
  const url = `${SITE}/printables.html`;
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Little Poppin Free Printables',
      numberOfItems: freeItems.length,
      itemListElement: freeItems.map((i, n) => ({
        '@type': 'ListItem', position: n + 1,
        item: {
          '@type': 'DigitalDocument', name: i.title, description: i.description, url: `${SITE}/printables/${i.slug}.html`,
          image: SITE + i.og, encodingFormat: 'application/pdf', isAccessibleForFree: true,
          author: { '@type': 'Organization', name: 'Little Poppin' },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: SITE + i.pdf },
        },
      })),
    },
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Little Poppin Printables. The bigger books',
      itemListElement: extras.map((e, i) => ({
        '@type': 'ListItem', position: i + 1,
        item: {
          '@type': 'Product', name: e.name, description: e.description, sku: e.sku,
          ...(e.preview ? { image: SITE + e.preview } : {}),
          brand: { '@type': 'Brand', name: 'Little Poppin' },
          offers: { '@type': 'Offer', price: money(e.price), priceCurrency: 'AUD', url, availability: 'https://schema.org/InStock' },
        },
      })),
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Are the Little Poppin printables really free?',
          acceptedAnswer: { '@type': 'Answer', text: `Yes. Every printable in the free library (${freeItems.length} at the moment) downloads instantly as an A4 PDF with no sign-up and no payment. They are free for personal use: your own family, classroom treat or party.` } },
        { '@type': 'Question', name: 'What format are Little Poppin printables?',
          acceptedAnswer: { '@type': 'Answer', text: 'Every printable is a print-ready PDF sized for A4, so it prints correctly at home or at any print shop. Choose “Actual size” rather than “Fit to page”.' } },
        { '@type': 'Question', name: 'Can I print a printable more than once?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Print as many copies as you like for your own family. The licence is personal use only, so they cannot be resold or shared as files.' } },
        { '@type': 'Question', name: 'What paper should I use for the cards and pennants?',
          acceptedAnswer: { '@type': 'Answer', text: 'White card of 200–250 gsm gives the nicest result. Cut just outside the dotted lines; a paper trimmer makes short work of it.' } },
        { '@type': 'Question', name: 'What is the difference between the free library and the bigger books?',
          acceptedAnswer: { '@type': 'Answer', text: 'The free library is single sheets and small sets. The bigger books are the full twenty-page colouring books, the illustrated milestone cards, the A to Z name banner on artwork, the bookmarks and the twelve-month wall calendar.' } },
      ],
    },
  ];

  const chips = [`<button type="button" class="pf__chip" data-filter="all" aria-pressed="true">All <small>${freeItems.length}</small></button>`]
    .concat(freeCategories.map((c) => `<button type="button" class="pf__chip" data-filter="${c.key}" aria-pressed="false">${esc(c.label)} <small>${freeItems.filter((i) => i.category === c.key).length}</small></button>`))
    .join('\n          ');

  const paidCards = extras.map((e) => `          <article class="print-card">
            ${e.preview ? `<button type="button" class="print-card__img lightbox-open" data-full="${e.preview}" data-title="${esc(e.title)}" aria-label="View ${esc(e.title)} larger"><img src="${e.preview.replace(/^\//, '')}" alt="${esc(e.title)}, printable from Little Poppin" loading="lazy" /></button>` : ''}
            <div class="print-card__body">
              <h3>${esc(e.title)}</h3>
              <p class="print-card__desc">${esc(e.description)}</p>
              <p class="print-card__price">$${(e.price / 100).toFixed(2)} <span>AUD · instant download</span></p>
              <button type="button" data-sku="${e.sku}" class="btn btn--primary print-card__buy">Download. $${(e.price / 100).toFixed(2)}</button>
            </div>
          </article>`).join('\n');

  const page = head({
    title: `${freeItems.length} Free Printables. Colouring Pages, Milestone Cards, Charts & Party Sets | Little Poppin`,
    description: `${freeItems.length} free A4 printables for babies and little ones: colouring pages from the Little Poppin art collection, milestone cards, routine charts, lunchbox notes, party bunting, Christmas and baby shower sets. No sign-up, instant PDF download.`,
    canonical: url,
    image: SITE + freeItems[0].og,
    jsonLd, up: '',
  }).replace('  <style>\n', `  <style>${pfStyles}\n`) + `
  <header class="prints-hero prints-hero--art" style="--hero-art:url('/images/banners/secret-dinosaur-museum.jpg');--hero-art-sm:url('/images/banners/secret-dinosaur-museum-sm.jpg')">
    <div class="container">
      <div class="section-label">Free printables</div>
      <h1>${freeItems.length} Free Printables</h1>
      <p>Colouring pages drawn from our own paintings, milestone cards, routine charts, lunchbox notes,
         party bunting, Christmas and baby shower sets. Every one an A4 PDF. No sign-up, just download and print.</p>
    </div>
  </header>

  <section class="pf" id="free">
    <div class="container">
      <p class="pf__intro">Pick a category, or scroll the lot. Each printable opens on its own page with a bigger preview, or download it straight away.</p>
      <div class="pf__chips" role="group" aria-label="Filter by category">
          ${chips}
      </div>
      <div class="pf__grid" id="pf-grid">
${freeItems.map((i) => freeCard(i, '')).join('\n')}
      </div>
      <p class="pf__empty" id="pf-empty" hidden>Nothing in that category yet.</p>
${printTips('')}
    </div>
  </section>

  <section class="pf-paid" id="books">
    <div class="container">
      <div class="pf-paid__head">
        <div class="section-label">The bigger books</div>
        <h2>When one page isn’t enough</h2>
        <p>Full twenty-page colouring books, illustrated milestone cards, the A to Z name banner on artwork, bookmarks and a twelve-month wall calendar. Instant PDF download, yours to print forever.</p>
      </div>
      <div class="print-grid">
${paidCards}
      </div>
    </div>
  </section>

  <section class="prints-faq">
    <div class="container container--narrow">
      <h2 class="prints-section__title">How it works</h2>
      <div class="faq">
        <details>
          <summary>Are the printables really free?</summary>
          <p>Yes. Everything in the free library downloads instantly as an A4 PDF, no sign-up, no payment. They are free for personal use: your own family, a classroom treat, a party. Please send friends here rather than forwarding the file.</p>
        </details>
        <details>
          <summary>What exactly do I get with the bigger books?</summary>
          <p>A print-ready PDF sized for A4, downloaded instantly after payment. Nothing is posted, so there's no shipping cost or wait.</p>
        </details>
        <details>
          <summary>Can I print it more than once?</summary>
          <p>Yes. Print as many copies as you like for your own family. That's rather the point of a printable. The licence is personal use only, so please don't resell or share the file.</p>
        </details>
        <details>
          <summary>What paper works best?</summary>
          <p>Ordinary printer paper is fine for colouring pages. For cards, pennants, toppers and tags, white card of 200–250&nbsp;gsm gives a much nicer result. Then cut just outside the dotted lines.</p>
        </details>
        <details>
          <summary>Is the calendar for a specific year?</summary>
          <p>No. The day grids are undated on purpose, so the same file works whichever year you print it.</p>
        </details>
      </div>
    </div>
  </section>

  <div class="lightbox" id="lightbox" hidden>
    <button type="button" class="lightbox__close" aria-label="Close">×</button>
    <figure><img src="" alt="" /><figcaption></figcaption></figure>
  </div>
  <script>
    (function () {
      var lb = document.getElementById('lightbox');
      var img = lb.querySelector('img'), cap = lb.querySelector('figcaption');
      function close(){ lb.hidden = true; document.body.style.overflow=''; }
      document.addEventListener('click', function (e) {
        var t = e.target.closest('.lightbox-open');
        if (t) { img.src = t.getAttribute('data-full'); img.alt = t.getAttribute('data-title');
                 cap.textContent = t.getAttribute('data-title'); lb.hidden = false; document.body.style.overflow='hidden'; return; }
        if (!lb.hidden && (e.target === lb || e.target.closest('.lightbox__close'))) close();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    })();
    // Category chips. The hash (#christmas) deep-links a category, so a pin can land on it.
    (function () {
      var chips = document.querySelectorAll('.pf__chip');
      var cards = document.querySelectorAll('.pf-card');
      var empty = document.getElementById('pf-empty');
      function apply(key) {
        var shown = 0;
        cards.forEach(function (c) { var on = key === 'all' || c.getAttribute('data-category') === key; c.hidden = !on; if (on) shown++; });
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === key ? 'true' : 'false'); });
        empty.hidden = shown > 0;
      }
      chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-filter')); if (history.replaceState) history.replaceState(null, '', c.getAttribute('data-filter') === 'all' ? '#free' : '#' + c.getAttribute('data-filter')); }); });
      var h = location.hash.replace('#', '');
      if (h && document.querySelector('.pf__chip[data-filter="' + h + '"]')) apply(h);
    })();
  </script>${pfDownloadScript}
` + foot('');

  fs.writeFileSync(path.join(REPO, 'printables.html'), page);
  console.log(`wrote printables.html (${freeItems.length} free printables + ${extras.length} paid)`);

  // --- one page per free printable ----------------------------------------
  fs.mkdirSync(path.join(REPO, 'printables'), { recursive: true });
  const pUp = '../';
  for (const i of freeItems) {
    const pageUrl = `${SITE}/printables/${i.slug}.html`;
    const related = freeItems.filter((r) => r.category === i.category && r.slug !== i.slug).slice(0, 6);
    const more = related.length < 6 ? freeItems.filter((r) => r.category !== i.category).slice(0, 6 - related.length) : [];
    const ld = [
      {
        '@context': 'https://schema.org', '@type': 'DigitalDocument',
        name: i.title, description: i.description, url: pageUrl, image: SITE + i.og,
        encodingFormat: 'application/pdf', isAccessibleForFree: true, inLanguage: 'en',
        genre: catLabel(i.category), typicalAgeRange: i.age,
        author: { '@type': 'Organization', name: 'Little Poppin', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: 'Little Poppin', url: `${SITE}/` },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: SITE + i.pdf },
        associatedMedia: { '@type': 'MediaObject', contentUrl: SITE + i.pdf, encodingFormat: 'application/pdf', contentSize: fmtBytes(i.bytes) },
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Free printables', item: url },
          { '@type': 'ListItem', position: 3, name: i.title, item: pageUrl },
        ],
      },
    ];
    const html = head({
      title: `${i.title}. Free Printable PDF | Little Poppin`,
      description: `${i.description} Free A4 PDF, ${i.pages} ${i.pages === 1 ? 'page' : 'pages'}, no sign-up. ${catLabel(i.category)} for ${i.age.toLowerCase()}.`,
      canonical: pageUrl, image: SITE + i.og, jsonLd: ld, up: pUp,
    }).replace('  <style>\n', `  <style>${pfStyles}\n`) + `
  <main class="pf-one">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${pUp}index.html">Home</a> › <a href="${pUp}printables.html">Free printables</a> › <a href="${pUp}printables.html#${i.category}">${esc(catLabel(i.category))}</a> › ${esc(i.title)}</nav>
      <div class="pf-one__grid">
        <div>
          <a href="${pUp}${i.pdf.replace(/^\//, '')}" download data-pf-download="${i.slug}"><img class="pf-one__art" src="${pUp}${i.preview.replace(/^\//, '')}" alt="${esc(i.title)}, free printable PDF preview" width="900" height="1273" /></a>
        </div>
        <div class="pf-one__body">
          <span class="pf-card__cat">${esc(catLabel(i.category))} · ${esc(i.age)}</span>
          <h1>${esc(i.title)}</h1>
          <p class="pf-one__free">Free <span>· A4 PDF · ${i.pages} ${i.pages === 1 ? 'page' : 'pages'} · ${fmtBytes(i.bytes)}</span></p>
          <p class="pf-one__lead">${esc(i.description)}</p>
          <a class="btn btn--primary pf-one__dl" href="${pUp}${i.pdf.replace(/^\//, '')}" download data-pf-download="${i.slug}">Download the PDF</a>
          <a class="pd__alt" href="${pUp}${i.pdf.replace(/^\//, '')}" target="_blank" rel="noopener">Open in a new tab instead</a>
          <ul class="pf-one__list">
            <li>Original Little Poppin design. Nothing borrowed, nothing stock.</li>
            <li>Sized for A4. Print at “Actual size” for true cut lines.</li>
            <li>Free for personal use. Print as many as your family needs.</li>
            <li>No email, no account. The link above is the file.</li>
          </ul>
${printTips(pUp)}
        </div>
      </div>
    </div>
  </main>
  <section class="related">
    <div class="container">
      <h2>More to print</h2>
      <div class="related__grid">
${[...related, ...more].map((r) => `        <a class="related__card" href="${pUp}printables/${r.slug}.html">
          <img src="${pUp}${r.preview.replace(/^\//, '')}" alt="${esc(r.title)}, free printable" loading="lazy" />
          <span>${esc(r.title)}</span>
        </a>`).join('\n')}
      </div>
      <p style="text-align:center;margin-top:26px"><a class="btn btn--outline-dark" href="${pUp}printables.html">All ${freeItems.length} free printables</a></p>
    </div>
  </section>${pfDownloadScript}
` + foot(pUp);
    fs.writeFileSync(path.join(REPO, 'printables', `${i.slug}.html`), html);
  }
  console.log(`wrote ${freeItems.length} free printable pages`);
}

// --- guides -----------------------------------------------------------------
// Product pages can only rank for their own design. These answer the questions people
// search on the way to buying ("how high to hang nursery art") and link into the shop.
{
  fs.mkdirSync(path.join(REPO, 'guides'), { recursive: true });
  const gUp = '../';

  for (const g of GUIDES) {
    const url = `${SITE}/guides/${g.slug}.html`;
    const jsonLd = [
      {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: g.title, description: g.description,
        image: SITE + g.image, datePublished: g.updated, dateModified: g.updated,
        author: { '@type': 'Organization', name: 'Little Poppin' },
        publisher: { '@type': 'Organization', name: 'Little Poppin', logo: { '@type': 'ImageObject', url: `${SITE}/images/logo.png` } },
        mainEntityOfPage: url,
      },
      {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE}/guides.html` },
          { '@type': 'ListItem', position: 3, name: g.title, item: url },
        ],
      },
    ];

    const body = `
  <main class="guide">
    <div class="container container--narrow">
      <p class="breadcrumb"><a href="${gUp}index.html">Home</a> › <a href="${gUp}guides.html">Guides</a> › ${esc(g.title)}</p>
      <h1>${esc(g.title)}</h1>
      <p class="guide__intro">${esc(g.intro)}</p>
      <img class="guide__hero" src="${gUp}${g.image.replace(/^\//, '')}" alt="${esc(g.imageAlt)}" />
${g.sections.map((sec) => `      <h2>${esc(sec.h)}</h2>
${sec.p.map((para) => `      <p>${para}</p>`).join('\n')}`).join('\n\n')}

      <div class="guide__cta">
        <p>${esc(g.cta.text)}</p>
        <a class="btn btn--primary" href="${gUp}${g.cta.href}">${esc(g.cta.label)}</a>
      </div>

      <h2>Common questions</h2>
      <div class="faq">
${g.faq.map(([q, a]) => `        <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
      </div>
    </div>
  </main>`;

    fs.writeFileSync(path.join(REPO, 'guides', `${g.slug}.html`),
      head({ title: `${g.title} | Little Poppin`, description: g.description, canonical: url,
             image: SITE + g.image, jsonLd, up: gUp }) + body + foot(gUp));
  }

  // Index page
  const cards = GUIDES.map((g) => `          <a class="lp-way" href="guides/${g.slug}.html">
            <div class="lp-way__img"><img src="${g.image.replace(/^\//, '')}" alt="${esc(g.imageAlt)}" loading="lazy" /></div>
            <div class="lp-way__body">
              <h3>${esc(g.title)}</h3>
              <p>${esc(g.description)}</p>
              <span class="lp-way__go">Read the guide →</span>
            </div>
          </a>`).join('\n');

  const indexLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Little Poppin Guides',
    itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/guides/${g.slug}.html`, name: g.title })),
  };

  fs.writeFileSync(path.join(REPO, 'guides.html'),
    head({ title: 'Guides. Styling, Sizing &amp; Printing Nursery Art | Little Poppin',
           description: 'Practical guides to nursery wall art: how to style a gallery wall, what size print to choose, and how to print a digital download anywtralia.',
           canonical: `${SITE}/guides.html`, image: SITE + GUIDES[0].image, jsonLd: [indexLd], up: '' }) + `
  <header class="prints-hero prints-hero--art" style="--hero-art:url('/images/banners/enchanted-toyshop.jpg');--hero-art-sm:url('/images/banners/enchanted-toyshop-sm.jpg')">
    <div class="container">
      <div class="section-label">Guides</div>
      <h1>Getting It On the Wall</h1>
      <p>Practical answers to the questions that come up between choosing a print and hanging it.</p>
    </div>
  </header>
  <section class="lp-ways">
    <div class="container">
      <div class="lp-ways__grid">
${cards}
      </div>
    </div>
  </section>` + foot(''));

  console.log(`wrote ${GUIDES.length} guides + guides.html`);
}

// --- sitemap ----------------------------------------------------------------
const staticPages = [
  ['/', '1.0', 'monthly'],
  ['/prints.html', '0.9', 'weekly'],
  ['/personalise.html', '0.9', 'monthly'],
  ['/printclub.html', '0.8', 'monthly'],
  ['/printables.html', '0.9', 'monthly'],
  ['/guides.html', '0.7', 'monthly'],
  ['/custom.html', '0.8', 'monthly'],
  ['/pink-swaddle.html', '0.8', 'monthly'],
  ['/green-swaddle.html', '0.8', 'monthly'],
  ['/shipping.html', '0.3', 'yearly'],
  ['/refunds.html', '0.3', 'yearly'],
  ['/privacy.html', '0.3', 'yearly'],
  ['/terms.html', '0.3', 'yearly'],
];
const urls = staticPages
  .map(([loc, pr, cf]) => ({ loc: SITE + loc, pr, cf }))
  .concat(data.prints.map((p) => ({ loc: `${SITE}/print/${slugOf(p.sku)}.html`, pr: '0.7', cf: 'monthly' })))
  .concat(data.sets.map((s) => ({ loc: `${SITE}/set/${slugOf(s.sku)}.html`, pr: '0.7', cf: 'monthly' })))
  .concat(GUIDES.map((g) => ({ loc: `${SITE}/guides/${g.slug}.html`, pr: '0.6', cf: 'yearly' })))
  // Free printables library (scripts/build-printables.mjs writes the manifest). Pinterest pins land on these pages.
  .concat(freeItems.map((i) => ({ loc: `${SITE}/printables/${i.slug}.html`, pr: '0.7', cf: 'monthly' })))
  // Cards and invitations (scripts/build-keepsakes.mjs writes the list; galleries rank above the 360 editor pages).
  .concat((fs.existsSync(path.join(REPO, 'data', 'keepsakes-urls.json')) ? JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'keepsakes-urls.json'), 'utf8')) : [])
    .map((f) => ({ loc: `${SITE}/${f}`, pr: /^(cards|invitations)\.html$/.test(f) ? '0.9' : /^(cards|invitations)\//.test(f) ? '0.8' : '0.6', cf: 'monthly' })));

fs.writeFileSync(path.join(REPO, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<!-- AUTO-GENERATED by scripts/build-product-pages.mjs. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.pr}</priority>
    <changefreq>${u.cf}</changefreq>
  </url>`).join('\n')}
</urlset>
`);

console.log(`wrote ${written} product pages (${data.prints.length} prints, ${data.sets.length} sets)`);
console.log(`wrote sitemap.xml (${urls.length} URLs)`);
