// stage-etsy.mjs. Assemble everything the Etsy listing run needs into etsy-stage/<sku>/.
//
// Each listing folder ends up with:
//   photo-*.jpg   listing photos (framed mockup first. It is what people actually see)
//   file-*.png    the digital files the buyer downloads
//   listing.json  title / tags / price / description, so the browser run is pure data entry
//
// WHY STAGE AT ALL: Etsy's uploader takes files from disk. The gallery-set prints live in
// ~/Downloads/LittlePoppin-Designs and the printables live only in the private Blob store,
// so nothing is in one place until this runs.
//
// ETSY'S HARD LIMITS: 5 digital files per listing, 20 MB each. Measured against the real
// originals, that rules out four of the five collection bundles (129–589 MB), which stay
// site-exclusive. Only bundle-zodiac fits, and only as zipped parts.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DIGITAL_PRODUCTS } from '../lib/products.js';
import { presignGet } from '../lib/blob-link.js';
import { PDFDocument } from 'pdf-lib';
import { ETSY_LISTINGS, ETSY_PRICE } from './etsy-content.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(os.homedir(), 'Downloads', 'LittlePoppin-Designs');
const STAGE = path.join(REPO, 'etsy-stage');
/** Etsy caps a digital file at 20 MB; split a little below it so nothing lands on the line. */
const LIMIT_MB = 18;

// Index every original once so set components resolve by preview basename.
const originals = new Map();
for (const coll of fs.readdirSync(SRC)) {
  const dir = path.join(SRC, coll);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png'))) {
    originals.set(f.replace(/\.png$/, ''), path.join(dir, f));
  }
}
const originalFor = (sku) => {
  const p = DIGITAL_PRODUCTS[sku];
  if (!p?.preview) return null;
  return originals.get(path.basename(p.preview).replace(/\.jpg$/, '')) || null;
};

fs.rmSync(STAGE, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });

let staged = 0;
const problems = [];

for (const listing of ETSY_LISTINGS) {
  const { sku } = listing;
  const product = DIGITAL_PRODUCTS[sku];
  if (!product) { problems.push(`${sku}: not in the catalogue`); continue; }

  const dir = path.join(STAGE, sku);
  fs.mkdirSync(dir, { recursive: true });

  // --- listing photos -------------------------------------------------------
  const photos = [];
  const mockup = path.join(REPO, 'images', 'mockups', `${sku}.jpg`);
  if (fs.existsSync(mockup)) photos.push(mockup);
  const preview = path.join(REPO, product.preview.replace(/^\//, ''));
  if (fs.existsSync(preview)) photos.push(preview);
  // For a set, add each component print so buyers can see all three individually.
  for (const item of product.items || []) {
    const ip = DIGITAL_PRODUCTS[item]?.preview;
    if (ip) {
      const f = path.join(REPO, ip.replace(/^\//, ''));
      if (fs.existsSync(f) && photos.length < 10) photos.push(f);
    }
  }
  photos.forEach((p, i) => fs.copyFileSync(p, path.join(dir, `photo-${i + 1}${path.extname(p)}`)));
  if (!photos.length) problems.push(`${sku}: no listing photo found`);

  // --- digital files --------------------------------------------------------
  if (product.items) {
    if (listing.zipParts) {
      // Too many components for Etsy's 5-file cap: bundle them into zipped parts.
      const files = product.items.map(originalFor).filter(Boolean);
      if (files.length !== product.items.length) problems.push(`${sku}: missing originals`);
      const per = Math.ceil(files.length / listing.zipParts);
      for (let i = 0; i < listing.zipParts; i++) {
        const chunk = files.slice(i * per, (i + 1) * per);
        if (!chunk.length) continue;
        const zip = path.join(dir, `file-part-${i + 1}-of-${listing.zipParts}.zip`);
        execFileSync('zip', ['-j', '-q', zip, ...chunk]);
        const mb = fs.statSync(zip).size / 1048576;
        if (mb > 20) problems.push(`${sku}: ${path.basename(zip)} is ${mb.toFixed(0)}MB. Over Etsy's 20MB limit`);
      }
    } else {
      if (product.items.length > 5) problems.push(`${sku}: ${product.items.length} files exceeds Etsy's 5-file cap`);
      for (const item of product.items) {
        const src = originalFor(item);
        if (!src) { problems.push(`${sku}: no original for ${item}`); continue; }
        fs.copyFileSync(src, path.join(dir, `file-${path.basename(src)}`));
      }
    }
  } else {
    // A printable: the deliverable is a PDF that exists only in the private Blob store.
    if (!product.file) { problems.push(`${sku}: no file in the catalogue`); continue; }
    const url = await presignGet(product.file);
    const res = await fetch(url);                       // GET. The signature covers GET only
    if (!res.ok) { problems.push(`${sku}: Blob fetch returned ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const mb = buf.length / 1048576;

    if (mb <= LIMIT_MB) {
      fs.writeFileSync(path.join(dir, `file-${sku}.pdf`), buf);
    } else {
      // Over Etsy's per-file cap. Split by PAGES rather than re-compressing: the colouring
      // books are line art, and JPEG puts visible ringing halos around black lines on white.
      // Etsy allows 5 files, so the buyer gets identical quality in two parts instead of a
      // degraded single file. Said plainly in the listing description.
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const parts = Math.ceil(mb / LIMIT_MB);
      const per = Math.ceil(total / parts);
      if (parts > 5) { problems.push(`${sku}: needs ${parts} parts, over Etsy's 5-file cap`); continue; }
      for (let i = 0; i < parts; i++) {
        const out = await PDFDocument.create();
        const idx = Array.from({ length: total }, (_, n) => n).slice(i * per, (i + 1) * per);
        if (!idx.length) continue;
        const pages = await out.copyPages(src, idx);
        pages.forEach((pg) => out.addPage(pg));
        const bytes = await out.save();
        const name = `file-${sku}-part-${i + 1}-of-${parts}.pdf`;
        fs.writeFileSync(path.join(dir, name), bytes);
        const pmb = bytes.length / 1048576;
        if (pmb > 20) problems.push(`${sku}: ${name} is still ${pmb.toFixed(0)}MB`);
      }
      listing.splitInto = parts;
    }
  }

  fs.writeFileSync(path.join(dir, 'listing.json'), JSON.stringify({
    ...listing, price: ETSY_PRICE(product.price), sitePrice: product.price / 100,
  }, null, 2));
  staged++;
  process.stdout.write('.');
}

console.log(`\n\nStaged ${staged} listings into etsy-stage/`);
if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of problems) console.log('  ! ' + p);
  process.exit(1);
}
