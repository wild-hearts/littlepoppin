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
        <p>&copy; 2025 Little Poppin. All rights reserved. Canberra, ACT, Australia.</p>
      </div>
    </div>
  </footer>
  <script src="${up}store.js" defer></script>
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
        <div><img class="pd__art" src="${up}${p.preview.replace(/^\//, '')}" alt="${esc(p.title)} — magical art print by Little Poppin" /></div>
        <div class="pd__body">
          <h1>${esc(p.title)}</h1>
          <p class="pd__lead">${esc(p.description)}</p>
          <p class="pd__price">$${(p.price / 100).toFixed(0)} <span>AUD · instant download</span></p>
          <div class="pd__buy">
            <button type="button" data-sku="${p.sku}" class="btn btn--primary btn--lg">Download Print — $${(p.price / 100).toFixed(0)}</button>
          </div>
          <a class="pd__alt" href="${up}personalise.html?print=${encodeURIComponent(p.sku)}">✨ Or add their name — personalise this print for $19</a>
          <ul class="pd__list">
            <li>High-resolution PNG (4:5 ratio, ~300 DPI)</li>
            <li>Prints beautifully at 4×5&Prime;, 8×10&Prime; and 16×20&Prime;</li>
            <li>Instant download — nothing is posted</li>
            <li>Personal-use licence for your home, nursery or as a gift</li>
            <li>🌿 A portion of every sale supports children's charities</li>
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
        <div><img class="pd__art" src="${up}${s.preview.replace(/^\//, '')}" alt="${esc(s.title)} — set of three magical art prints" /></div>
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
          <ul class="pd__list">
            <li>${comps.length} high-resolution PNGs (4:5 ratio, ~300 DPI)</li>
            <li>A ready-made gallery wall, designed to hang together</li>
            <li>Instant download — nothing is posted</li>
            <li>🌿 A portion of every sale supports children's charities</li>
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
          acceptedAnswer: { '@type': 'Answer', text: 'Every printable is a print-ready PDF sized for A4, so it prints correctly at home, at Officeworks, or at any print shop. Nothing is posted — the file downloads instantly after payment.' } },
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
      <p class="prints-hero__note">🌿 A portion of every sale supports children's charities worldwide.</p>
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

// --- sitemap ----------------------------------------------------------------
const staticPages = [
  ['/', '1.0', 'monthly'],
  ['/prints.html', '0.9', 'weekly'],
  ['/personalise.html', '0.9', 'monthly'],
  ['/printclub.html', '0.8', 'monthly'],
  ['/printables.html', '0.9', 'monthly'],
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
  .concat(data.sets.map((s) => ({ loc: `${SITE}/set/${slugOf(s.sku)}.html`, pr: '0.7', cf: 'monthly' })));

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
