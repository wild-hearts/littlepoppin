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

// Carry forward the Vercel Blob pathnames from the previous build. Without this every
// rebuild resets `file` to null, which silently blocks checkout on every print until
// publish-prints.mjs is re-run — the single easiest way to take the shop offline.
const PUBLISHED = await (async () => {
  try {
    const { GENERATED_DIGITAL_PRODUCTS } = await import('../lib/digital-products.generated.js');
    return Object.fromEntries(
      Object.entries(GENERATED_DIGITAL_PRODUCTS)
        .filter(([, p]) => p.file)
        .map(([sku, p]) => [sku, p.file])
    );
  } catch {
    return {};
  }
})();
const fileFor = (sku) => (PUBLISHED[sku] ? `'${PUBLISHED[sku]}'` : 'null');
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
// Prints may appear in more than one set; that is deliberate, the same way a bookshop
// puts one title on several tables.
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
  { sku: 'set-woodland-friends', title: 'Woodland Friends Set',
    description: 'Little Fawn, Autumn Fox Kit and the Owl Family — a soft, storybook forest for the nursery wall.',
    items: ['print-little-fawn', 'print-autumn-fox-kit', 'print-owl-family'], price: 3000 },
  { sku: 'set-garden-magic', title: 'Garden Magic Set',
    description: 'Butterfly Garden, Hummingbird Garden and Bumblebee Meadow — a glowing trio of tiny garden wonders.',
    items: ['print-butterfly-garden', 'print-hummingbird-garden', 'print-bumblebee-meadow'], price: 3000 },
  { sku: 'set-ocean-dreams', title: 'Ocean Dreams Set',
    description: 'Under the Sea, Mermaid Lagoon and Little Sailboat — a calm, watery world for small adventurers.',
    items: ['print-under-the-sea', 'print-mermaid-lagoon', 'print-little-sailboat'], price: 3000 },
  { sku: 'set-little-australians', title: 'Little Australians Set',
    description: 'Sleepy Koala, Gum Blossom Dreams and Little Penguin — a gentle Australian bedtime, in three prints.',
    items: ['print-sleepy-koala', 'print-gum-blossom-dreams', 'print-little-penguin'], price: 3000 },
  { sku: 'set-up-and-away', title: 'Up & Away Set',
    description: 'Hot Air Balloon Dreams, Balloon Voyage and Up & Away — for the little one with somewhere to be.',
    items: ['print-hot-air-balloon-dreams', 'print-hot-air-balloon-voyage', 'print-up-and-away'], price: 3000 },
  { sku: 'set-fairy-hollow', title: 'Fairy Hollow Set',
    description: 'Enchanted Fairy Garden, Fairy Blossom and Mushroom Hollow — a secret world at the bottom of the garden.',
    items: ['print-enchanted-fairy-garden', 'print-fairy-blossom', 'print-mushroom-hollow'], price: 3000 },
  { sku: 'set-brave-explorers', title: 'Brave Explorers Set',
    description: 'Dreamy Space Adventure, Jungle Explorers and Little Dinosaurs — three big adventures for a small room.',
    items: ['print-dreamy-space-adventure', 'print-jungle-explorers', 'print-little-dinosaurs'], price: 3000 },
  { sku: 'set-sunshine-and-rainbows', title: 'Sunshine & Rainbows Set',
    description: 'Rainbow & Clouds, Sunshine Smile and Swan Lake Dream — the brightest, happiest corner of the nursery.',
    items: ['print-rainbow-and-clouds', 'print-sunshine-smile', 'print-swan-lake-dream'], price: 3000 },
  { sku: 'set-wizarding-study', title: 'Wizarding Study Set',
    description: 'The Open Spellbook, Quill & Ink and the Study Nook — for the desk of someone who reads late.',
    items: ['print-the-open-spellbook', 'print-quill-and-ink', 'print-the-study-nook'], price: 3000 },
  { sku: 'set-potions-and-spells', title: 'Potions & Spells Set',
    description: "The Potions Shelf, the Cauldron and the Alchemist's Desk — bottled magic, three ways.",
    items: ['print-potions-shelf', 'print-the-cauldron', 'print-the-alchemist-s-desk'], price: 3000 },
  { sku: 'set-star-gazing', title: 'Star Gazing Set',
    description: "The Observatory, the Astronomer's Desk and the Crystal Ball — for anyone who looks up.",
    items: ['print-the-observatory', 'print-the-astronomer-s-desk', 'print-the-crystal-ball'], price: 3000 },
  { sku: 'set-christmas-magic', title: 'Christmas Magic Set',
    description: "The Christmas Tree, Little Reindeer and Santa's Sleigh Ride — the three that make it feel like Christmas.",
    items: ['print-the-christmas-tree', 'print-little-reindeer', 'print-santa-s-sleigh-ride'], price: 3000 },
  { sku: 'set-winter-friends', title: 'Winter Friends Set',
    description: "Skating Penguins, Polar Bear's First Christmas and the Christmas Robin — snowy, cosy and full of heart.",
    items: ['print-skating-penguins', 'print-polar-bear-s-first-christmas', 'print-christmas-robin'], price: 3000 },
  { sku: 'set-cosy-christmas', title: 'Cosy Christmas Set',
    description: 'Hot Cocoa Night, the Candlelit Window and Kitten Under the Tree — Christmas with the lamps on.',
    items: ['print-hot-cocoa-night', 'print-the-candlelit-window', 'print-kitten-under-the-tree'], price: 3000 },
];

// Whole-collection bundles. `fromSection` pulls in every print in that shop section;
// `all: true` takes the entire catalogue. Priced as the "everything you were going to
// buy anyway, plus the rest" tier — the marginal cost of a digital file is zero, so the
// job of these is to lift average order value, not to protect the single-print price.
// To reprice, edit `price` here and rebuild — nothing else needs to change.
const BUNDLES = [
  { sku: 'bundle-zodiac', title: 'The Complete Little Zodiac', fromSection: 'zodiac', price: 4500,
    description: 'All twelve star-sign prints in one download — every birthday covered, for siblings, cousins and every baby shower this year.' },
  { sku: 'bundle-festive', title: 'The Complete Festive Collection', fromSection: 'festive', price: 5900,
    description: 'All twenty enchanted Christmas prints — a whole season of decorating, and a new wall every December.' },
  { sku: 'bundle-academia', title: 'The Complete Magical Academia', fromSection: 'academia', price: 5900,
    description: 'All twenty candlelit, wizarding-inspired prints — a full study wall for magic lovers of every age.' },
  { sku: 'bundle-nursery', title: 'The Complete Nursery Collection', fromSection: 'nursery', price: 8900,
    description: 'Every one of our dreamy nursery prints in a single download — enough to style a whole nursery, playroom and hallway.' },
  { sku: 'bundle-everything', title: 'The Entire Little Poppin Library', all: true, price: 14900,
    description: 'Every single print we make — nursery, star signs, magical academia and festive. The whole library, one download, yours forever.' },
];

fs.mkdirSync(OUT_IMG, { recursive: true });
const titleCase = s => s.replace(/^\d+-/, '').split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

const all = [];
const sectionCards = [];
const navLinks = [{ id: 'sets', nav: 'Gallery Sets' }, { id: 'bundles', nav: 'Collections' }];
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
      items.push({ sku, title, name: `${title} — Art Print`, description, price: sec.price, preview: `/images/prints/${outName}`, section: sec.id });
      process.stdout.write('.');
    }
  }
  if (!items.length) continue;
  all.push(...items);
  navLinks.push({ id: sec.id, nav: sec.nav });
  const cards = items.map(it => `          <article class="print-card">
            <button type="button" class="print-card__img lightbox-open" data-full="${it.preview}" data-title="${it.title}" aria-label="View ${it.title} larger"><img src="${it.preview}" alt="${it.title} — magical art print by Little Poppin" loading="lazy" /></button>
            <div class="print-card__body">
              <h3><a href="print/${it.sku.replace(/^print-/, '')}.html">${it.title}</a></h3>
              <p class="print-card__desc">${it.description}</p>
              <p class="print-card__price">$${(it.price / 100).toFixed(0)} <span>AUD · instant download</span></p>
              <button type="button" data-sku="${it.sku}" class="btn btn--primary print-card__buy">Download Print — $${(it.price / 100).toFixed(0)}</button>
              <a class="print-card__personalise" href="personalise.html?print=${encodeURIComponent(it.sku)}">✨ Add their name — $19</a>
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
              <span class="print-card__badge-save">Save $${((it.items.length * 1200 - it.price) / 100).toFixed(0)}</span>
              <h3><a href="set/${it.sku.replace(/^set-/, '')}.html">${it.title}</a></h3>
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

// --- collection bundles: grid preview + cards -------------------------------
const bundleItems = [];
for (const b of BUNDLES) {
  const comps = b.all ? all.slice() : all.filter(it => it.section === b.fromSection);
  if (comps.length < 3) { console.log(`! skipping ${b.sku} — not enough prints`); continue; }
  const compositePath = path.join(setsDir, `${b.sku}.jpg`);
  if (!fs.existsSync(compositePath)) {
    // A 4x2 grid of covers sampled evenly across the collection, so the preview reads
    // as "lots of prints" rather than "the first eight".
    const picks = Array.from({ length: 8 }, (_, i) => comps[Math.floor((i * comps.length) / 8)]);
    const rows = [];
    for (let r = 0; r < 2; r++) {
      const rowOut = path.join(setsDir, `.tmp-${b.sku}-${r}.jpg`);
      execFileSync('magick', [
        ...picks.slice(r * 4, r * 4 + 4).map(c => path.join(REPO, c.preview.slice(1))),
        '-resize', 'x400', '-background', 'white', '+smush', '10', rowOut]);
      rows.push(rowOut);
    }
    execFileSync('magick', [...rows, '-background', 'white', '-smush', '10', compositePath]);
    rows.forEach(p => fs.unlinkSync(p));
  }
  bundleItems.push({
    ...b, items: comps.map(c => c.sku), count: comps.length,
    name: `${b.title} — ${comps.length} Digital Prints`,
    preview: `/images/prints/sets/${b.sku}.jpg`,
  });
  process.stdout.write('#');
}

const bundleCards = bundleItems.map(it => {
  const worth = it.count * 1200;
  return `          <article class="print-card print-card--set print-card--bundle">
            <button type="button" class="print-card__img print-card__img--set lightbox-open" data-full="${it.preview}" data-title="${it.title}" aria-label="View ${it.title} larger"><img src="${it.preview}" alt="${it.title} — ${it.count} magical art prints" loading="lazy" /></button>
            <div class="print-card__body">
              <span class="print-card__badge-save">${it.count} prints · save $${((worth - it.price) / 100).toFixed(0)}</span>
              <h3><a href="set/${it.sku.replace(/^bundle-/, 'bundle-')}.html">${it.title}</a></h3>
              <p class="print-card__desc">${it.description}</p>
              <p class="print-card__price">$${(it.price / 100).toFixed(0)} <span>AUD · ${it.count} prints · worth $${(worth / 100).toFixed(0)}</span></p>
              <button type="button" data-sku="${it.sku}" class="btn btn--primary print-card__buy">Get the Collection — $${(it.price / 100).toFixed(0)}</button>
            </div>
          </article>`;
}).join('\n');

const bundlesSection = bundleItems.length ? `    <section class="prints prints--sets" id="bundles">
      <div class="container">
        <h2 class="prints-section__title">✨ Complete Collections</h2>
        <p class="prints-section__blurb">Every print in a collection, in one download — the best value we offer.</p>
        <div class="print-grid print-grid--sets">
${bundleCards}
        </div>
      </div>
    </section>` : '';
console.log(` ${bundleItems.length} collection bundles.`);

// --- catalogue ---
const entries = all.map(it =>
  `  '${it.sku}': { sku: '${it.sku}', name: ${JSON.stringify(it.name)}, description: ${JSON.stringify(it.description)}, price: ${it.price}, preview: '${it.preview}', section: '${it.section}', title: ${JSON.stringify(it.title)}, file: ${fileFor(it.sku)} },`
).concat(setItems.concat(bundleItems).map(it =>
  `  '${it.sku}': { sku: '${it.sku}', name: ${JSON.stringify(it.name)}, description: ${JSON.stringify(it.description)}, price: ${it.price}, preview: '${it.preview}', title: ${JSON.stringify(it.title)}, items: ${JSON.stringify(it.items)}, file: ${fileFor(it.sku)} },`
)).join('\n');
fs.writeFileSync(path.join(REPO, 'lib', 'digital-products.generated.js'),
  `// AUTO-GENERATED by build-prints-shop.mjs — do not edit by hand.
// 'file' is the PRIVATE Vercel Blob pathname; null until the high-res original is uploaded
// (scripts/publish-prints.mjs). Checkout is blocked while file is null, so nothing sells
// without a deliverable. Rebuilds PRESERVE already-published paths — see PUBLISHED above.
export const GENERATED_DIGITAL_PRODUCTS = {
${entries}
};
`);
const kept = all.concat(setItems).filter(it => PUBLISHED[it.sku]).length;
console.log(`wrote lib/digital-products.generated.js (${kept} published file paths preserved)`);

// --- public catalogue (safe for the browser) --------------------------------
// Consumed by personalise.html and the product-page generator. Contains only what is
// already visible on the shop — never the private Blob pathnames.
const publicCatalogue = {
  prints: all.map(it => ({
    sku: it.sku, title: it.title, description: it.description,
    price: it.price, preview: it.preview, section: it.section,
    available: !!PUBLISHED[it.sku],
  })),
  sets: setItems.concat(bundleItems).map(it => ({
    sku: it.sku, title: it.title, description: it.description,
    price: it.price, preview: it.preview, items: it.items,
    available: it.items.every(s => PUBLISHED[s]),
  })),
  sections: SECTIONS.map(s => ({ id: s.id, title: s.title, nav: s.nav })),
};
fs.mkdirSync(path.join(REPO, 'data'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'data', 'prints.json'), JSON.stringify(publicCatalogue));
console.log(`wrote data/prints.json (${publicCatalogue.prints.length} prints, ${publicCatalogue.sets.length} sets)`);

// --- JSON-LD structured data (SEO rich results) ---
const jsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Little Poppin Art Prints',
  itemListElement: all.concat(setItems, bundleItems).map((it, i) => ({
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
      <button class="nav__toggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav__links">
        <li><a href="index.html#products">Swaddles</a></li>
        <li><a href="prints.html">Art Prints</a></li>
        <li><a href="personalise.html">Personalise</a></li>
        <li><a href="printclub.html">Print Club</a></li>
        <li><a href="printables.html">Printables</a></li>
        <li><a href="custom.html">Made for You</a></li>
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

${bundlesSection}

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
        <p>&copy; 2025 Little Poppin. All rights reserved. Australia.</p>
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
console.log('wrote prints.html (' + (all.length + setItems.length + bundleItems.length) + ' cards, jump-nav, lightbox, FAQ, JSON-LD)');
