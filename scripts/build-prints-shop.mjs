// build-prints-shop.mjs — generate the Little Poppin prints shop from the art library.
// Sections let different collections appear as their own shop categories.
// Outputs: web previews (images/prints/*.jpg), lib/digital-products.generated.js,
// and prints.html (with jump-nav, lightbox, FAQ, JSON-LD). Re-runnable: skips existing previews.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PRINT_META } from '../lib/print-meta.js';

const REPO = '/Users/naomishiels/Downloads/skills/littlepoppin';
const SRC = path.join(os.homedir(), 'Downloads', 'LittlePoppin-Designs');
const OUT_IMG = path.join(REPO, 'images', 'prints');
const SITE = 'https://www.littlepoppin.com';

// Shop sections (collection-04 Mystic is intentionally excluded — own brand).
const SECTIONS = [
  { id: 'nursery', title: 'Nursery Art Prints', nav: 'Nursery',
    blurb: 'Dreamy, magical nursery art — delivered instantly, ready to print and frame.',
    colls: ['collection-01', 'collection-02', 'collection-03', 'collection-08'], price: 1200 },
  { id: 'zodiac', title: '⭐ Little Zodiac', nav: 'Zodiac',
    blurb: 'A magical print for every star sign — the personalised gift for every new arrival.',
    colls: ['collection-07'], price: 1200 },
  { id: 'academia', title: '✨ Magical Academia', nav: 'Academia',
    blurb: 'Enchanted, candlelit, wizarding-inspired wall art for magic lovers of every age.',
    colls: ['collection-05', 'collection-09'], price: 1200 },
  { id: 'festive', title: '🎄 Festive Magic', nav: 'Festive',
    blurb: 'Enchanted Christmas prints — glowing trees, sleepy reindeer and candlelit windows.',
    colls: ['collection-06', 'collection-10'], price: 1200 },
];

// Curated gallery sets — 3 matching prints for $30 (save $6 vs 3 × $12).
const SETS = [
  { sku: 'set-sweet-dreams', title: 'Sweet Dreams Set',
    description: 'Three sleepy friends — Sleepy Bunny, Dreamy Bear Cub and Sleepy Lamb — a ready-made gallery wall of pure bedtime calm.',
    items: ['print-sleepy-bunny', 'print-dreamy-bear-cub', 'print-sleepy-lamb-on-a-cloud'], price: 3000 },
  { sku: 'set-night-sky', title: 'Night Sky Set',
    description: 'Sleepy Moon & Stars, Cloud Dreams and Star Catcher — a celestial trio for little stargazers.',
    items: ['print-sleepy-moon-and-stars', 'print-cloud-dreams', 'print-star-catcher'], price: 3000 },
  { sku: 'set-enchanted-adventure', title: 'Enchanted Adventure Set',
    description: 'Unicorn Dreams, the Dream Castle and a friendly Baby Dragon — a fairytale wall in three prints.',
    items: ['print-unicorn-dreams', 'print-dream-castle-in-the-clouds', 'print-baby-dragon'], price: 3000 },
  { sku: 'set-magical-academia', title: 'Magical Academia Set',
    description: 'The Enchanted Library, Floating Candles and Owl Post — the wizarding study wall, complete.',
    items: ['print-the-enchanted-library', 'print-floating-candles', 'print-owl-post'], price: 3000 },
];

fs.mkdirSync(OUT_IMG, { recursive: true });
const titleCase = s => s.replace(/^\d+-/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const all = [];
const sectionCards = [];
const navLinks = [{ id: 'sets', nav: 'Gallery Sets' }];
for (const sec of SECTIONS) {
  const items = [];
  for (const c of sec.colls) {
    const dir = path.join(SRC, c);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.png')).sort()) {
      const base = f.replace(/\.png$/, '');
      const outName = base + '.jpg';
      const outPath = path.join(OUT_IMG, outName);
      if (!fs.existsSync(outPath)) {
        execFileSync('magick', [path.join(dir, f), '-resize', '1000x', '-quality', '82', outPath]);
      }
      const sku = 'print-' + base.replace(/^\d+-/, '');
      const meta = PRINT_META[sku] || {};
      const title = meta.title || titleCase(base);
      const description = meta.description || 'High-resolution digital art print (4:5). Instant download for personal printing.';
      items.push({ sku, title, name: `${title} — Art Print`, description, price: sec.price, preview: `/images/prints/${outName}` });
      process.stdout.write('.');
    }
  }
  if (!items.length) continue;
  all.push(...items);
  navLinks.push({ id: sec.id, nav: sec.nav });
  const cards = items.map(it => `          <article class="print-card">
            <button type="button" class="print-card__img lightbox-open" data-full="${it.preview}" data-title="${it.title}" aria-label="View ${it.title} larger"><img src="${it.preview}" alt="${it.title} — magical art print by Little Poppin" loading="lazy" /></button>
            <div class="print-card__body">
              <h3>${it.title}</h3>
              <p class="print-card__desc">${it.description}</p>
              <p class="print-card__price">$${(it.price / 100).toFixed(0)} <span>AUD · instant download</span></p>
              <button type="button" data-sku="${it.sku}" class="btn btn--primary print-card__buy">Download Print — $${(it.price / 100).toFixed(0)}</button>
            </div>
          </article>`).join('\n');
  const finder = sec.id === 'zodiac' ? `
        <div class="sign-finder">
          <label for="signDate">When was (or is) your little one due? 🌟</label>
          <div class="sign-finder__row">
            <input type="date" id="signDate" aria-label="Baby's birthday" />
            <button type="button" class="btn btn--primary" id="signGo">Find their star sign</button>
          </div>
        </div>` : '';
  sectionCards.push(`    <section class="prints" id="${sec.id}">
      <div class="container">
        <h2 class="prints-section__title">${sec.title}</h2>
        <p class="prints-section__blurb">${sec.blurb}</p>${finder}
        <div class="print-grid">
${cards}
        </div>
      </div>
    </section>`);
}
console.log(`\n${all.length} prints across ${SECTIONS.length} sections.`);

// --- gallery sets: composite previews + cards ---
const bySku = Object.fromEntries(all.map(it => [it.sku, it]));
const setsDir = path.join(OUT_IMG, 'sets');
fs.mkdirSync(setsDir, { recursive: true });
const setItems = [];
for (const s of SETS) {
  const comps = s.items.map(sku => bySku[sku]).filter(Boolean);
  if (comps.length !== s.items.length) { console.log(`! skipping ${s.sku} — missing component(s)`); continue; }
  const compositePath = path.join(setsDir, `${s.sku}.jpg`);
  if (!fs.existsSync(compositePath)) {
    execFileSync('magick', [
      ...comps.map(c => path.join(REPO, c.preview.slice(1))),
      '-resize', 'x600', '-background', 'white', '+smush', '16', compositePath]);
  }
  setItems.push({ ...s, name: `${s.title} — 3 Digital Prints`, preview: `/images/prints/sets/${s.sku}.jpg` });
  process.stdout.write('+');
}
const setCards = setItems.map(it => `          <article class="print-card print-card--set">
            <button type="button" class="print-card__img print-card__img--set lightbox-open" data-full="${it.preview}" data-title="${it.title}" aria-label="View ${it.title} larger"><img src="${it.preview}" alt="${it.title} — gallery set of three magical art prints" loading="lazy" /></button>
            <div class="print-card__body">
              <span class="print-card__badge-save">Save $6</span>
              <h3>${it.title}</h3>
              <p class="print-card__desc">${it.description}</p>
              <p class="print-card__price">$${(it.price / 100).toFixed(0)} <span>AUD · 3 prints · instant download</span></p>
              <button type="button" data-sku="${it.sku}" class="btn btn--primary print-card__buy">Download Set — $${(it.price / 100).toFixed(0)}</button>
            </div>
          </article>`).join('\n');
const setsSection = setItems.length ? `    <section class="prints prints--sets" id="sets">
      <div class="container">
        <h2 class="prints-section__title">Gallery Sets</h2>
        <p class="prints-section__blurb">Three matching prints, one ready-made gallery wall — $30 the set (worth $36).</p>
        <div class="print-grid print-grid--sets">
${setCards}
        </div>
      </div>
    </section>` : '';
console.log(` ${setItems.length} gallery sets.`);

// --- catalogue ---
const entries = all.map(it =>
  `  '${it.sku}': { sku: '${it.sku}', name: ${JSON.stringify(it.name)}, description: ${JSON.stringify(it.description)}, price: ${it.price}, preview: '${it.preview}', file: null },`
).concat(setItems.map(it =>
  `  '${it.sku}': { sku: '${it.sku}', name: ${JSON.stringify(it.name)}, description: ${JSON.stringify(it.description)}, price: ${it.price}, preview: '${it.preview}', items: ${JSON.stringify(it.items)}, file: null },`
)).join('\n');
fs.writeFileSync(path.join(REPO, 'lib', 'digital-products.generated.js'),
  `// AUTO-GENERATED by build-prints-shop.mjs — do not edit by hand.
// 'file' is null until the high-res original is uploaded to Vercel Blob (scripts/publish-prints.mjs).
// Checkout is blocked while file is null, so nothing sells without a deliverable.
export const GENERATED_DIGITAL_PRODUCTS = {
${entries}
};
`);
console.log('wrote lib/digital-products.generated.js');

// --- JSON-LD structured data (SEO rich results) ---
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Little Poppin Art Prints',
  itemListElement: all.concat(setItems).map((it, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: {
      '@type': 'Product', name: it.name, description: it.description,
      image: SITE + it.preview, brand: { '@type': 'Brand', name: 'Little Poppin' },
      offers: { '@type': 'Offer', price: (it.price / 100).toFixed(2), priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: SITE + '/prints.html' },
    },
  })),
});

// --- FAQPage structured data (AEO: answer engines read these Q&As directly) ---
const faqLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What do I get when I buy a Little Poppin art print?',
      acceptedAnswer: { '@type': 'Answer', text: 'A high-resolution digital file (4:5 ratio, around 300 DPI) delivered instantly — a download button appears the moment payment completes, and the link is also emailed. Nothing is posted, so there is no shipping cost or wait.' } },
    { '@type': 'Question', name: 'What sizes can Little Poppin digital prints be printed at?',
      acceptedAnswer: { '@type': 'Answer', text: 'The 4:5 ratio prints beautifully at 4×5″, 8×10″ and 16×20″, and fits A4 or A3 frames with a small trim or mat. Local print shops can print directly from the file for larger sizes.' } },
    { '@type': 'Question', name: 'How do I print a digital art print?',
      acceptedAnswer: { '@type': 'Answer', text: 'Print at home on good photo paper, upload the file to an online print service such as Officeworks, Kmart Photos or Snapfish, or take it to any local print shop. Matte paper suits the soft watercolour style best.' } },
    { '@type': 'Question', name: 'Can I resell or share a Little Poppin digital print?',
      acceptedAnswer: { '@type': 'Answer', text: 'No — downloads are licensed for personal use: print them for your home, nursery, or as a gift. They cannot be resold, shared, or used commercially.' } },
    { '@type': 'Question', name: 'Are refunds available on digital downloads?',
      acceptedAnswer: { '@type': 'Answer', text: 'Change-of-mind refunds are not available once a digital file has been downloaded, but if anything is wrong with a file Little Poppin will make it right. Australian Consumer Law guarantees always apply.' } },
  ],
});

// --- jump nav ---
const jumpNav = navLinks.map(n => `<a href="#${n.id}">${n.nav}</a>`).join('\n      ');

// --- page ---
const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Art Prints — Instant Digital Downloads | Little Poppin</title>
  <meta name="description" content="Dreamy magical art prints — instant high-resolution digital downloads. Nursery art, star-sign prints, magical academia and festive collections. A portion of every sale supports children's charities." />
  <link rel="canonical" href="${SITE}/prints.html" />
  <!-- Open Graph / social sharing -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Little Poppin" />
  <meta property="og:title" content="Magical Art Prints — Instant Digital Downloads | Little Poppin" />
  <meta property="og:description" content="Dreamy nursery art, star-sign prints and enchanted magical-academia prints, delivered instantly as high-resolution downloads. A portion of every sale supports children's charities." />
  <meta property="og:url" content="${SITE}/prints.html" />
  <meta property="og:image" content="${SITE}/images/prints/10-dream-castle-in-the-clouds.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Magical Art Prints — Instant Digital Downloads | Little Poppin" />
  <meta name="twitter:description" content="Dreamy nursery art and enchanted magical prints, delivered instantly as high-resolution downloads." />
  <meta name="twitter:image" content="${SITE}/images/prints/10-dream-castle-in-the-clouds.jpg" />
  <script type="application/ld+json">${jsonLd}</script>
  <script type="application/ld+json">${faqLd}</script>
  <link rel="stylesheet" href="styles.css" />
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
</head>
<body>
  <nav class="nav nav--scrolled" id="nav">
    <div class="nav__inner">
      <a href="index.html" class="nav__logo"><img src="images/logo.jpg" alt="Little Poppin" /></a>
      <ul class="nav__links">
        <li><a href="index.html#products">Swaddles</a></li>
        <li><a href="prints.html">Art Prints</a></li>
        <li><a href="index.html#contact">Contact</a></li>
      </ul>
    </div>
  </nav>

  <header class="prints-hero">
    <div class="container">
      <div class="section-label">Instant Digital Downloads</div>
      <h1>Little Poppin Art Prints</h1>
      <p>Dreamy, magical art — delivered as a high-resolution file the moment you buy.
         Print it at home or your local print shop, frame it, and fill the room with wonder.</p>
      <p class="prints-hero__note">🌿 A portion of every sale supports children's charities worldwide.</p>
    </div>
  </header>

  <nav class="prints-jumpnav" aria-label="Print collections">
    <div class="container">
      ${jumpNav}
    </div>
  </nav>

${setsSection}

${sectionCards.join('\n\n')}

  <section class="prints-faq">
    <div class="container container--narrow">
      <h2 class="prints-section__title">How it works</h2>
      <div class="faq">
        <details>
          <summary>What exactly do I get?</summary>
          <p>A high-resolution digital file (4:5 ratio, ~300&nbsp;DPI) delivered instantly — a download button appears the moment your payment completes, and we email you the link too. Nothing is posted; there's no shipping cost or wait.</p>
        </details>
        <details>
          <summary>What sizes can I print?</summary>
          <p>The 4:5 ratio prints beautifully at 4×5″, 8×10″ and 16×20″, and sits happily in an A4 or A3 frame with a small trim or mat. For large statement prints, your local print shop can print directly from the file.</p>
        </details>
        <details>
          <summary>How do I print it?</summary>
          <p>Print at home on good photo paper, upload to an online print service (Officeworks, Kmart Photos, Snapfish), or take the file to any local print shop. Matte paper suits the soft watercolour style best.</p>
        </details>
        <details>
          <summary>Can I use it for anything else?</summary>
          <p>Your download is for <strong>personal use</strong> — print it for your home, your nursery, or as a gift. It can't be resold, shared, or used commercially.</p>
        </details>
        <details>
          <summary>Refunds on digital downloads?</summary>
          <p>Because digital files can't be returned, change-of-mind refunds aren't available once the file has been downloaded — but if anything's wrong with your file, contact us and we'll make it right. Australian Consumer Law guarantees always apply. See our <a href="refunds.html">Refunds &amp; Returns</a> policy.</p>
        </details>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <div class="footer__bottom">
        <nav class="footer__legal" aria-label="Legal">
          <a href="shipping.html">Shipping</a>
          <a href="refunds.html">Refunds &amp; Returns</a>
          <a href="privacy.html">Privacy</a>
          <a href="terms.html">Terms</a>
        </nav>
        <p>&copy; 2025 Little Poppin. All rights reserved. Canberra, ACT, Australia.</p>
      </div>
    </div>
  </footer>

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

    // Zodiac sign finder — birthday -> highlight that sign's print.
    (function () {
      var go = document.getElementById('signGo');
      if (!go) return;
      var SIGNS = [
        ['capricorn', 119], ['aquarius', 218], ['pisces', 320], ['aries', 419], ['taurus', 520],
        ['gemini', 620], ['cancer', 722], ['leo', 822], ['virgo', 922], ['libra', 1022],
        ['scorpio', 1121], ['sagittarius', 1221], ['capricorn', 1231],
      ];
      go.addEventListener('click', function () {
        var v = document.getElementById('signDate').value;
        if (!v) return;
        var d = new Date(v + 'T00:00:00');
        var mmdd = (d.getMonth() + 1) * 100 + d.getDate();
        var sign = 'capricorn';
        for (var i = 0; i < SIGNS.length; i++) { if (mmdd <= SIGNS[i][1]) { sign = SIGNS[i][0]; break; } }
        var btn = document.querySelector('[data-sku="print-little-' + sign + '"]');
        if (!btn) return;
        var card = btn.closest('.print-card');
        document.querySelectorAll('.print-card--highlight').forEach(function (c) { c.classList.remove('print-card--highlight'); });
        card.classList.add('print-card--highlight');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    })();
  </script>
  <script src="store.js" defer></script>
</body>
</html>
`;
fs.writeFileSync(path.join(REPO, 'prints.html'), page);
console.log('wrote prints.html (' + (all.length + setItems.length) + ' cards, jump-nav, lightbox, FAQ, JSON-LD)');
