// build-extras.mjs — build the printable ranges (colouring books, milestone cards,
// wall calendar) from the existing art library. Outputs dist/extras/<sku>.pdf plus a
// web preview image for each, then publish-extras.mjs uploads and registers them.
//
// COLOURING LINE ART: the recipe below was chosen by converting one design four ways and
// looking at the results. Canny lost the subject to broken lines, -sketch washed it out,
// and a colour-dodge blend inverted into dark blobs. `-morphology edgein` was the only
// one that kept the subject, and the level/threshold pass after it is what turns a grey
// pencil sketch into true black-on-white line art. Change it only by eye, on several
// designs at once — some look fine and others lose their subject entirely.
//
// Usage:  node scripts/build-extras.mjs [sku ...]     (no args = build everything)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { EXTRAS } from '../lib/extras.js';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const DESIGNS = path.join(process.env.HOME, 'Downloads', 'LittlePoppin-Designs');
const OUT = path.join(REPO, 'dist', 'extras');
const CACHE = path.join(REPO, 'dist', '.extras-cache');
const PREVIEW_DIR = path.join(REPO, 'images', 'extras');

const A4 = { w: 595.28, h: 841.89 };
const CREAM = rgb(0xFD / 255, 0xFA / 255, 0xF7 / 255);
const INK = rgb(0x2C / 255, 0x2C / 255, 0x2C / 255);
const MUTED = rgb(0x6B / 255, 0x6B / 255, 0x6B / 255);
const RED = rgb(0xB5 / 255, 0x22 / 255, 0x3E / 255);

for (const d of [OUT, CACHE, PREVIEW_DIR]) fs.mkdirSync(d, { recursive: true });

const catalogue = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'prints.json'), 'utf8'));
const fontBytes = fs.readFileSync(path.join(REPO, 'assets', 'fonts', 'CormorantGaramond.ttf'));

// Map a shop sku back to its source artwork in the design library.
const sourceIndex = (() => {
  const map = {};
  for (const coll of fs.readdirSync(DESIGNS)) {
    const dir = path.join(DESIGNS, coll);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png'))) {
      map['print-' + f.replace(/\.png$/, '').replace(/^\d+-/, '')] = path.join(dir, f);
    }
  }
  return map;
})();

const printsIn = (section) =>
  catalogue.prints.filter((p) => p.section === section && sourceIndex[p.sku]);

/** Convert one artwork to black-on-white line art (cached — this is the slow step). */
function lineArt(sku) {
  const out = path.join(CACHE, `${sku}-line.png`);
  if (fs.existsSync(out)) return out;
  execFileSync('magick', [
    sourceIndex[sku], '-resize', '1700x',
    '-colorspace', 'gray',
    '-morphology', 'edgein', 'octagon',
    '-negate', '-normalize',
    '-level', '50%,90%',
    '-white-threshold', '78%',
    '-black-threshold', '30%',
    out,
  ]);
  return out;
}

/** Square centre-crop, used for cut-out cards (cheaper than clipping inside the PDF). */
function squareCrop(sku, size = 900) {
  const out = path.join(CACHE, `${sku}-sq${size}.jpg`);
  if (fs.existsSync(out)) return out;
  execFileSync('magick', [sourceIndex[sku], '-resize', `${size}x${size}^`,
    '-gravity', 'center', '-extent', `${size}x${size}`, '-quality', '86', out]);
  return out;
}

/** Tall centre-crop for bookmarks (roughly 1:4). */
function tallCrop(sku, w = 500, h = 2000) {
  const out = path.join(CACHE, `${sku}-tall.jpg`);
  if (fs.existsSync(out)) return out;
  execFileSync('magick', [sourceIndex[sku], '-resize', `${w}x${h}^`,
    '-gravity', 'center', '-extent', `${w}x${h}`, '-quality', '86', out]);
  return out;
}

const fit = (iw, ih, bw, bh) => {
  const s = Math.min(bw / iw, bh / ih);
  return { w: iw * s, h: ih * s };
};

function centredText(page, font, text, { y, size, color }) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - w) / 2, y, size, font, color });
}

function fitText(font, text, maxWidth, max, min = 6) {
  let s = max;
  while (s > min && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.5;
  return s;
}

async function newDoc(title) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(title);
  doc.setCreator('Little Poppin — littlepoppin.com');
  // subset:false — the bundled Cormorant is a variable font and fontkit's subsetter drops
  // most of its glyphs (see lib/personalise.js). Do not "optimise" this.
  const font = await doc.embedFont(fontBytes, { subset: false });
  return { doc, font };
}

function coverPage(doc, font, { title, blurb, artPath }) {
  const page = doc.addPage([A4.w, A4.h]);
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });
  return { page, artPath, title, blurb, font };
}

async function drawCover(doc, font, { title, blurb, artJpeg }) {
  const page = doc.addPage([A4.w, A4.h]);
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });
  const img = await doc.embedJpg(fs.readFileSync(artJpeg));
  const box = fit(img.width, img.height, A4.w * 0.62, A4.h * 0.46);
  page.drawImage(img, { x: (A4.w - box.w) / 2, y: A4.h * 0.40, width: box.w, height: box.h });

  const tSize = fitText(font, title, A4.w * 0.80, 34);
  centredText(page, font, title, { y: A4.h * 0.31, size: tSize, color: INK });
  centredText(page, font, blurb, { y: A4.h * 0.265, size: 13, color: MUTED });
  centredText(page, font, 'Little Poppin', { y: A4.h * 0.115, size: 15, color: RED });
  centredText(page, font, 'littlepoppin.com  ·  for personal use', { y: A4.h * 0.09, size: 9, color: MUTED });
  return page;
}

// --- colouring book ---------------------------------------------------------
async function buildColouring(extra) {
  const pool = printsIn(extra.fromSection).slice(0, extra.pages);
  if (!pool.length) throw new Error(`no prints for section ${extra.fromSection}`);
  const { doc, font } = await newDoc(`${extra.title} — Little Poppin`);

  await drawCover(doc, font, {
    title: extra.title, blurb: extra.coverBlurb,
    artJpeg: path.join(REPO, pool[0].preview.replace(/^\//, '')),
  });

  for (const p of pool) {
    const page = doc.addPage([A4.w, A4.h]);
    page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: rgb(1, 1, 1) });
    const img = await doc.embedPng(fs.readFileSync(lineArt(p.sku)));
    // Generous bottom margin so the caption never crowds the drawing.
    const box = fit(img.width, img.height, A4.w - 72, A4.h - 118);
    page.drawImage(img, { x: (A4.w - box.w) / 2, y: A4.h - 46 - box.h, width: box.w, height: box.h });
    centredText(page, font, p.title, { y: 44, size: 12, color: MUTED });
    centredText(page, font, 'littlepoppin.com', { y: 27, size: 8, color: rgb(0.72, 0.70, 0.68) });
    process.stdout.write('.');
  }
  return doc;
}

// --- square cut-out cards (milestones, name-banner letters) -----------------
// One renderer, driven by `extra.labels`: a 2x2 grid of square cards, each a piece of
// artwork with a soft disc behind the wording so it stays readable over any design.
async function buildCards(extra) {
  const pool = printsIn(extra.fromSection);
  if (pool.length < 4) throw new Error(`not enough prints in ${extra.fromSection}`);
  const labels = extra.labels;
  const { doc, font } = await newDoc(`${extra.title} — Little Poppin`);

  await drawCover(doc, font, {
    title: extra.title, blurb: extra.coverBlurb,
    artJpeg: path.join(REPO, pool[0].preview.replace(/^\//, '')),
  });

  // Instructions page — this is a cut-out product, so say so.
  const info = doc.addPage([A4.w, A4.h]);
  info.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });
  centredText(info, font, extra.howToTitle || 'How to use your cards', { y: A4.h - 120, size: 26, color: INK });
  (extra.howTo || []).forEach((l, i) =>
    centredText(info, font, l, { y: A4.h - 175 - i * 22, size: 12, color: MUTED }));

  // Four large cards per page, 2x2. Big cards photograph better beside a baby than a
  // sheet of small ones, so the grid is centred on the page rather than pushed to the
  // top — otherwise the lower third prints as blank paper.
  const cardsPerPage = 4;
  const margin = 40;
  const gap = 18;
  const cardW = (A4.w - margin * 2 - gap) / 2;
  const cardH = cardW;
  const blockH = cardH * 2 + gap;
  const topY = (A4.h - blockH) / 2 + cardH + gap;

  for (let i = 0; i < labels.length; i++) {
    if (i % cardsPerPage === 0) doc.addPage([A4.w, A4.h]);
    const page = doc.getPage(doc.getPageCount() - 1);
    if (i % cardsPerPage === 0) page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: rgb(1, 1, 1) });

    const slot = i % cardsPerPage;
    const x = margin + (slot % 2) * (cardW + gap);
    const y = topY - Math.floor(slot / 2) * (cardH + gap);

    const art = pool[i % pool.length];
    const img = await doc.embedJpg(fs.readFileSync(squareCrop(art.sku)));
    page.drawImage(img, { x, y, width: cardW, height: cardH });

    // A soft disc keeps the wording readable over any artwork.
    const cx = x + cardW / 2, cy = y + cardH / 2;
    page.drawCircle({ x: cx, y: cy, size: cardW * 0.30, color: CREAM, opacity: 0.88 });

    const label = labels[i];
    // Single characters are the point of a banner letter, so let them run much larger.
    const maxSize = label.length <= 2 ? cardW * 0.34 : 30;
    const size = fitText(font, label, cardW * 0.50, maxSize);
    const w = font.widthOfTextAtSize(label, size);
    page.drawText(label, { x: cx - w / 2, y: cy - size * 0.32, size, font, color: INK });

    // Cut guide.
    page.drawRectangle({ x, y, width: cardW, height: cardH, borderColor: rgb(0.82, 0.80, 0.78), borderWidth: 0.5 });
    process.stdout.write('.');
  }
  return doc;
}

// --- wall calendar ----------------------------------------------------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

async function buildCalendar(extra) {
  // One print per month, spread across the whole catalogue so the year feels varied,
  // and December gets something festive.
  const nursery = printsIn('nursery');
  const festive = printsIn('festive');
  const academia = printsIn('academia');
  const spread = [...nursery, ...academia].filter(Boolean);
  const picks = MONTHS.map((_, i) =>
    i === 11 && festive.length ? festive[0] : spread[Math.floor((i * spread.length) / 12)]);

  const { doc, font } = await newDoc(`${extra.title} — Little Poppin`);
  await drawCover(doc, font, {
    title: extra.title, blurb: extra.coverBlurb,
    artJpeg: path.join(REPO, picks[0].preview.replace(/^\//, '')),
  });

  for (let m = 0; m < 12; m++) {
    const page = doc.addPage([A4.w, A4.h]);
    page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });

    const img = await doc.embedJpg(fs.readFileSync(path.join(REPO, picks[m].preview.replace(/^\//, ''))));
    const box = fit(img.width, img.height, A4.w - 96, A4.h * 0.44);
    page.drawImage(img, { x: (A4.w - box.w) / 2, y: A4.h - 52 - box.h, width: box.w, height: box.h });

    centredText(page, font, MONTHS[m], { y: A4.h - 52 - box.h - 40, size: 30, color: INK });

    // Undated grid: 7 columns x 5 rows, numbered 1..31 from the top-left. Undated on
    // purpose — it makes the calendar reusable in any year, which is the whole point of
    // a printable one. Rows are sized to fill the space left under the month name, so
    // the grid reads as part of the design rather than a small table floating on it.
    const ROWS = Math.ceil(31 / 7);
    const gridTop = A4.h - 52 - box.h - 66;
    const bottomMargin = 58;
    const headerH = 20;
    const left = 48;
    const gridW = A4.w - 96;
    const colW = gridW / 7;
    const rowH = (gridTop - headerH - bottomMargin) / ROWS;

    DOW.forEach((d, i) => {
      const w = font.widthOfTextAtSize(d, 12);
      page.drawText(d, { x: left + i * colW + colW / 2 - w / 2, y: gridTop - 14, size: 12, color: RED });
    });

    for (let day = 1; day <= 31; day++) {
      const idx = day - 1;
      const col = idx % 7, row = Math.floor(idx / 7);
      const cx = left + col * colW;
      const cy = gridTop - headerH - (row + 1) * rowH;
      page.drawRectangle({ x: cx, y: cy, width: colW, height: rowH, borderColor: rgb(0.86, 0.84, 0.82), borderWidth: 0.6 });
      page.drawText(String(day), { x: cx + 6, y: cy + rowH - 15, size: 10.5, font, color: MUTED });
    }

    centredText(page, font, 'littlepoppin.com', { y: 26, size: 8, color: rgb(0.72, 0.70, 0.68) });
    process.stdout.write('.');
  }
  return doc;
}

// --- bookmarks --------------------------------------------------------------
// Four tall bookmarks per A4 sheet. A cheap, high-margin add-on that suits the academia
// artwork, where the prints are detailed enough to read at a narrow crop.
async function buildBookmarks(extra) {
  const pool = printsIn(extra.fromSection);
  if (!pool.length) throw new Error(`no prints in ${extra.fromSection}`);
  const { doc, font } = await newDoc(`${extra.title} — Little Poppin`);

  await drawCover(doc, font, {
    title: extra.title, blurb: extra.coverBlurb,
    artJpeg: path.join(REPO, pool[0].preview.replace(/^\//, '')),
  });

  const info = doc.addPage([A4.w, A4.h]);
  info.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: CREAM });
  centredText(info, font, 'How to use your bookmarks', { y: A4.h - 120, size: 26, color: INK });
  [
    'Print on white card (250–300 gsm) so they survive a handbag.',
    'Cut along the outside of each bookmark.',
    'Punch a hole at the top and add a ribbon if you like.',
    '',
    'Print as many as you like for yourself or as gifts. Please don\'t resell them.',
  ].forEach((l, i) => centredText(info, font, l, { y: A4.h - 175 - i * 22, size: 12, color: MUTED }));

  const perPage = 4;
  const margin = 42;
  const gap = 14;
  const bmW = (A4.w - margin * 2 - gap * (perPage - 1)) / perPage;
  const bmH = A4.h - margin * 2;

  for (let i = 0; i < extra.count; i++) {
    if (i % perPage === 0) {
      const pg = doc.addPage([A4.w, A4.h]);
      pg.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: rgb(1, 1, 1) });
    }
    const page = doc.getPage(doc.getPageCount() - 1);
    const slot = i % perPage;
    const x = margin + slot * (bmW + gap);
    const y = margin;

    const art = pool[i % pool.length];
    // Cover-crop the 4:5 artwork into the tall bookmark shape.
    const img = await doc.embedJpg(fs.readFileSync(tallCrop(art.sku)));
    page.drawImage(img, { x, y, width: bmW, height: bmH });

    // Caption plate at the foot so the design is named.
    const plateH = 34;
    page.drawRectangle({ x, y, width: bmW, height: plateH, color: CREAM, opacity: 0.92 });
    const label = art.title;
    const size = fitText(font, label, bmW * 0.88, 11, 6);
    const w = font.widthOfTextAtSize(label, size);
    page.drawText(label, { x: x + (bmW - w) / 2, y: y + plateH / 2 - size * 0.34, size, font, color: INK });

    page.drawRectangle({ x, y, width: bmW, height: bmH, borderColor: rgb(0.82, 0.80, 0.78), borderWidth: 0.5 });
    process.stdout.write('.');
  }
  return doc;
}

// --- run --------------------------------------------------------------------
const builders = { colouring: buildColouring, cards: buildCards, calendar: buildCalendar, bookmarks: buildBookmarks };
const wanted = process.argv.slice(2);
const todo = wanted.length ? EXTRAS.filter((e) => wanted.includes(e.sku)) : EXTRAS;

for (const extra of todo) {
  process.stdout.write(`${extra.sku} `);
  const doc = await builders[extra.kind](extra);
  const bytes = await doc.save();
  const pdfPath = path.join(OUT, `${extra.sku}.pdf`);
  fs.writeFileSync(pdfPath, bytes);

  // Web preview for the shop card. NOT the cover: a colouring book's cover shows the
  // original full-colour artwork, so a shopper browsing "Nursery Colouring Book" would
  // see a finished painting and have no idea they're buying line art to colour in.
  // Preview an INTERIOR page instead, so the card shows what the buyer actually gets.
  //   colouring → first line drawing · milestone → first sheet of cards · calendar → January
  const PREVIEW_PAGE = { colouring: 1, milestone: 2, calendar: 1 };
  const previewPath = path.join(PREVIEW_DIR, `${extra.sku}.jpg`);
  try {
    const pageNo = Math.min(PREVIEW_PAGE[extra.kind] ?? 0, doc.getPageCount() - 1);
    const one = await PDFDocument.create();
    const [copied] = await one.copyPages(doc, [pageNo]);
    one.addPage(copied);
    const onePath = path.join(CACHE, `${extra.sku}-preview.pdf`);
    fs.writeFileSync(onePath, await one.save());

    execFileSync('qlmanage', ['-t', '-s', '1000', '-o', CACHE, onePath], { stdio: 'ignore' });
    const thumb = path.join(CACHE, `${extra.sku}-preview.pdf.png`);
    if (fs.existsSync(thumb)) {
      execFileSync('magick', [thumb, '-background', 'white', '-flatten', '-resize', '800x', '-quality', '84', previewPath]);
    }
  } catch { /* preview is nice-to-have; the PDF is the product */ }

  console.log(` → ${(bytes.length / 1024 / 1024).toFixed(1)} MB, ${doc.getPageCount()} pages`);
}

console.log(`\nBuilt ${todo.length} extras into dist/extras/`);
