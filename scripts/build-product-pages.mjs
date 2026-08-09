// build-product-pages.mjs — one indexable page per print and per gallery set.
//
// WHY: prints.html holds ~97 products on a single URL, so Google only has one page to
// rank. A page per product gives each design its own shot at long-tail search
// ("capricorn constellation nursery print"), its own Product rich result, and a natural
// landing page to send ads or Etsy traffic to.
//
// Input:  data/prints.json (written by build-prints-shop.mjs)
// Output: print/<slug>.html, set/<slug>.html, and a regenerated sitemap.xml
//
// Re-runnable and safe: it only writes into print/ and set/, plus sitemap.xml.

import fs from 'node:fs';
import path from 'node:path';
import { GENERATED_EXTRAS } from '../lib/extras-products.generated.js';
import { PRINTIFY_CONFIG } from '../lib/printify-config.generated.js';
import { GUIDES } from './guides-content.mjs';

import { PRINT_COUNTRIES } from '../lib/products.js';

// Destination is chosen BEFORE checkout because Stripe fixes shipping rates when the
// session is created — it cannot re-price after the buyer types an address. The list is
// exactly the countries PRINT_SHIPPING covers, so every option has a real rate behind it.
const countryName = (() => {
  const dn = new Intl.DisplayNames(['en'], { type: 'region' });
  return (c) => { try { return dn.of(c) || c; } catch { return c; } };
})();
const countryOptions = ['AU', 'US', 'GB', 'CA', 'NZ']
  .filter((c) => PRINT_COUNTRIES.includes(c))
  .concat(PRINT_COUNTRIES.filter((c) => !['AU','US','GB','CA','NZ'].includes(c))
    .sort((a, b) => countryName(a).localeCompare(countryName(b))))
  .map((c) => `<option value="${c}">${countryName(c)}</option>`).join('');

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const SITE = 'https://www.littlepoppin.com';

const data = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'prints.json'), 'utf8'));
const sectionTitle = Object.fromEntries(data.sections.map((s) => [s.id, s.nav]));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugOf = (sku) => sku.replace(/^(print|set)-/, '');
const money = (cents) => (cents / 100).toFixed(2);

// Shared chrome so product pages look and navigate exactly like the rest of the site.
// `up` is the relative prefix back to the site root (product pages live one level down).
const head = ({ title, description, canonical, image, jsonLd, up }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Little Poppin" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${image}" />
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
      <a href="${up}index.html" class="nav__logo"><img src="${up}images/logo.jpg" alt="Little Poppin" /></a>
      <button class="nav__toggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav__links">
        <li><a href="${up}index.html#products">Swaddles</a></li>
        <li><a href="${up}prints.html">Art Prints</a></li>
        <li><a href="${up}personalise.html">Personalise</a></li>
        <li><a href="${up}printclub.html">Print Club</a></li>
        <li><a href="${up}printables.html">Printables</a></li>
        <li><a href="${up}guides.html">Guides</a></li>
        <li><a href="${up}custom.html">Made for You</a></li>
        <li><a href="${up}index.html#contact">Contact</a></li>
      </ul>
    </div>
  </nav>
`;

const foot = (up) => `
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
  <script src="${up}physical.js" defer></script>
</body>
</html>
`;

const relatedGrid = (items, up) => !items.length ? '' : `
  <section class="related">
    <div class="container">
      <h2>You might also love</h2>
      <div class="related__grid">
${items.map((r) => `        <a class="related__card" href="${up}print/${slugOf(r.sku)}.html">
          <img src="${up}${r.preview.replace(/^\//, '')}" alt="${esc(r.title)} — magical art print" loading="lazy" />
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
  const title = `${p.title} — ${sectionName} Print | Little Poppin`;

  // Related: the next four prints from the same collection, wrapping around.
  const pool = data.prints.filter((x) => x.section === p.section && x.available);
  const at = pool.findIndex((x) => x.sku === p.sku);
  const related = pool.length > 1
    ? Array.from({ length: Math.min(4, pool.length - 1) }, (_, i) => pool[(at + 1 + i) % pool.length])
    : [];

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Product',
      name: `${p.title} — Art Print`, description: p.description, image: img, sku: p.sku,
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
          <img class="pd__art" src="${up}${p.preview.replace(/^\//, '')}" alt="${esc(p.title)} — magical art print by Little Poppin" />
          <img class="pd__mockup" src="${up}images/mockups/${slug}.jpg" loading="lazy"
               alt="${esc(p.title)} shown framed on a wall" />
          <p class="pd__mockupNote">Shown framed — frame not included with the digital download.</p>
        </div>
        <div class="pd__body">
          <h1>${esc(p.title)}</h1>
          <p class="pd__lead">${esc(p.description)}</p>
          <p class="pd__price">$${(p.price / 100).toFixed(0)} <span>AUD · instant download</span></p>
          <div class="pd__buy">
            <button type="button" data-sku="${p.sku}" class="btn btn--primary btn--lg">Download Print — $${(p.price / 100).toFixed(0)}</button>
          </div>
          <a class="pd__alt" href="${up}personalise.html?print=${encodeURIComponent(p.sku)}">✨ Or add their name — personalise this print for $19</a>

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
            <button type="button" class="btn btn--outline-dark pd__physicalBuy" data-physical-buy>Order a printed copy</button>
            <p class="pd__physicalNote">Printed close to you and posted &mdash; postage shown at checkout</p>
            <p class="pd__err" data-physical-err role="alert"></p>
          </div>
          <p class="pd__guarantee"><strong>Our promise:</strong> if your file isn't right —
             wrong size, won't open, anything at all — tell us and we'll fix it or refund you.
             No argument, no forms.</p>
          <ul class="pd__list">
            <li>High-resolution PNG (4:5 ratio, ~300 DPI)</li>
            <li>Prints beautifully at 4×5&Prime;, 8×10&Prime; and 16×20&Prime;</li>
            <li>Instant download — nothing is posted</li>
            <li>Personal-use licence for your home, nursery or as a gift</li>
          </ul>
        </div>
      </div>
    </div>
  </main>
${relatedGrid(related, up)}`;

  fs.writeFileSync(path.join(REPO, 'print', `${slug}.html`),
    head({ title, description: p.description, canonical: url, image: img, jsonLd, up }) + body + foot(up));
  written++;
}

// --- gallery sets -----------------------------------------------------------
const bySku = Object.fromEntries(data.prints.map((p) => [p.sku, p]));

for (const s of data.sets) {
  const slug = slugOf(s.sku);
  const url = `${SITE}/set/${slug}.html`;
  const img = SITE + s.preview;
  const title = `${s.title} — Set of 3 Art Prints | Little Poppin`;
  const comps = s.items.map((sku) => bySku[sku]).filter(Boolean);

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Product',
      name: `${s.title} — 3 Digital Prints`, description: s.description, image: img, sku: s.sku,
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
          <img class="pd__art" src="${up}${s.preview.replace(/^\//, '')}" alt="${esc(s.title)} — set of magical art prints" />
          <img class="pd__mockup" src="${up}images/mockups/${s.sku}.jpg" loading="lazy"
               alt="${esc(s.title)} shown as a framed gallery wall" />
          <p class="pd__mockupNote">Shown framed — frames not included with the digital download.</p>
        </div>
        <div class="pd__body">
          <h1>${esc(s.title)}</h1>
          <p class="pd__lead">${esc(s.description)}</p>
          <p class="pd__price">$${(s.price / 100).toFixed(0)} <span>AUD · ${comps.length} prints · instant download${saving > 0 ? ` · save $${(saving / 100).toFixed(0)}` : ''}</span></p>
          <div class="pd__buy">
            <button type="button" data-sku="${s.sku}" class="btn btn--primary btn--lg">Download Set — $${(s.price / 100).toFixed(0)}</button>
          </div>
          <ul class="pd__sets">
${comps.map((c) => `            <li><a href="${up}print/${slugOf(c.sku)}.html">${esc(c.title)}</a></li>`).join('\n')}
          </ul>
          <p class="pd__guarantee"><strong>Our promise:</strong> if any file isn't right —
             wrong size, won't open, anything at all — tell us and we'll fix it or refund you.
             No argument, no forms.</p>
          <ul class="pd__list">
            <li>${comps.length} high-resolution PNGs (4:5 ratio, ~300 DPI)</li>
            <li>A ready-made gallery wall, designed to hang together</li>
            <li>Instant download — nothing is posted</li>
          </ul>
        </div>
      </div>
    </div>
  </main>
${relatedGrid(comps, up)}`;

  fs.writeFileSync(path.join(REPO, 'set', `${slug}.html`),
    head({ title, description: s.description, canonical: url, image: img, jsonLd, up }) + body + foot(up));
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
  // Which art has a Printify product built for it — the picker only offers those.
  const availableFor = Object.keys(PRINTIFY_CONFIG.products || {});

  fs.mkdirSync(path.join(REPO, 'data'), { recursive: true });
  fs.writeFileSync(path.join(REPO, 'data', 'print-options.json'),
    JSON.stringify({ configured, formats, availableFor }));
  console.log(`wrote data/print-options.json (${configured ? `${formats.length} formats, ${availableFor.length} prints` : 'not configured yet — picker stays hidden'})`);
}

// --- printables shop page ---------------------------------------------------
// The printable ranges (colouring books, milestone cards, calendar) are a distinct
// product family from the wall art, so they get their own page rather than another
// section bolted onto an already-long prints.html.
{
  const extras = Object.values(GENERATED_EXTRAS).filter((e) => e.file);
  const url = `${SITE}/printables.html`;
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Little Poppin Printables',
      itemListElement: extras.map((e, i) => ({
        '@type': 'ListItem', position: i + 1,
        item: {
          '@type': 'Product', name: e.name, description: e.description, sku: e.sku,
          ...(e.preview ? { image: SITE + e.preview } : {}),
          brand: { '@type': 'Brand', name: 'Little Poppin' },
          offers: {
            '@type': 'Offer', price: money(e.price), priceCurrency: 'AUD', url,
            availability: 'https://schema.org/InStock',
          },
        },
      })),
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'What format are Little Poppin printables?',
          acceptedAnswer: { '@type': 'Answer', text: 'Every printable is a print-ready PDF sized for A4, so it prints correctly at home, at a print shop, or at any print shop. Nothing is posted — the file downloads instantly after payment.' } },
        { '@type': 'Question', name: 'Can I print a colouring book more than once?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes. Print as many copies as you like for your own family — that is the point of a printable. The licence is personal use only, so they cannot be resold or shared.' } },
        { '@type': 'Question', name: 'What paper should I use for the milestone cards?',
          acceptedAnswer: { '@type': 'Answer', text: 'White card of 200–300 gsm gives the nicest result. Cut along the outside of each square; a paper trimmer makes short work of it.' } },
        { '@type': 'Question', name: 'Is the wall calendar dated to a particular year?',
          acceptedAnswer: { '@type': 'Answer', text: 'No — the day grids are undated on purpose, so the same file works whichever year you print it.' } },
      ],
    },
  ];

  const cards = extras.map((e) => `          <article class="print-card">
            ${e.preview ? `<button type="button" class="print-card__img lightbox-open" data-full="${e.preview}" data-title="${esc(e.title)}" aria-label="View ${esc(e.title)} larger"><img src="${e.preview.replace(/^\//, '')}" alt="${esc(e.title)} — printable from Little Poppin" loading="lazy" /></button>` : ''}
            <div class="print-card__body">
              <h3>${esc(e.title)}</h3>
              <p class="print-card__desc">${esc(e.description)}</p>
              <p class="print-card__price">$${(e.price / 100).toFixed(2)} <span>AUD · instant download</span></p>
              <button type="button" data-sku="${e.sku}" class="btn btn--primary print-card__buy">Download — $${(e.price / 100).toFixed(2)}</button>
            </div>
          </article>`).join('\n');

  const page = head({
    title: 'Printables — Colouring Books, Milestone Cards & Calendar | Little Poppin',
    description: 'Printable colouring books, baby milestone cards and a magical wall calendar — all drawn from the Little Poppin art collection. Instant PDF download, print at home as often as you like.',
    canonical: url,
    image: extras[0]?.preview ? SITE + extras[0].preview : `${SITE}/images/prints/05-sleepy-moon-and-stars.jpg`,
    jsonLd, up: '',
  }) + `
  <header class="prints-hero">
    <div class="container">
      <div class="section-label">Printables</div>
      <h1>More Than Wall Art</h1>
      <p>Colouring books, milestone cards and a wall calendar — all drawn from the same
         magical collection. Print them at home, as many times as you like.</p>
    </div>
  </header>

    <section class="prints" id="printables">
      <div class="container">
        <div class="print-grid">
${cards}
        </div>
      </div>
    </section>

  <section class="prints-faq">
    <div class="container container--narrow">
      <h2 class="prints-section__title">How it works</h2>
      <div class="faq">
        <details>
          <summary>What exactly do I get?</summary>
          <p>A print-ready PDF sized for A4, downloaded instantly after payment. Nothing is posted, so there's no shipping cost or wait.</p>
        </details>
        <details>
          <summary>Can I print it more than once?</summary>
          <p>Yes — print as many copies as you like for your own family. That's rather the point of a printable. The licence is personal use only, so please don't resell or share the file.</p>
        </details>
        <details>
          <summary>What paper works best?</summary>
          <p>Ordinary printer paper is fine for colouring pages. For the milestone cards, white card of 200–300&nbsp;gsm gives a much nicer result — then just cut along the outside of each square.</p>
        </details>
        <details>
          <summary>Is the calendar for a specific year?</summary>
          <p>No — the day grids are undated on purpose, so the same file works whichever year you print it.</p>
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
  </script>
` + foot('');

  fs.writeFileSync(path.join(REPO, 'printables.html'), page);
  console.log(`wrote printables.html (${extras.length} printable products)`);
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
        publisher: { '@type': 'Organization', name: 'Little Poppin', logo: { '@type': 'ImageObject', url: `${SITE}/images/logo.jpg` } },
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
    head({ title: 'Guides — Styling, Sizing &amp; Printing Nursery Art | Little Poppin',
           description: 'Practical guides to nursery wall art: how to style a gallery wall, what size print to choose, and how to print a digital download anywtralia.',
           canonical: `${SITE}/guides.html`, image: SITE + GUIDES[0].image, jsonLd: [indexLd], up: '' }) + `
  <header class="prints-hero">
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
  .concat(GUIDES.map((g) => ({ loc: `${SITE}/guides/${g.slug}.html`, pr: '0.6', cf: 'yearly' })));

fs.writeFileSync(path.join(REPO, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<!-- AUTO-GENERATED by scripts/build-product-pages.mjs — do not edit by hand. -->
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
