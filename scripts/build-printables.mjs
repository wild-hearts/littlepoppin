// build-printables.mjs. The free printables library: every PDF in printables/free/, its
// preview and Pinterest image in images/printables/, and the manifest the shop page is
// built from (data/free-printables.json).
//
// WHY FREE: the seven paid printables (lib/extras.js) sell to people already on the site.
// This library is what brings families TO the site, and gives Pinterest something to pin.
// Every sheet is original Little Poppin work: colouring pages are the shop's own paintings
// turned into line art, everything else is drawn here with pdf-lib vectors. No borrowed
// characters, no copied layouts.
//
// Reproducible: run it again and you get the same files. Layout is all in this file;
// the raster steps (line art, square crops, OG images) are in scripts/printables-art.py
// because they need Pillow, and ImageMagick is not installed on this machine. Previews
// are rendered with pdftoppm (poppler, `brew install poppler`).
//
// Usage:  node scripts/build-printables.mjs [slug ...]     (no args = build everything)
//         then `node scripts/build-product-pages.mjs` to rebuild printables.html,
//         the per-printable landing pages and sitemap.xml from the manifest.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const PDF_DIR = path.join(REPO, 'printables', 'free');
const IMG_DIR = path.join(REPO, 'images', 'printables');
const OG_DIR = path.join(IMG_DIR, 'og');
const CACHE = path.join(REPO, 'dist', '.printables-cache');
const MANIFEST = path.join(REPO, 'data', 'free-printables.json');
const ART = path.join(REPO, 'scripts', 'printables-art.py');
for (const d of [PDF_DIR, IMG_DIR, OG_DIR, CACHE]) fs.mkdirSync(d, { recursive: true });

const A4 = { w: 595.28, h: 841.89 };
const WHITE = rgb(1, 1, 1);
const CREAM = rgb(0xFE / 255, 0xF9 / 255, 0xF5 / 255);
const INK = rgb(0x2C / 255, 0x2C / 255, 0x2C / 255);
const MUTED = rgb(0x6B / 255, 0x6B / 255, 0x6B / 255);
const RED = rgb(0xB5 / 255, 0x22 / 255, 0x3E / 255);
const PINK = rgb(0xF7 / 255, 0xE8 / 255, 0xEE / 255);
const TEAL = rgb(0xE8 / 255, 0xF4 / 255, 0xF1 / 255);
const GREEN = rgb(0x3A / 255, 0x6B / 255, 0x3A / 255);
const RULE = rgb(0.80, 0.77, 0.74);       // faint lines: cut guides, writing lines
const LINE = rgb(0.18, 0.18, 0.18);       // colouring outlines

const catalogue = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'prints.json'), 'utf8'));
const serifBytes = fs.readFileSync(path.join(REPO, 'assets', 'fonts', 'CormorantGaramond.ttf'));
const sansBytes = fs.readFileSync(path.join(REPO, 'assets', 'fonts', 'Lato-Regular.ttf'));

const printByFile = Object.fromEntries(catalogue.prints.map((p) => [path.basename(p.preview, '.jpg'), p]));
const artPath = (file) => path.join(REPO, 'images', 'prints', `${file}.jpg`);

// --- raster helpers (cached; the python steps are the slow part) --------------
function cached(name, make) {
  const out = path.join(CACHE, name);
  if (!fs.existsSync(out)) make(out);
  return out;
}
const lineArt = (file) => cached(`${file}-line.jpg`, (out) => execFileSync('python3', [ART, 'lineart', artPath(file), out]));
const squareArt = (file) => cached(`${file}-sq.jpg`, (out) => execFileSync('python3', [ART, 'square', artPath(file), out, '600']));

// --- PDF helpers ------------------------------------------------------------
async function newDoc(item) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${item.title}. Free printable from Little Poppin`);
  doc.setSubject(item.description);
  doc.setAuthor('Little Poppin');
  doc.setCreator('Little Poppin. littlepoppin.com/printables');
  doc.setKeywords(['printable', 'free', item.category, 'Little Poppin']);
  // subset:false for Cormorant: it is a variable font and fontkit's subsetter drops most
  // of its glyphs (see lib/personalise.js). Lato is a static face and subsets fine.
  // features: no ligatures. The variable Cormorant renders fi, ft and gg ligatures with a wrong
  // advance ("Certifi cate"), so standard ligatures are switched off for both faces.
  const serif = await doc.embedFont(serifBytes, { subset: false, features: { liga: false, dlig: false, clig: false, calt: false } });
  const sans = await doc.embedFont(sansBytes, { subset: true, features: { liga: false } });
  return { doc, serif, sans };
}

function addPage(doc, bg = WHITE) {
  const page = doc.addPage([A4.w, A4.h]);
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: bg });
  return page;
}

const textWidth = (font, str, size) => font.widthOfTextAtSize(str, size);

function centred(page, font, str, { y, size, color = INK, x0 = 0, x1 = A4.w }) {
  const w = textWidth(font, str, size);
  page.drawText(str, { x: x0 + (x1 - x0 - w) / 2, y, size, font, color });
}

function fitSize(font, str, maxW, max, min = 7) {
  let s = max;
  while (s > min && textWidth(font, str, s) > maxW) s -= 0.5;
  return s;
}

function wrap(font, str, size, maxW) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (textWidth(font, t, size) <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function paragraph(page, font, str, { x, y, size, maxW, color = MUTED, leading = 1.45, align = 'left' }) {
  const lines = wrap(font, str, size, maxW);
  lines.forEach((l, i) => {
    const w = textWidth(font, l, size);
    const lx = align === 'centre' ? x + (maxW - w) / 2 : x;
    page.drawText(l, { x: lx, y: y - i * size * leading, size, font, color });
  });
  return y - lines.length * size * leading;
}

/** The small brand line at the foot of every sheet. */
function footer(page, fonts, note = 'free printable · for personal use') {
  centred(page, fonts.serif, 'Little Poppin', { y: 30, size: 11, color: RED });
  centred(page, fonts.sans, `littlepoppin.com/printables  ·  ${note}`, { y: 17, size: 6.5, color: MUTED });
}

/** Title block for a sheet: small red kicker, big serif title, optional grey line. */
function heading(page, fonts, { kicker, title, sub, top = A4.h - 64, titleSize = 34 }) {
  if (kicker) centred(page, fonts.sans, kicker.toUpperCase(), { y: top, size: 8.5, color: RED });
  const ts = fitSize(fonts.serif, title, A4.w - 90, titleSize);
  centred(page, fonts.serif, title, { y: top - 34, size: ts, color: INK });
  let y = top - 34 - 20;
  if (sub) { y = paragraph(page, fonts.sans, sub, { x: 70, y, size: 9.5, maxW: A4.w - 140, align: 'centre' }); }
  return y;
}

const cutRect = (page, x, y, w, h) =>
  page.drawRectangle({ x, y, width: w, height: h, borderColor: RULE, borderWidth: 0.6, borderDashArray: [3, 3] });

const rule = (page, x1, y1, x2, y2, { color = RULE, thickness = 0.7, dash } = {}) =>
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color, ...(dash ? { dashArray: dash } : {}) });

/** Writing lines for fill-in sheets. */
function writingLines(page, { x, y, w, count, gap = 24 }) {
  for (let i = 0; i < count; i++) rule(page, x, y - i * gap, x + w, y - i * gap, { color: RULE, thickness: 0.8 });
  return y - count * gap;
}

// SVG path builders. pdf-lib's drawSvgPath places the path origin at (x, y) with SVG's
// downward y axis, so every path below is centred on its own origin and placed by centre.
const fmt = (n) => Number(n.toFixed(2));
function starPath(r, inner = 0.45, points = 5) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${fmt(Math.cos(a) * rr)} ${fmt(Math.sin(a) * rr)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}
function heartPath(s) {
  // s = half width. Two cubic lobes meeting at a point below.
  return `M 0 ${fmt(s * 0.35)} C ${fmt(-s * 0.1)} ${fmt(s * 0.05)} ${fmt(-s)} ${fmt(-s * 0.1)} ${fmt(-s)} ${fmt(-s * 0.55)} ` +
    `C ${fmt(-s)} ${fmt(-s * 0.95)} ${fmt(-s * 0.5)} ${fmt(-s * 1.1)} 0 ${fmt(-s * 0.6)} ` +
    `C ${fmt(s * 0.5)} ${fmt(-s * 1.1)} ${fmt(s)} ${fmt(-s * 0.95)} ${fmt(s)} ${fmt(-s * 0.55)} ` +
    `C ${fmt(s)} ${fmt(-s * 0.1)} ${fmt(s * 0.1)} ${fmt(s * 0.05)} 0 ${fmt(s * 0.35)} Z`;
}
/** Ellipse (optionally rotated) as four cubic arcs, so petals and leaves need no clipping tricks. */
function ellipsePath(rx, ry, angleDeg = 0, cx = 0, cy = 0) {
  const k = 0.5523;
  const a = (angleDeg * Math.PI) / 180;
  const rot = ([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  const P = (x, y) => rot([x, y]).map(fmt).join(' ');
  return `M ${P(rx, 0)} C ${P(rx, ry * k)} ${P(rx * k, ry)} ${P(0, ry)} C ${P(-rx * k, ry)} ${P(-rx, ry * k)} ${P(-rx, 0)} ` +
    `C ${P(-rx, -ry * k)} ${P(-rx * k, -ry)} ${P(0, -ry)} C ${P(rx * k, -ry)} ${P(rx, -ry * k)} ${P(rx, 0)} Z`;
}
const drawPath = (page, d, x, y, { color, borderColor = LINE, borderWidth = 1.2, scale } = {}) =>
  page.drawSvgPath(d, { x, y, ...(color ? { color } : {}), borderColor, borderWidth, ...(scale ? { scale } : {}) });

/** A little sprinkle of outline stars (to colour) around a region. */
function sprinkleStars(page, stars) {
  for (const [x, y, r] of stars) drawPath(page, starPath(r), x, y, { borderWidth: 1 });
}

function embedJpg(doc, file) { return doc.embedJpg(fs.readFileSync(file)); }
const fit = (iw, ih, bw, bh) => { const s = Math.min(bw / iw, bh / ih); return { w: iw * s, h: ih * s }; };

// Deterministic shuffle so bingo cards and scrambles come out the same on every build.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(arr, seed) {
  const r = rng(seed); const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ============================================================================
// Builders. Each takes the item and returns a PDFDocument.
// ============================================================================

// --- colouring page: one painting, turned into line art --------------------
async function buildColouring(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc);
  const img = await embedJpg(doc, lineArt(item.file));
  const box = fit(img.width, img.height, A4.w - 64, A4.h - 112);
  page.drawImage(img, { x: (A4.w - box.w) / 2, y: A4.h - 40 - box.h, width: box.w, height: box.h });
  centredCaption(page, fonts, item.caption || printByFile[item.file].title, A4.h - 40 - box.h - 22);
  footer(page, fonts);
  return doc;
}
function centredCaption(page, fonts, str, y) {
  centred(page, fonts.serif, str, { y, size: 14, color: INK });
}

// --- square cut-out cards: milestones and baby firsts -----------------------
// 2 x 2 per page, each card white on a cream sheet with a fine red frame and a sprinkle
// of outline stars. Big enough to read in a photo beside a baby; that is the whole use.
async function buildSquareCards(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const cards = item.cards;
  const margin = 46, gap = 22;
  const cw = (A4.w - margin * 2 - gap) / 2;
  const blockH = cw * 2 + gap;
  const topY = (A4.h - blockH) / 2 + cw + gap + 8;
  for (let i = 0; i < cards.length; i++) {
    if (i % 4 === 0) { const p = addPage(doc, CREAM); footer(p, fonts, 'print on card, cut along the dotted line'); }
    const page = doc.getPage(doc.getPageCount() - 1);
    const slot = i % 4;
    const x = margin + (slot % 2) * (cw + gap);
    const y = topY - Math.floor(slot / 2) * (cw + gap);
    page.drawRectangle({ x, y, width: cw, height: cw, color: WHITE });
    cutRect(page, x, y, cw, cw);
    page.drawRectangle({ x: x + 12, y: y + 12, width: cw - 24, height: cw - 24, borderColor: RED, borderWidth: 0.9 });
    const [big, small, tiny] = cards[i];
    const cx = x + cw / 2, cy = y + cw / 2;
    sprinkleStars(page, [[x + 34, y + cw - 34, 6], [x + cw - 34, y + cw - 36, 4.5], [x + 30, y + 34, 4], [x + cw - 36, y + 32, 6]]);
    if (big) {
      const bs = fitSize(serif, big, cw - 60, big.length <= 2 ? 118 : 36);
      centred(page, serif, big, { y: cy - bs * 0.28 + (small ? 22 : 0), size: bs, color: INK, x0: x, x1: x + cw });
    }
    if (small) centred(page, sans, small.toUpperCase(), { y: cy - 62, size: 9, color: RED, x0: x, x1: x + cw });
    if (tiny) centred(page, serif, tiny, { y: y + 30, size: 11, color: MUTED, x0: x, x1: x + cw });
  }
  return doc;
}

// --- pennants: name-banner alphabet, HAPPY BIRTHDAY bunting, number flags ---
function drawPennant(page, fonts, { x, yTop, w, h, label, colour = RED, fill = WHITE, band = PINK }) {
  // Pointing down. Cut line is the outer triangle; two hole marks near the top corners.
  const tri = `M 0 0 L ${fmt(w)} 0 L ${fmt(w / 2)} ${fmt(h)} Z`;
  page.drawSvgPath(tri, { x, y: yTop, color: fill, borderColor: RULE, borderWidth: 0.8, borderDashArray: [3, 3] });
  // Inner band: a stripe across the top, then the inner triangle outline.
  page.drawRectangle({ x: x + 10, y: yTop - 26, width: w - 20, height: 14, color: band });
  const inset = 14;
  const ih = h * ((w - inset * 2) / w);
  page.drawSvgPath(`M 0 0 L ${fmt(w - inset * 2)} 0 L ${fmt((w - inset * 2) / 2)} ${fmt(ih)} Z`,
    { x: x + inset, y: yTop - inset * 0.9, borderColor: colour, borderWidth: 1.1 });
  page.drawCircle({ x: x + 16, y: yTop - 8, size: 2.6, borderColor: MUTED, borderWidth: 0.7 });
  page.drawCircle({ x: x + w - 16, y: yTop - 8, size: 2.6, borderColor: MUTED, borderWidth: 0.7 });
  if (label === '♥') drawPath(page, heartPath(w * 0.17), x + w / 2, yTop - h * 0.4, { color: colour, borderColor: colour, borderWidth: 1 });
  else if (label === '★') drawPath(page, starPath(w * 0.2), x + w / 2, yTop - h * 0.4, { color: colour, borderColor: colour, borderWidth: 1 });
  else {
    const size = Math.min(w * 0.62, h * 0.5);
    const tw = textWidth(fonts.serif, label, size);
    page.drawText(label, { x: x + w / 2 - tw / 2, y: yTop - h * 0.38 - size * 0.34, size, font: fonts.serif, color: colour });
  }
}
async function buildPennants(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const per = item.perPage || 6;
  const cols = per === 6 ? 2 : 1;
  const rows = per / cols;
  const margin = 40, gap = 18;
  const w = (A4.w - margin * 2 - gap * (cols - 1)) / cols;
  const h = Math.min(w * 1.3, (A4.h - 100 - gap * (rows - 1)) / rows);
  for (let i = 0; i < item.labels.length; i++) {
    if (i % per === 0) { const p = addPage(doc, CREAM); footer(p, fonts, 'print on card, cut out, punch the holes and thread a ribbon'); }
    const page = doc.getPage(doc.getPageCount() - 1);
    const slot = i % per;
    const x = margin + (slot % cols) * (w + gap);
    const yTop = A4.h - 44 - Math.floor(slot / cols) * (h + gap);
    drawPennant(page, fonts, { x, yTop, w, h, label: item.labels[i], colour: item.colour || RED, band: item.band || PINK });
  }
  return doc;
}

// --- small cards in a grid: lunchbox notes, gift tags, thank-you tags, toppers
async function buildNoteCards(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const { cols, rows } = item.grid;
  const margin = 36, gap = 10;
  const top = A4.h - 40;
  const cw = (A4.w - margin * 2 - gap * (cols - 1)) / cols;
  const ch = (top - 50 - gap * (rows - 1)) / rows;
  const per = cols * rows;
  for (let i = 0; i < item.notes.length; i++) {
    if (i % per === 0) { const p = addPage(doc, WHITE); footer(p, fonts, item.footNote || 'cut along the dotted lines'); }
    const page = doc.getPage(doc.getPageCount() - 1);
    const slot = i % per;
    const x = margin + (slot % cols) * (cw + gap);
    const y = top - (Math.floor(slot / cols) + 1) * ch - Math.floor(slot / cols) * gap;
    item.draw(page, fonts, { x, y, w: cw, h: ch, note: item.notes[i], i });
  }
  return doc;
}

function lunchboxCard(page, fonts, { x, y, w, h, note, i }) {
  page.drawRectangle({ x, y, width: w, height: h, color: i % 2 ? CREAM : WHITE });
  cutRect(page, x, y, w, h);
  page.drawRectangle({ x: x + 7, y: y + 7, width: w - 14, height: h - 14, borderColor: i % 3 === 0 ? RED : i % 3 === 1 ? GREEN : rgb(0.79, 0.41, 0.56), borderWidth: 0.8 });
  const orn = i % 3 === 0 ? heartPath(7) : i % 3 === 1 ? starPath(8) : ellipsePath(6, 6);
  drawPath(page, orn, x + w / 2, y + h - 24, { color: i % 3 === 0 ? RED : undefined, borderColor: i % 3 === 0 ? RED : GREEN, borderWidth: 0.9 });
  const size = note.length > 60 ? 10 : 11.5;
  const lines = wrap(fonts.serif, note, size, w - 36);
  const block = lines.length * size * 1.35;
  lines.forEach((l, k) => centred(page, fonts.serif, l, { y: y + h / 2 + block / 2 - 12 - k * size * 1.35, size, color: INK, x0: x, x1: x + w }));
  rule(page, x + 30, y + 24, x + w - 30, y + 24);
  centred(page, fonts.sans, 'love from', { y: y + 27, size: 6, color: MUTED, x0: x, x1: x + w });
}

function giftTag(page, fonts, { x, y, w, h, note, i }) {
  const pad = 6;
  const tx = x + pad, ty = y + pad, tw = w - pad * 2, th = h - pad * 2;
  page.drawRectangle({ x: tx, y: ty, width: tw, height: th, color: i % 2 ? WHITE : CREAM });
  cutRect(page, tx, ty, tw, th);
  page.drawCircle({ x: tx + tw / 2, y: ty + th - 14, size: 4, borderColor: MUTED, borderWidth: 0.8 });
  const colour = note.colour;
  const ornY = ty + th - 46;
  if (note.orn === 'star') drawPath(page, starPath(12), tx + tw / 2, ornY, { color: colour, borderColor: colour, borderWidth: 1 });
  if (note.orn === 'heart') drawPath(page, heartPath(11), tx + tw / 2, ornY + 2, { color: colour, borderColor: colour, borderWidth: 1 });
  if (note.orn === 'tree') {
    // three stacked triangles and a trunk
    const cx = tx + tw / 2;
    [[0, 16], [10, 15], [20, 14]].forEach(([dy, hw]) =>
      page.drawSvgPath(`M 0 0 L ${hw} 16 L ${-hw} 16 Z`, { x: cx, y: ornY + 20 - dy, color: colour }));
    page.drawRectangle({ x: cx - 3, y: ornY - 20, width: 6, height: 7, color: rgb(0.45, 0.3, 0.2) });
  }
  if (note.orn === 'snowflake') {
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      rule(page, tx + tw / 2 - Math.cos(a) * 12, ornY - Math.sin(a) * 12, tx + tw / 2 + Math.cos(a) * 12, ornY + Math.sin(a) * 12, { color: colour, thickness: 1.3 });
    }
  }
  if (note.orn === 'bauble') {
    page.drawCircle({ x: tx + tw / 2, y: ornY - 2, size: 12, borderColor: colour, borderWidth: 1.4 });
    page.drawRectangle({ x: tx + tw / 2 - 4, y: ornY + 10, width: 8, height: 5, color: colour });
    rule(page, tx + tw / 2 - 8, ornY - 2, tx + tw / 2 + 8, ornY - 2, { color: colour, thickness: 1 });
  }
  if (note.orn === 'balloon') {
    page.drawSvgPath(ellipsePath(10, 13), { x: tx + tw / 2, y: ornY, borderColor: colour, borderWidth: 1.3 });
    rule(page, tx + tw / 2, ornY - 13, tx + tw / 2 - 3, ornY - 26, { color: colour, thickness: 0.9 });
  }
  const title = note.title;
  const ts = fitSize(fonts.serif, title, tw - 20, 15);
  centred(page, fonts.serif, title, { y: ty + th - 84, size: ts, color: INK, x0: tx, x1: tx + tw });
  const baseY = ty + 42;
  ['to', 'from'].forEach((lab, k) => {
    const ly = baseY - k * 20;
    page.drawText(lab, { x: tx + 14, y: ly + 2, size: 7, font: fonts.sans, color: MUTED });
    rule(page, tx + 36, ly, tx + tw - 14, ly);
  });
}

function cupcakeTopper(page, fonts, { x, y, w, h, note, i }) {
  const r = Math.min(w, h) / 2 - 8;
  const cx = x + w / 2, cy = y + h / 2;
  page.drawCircle({ x: cx, y: cy, size: r, color: i % 2 ? CREAM : WHITE, borderColor: RULE, borderWidth: 0.6, borderDashArray: [3, 3] });
  page.drawCircle({ x: cx, y: cy, size: r - 7, borderColor: note.colour, borderWidth: 1.4 });
  if (note.kind === 'text') {
    const lines = note.text.split('\n');
    lines.forEach((l, k) => {
      const s = fitSize(fonts.serif, l, r * 1.5, lines.length > 1 ? 16 : 20);
      centred(page, fonts.serif, l, { y: cy + (lines.length - 1) * 9 - k * 20 - 6, size: s, color: note.colour, x0: x, x1: x + w });
    });
  } else if (note.kind === 'star') drawPath(page, starPath(r * 0.5), cx, cy, { color: note.colour, borderColor: note.colour, borderWidth: 1 });
  else if (note.kind === 'heart') drawPath(page, heartPath(r * 0.42), cx, cy + 3, { color: note.colour, borderColor: note.colour, borderWidth: 1 });
  else if (note.kind === 'cake') {
    page.drawRectangle({ x: cx - 22, y: cy - 18, width: 44, height: 22, color: note.colour });
    page.drawRectangle({ x: cx - 26, y: cy + 2, width: 52, height: 6, color: PINK, borderColor: note.colour, borderWidth: 0.8 });
    rule(page, cx, cy + 8, cx, cy + 22, { color: note.colour, thickness: 2 });
    drawPath(page, ellipsePath(3, 5), cx, cy + 27, { color: RED, borderColor: RED, borderWidth: 0.5 });
  }
}

// --- charts: reward / routine / chore / potty ------------------------------
async function buildChart(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  const bottom = heading(page, fonts, { kicker: item.kicker, title: item.title, sub: item.sub });
  const nameY = bottom - 14;
  page.drawText('Name', { x: 60, y: nameY, size: 9, font: sans, color: MUTED });
  rule(page, 92, nameY - 2, 300, nameY - 2);
  page.drawText(item.rightLabel || 'Week of', { x: 330, y: nameY, size: 9, font: sans, color: MUTED });
  rule(page, 380, nameY - 2, A4.w - 60, nameY - 2);

  const cols = item.cols;                     // column headers
  const rows = item.rows;                     // row labels ('' = write your own)
  const left = 48, right = A4.w - 48;
  const labelW = item.labelW || 150;
  const gridTop = nameY - 30;
  const gridBottom = item.bottomNote ? 120 : 70;
  const rowH = (gridTop - gridBottom - 24) / rows.length;
  const colW = (right - left - labelW) / cols.length;
  // header
  cols.forEach((c, i) => centred(page, sans, c, { y: gridTop - 16, size: 9, color: RED, x0: left + labelW + i * colW, x1: left + labelW + (i + 1) * colW }));
  rows.forEach((r, j) => {
    const y = gridTop - 24 - (j + 1) * rowH;
    page.drawRectangle({ x: left, y, width: right - left, height: rowH, color: j % 2 ? CREAM : WHITE, borderColor: RULE, borderWidth: 0.6 });
    if (r) {
      const s = fitSize(serif, r, labelW - 20, 13);
      page.drawText(r, { x: left + 12, y: y + rowH / 2 - s * 0.35, size: s, font: serif, color: INK });
    } else rule(page, left + 12, y + rowH / 2 - 4, left + labelW - 12, y + rowH / 2 - 4);
    cols.forEach((_, i) => {
      const cx = left + labelW + i * colW + colW / 2, cy = y + rowH / 2;
      rule(page, left + labelW + i * colW, y, left + labelW + i * colW, y + rowH);
      const r2 = Math.min(colW, rowH) * 0.3;
      if (item.cell === 'star') drawPath(page, starPath(r2), cx, cy, { borderColor: RULE, borderWidth: 0.9 });
      else page.drawCircle({ x: cx, y: cy, size: r2 * 0.75, borderColor: RULE, borderWidth: 0.8 });
    });
  });
  if (item.bottomNote) {
    const by = 96;
    page.drawRectangle({ x: 48, y: by - 30, width: A4.w - 96, height: 52, color: TEAL });
    paragraph(page, sans, item.bottomNote, { x: 62, y: by + 6, size: 8.5, maxW: A4.w - 124, color: INK });
  }
  footer(page, fonts);
  return doc;
}

// --- certificate -------------------------------------------------------------
async function buildToothCertificate(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, CREAM);
  page.drawRectangle({ x: 28, y: 28, width: A4.w - 56, height: A4.h - 56, borderColor: RED, borderWidth: 2 });
  page.drawRectangle({ x: 36, y: 36, width: A4.w - 72, height: A4.h - 72, borderColor: RED, borderWidth: 0.7 });
  // corner stars
  [[62, A4.h - 62], [A4.w - 62, A4.h - 62], [62, 62], [A4.w - 62, 62]].forEach(([x, y]) => drawPath(page, starPath(11), x, y, { color: RED, borderColor: RED, borderWidth: 0.6 }));
  centred(page, sans, 'THE TOOTH FAIRY · OFFICIAL RECORDS OFFICE', { y: A4.h - 110, size: 8.5, color: RED });
  centred(page, serif, 'Certificate of a Lost Tooth', { y: A4.h - 160, size: 38, color: INK });
  // a tooth: a rounded crown with two little roots, as outline
  const toothD = 'M -22 0 C -22 -26 22 -26 22 0 C 22 12 18 22 14 34 C 12 40 6 40 4 34 C 2 26 -2 26 -4 34 C -6 40 -12 40 -14 34 C -18 22 -22 12 -22 0 Z';
  page.drawSvgPath(toothD, { x: A4.w / 2, y: A4.h - 200, color: WHITE, borderColor: INK, borderWidth: 1.4 });
  sprinkleStars(page, [[A4.w / 2 - 46, A4.h - 206, 5], [A4.w / 2 + 48, A4.h - 214, 6], [A4.w / 2 + 34, A4.h - 250, 3.5], [A4.w / 2 - 38, A4.h - 246, 4]]);
  let y = A4.h - 300;
  centred(page, sans, 'This is to certify that', { y, size: 11, color: MUTED });
  y -= 44; rule(page, 120, y, A4.w - 120, y, { color: INK, thickness: 0.8 });
  centred(page, sans, 'name', { y: y - 11, size: 7, color: MUTED });
  y -= 44; centred(page, sans, 'lost a tooth on', { y, size: 11, color: MUTED });
  y -= 40; rule(page, 170, y, A4.w - 170, y, { color: INK, thickness: 0.8 });
  centred(page, sans, 'date', { y: y - 11, size: 7, color: MUTED });
  y -= 48;
  paragraph(page, serif, 'It was inspected on arrival and found to be a very fine tooth indeed: brushed, brave and beautifully wobbled.', { x: 90, y, size: 14, maxW: A4.w - 180, color: INK, align: 'centre', leading: 1.4 });
  y -= 70;
  centred(page, sans, 'Tooth number', { y, size: 9, color: MUTED, x0: 90, x1: 290 });
  rule(page, 120, y - 22, 260, y - 22, { color: INK, thickness: 0.8 });
  centred(page, sans, 'Left under the pillow in exchange for', { y, size: 9, color: MUTED, x0: 300, x1: A4.w - 90 });
  rule(page, 320, y - 22, A4.w - 110, y - 22, { color: INK, thickness: 0.8 });
  y -= 96;
  rule(page, A4.w / 2 - 90, y, A4.w / 2 + 90, y, { color: INK, thickness: 0.8 });
  centred(page, serif, 'The Tooth Fairy', { y: y + 8, size: 22, color: RED });
  centred(page, sans, 'signed, with a sprinkle of fairy dust', { y: y - 12, size: 7.5, color: MUTED });
  footer(page, fonts);
  return doc;
}

// Tooth pocket: a square envelope to fold, with a little note card beside it.
async function buildToothPocket(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  heading(page, fonts, { kicker: 'Tooth fairy', title: 'My Tooth Pocket', sub: 'Cut along the dotted line, fold the three flaps in, and glue or tape the side flaps. Pop the tooth inside and the little note on top.' });
  const s = 150; // pocket square
  const cx = A4.w / 2 - 70, cy = 420;
  // body square
  page.drawRectangle({ x: cx - s / 2, y: cy - s / 2, width: s, height: s, color: CREAM, borderColor: INK, borderWidth: 0.8 });
  // flaps: left, right (trapezoids) and top (triangle), bottom as fold base
  const flap = 46;
  page.drawSvgPath(`M 0 0 L ${-flap} ${flap * 0.5} L ${-flap} ${s - flap * 0.5} L 0 ${s} Z`, { x: cx - s / 2, y: cy + s / 2, color: WHITE, borderColor: RULE, borderWidth: 0.6, borderDashArray: [3, 3] });
  page.drawSvgPath(`M 0 0 L ${flap} ${flap * 0.5} L ${flap} ${s - flap * 0.5} L 0 ${s} Z`, { x: cx + s / 2, y: cy + s / 2, color: WHITE, borderColor: RULE, borderWidth: 0.6, borderDashArray: [3, 3] });
  page.drawSvgPath(`M 0 0 L ${s} 0 L ${s / 2} ${-s * 0.55} Z`, { x: cx - s / 2, y: cy + s / 2, color: WHITE, borderColor: RULE, borderWidth: 0.6, borderDashArray: [3, 3] });
  page.drawSvgPath(`M 0 0 L ${s} 0 L ${s / 2} ${s * 0.55} Z`, { x: cx - s / 2, y: cy - s / 2, color: WHITE, borderColor: RULE, borderWidth: 0.6, borderDashArray: [3, 3] });
  // fold lines
  rule(page, cx - s / 2, cy - s / 2, cx - s / 2, cy + s / 2, { dash: [2, 2], color: MUTED });
  rule(page, cx + s / 2, cy - s / 2, cx + s / 2, cy + s / 2, { dash: [2, 2], color: MUTED });
  rule(page, cx - s / 2, cy + s / 2, cx + s / 2, cy + s / 2, { dash: [2, 2], color: MUTED });
  rule(page, cx - s / 2, cy - s / 2, cx + s / 2, cy - s / 2, { dash: [2, 2], color: MUTED });
  // tooth and label on the body (which becomes the front)
  const toothD = 'M -14 0 C -14 -17 14 -17 14 0 C 14 8 11 14 9 22 C 8 26 4 26 3 22 C 1 17 -1 17 -3 22 C -4 26 -8 26 -9 22 C -11 14 -14 8 -14 0 Z';
  page.drawSvgPath(toothD, { x: cx, y: cy + 30, color: WHITE, borderColor: INK, borderWidth: 1.1 });
  centred(page, serif, 'For the Tooth Fairy', { y: cy - 36, size: 15, color: RED, x0: cx - s / 2, x1: cx + s / 2 });
  centred(page, sans, 'fold', { y: cy + s / 2 + 40, size: 7, color: MUTED, x0: cx - s / 2, x1: cx + s / 2 });
  // note card
  const nx = A4.w / 2 + 70, ny = cy - 80, nw = 150, nh = 160;
  page.drawRectangle({ x: nx, y: ny, width: nw, height: nh, color: WHITE });
  cutRect(page, nx, ny, nw, nh);
  page.drawRectangle({ x: nx + 8, y: ny + 8, width: nw - 16, height: nh - 16, borderColor: RED, borderWidth: 0.7 });
  centred(page, serif, 'Dear Tooth Fairy,', { y: ny + nh - 36, size: 13, color: INK, x0: nx, x1: nx + nw });
  writingLines(page, { x: nx + 18, y: ny + nh - 62, w: nw - 36, count: 5, gap: 17 });
  centred(page, sans, 'love from', { y: ny + 16, size: 6.5, color: MUTED, x0: nx, x1: nx + nw });
  footer(page, fonts, 'print on card for a sturdier pocket');
  return doc;
}

// --- Christmas: letter to Santa, countdown ---------------------------------
function snowflake(page, x, y, r, colour = RULE) {
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    rule(page, x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r, { color: colour, thickness: 1 });
  }
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const px = x + Math.cos(a) * r * 0.6, py = y + Math.sin(a) * r * 0.6;
    rule(page, px, py, px + Math.cos(a + 0.6) * r * 0.3, py + Math.sin(a + 0.6) * r * 0.3, { color: colour, thickness: 0.8 });
    rule(page, px, py, px + Math.cos(a - 0.6) * r * 0.3, py + Math.sin(a - 0.6) * r * 0.3, { color: colour, thickness: 0.8 });
  }
}
async function buildSantaLetter(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  page.drawRectangle({ x: 30, y: 30, width: A4.w - 60, height: A4.h - 60, borderColor: RED, borderWidth: 1.2 });
  [[70, A4.h - 70], [A4.w - 70, A4.h - 70], [70, 70], [A4.w - 70, 70]].forEach(([x, y]) => snowflake(page, x, y, 14, RED));
  centred(page, sans, 'EXPRESS DELIVERY · THE NORTH POLE', { y: A4.h - 76, size: 8.5, color: RED });
  centred(page, serif, 'Dear Santa,', { y: A4.h - 140, size: 40, color: INK });
  let y = A4.h - 186;
  const prompt = (label, lines) => {
    page.drawText(label, { x: 64, y, size: 11.5, font: serif, color: RED });
    y -= 26;
    y = writingLines(page, { x: 64, y, w: A4.w - 128, count: lines, gap: 24 });
    y -= 10;
  };
  prompt('My name is', 1);
  prompt('I am this many years old', 1);
  prompt('This year I have been', 2);
  prompt('Something kind I did this year was', 2);
  prompt('For Christmas I would love', 3);
  prompt('Something for someone else', 2);
  prompt('I will leave out for you and the reindeer', 1);
  page.drawText('Love from', { x: 64, y: y - 6, size: 11.5, font: serif, color: RED });
  rule(page, 130, y - 8, 330, y - 8);
  // a little stamp
  page.drawRectangle({ x: A4.w - 150, y: y - 50, width: 86, height: 60, borderColor: RULE, borderWidth: 0.8, borderDashArray: [2, 2] });
  centred(page, sans, 'STICK YOUR', { y: y - 14, size: 6.5, color: MUTED, x0: A4.w - 150, x1: A4.w - 64 });
  centred(page, sans, 'STAMP OR', { y: y - 24, size: 6.5, color: MUTED, x0: A4.w - 150, x1: A4.w - 64 });
  centred(page, sans, 'DRAWING HERE', { y: y - 34, size: 6.5, color: MUTED, x0: A4.w - 150, x1: A4.w - 64 });
  footer(page, fonts);
  return doc;
}
async function buildCountdown(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  const bottom = heading(page, fonts, { kicker: 'Christmas countdown', title: 'Sleeps Until Christmas', sub: 'Colour one bauble a day from the 1st of December. When they are all coloured in, it is Christmas Eve, and tomorrow is the day.' });
  const cols = 4, rows = 6;
  const left = 56, right = A4.w - 56;
  const cw = (right - left) / cols;
  const top = bottom - 18, bot = 70;
  const ch = (top - bot) / rows;
  for (let n = 1; n <= 24; n++) {
    const i = n - 1;
    const cx = left + (i % cols) * cw + cw / 2;
    const cy = top - Math.floor(i / cols) * ch - ch / 2 - 6;
    const r = Math.min(cw, ch) * 0.33;
    page.drawRectangle({ x: cx - r * 0.3, y: cy + r - 2, width: r * 0.6, height: r * 0.28, borderColor: LINE, borderWidth: 1.1 });
    rule(page, cx, cy + r + r * 0.26, cx, cy + r + r * 0.26 + 8, { color: LINE, thickness: 1 });
    page.drawCircle({ x: cx, y: cy, size: r, borderColor: LINE, borderWidth: 1.4 });
    // a decorative band to colour differently
    if (n % 3 === 0) { rule(page, cx - r * 0.95, cy + 4, cx + r * 0.95, cy + 4, { color: LINE, thickness: 0.9 }); rule(page, cx - r * 0.95, cy - 4, cx + r * 0.95, cy - 4, { color: LINE, thickness: 0.9 }); }
    if (n % 3 === 1) [[-0.5, 0.45], [0.5, 0.45], [0, -0.5], [-0.55, -0.3], [0.55, -0.3]].forEach(([dx, dy]) => page.drawCircle({ x: cx + dx * r, y: cy + dy * r, size: 2.2, borderColor: LINE, borderWidth: 0.8 }));
    if (n % 3 === 2) drawPath(page, starPath(r * 0.45), cx, cy + 2, { borderWidth: 0.9 });
    const s = 16;
    centred(page, serif, String(n), { y: cy - r - 16, size: s, color: RED, x0: cx - cw / 2, x1: cx + cw / 2 });
  }
  footer(page, fonts);
  return doc;
}

// --- fold-in-half cards to colour -------------------------------------------
// A4 portrait, folded along the middle. Bottom half is the front (the design), top half
// is the back, printed upside down so it reads the right way once folded.
async function buildFoldCard(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  const mid = A4.h / 2;
  rule(page, 20, mid, A4.w - 20, mid, { dash: [4, 4], color: RULE });
  page.drawText('fold', { x: A4.w - 44, y: mid + 4, size: 6.5, font: sans, color: MUTED });
  // back (rotated 180): brand line at what will be the bottom of the back
  const back = 'Coloured with love  ·  littlepoppin.com/printables';
  const bw = textWidth(sans, back, 7);
  page.drawText(back, { x: A4.w / 2 + bw / 2, y: A4.h - 44, size: 7, font: sans, color: MUTED, rotate: degrees(180) });
  // front
  const front = { x0: 0, x1: A4.w, yTop: mid - 30, yBottom: 40 };
  item.drawFront(page, fonts, front);
  return doc;
}

function easterFront(page, fonts, { yTop, yBottom }) {
  const cx = A4.w / 2, cy = (yTop + yBottom) / 2 + 14;
  // the egg: an ellipse slightly fatter at the bottom, built from two half-ellipses
  const rx = 125, ryTop = 175, ryBot = 140;
  const k = 0.5523;
  const egg = `M ${fmt(-rx)} 0 C ${fmt(-rx)} ${fmt(-ryTop * k)} ${fmt(-rx * k)} ${fmt(-ryTop)} 0 ${fmt(-ryTop)} C ${fmt(rx * k)} ${fmt(-ryTop)} ${fmt(rx)} ${fmt(-ryTop * k)} ${fmt(rx)} 0 ` +
    `C ${fmt(rx)} ${fmt(ryBot * k)} ${fmt(rx * k)} ${fmt(ryBot)} 0 ${fmt(ryBot)} C ${fmt(-rx * k)} ${fmt(ryBot)} ${fmt(-rx)} ${fmt(ryBot * k)} ${fmt(-rx)} 0 Z`;
  page.drawSvgPath(egg, { x: cx, y: cy, borderColor: LINE, borderWidth: 2 });
  const halfW = (dy) => { // half-width of the egg at vertical offset dy (pdf coords, + up)
    const ry = dy > 0 ? ryTop : ryBot;
    const t = Math.min(1, Math.abs(dy) / ry);
    return rx * Math.sqrt(1 - t * t);
  };
  // zigzag band
  const zz = (y0, amp, step) => {
    let d = '';
    const w = halfW(y0 - cy) - 2;
    let up = true;
    for (let x = -w; x <= w; x += step) { d += (d ? ' L ' : 'M ') + `${fmt(x)} ${fmt(up ? -amp : amp)}`; up = !up; }
    page.drawSvgPath(d, { x: cx, y: y0, borderColor: LINE, borderWidth: 1.3 });
  };
  zz(cy + 95, 8, 16);
  zz(cy - 60, 8, 16);
  // straight bands
  [[cy + 60, 1.2], [cy + 40, 1.2], [cy - 20, 1.2], [cy - 100, 1.2]].forEach(([y, t]) => rule(page, cx - halfW(y - cy) + 2, y, cx + halfW(y - cy) - 2, y, { color: LINE, thickness: t }));
  // dots between the bands
  for (let x = -90; x <= 90; x += 30) page.drawCircle({ x: cx + x, y: cy + 50, size: 5, borderColor: LINE, borderWidth: 1.1 });
  for (let x = -75; x <= 75; x += 30) page.drawCircle({ x: cx + x, y: cy - 80, size: 4.5, borderColor: LINE, borderWidth: 1.1 });
  // little hearts in the middle band
  for (let x = -60; x <= 60; x += 40) drawPath(page, heartPath(8), cx + x, cy + 10, { borderWidth: 1.1 });
  // grass
  for (let x = 70; x < A4.w - 70; x += 14) {
    const h = 14 + ((x * 7) % 11);
    page.drawSvgPath(`M 0 0 Q ${x % 2 ? 6 : -6} ${-h / 2} ${x % 2 ? 3 : -3} ${-h}`, { x, y: cy - ryBot + 2, borderColor: LINE, borderWidth: 1 });
  }
  centred(page, fonts.serif, 'Happy Easter', { y: yBottom + 14, size: 34, color: INK });
}

function flower(page, cx, cy, r, petals = 6) {
  const d = r * 0.62;
  for (let i = 0; i < petals; i++) {
    const a = (i * 360) / petals;
    const rad = (a * Math.PI) / 180;
    page.drawSvgPath(ellipsePath(r * 0.38, r * 0.62, a), { x: cx + Math.sin(rad) * d, y: cy + Math.cos(rad) * d, borderColor: LINE, borderWidth: 1.2 });
  }
  page.drawCircle({ x: cx, y: cy, size: r * 0.3, borderColor: LINE, borderWidth: 1.2 });
}
function stem(page, x0, y0, x1, y1) {
  page.drawSvgPath(`M 0 0 C ${fmt((x1 - x0) * 0.2)} ${fmt(-(y1 - y0) * 0.4)} ${fmt((x1 - x0) * 0.8)} ${fmt(-(y1 - y0) * 0.6)} ${fmt(x1 - x0)} ${fmt(-(y1 - y0))}`, { x: x0, y: y0, borderColor: LINE, borderWidth: 1.4 });
}
function leaf(page, x, y, len, angle) {
  page.drawSvgPath(ellipsePath(len * 0.22, len * 0.5, angle), { x, y, borderColor: LINE, borderWidth: 1.1 });
  const a = ((angle + 90) * Math.PI) / 180;
  rule(page, x - Math.cos(a) * len * 0.4, y + Math.sin(a) * len * 0.4, x + Math.cos(a) * len * 0.4, y - Math.sin(a) * len * 0.4, { color: LINE, thickness: 0.8 });
}
function mothersFront(page, fonts, { yTop, yBottom }) {
  const cx = A4.w / 2;
  const base = yBottom + 70;
  // vase
  page.drawSvgPath('M -40 0 L 40 0 C 44 -40 56 -70 56 -110 L -56 -110 C -56 -70 -44 -40 -40 0 Z', { x: cx, y: base + 110, borderColor: LINE, borderWidth: 1.6 });
  rule(page, cx - 56, base + 110, cx + 56, base + 110, { color: LINE, thickness: 1.6 });
  for (let y = base + 20; y < base + 100; y += 20) rule(page, cx - 46 + (y - base) * 0.1, y, cx + 46 - (y - base) * 0.1, y, { color: LINE, thickness: 0.8 });
  const top = base + 110;
  // stems and flowers
  const blooms = [[-90, 150, 30, 6], [-30, 200, 36, 7], [40, 180, 32, 5], [100, 140, 28, 6], [0, 120, 22, 8]];
  blooms.forEach(([dx, h, r]) => stem(page, cx + dx * 0.2, top, cx + dx, top + h - r * 0.8));
  blooms.forEach(([dx, h, r, p]) => flower(page, cx + dx, top + h, r, p));
  leaf(page, cx - 50, top + 70, 44, -35);
  leaf(page, cx + 52, top + 60, 44, 30);
  leaf(page, cx - 10, top + 50, 36, 10);
  sprinkleStars(page, [[cx - 150, yTop - 40, 6], [cx + 150, yTop - 60, 5], [cx - 130, base + 90, 4]]);
  centred(page, fonts.serif, 'Happy Mother’s Day', { y: yBottom + 10, size: 30, color: INK });
}
function fathersFront(page, fonts, { yTop, yBottom }) {
  const cx = A4.w / 2, cy = (yTop + yBottom) / 2 + 30;
  // ribbon tails
  page.drawSvgPath('M -28 0 L -52 90 L -30 78 L -14 96 L 0 10 Z', { x: cx, y: cy - 40, borderColor: LINE, borderWidth: 1.4 });
  page.drawSvgPath('M 28 0 L 52 90 L 30 78 L 14 96 L 0 10 Z', { x: cx, y: cy - 40, borderColor: LINE, borderWidth: 1.4 });
  // medal
  page.drawCircle({ x: cx, y: cy, size: 92, borderColor: LINE, borderWidth: 2 });
  page.drawCircle({ x: cx, y: cy, size: 78, borderColor: LINE, borderWidth: 1.1 });
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI * 2) / 24;
    rule(page, cx + Math.cos(a) * 80, cy + Math.sin(a) * 80, cx + Math.cos(a) * 90, cy + Math.sin(a) * 90, { color: LINE, thickness: 1 });
  }
  drawPath(page, starPath(44), cx, cy + 10, { borderWidth: 1.6 });
  centred(page, fonts.serif, 'No. 1', { y: cy - 58, size: 20, color: INK });
  sprinkleStars(page, [[cx - 140, cy + 100, 8], [cx + 140, cy + 80, 7], [cx - 150, cy - 60, 5], [cx + 150, cy - 90, 6], [cx - 100, yTop - 20, 4], [cx + 110, yTop - 30, 5]]);
  centred(page, fonts.serif, 'Happy Father’s Day', { y: yBottom + 10, size: 30, color: INK });
}

// Easter egg patterns: six eggs, each a different pattern, to colour.
async function buildEggSheet(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  const bottom = heading(page, fonts, { kicker: 'Easter', title: 'Decorate the Eggs', sub: 'Six eggs, six patterns. Colour them in, or cut them out and hang them on a branch for an Easter tree.' });
  const cols = 2, rows = 3;
  const cw = (A4.w - 80) / cols, ch = (bottom - 70) / rows;
  const rx = 72, ryT = 100, ryB = 84, k = 0.5523;
  const egg = `M ${-rx} 0 C ${-rx} ${fmt(-ryT * k)} ${fmt(-rx * k)} ${-ryT} 0 ${-ryT} C ${fmt(rx * k)} ${-ryT} ${rx} ${fmt(-ryT * k)} ${rx} 0 C ${rx} ${fmt(ryB * k)} ${fmt(rx * k)} ${ryB} 0 ${ryB} C ${fmt(-rx * k)} ${ryB} ${-rx} ${fmt(ryB * k)} ${-rx} 0 Z`;
  const halfW = (dy) => { const ry = dy > 0 ? ryT : ryB; const t = Math.min(1, Math.abs(dy) / ry); return rx * Math.sqrt(1 - t * t); };
  for (let i = 0; i < 6; i++) {
    const cx = 40 + (i % cols) * cw + cw / 2;
    const cy = bottom - Math.floor(i / cols) * ch - ch / 2 - 4;
    page.drawSvgPath(egg, { x: cx, y: cy, borderColor: LINE, borderWidth: 1.8 });
    if (i === 0) for (let y = -60; y <= 60; y += 20) rule(page, cx - halfW(y) + 2, cy + y, cx + halfW(y) - 2, cy + y, { color: LINE, thickness: 1 });
    if (i === 1) for (let y = -60; y <= 60; y += 30) for (let x = -60; x <= 60; x += 30) if (Math.abs(x) < halfW(y) - 8) page.drawCircle({ x: cx + x, y: cy + y, size: 6, borderColor: LINE, borderWidth: 1 });
    if (i === 2) for (let y = -50; y <= 50; y += 40) { let d = ''; const w = halfW(y) - 3; let up = true; for (let x = -w; x <= w; x += 12) { d += (d ? ' L ' : 'M ') + `${fmt(x)} ${up ? -7 : 7}`; up = !up; } page.drawSvgPath(d, { x: cx, y: cy + y, borderColor: LINE, borderWidth: 1 }); }
    if (i === 3) for (let y = -55; y <= 55; y += 30) for (let x = -60; x <= 60; x += 34) if (Math.abs(x) < halfW(y) - 10) drawPath(page, heartPath(7), cx + x, cy + y, { borderWidth: 1 });
    if (i === 4) for (let x = -60; x <= 60; x += 20) { const f = Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)); rule(page, cx + x, cy - ryB * f + 3, cx + x, cy + ryT * f - 3, { color: LINE, thickness: 1 }); }
    if (i === 5) for (let y = -55; y <= 55; y += 32) for (let x = -56; x <= 56; x += 32) if (Math.abs(x) < halfW(y) - 10) drawPath(page, starPath(7), cx + x, cy + y, { borderWidth: 0.9 });
  }
  footer(page, fonts);
  return doc;
}

// --- memory match: pairs of the shop's paintings ----------------------------
async function buildMemory(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const files = item.files;
  const cards = shuffle([...files, ...files], 7);
  const cols = 3, rows = 3, per = 9;
  const size = 150, gap = 14;
  const gridW = cols * size + (cols - 1) * gap;
  const left = (A4.w - gridW) / 2;
  const images = {};
  for (const f of files) images[f] = await embedJpg(doc, squareArt(f));
  for (let i = 0; i < cards.length; i++) {
    if (i % per === 0) {
      const p = addPage(doc, WHITE);
      if (i === 0) heading(p, fonts, { kicker: 'Memory match', title: item.title, sub: 'Print on card, cut out the squares and lay them face down. Take turns turning over two. Find a pair and it is yours; the most pairs wins.', titleSize: 28 });
      else heading(p, fonts, { kicker: 'Memory match', title: item.title, titleSize: 28 });
      footer(p, fonts, 'print on card so the pictures do not show through');
    }
    const page = doc.getPage(doc.getPageCount() - 1);
    const slot = i % per;
    const x = left + (slot % cols) * (size + gap);
    const y = 70 + (rows - 1 - Math.floor(slot / cols)) * (size + gap);
    page.drawImage(images[cards[i]], { x: x + 6, y: y + 6, width: size - 12, height: size - 12 });
    cutRect(page, x, y, size, size);
  }
  return doc;
}

// --- dot-to-dot ----------------------------------------------------------------
async function buildDotToDot(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  for (const shape of item.shapes) {
    const page = addPage(doc, WHITE);
    const bottom = heading(page, fonts, { kicker: 'Dot to dot', title: shape.title, sub: `Join the dots from 1 to ${shape.points.length}, then colour me in.` });
    // scale shape into the box
    const xs = shape.points.map((p) => p[0]), ys = shape.points.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const boxW = A4.w - 140, boxH = bottom - 130;
    const s = Math.min(boxW / (maxX - minX), boxH / (maxY - minY));
    const ox = (A4.w - (maxX - minX) * s) / 2 - minX * s;
    const oy = 80 + (boxH - (maxY - minY) * s) / 2 - minY * s;
    shape.points.forEach(([px, py], i) => {
      const x = ox + px * s, y = oy + py * s;
      page.drawCircle({ x, y, size: 2.6, color: INK });
      const lab = String(i + 1);
      // label pushed outward from the shape centre so it sits clear of the line
      const cxs = ox + ((minX + maxX) / 2) * s, cys = oy + ((minY + maxY) / 2) * s;
      const dx = x - cxs, dy = y - cys; const len = Math.hypot(dx, dy) || 1;
      page.drawText(lab, { x: x + (dx / len) * 11 - textWidth(sans, lab, 10) / 2, y: y + (dy / len) * 11 - 3.5, size: 10, font: sans, color: RED });
    });
    if (shape.extra) shape.extra(page);
    footer(page, fonts);
  }
  return doc;
}

// --- baby shower sheets ----------------------------------------------------
async function buildPredictions(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, CREAM);
  page.drawRectangle({ x: 30, y: 30, width: A4.w - 60, height: A4.h - 60, borderColor: RED, borderWidth: 1 });
  let y = heading(page, fonts, { kicker: 'Baby shower game', title: 'Baby Predictions', sub: 'Fill in your guesses, pop your name at the bottom, and whoever is closest wins bragging rights for a year.' });
  y -= 16;
  const fields = [['Baby will arrive on', 'date'], ['At exactly', 'time'], ['Weighing', 'weight'], ['Measuring', 'length'], ['Hair', 'colour, or none at all'], ['Eyes', 'colour'], ['Baby will look most like', 'mum or dad'], ['First word will be', ''], ['Baby’s name will be', 'take a guess']];
  for (const [label, hint] of fields) {
    page.drawText(label, { x: 64, y, size: 13, font: serif, color: INK });
    const lw = textWidth(serif, label, 13);
    rule(page, 64 + lw + 10, y - 2, A4.w - 64, y - 2, { color: INK, thickness: 0.7 });
    if (hint) page.drawText(hint, { x: A4.w - 64 - textWidth(sans, hint, 7), y: y - 12, size: 7, font: sans, color: MUTED });
    y -= 44;
  }
  y -= 10;
  page.drawText('Predicted by', { x: 64, y, size: 11, font: sans, color: MUTED });
  rule(page, 140, y - 2, 330, y - 2, { color: INK, thickness: 0.7 });
  sprinkleStars(page, [[A4.w - 90, y + 4, 7], [A4.w - 120, y - 6, 4.5], [A4.w - 70, y - 14, 4]]);
  footer(page, fonts);
  return doc;
}
async function buildWishes(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  page.drawRectangle({ x: 30, y: 30, width: A4.w - 60, height: A4.h - 60, borderColor: RED, borderWidth: 1 });
  let y = heading(page, fonts, { kicker: 'Baby shower keepsake', title: 'Wishes for Baby', sub: 'Fill one in for the new arrival. Mum and dad keep them to read on the hard nights and the first birthday.' });
  y -= 10;
  for (const p of ['I hope you learn', 'I hope you laugh at', 'I hope you never forget', 'I hope you love', 'I hope you ignore', 'I hope you grow up to be', 'I hope you always know']) {
    page.drawText(p, { x: 64, y, size: 15, font: serif, color: RED });
    y = writingLines(page, { x: 64, y: y - 24, w: A4.w - 128, count: 1, gap: 22 });
    y -= 22;
  }
  page.drawText('With love from', { x: 64, y: y - 4, size: 10, font: sans, color: MUTED });
  rule(page, 150, y - 6, 360, y - 6, { color: INK, thickness: 0.7 });
  drawPath(page, heartPath(12), A4.w - 90, y + 2, { color: RED, borderColor: RED, borderWidth: 0.6 });
  footer(page, fonts);
  return doc;
}
async function buildScramble(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const words = item.words;
  const scrambleWord = (w, seed) => {
    let s = w;
    for (let t = 0; t < 10 && s === w; t++) s = shuffle(w.split(''), seed + t).join('');
    return s.toUpperCase();
  };
  const page = addPage(doc, WHITE);
  let y = heading(page, fonts, { kicker: 'Baby shower game', title: 'Baby Word Scramble', sub: 'Unscramble the baby words. Three minutes on the clock; the most right answers wins. Answers are on page two, so print that one just for the host.' });
  y -= 14;
  const colX = [60, A4.w / 2 + 16];
  words.forEach((w, i) => {
    const col = i < words.length / 2 ? 0 : 1;
    const row = col ? i - words.length / 2 : i;
    const yy = y - row * 46;
    page.drawText(`${i + 1}.`, { x: colX[col], y: yy, size: 10, font: sans, color: RED });
    page.drawText(scrambleWord(w, 100 + i), { x: colX[col] + 22, y: yy, size: 13, font: sans, color: INK });
    rule(page, colX[col] + 22, yy - 22, colX[col] + 220, yy - 22);
  });
  footer(page, fonts);
  const ans = addPage(doc, CREAM);
  let ay = heading(ans, fonts, { kicker: 'Host only', title: 'Answers' });
  ay -= 14;
  words.forEach((w, i) => {
    const col = i < words.length / 2 ? 0 : 1;
    const row = col ? i - words.length / 2 : i;
    const yy = ay - row * 40;
    ans.drawText(`${i + 1}.  ${scrambleWord(w, 100 + i)}`, { x: colX[col], y: yy, size: 11, font: sans, color: MUTED });
    ans.drawText(w.toUpperCase(), { x: colX[col] + 150, y: yy, size: 12, font: sans, color: INK });
  });
  footer(ans, fonts);
  return doc;
}
async function buildBingo(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  for (let card = 0; card < item.cards; card++) {
    const page = addPage(doc, WHITE);
    const bottom = heading(page, fonts, { kicker: 'Baby shower bingo', title: 'Gift Bingo', sub: 'As the presents are opened, cross off each one on your card. First full line across, down or diagonal shouts BINGO.' });
    const words = shuffle(item.words, 31 + card).slice(0, 24);
    words.splice(12, 0, 'FREE');
    const n = 5, size = (A4.w - 90) / n;
    const left = 45, top = bottom - 16;
    for (let i = 0; i < 25; i++) {
      const x = left + (i % n) * size, y = top - (Math.floor(i / n) + 1) * size;
      page.drawRectangle({ x, y, width: size, height: size, color: i === 12 ? PINK : WHITE, borderColor: RED, borderWidth: 0.8 });
      const w = words[i];
      const lines = wrap(sans, w, 10, size - 14);
      lines.forEach((l, k) => centred(page, i === 12 ? serif : sans, l, { y: y + size / 2 + (lines.length - 1) * 7 - k * 14 - 3, size: i === 12 ? 18 : 10, color: i === 12 ? RED : INK, x0: x, x1: x + size }));
      if (i === 12) drawPath(page, heartPath(8), x + size / 2, y + 18, { color: RED, borderColor: RED, borderWidth: 0.5 });
    }
    footer(page, fonts, `card ${card + 1} of ${item.cards} · every card is different`);
  }
  return doc;
}
async function buildAdviceCards(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  const h = (A4.h - 80) / 2;
  for (let i = 0; i < 2; i++) {
    const y = 50 + (1 - i) * h;
    const x = 40, w = A4.w - 80, hh = h - 10;
    page.drawRectangle({ x, y, width: w, height: hh, color: CREAM });
    cutRect(page, x, y, w, hh);
    page.drawRectangle({ x: x + 10, y: y + 10, width: w - 20, height: hh - 20, borderColor: RED, borderWidth: 0.8 });
    centred(page, sans, 'FOR THE NEW PARENTS', { y: y + hh - 40, size: 8.5, color: RED, x0: x, x1: x + w });
    centred(page, serif, 'My Best Advice', { y: y + hh - 72, size: 28, color: INK, x0: x, x1: x + w });
    let yy = y + hh - 104;
    page.drawText('The one thing nobody tells you', { x: x + 30, y: yy, size: 11, font: serif, color: RED });
    yy = writingLines(page, { x: x + 30, y: yy - 22, w: w - 60, count: 2, gap: 22 });
    yy -= 14;
    page.drawText('When it is 3 a.m. and nothing works, remember', { x: x + 30, y: yy, size: 11, font: serif, color: RED });
    yy = writingLines(page, { x: x + 30, y: yy - 22, w: w - 60, count: 2, gap: 22 });
    yy -= 14;
    page.drawText('And the thing I would do all over again', { x: x + 30, y: yy, size: 11, font: serif, color: RED });
    yy = writingLines(page, { x: x + 30, y: yy - 22, w: w - 60, count: 1, gap: 22 });
    page.drawText('from', { x: x + 30, y: y + 30, size: 8, font: sans, color: MUTED });
    rule(page, x + 56, y + 28, x + 240, y + 28);
    drawPath(page, heartPath(9), x + w - 44, y + 34, { color: RED, borderColor: RED, borderWidth: 0.5 });
  }
  footer(page, fonts, 'two cards per sheet, cut along the dotted line');
  return doc;
}
async function buildRaffle(item) {
  const { doc, serif, sans } = await newDoc(item);
  const fonts = { serif, sans };
  const page = addPage(doc, WHITE);
  let y = heading(page, fonts, { kicker: 'Baby shower', title: 'Nappy Raffle Tickets', sub: 'Bring a pack of nappies, take a ticket. One lucky guest wins a prize, and the new parents start with a nappy mountain.' });
  const cols = 2, rows = 5;
  const tw = (A4.w - 80 - 12) / cols, th = (y - 70) / rows - 8;
  for (let i = 0; i < cols * rows; i++) {
    const x = 40 + (i % cols) * (tw + 12);
    const ty = y - 10 - (Math.floor(i / cols) + 1) * (th + 8);
    page.drawRectangle({ x, y: ty, width: tw, height: th, color: i % 2 ? CREAM : WHITE });
    cutRect(page, x, ty, tw, th);
    rule(page, x + tw * 0.68, ty + 6, x + tw * 0.68, ty + th - 6, { dash: [2, 2], color: MUTED });
    page.drawText('NAPPY RAFFLE', { x: x + 14, y: ty + th - 20, size: 7.5, font: sans, color: RED });
    centred(page, serif, String(i + 1).padStart(3, '0'), { y: ty + th - 46, size: 24, color: INK, x0: x, x1: x + tw * 0.68 });
    page.drawText('name', { x: x + 14, y: ty + 18, size: 6.5, font: sans, color: MUTED });
    rule(page, x + 40, ty + 16, x + tw * 0.68 - 12, ty + 16);
    // stub
    const sx = x + tw * 0.68;
    page.drawText('No.', { x: sx + 10, y: ty + th - 20, size: 7, font: sans, color: MUTED });
    centred(page, serif, String(i + 1).padStart(3, '0'), { y: ty + th / 2 - 8, size: 18, color: RED, x0: sx, x1: x + tw });
    page.drawText('keep this half', { x: sx + 10, y: ty + 10, size: 5.5, font: sans, color: MUTED });
  }
  footer(page, fonts, 'print as many sheets as you have guests');
  return doc;
}

// ============================================================================
// The library.
// ============================================================================
const COLOURING = [
  ['01-butterfly-garden', 'Butterfly Garden', 'Butterflies drifting through a moonlit blossom garden. Lots of wings and petals to colour.', '3–8 years'],
  ['03-sleepy-bunny', 'Sleepy Bunny', 'A little bunny asleep in a meadow of flowers under a sky full of stars.', '2–6 years'],
  ['06-hot-air-balloon-dreams', 'Hot Air Balloon Dreams', 'A balloon sails over soft clouds and a sky full of stars. Big simple shapes for small hands.', '2–6 years'],
  ['07-under-the-sea', 'Under the Sea', 'A friendly whale swims through bubbles and starfish.', '2–6 years'],
  ['07-teddy-bears-picnic', 'Teddy Bears’ Picnic', 'Two bears share a picnic blanket under a tree.', '3–7 years'],
  ['07-rainbow-and-clouds', 'Rainbow and Clouds', 'A big rainbow over fluffy clouds. Seven stripes to colour in order, or not.', '2–5 years'],
  ['04-unicorn-dreams', 'Unicorn Dreams', 'A unicorn leaps through a sky of stars. The mane is begging for every colour you own.', '3–8 years'],
  ['08-cuddly-elephant', 'Cuddly Elephant', 'A baby elephant with a balloon, sitting on a cloud.', '2–6 years'],
  ['03-little-dinosaurs', 'Little Dinosaurs', 'Two friendly dinosaurs in a leafy jungle.', '3–7 years'],
  ['01-dreamy-space-adventure', 'Dreamy Space Adventure', 'A little astronaut floats among planets, moons and stars.', '3–8 years'],
  ['24-little-sailboat', 'Little Sailboat', 'A sailboat and a friendly whale on a calm starry sea.', '2–6 years'],
  ['01-sleepy-koala', 'Sleepy Koala', 'A koala dozing in a gum tree, hugging the branch.', '3–7 years'],
  ['04-owl-family', 'Owl Family', 'Three owls asleep on a branch under a crescent moon.', '3–8 years'],
  ['05-mushroom-hollow', 'Mushroom Hollow', 'Toadstools and tiny flowers in a woodland clearing.', '3–8 years'],
  ['09-dreamy-bear-cub', 'Dreamy Bear Cub', 'A bear cub curled up asleep on a cloud.', '2–6 years'],
  ['10-sleepy-lamb-on-a-cloud', 'Sleepy Lamb on a Cloud', 'A woolly lamb fast asleep, floating among the stars.', '2–6 years'],
];
const XMAS_COLOURING = [
  ['01-christmas-robin', 'Christmas Robin', 'A robin on a holly branch, with berries to colour bright red.', '3–8 years'],
  ['03-little-reindeer', 'Little Reindeer', 'A baby reindeer in a scarf, standing in a snowy wood.', '3–8 years'],
  ['02-skating-penguins', 'Skating Penguins', 'Penguins skating on a frozen pond under the winter stars.', '3–8 years'],
  ['10-polar-bear-s-first-christmas', 'Polar Bear’s First Christmas', 'A polar bear cub meets its first Christmas tree.', '3–8 years'],
];

const MONTH_CARDS = [['Hello', 'world', 'born on'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => [String(n), n === 1 ? 'month old' : 'months old', '']), ['One', 'whole year', 'happy birthday little one']];
const FIRSTS = ['First smile', 'First laugh', 'First tooth', 'First food', 'First word', 'First steps', 'First bath', 'First haircut', 'First holiday', 'First swim', 'First Christmas', 'First birthday'].map((t) => [t, '', 'date']);

const LOVE_NOTES = [
  'You are my favourite hello and my hardest goodbye.', 'I am so proud of you. Have a brilliant day.', 'Be brave, be kind, be you.', 'Guess who is thinking about you right now? Me.',
  'You make every single day better.', 'Try your best. That is always enough.', 'The world is lucky to have you in it.', 'Something wonderful is going to happen today. Watch for it.',
  'Smile at someone new today.', 'You are loved more than all the stars.', 'Eat your crusts. They are where the magic is.', 'Can’t wait to hear about your day.',
  'Even when we are apart, you are always in my heart.', 'You are braver than you think.', 'Be the reason someone smiles today.', 'See you soon, little one.',
  'Today is a good day to have a good day.', 'Hugs are in the bag. Can you feel them?', 'You are kind, clever and completely wonderful.', 'Whatever happens today, I am on your side.',
  'Keep being curious.', 'A little note to say: you are my sunshine.', 'High five for being you.', 'Home will be waiting. So will I.',
];
const JOKES = [
  'Why did the banana go to the doctor? It wasn’t peeling well.', 'What do you call cheese that isn’t yours? Nacho cheese!', 'Why was the maths book sad? It had too many problems.', 'What do you call a sleeping dinosaur? A dino-snore.',
  'What did one plate say to the other? Lunch is on me!', 'Why did the cookie go to the nurse? It felt crummy.', 'How do you make a tissue dance? Put a little boogie in it.', 'What do you call a bear with no teeth? A gummy bear.',
  'Why don’t eggs tell jokes? They would crack up.', 'What is orange and sounds like a parrot? A carrot.', 'What do you call a fish with no eyes? A fsh.', 'Why did the teddy bear say no to pudding? It was stuffed.',
  'What do you give a sick lemon? Lemon-aid.', 'Knock knock. Who’s there? Lettuce. Lettuce who? Lettuce in, it’s cold out here!', 'What do clouds wear under their clothes? Thunderwear.', 'Why can’t you give Elsa a balloon? She will let it go.',
  'What kind of tree fits in your hand? A palm tree.', 'Why did the picture go to jail? It was framed.', 'What do you call a dog magician? A labracadabrador.', 'How does the ocean say hello? It waves.',
  'What is a cat’s favourite colour? Purr-ple.', 'Why did the tomato blush? It saw the salad dressing.', 'What time is it when an elephant sits on a fence? Time to fix the fence.', 'What do you call a snowman in summer? A puddle.',
];

const dayCols = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BINGO_WORDS = ['Nappies', 'Wipes', 'Onesie', 'Blanket', 'Dummy', 'Bib', 'Socks', 'Teddy', 'Bath towel', 'Bottle', 'Swaddle', 'Picture book', 'Rattle', 'Hat', 'Muslin cloth', 'Nappy bag', 'Sleep suit', 'Booties', 'Baby monitor', 'Lotion', 'Play mat', 'Photo frame', 'Night light', 'Gift card', 'Thermometer', 'Cardigan', 'Mobile', 'Stroller', 'Baby carrier', 'Burp cloth'];
const SCRAMBLE_WORDS = ['nappy', 'bottle', 'cradle', 'stroller', 'blanket', 'pacifier', 'rattle', 'lullaby', 'onesie', 'bootie', 'swaddle', 'teething', 'bib', 'cuddle', 'midnight', 'highchair'];

// Dot-to-dot shapes, in arbitrary units (x right, y up).
const STAR_PTS = (() => { const pts = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 42 : 100; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return pts; })();
const HEART_PTS = (() => { const pts = []; for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2; pts.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]); } return pts; })();
const BOAT_PTS = [[0, 0], [70, 0], [80, 14], [72, 24], [40, 24], [40, 40], [74, 40], [40, 104], [35, 104], [35, 24], [-6, 24], [-14, 14]];
const ROCKET_PTS = [[12, 0], [12, 14], [22, 30], [22, 90], [10, 120], [0, 132], [-10, 120], [-22, 90], [-22, 30], [-12, 14], [-12, 0], [-6, -14], [0, -4], [6, -14]];
const HOUSE_PTS = [[0, 0], [100, 0], [100, 60], [112, 60], [50, 110], [40, 102], [40, 118], [30, 118], [30, 94], [-12, 60], [0, 60]];

const FILES_MEMORY_NURSERY = ['03-sleepy-bunny', '08-cuddly-elephant', '04-unicorn-dreams', '07-under-the-sea', '06-hot-air-balloon-dreams', '01-sleepy-koala', '04-owl-family', '09-dreamy-bear-cub', '10-sleepy-lamb-on-a-cloud', '24-little-sailboat', '03-little-dinosaurs', '01-dreamy-space-adventure'];
const FILES_MEMORY_XMAS = ['01-christmas-robin', '03-little-reindeer', '02-skating-penguins', '10-polar-bear-s-first-christmas', '06-gingerbread-village', '04-the-snow-globe', '05-christmas-mice', '06-kitten-under-the-tree', '08-hot-cocoa-night', '10-star-of-wonder', '01-the-christmas-tree', '03-santa-s-workshop'];

const bannerLetters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '♥', '★', '&'];

export const CATEGORIES = [
  ['colouring', 'Colouring pages'], ['baby', 'Baby milestones'], ['nursery', 'Nursery decor'], ['lunchbox', 'Lunchbox notes'],
  ['charts', 'Charts & routines'], ['party', 'Birthday party'], ['christmas', 'Christmas'], ['cards', 'Cards to colour'],
  ['games', 'Games & puzzles'], ['shower', 'Baby shower'],
];

const ITEMS = [
  ...COLOURING.map(([file, title, description, age]) => ({ slug: `colouring-${file.replace(/^\d+-/, '')}`, title: `${title} Colouring Page`, category: 'colouring', age, description, file, caption: title, build: buildColouring })),
  { slug: 'baby-monthly-milestone-cards', title: 'Monthly Milestone Cards', category: 'baby', age: 'Babies', description: 'Hello World, one to eleven months, and One Whole Year. Fourteen cards to photograph beside your baby as they grow.', cards: MONTH_CARDS, build: buildSquareCards },
  { slug: 'baby-firsts-cards', title: 'Baby Firsts Cards', category: 'baby', age: 'Babies', description: 'First smile, first tooth, first steps and nine more. Twelve cards with a space for the date.', cards: FIRSTS, build: buildSquareCards },
  { slug: 'nursery-pennant-alphabet', title: 'Pennant Alphabet Banner', category: 'nursery', age: 'All ages', description: 'A to Z pennants plus a heart, a star and an ampersand. Print the letters you need, thread a ribbon, spell any name.', labels: bannerLetters, perPage: 6, build: buildPennants },
  { slug: 'lunchbox-love-notes', title: 'Lunchbox Love Notes', category: 'lunchbox', age: '4–10 years', description: 'Twenty-four little notes to tuck into a lunchbox. Encouragement, hugs and a reminder to eat the crusts.', notes: LOVE_NOTES, grid: { cols: 3, rows: 4 }, draw: lunchboxCard, build: buildNoteCards },
  { slug: 'lunchbox-jokes', title: 'Lunchbox Jokes', category: 'lunchbox', age: '5–10 years', description: 'Twenty-four groan-worthy jokes for the lunch table. One a day for nearly five school weeks.', notes: JOKES, grid: { cols: 3, rows: 4 }, draw: lunchboxCard, build: buildNoteCards },
  { slug: 'star-reward-chart', title: 'Star Reward Chart', category: 'charts', age: '3–8 years', description: 'Write up to six goals, colour a star each time one is met. Ten stars a row, then the treat.', kicker: 'Reward chart', sub: 'Write a goal on each line. Colour in a star every time it happens. When a row is full, it is time for the reward you agreed on.', rows: ['', '', '', '', '', ''], cols: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], cell: 'star', labelW: 170, rightLabel: 'Reward', bottomNote: 'Tip: pick goals your child can finish in a day (shoes on without being asked, teeth brushed twice) and let them do the colouring in. The chart works because they see the row filling up.', build: buildChart },
  { slug: 'morning-routine-chart', title: 'Morning Routine Chart', category: 'charts', age: '3–8 years', description: 'Seven morning jobs, seven days. Tick the circle and get out the door with fewer reminders.', kicker: 'Routine chart', sub: 'Tick each circle as the job is done. Stick it on the fridge at child height.', rows: ['Wake up and stretch', 'Get dressed', 'Eat breakfast', 'Brush teeth', 'Brush hair', 'Pack bag', 'Shoes on'], cols: dayCols, cell: 'circle', labelW: 160, build: buildChart },
  { slug: 'bedtime-routine-chart', title: 'Bedtime Routine Chart', category: 'charts', age: '2–7 years', description: 'Bath, pyjamas, teeth, story, cuddle, lights out. The same six steps every night, in the same order.', kicker: 'Routine chart', sub: 'The same steps in the same order every night is what makes bedtime easier. Tick the circles together.', rows: ['Tidy up toys', 'Bath time', 'Pyjamas on', 'Brush teeth', 'Story time', 'Cuddle and goodnight', 'Lights out'], cols: dayCols, cell: 'circle', labelW: 160, build: buildChart },
  { slug: 'weekly-chore-chart', title: 'Weekly Chore Chart', category: 'charts', age: '5–12 years', description: 'Eight blank rows for the jobs you choose, Monday to Sunday. Stars to colour when they are done.', kicker: 'Chore chart', sub: 'Write the jobs on the lines. Colour a star for each one done. Pocket money optional.', rows: ['', '', '', '', '', '', '', ''], cols: dayCols, cell: 'star', labelW: 170, build: buildChart },
  { slug: 'potty-training-chart', title: 'Potty Training Chart', category: 'charts', age: '2–4 years', description: 'Seven days, six tries a day. A star for every sit, whatever happens. Gentle, no pressure.', kicker: 'Potty chart', sub: 'A star for every try, not just every success. Sitting down and giving it a go is the whole job at this age.', rows: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'], cols: ['Try 1', 'Try 2', 'Try 3', 'Try 4', 'Try 5', 'Try 6'], cell: 'star', labelW: 110, rightLabel: 'Prize', bottomNote: 'Tip: keep the chart beside the potty and let them put the colour on the star themselves. Accidents do not take stars away. Ever.', build: buildChart },
  { slug: 'tooth-fairy-certificate', title: 'Tooth Fairy Certificate', category: 'party', age: '5–9 years', description: 'An official certificate of a lost tooth, signed by the Tooth Fairy herself. Fill in the name, date and the going rate.', build: buildToothCertificate },
  { slug: 'tooth-fairy-pocket', title: 'Tooth Fairy Pocket', category: 'party', age: '5–9 years', description: 'A fold-up envelope for the tooth and a little note card to go under the pillow with it.', build: buildToothPocket },
  { slug: 'happy-birthday-bunting', title: 'Happy Birthday Bunting', category: 'party', age: 'All ages', description: 'HAPPY BIRTHDAY on fifteen big pennants, two to a page, plus two blank ones for a name. Thread on ribbon and hang.', labels: [...'HAPPY'.split(''), '♥', ...'BIRTHDAY'.split(''), '★', ' '], perPage: 2, build: buildPennants },
  { slug: 'birthday-number-pennants', title: 'Birthday Number Pennants', category: 'party', age: 'All ages', description: 'Numbers 0 to 9 as big pennants, so the bunting can say exactly how old. Two to a page.', labels: '0123456789'.split(''), perPage: 2, colour: GREEN, band: TEAL, build: buildPennants },
  { slug: 'cupcake-toppers', title: 'Cupcake Toppers', category: 'party', age: 'All ages', description: 'Twelve round toppers: Happy Birthday, Make a Wish, Hooray, and stars, hearts and cakes to mix in. Cut out and tape to a toothpick.', notes: [
    { kind: 'text', text: 'Happy\nBirthday', colour: RED }, { kind: 'star', colour: RED }, { kind: 'text', text: 'Make\na wish', colour: GREEN }, { kind: 'cake', colour: INK },
    { kind: 'heart', colour: RED }, { kind: 'text', text: 'Hooray!', colour: RED }, { kind: 'star', colour: GREEN }, { kind: 'text', text: 'Party\ntime', colour: INK },
    { kind: 'cake', colour: RED }, { kind: 'text', text: 'Happy\nBirthday', colour: GREEN }, { kind: 'heart', colour: GREEN }, { kind: 'text', text: 'Yay!', colour: RED },
  ], grid: { cols: 3, rows: 4 }, draw: cupcakeTopper, footNote: 'cut around the dotted circle and tape to a toothpick', build: buildNoteCards },
  { slug: 'party-thank-you-tags', title: 'Party Thank-You Tags', category: 'party', age: 'All ages', description: 'Eight tags for party bags: thank you for coming, with a line for each guest’s name.', notes: [
    { title: 'Thank you for coming', orn: 'balloon', colour: RED }, { title: 'Thanks for celebrating', orn: 'star', colour: GREEN }, { title: 'You made my day', orn: 'heart', colour: RED }, { title: 'Thank you for coming', orn: 'star', colour: RED },
    { title: 'Thanks for the fun', orn: 'balloon', colour: GREEN }, { title: 'Thank you for coming', orn: 'heart', colour: GREEN }, { title: 'So glad you came', orn: 'star', colour: RED }, { title: 'Thanks for celebrating', orn: 'balloon', colour: RED },
  ], grid: { cols: 2, rows: 4 }, draw: giftTag, build: buildNoteCards },
  { slug: 'letter-to-santa', title: 'Letter to Santa', category: 'christmas', age: '3–9 years', description: 'A guided letter to the North Pole with prompts for the year’s kindnesses, a wish for someone else, and the reindeer snacks.', build: buildSantaLetter },
  { slug: 'christmas-countdown', title: 'Sleeps Until Christmas', category: 'christmas', age: '2–8 years', description: 'Twenty-four baubles to colour, one a day through December.', build: buildCountdown },
  { slug: 'christmas-gift-tags', title: 'Christmas Gift Tags', category: 'christmas', age: 'All ages', description: 'Eight gift tags with trees, baubles, snowflakes and stars. To and from lines, hole mark for the ribbon.', notes: [
    { title: 'Merry Christmas', orn: 'tree', colour: GREEN }, { title: 'For you', orn: 'bauble', colour: RED }, { title: 'Happy Christmas', orn: 'snowflake', colour: rgb(0.35, 0.55, 0.7) }, { title: 'With love', orn: 'star', colour: RED },
    { title: 'Merry Christmas', orn: 'bauble', colour: GREEN }, { title: 'Do not open until Christmas', orn: 'tree', colour: RED }, { title: 'Season’s greetings', orn: 'star', colour: GREEN }, { title: 'From Santa', orn: 'snowflake', colour: RED },
  ], grid: { cols: 2, rows: 4 }, draw: giftTag, build: buildNoteCards },
  ...XMAS_COLOURING.map(([file, title, description, age]) => ({ slug: `colouring-${file.replace(/^\d+-/, '')}`, title: `${title} Colouring Page`, category: 'christmas', age, description, file, caption: title, build: buildColouring })),
  { slug: 'christmas-memory-match', title: 'Christmas Memory Match', category: 'christmas', age: '3–8 years', description: 'Twelve pairs of Little Poppin Christmas paintings on cut-out cards. Robins, reindeer, gingerbread and snow.', files: FILES_MEMORY_XMAS, build: buildMemory },
  { slug: 'easter-card-to-colour', title: 'Easter Card to Colour', category: 'cards', age: '3–8 years', description: 'A fold-in-half card with a big patterned egg on the front. Colour it, fold it, write inside.', drawFront: easterFront, build: buildFoldCard },
  { slug: 'mothers-day-card-to-colour', title: 'Mother’s Day Card to Colour', category: 'cards', age: '3–9 years', description: 'A vase of flowers to colour on the front of a fold-in-half card. Blank inside for the message.', drawFront: mothersFront, build: buildFoldCard },
  { slug: 'fathers-day-card-to-colour', title: 'Father’s Day Card to Colour', category: 'cards', age: '3–9 years', description: 'A No. 1 Dad medal to colour on the front of a fold-in-half card. Blank inside.', drawFront: fathersFront, build: buildFoldCard },
  { slug: 'easter-egg-patterns', title: 'Decorate the Eggs', category: 'cards', age: '3–8 years', description: 'Six Easter eggs with stripes, dots, zigzags, hearts and stars to colour, or cut out for an Easter tree.', build: buildEggSheet },
  { slug: 'nursery-memory-match', title: 'Nursery Memory Match', category: 'games', age: '3–8 years', description: 'Twelve pairs of Little Poppin nursery paintings on cut-out cards. Bunnies, whales, owls and a unicorn.', files: FILES_MEMORY_NURSERY, build: buildMemory },
  { slug: 'dot-to-dot-star-and-heart', title: 'Dot to Dot: Star and Heart', category: 'games', age: '3–6 years', description: 'Two easy dot-to-dots, 10 and 20 dots, then colour them in.', shapes: [{ title: 'A Star', points: STAR_PTS }, { title: 'A Heart', points: HEART_PTS }], build: buildDotToDot },
  { slug: 'dot-to-dot-sailboat', title: 'Dot to Dot: Sailboat', category: 'games', age: '4–7 years', description: 'Twelve dots make a sailboat. Add the sea and the sun yourself.', shapes: [{ title: 'A Sailboat', points: BOAT_PTS }], build: buildDotToDot },
  { slug: 'dot-to-dot-rocket', title: 'Dot to Dot: Rocket', category: 'games', age: '4–7 years', description: 'Fourteen dots to a rocket, ready for a window, flames and a planet or two.', shapes: [{ title: 'A Rocket', points: ROCKET_PTS }], build: buildDotToDot },
  { slug: 'dot-to-dot-house', title: 'Dot to Dot: House', category: 'games', age: '3–6 years', description: 'Eleven dots to a little house with a chimney. Then draw who lives there.', shapes: [{ title: 'A House', points: HOUSE_PTS }], build: buildDotToDot },
  { slug: 'baby-shower-predictions', title: 'Baby Predictions', category: 'shower', age: 'Grown-ups', description: 'Date, time, weight, hair, eyes and a name guess. One sheet per guest, kept until the big day.', build: buildPredictions },
  { slug: 'baby-shower-wishes', title: 'Wishes for Baby', category: 'shower', age: 'Grown-ups', description: 'I hope you learn, I hope you laugh at, I hope you never forget. A keepsake sheet for every guest to fill in.', build: buildWishes },
  { slug: 'baby-shower-word-scramble', title: 'Baby Word Scramble', category: 'shower', age: 'Grown-ups', description: 'Sixteen scrambled baby words with an answer page for the host.', words: SCRAMBLE_WORDS, build: buildScramble },
  { slug: 'baby-shower-gift-bingo', title: 'Gift Bingo', category: 'shower', age: 'Grown-ups', description: 'Six different bingo cards. Cross off the presents as they are opened; first line wins.', words: BINGO_WORDS, cards: 6, build: buildBingo },
  { slug: 'baby-shower-advice-cards', title: 'Advice for the New Parents', category: 'shower', age: 'Grown-ups', description: 'Two cards per sheet with three prompts each, for the advice that actually helps at 3 a.m.', build: buildAdviceCards },
  { slug: 'baby-shower-nappy-raffle', title: 'Nappy Raffle Tickets', category: 'shower', age: 'Grown-ups', description: 'Numbered tickets with tear-off stubs. Bring nappies, take a ticket, win a prize.', build: buildRaffle },
];

// ============================================================================
// Build.
// ============================================================================
const only = process.argv.slice(2);
const todo = only.length ? ITEMS.filter((i) => only.includes(i.slug)) : ITEMS;
if (!todo.length) { console.error('no matching printables'); process.exit(1); }

const dupes = ITEMS.map((i) => i.slug).filter((s, i, a) => a.indexOf(s) !== i);
if (dupes.length) throw new Error(`duplicate slugs: ${dupes.join(', ')}`);

const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).items || [] : [];
const manifest = [];
for (const item of ITEMS) {
  if (!todo.includes(item)) { const prev = previous.find((p) => p.slug === item.slug); if (prev) manifest.push(prev); continue; }
  process.stdout.write(`${item.slug} `);
  const doc = await item.build(item);
  const pdfPath = path.join(PDF_DIR, `${item.slug}.pdf`);
  fs.writeFileSync(pdfPath, await doc.save());
  const previewBase = path.join(IMG_DIR, item.slug);
  execFileSync('pdftoppm', ['-jpeg', '-jpegopt', 'quality=84', '-singlefile', '-f', '1', '-l', '1', '-scale-to', '900', pdfPath, previewBase]);
  const ogPath = path.join(OG_DIR, `${item.slug}.jpg`);
  const cat = CATEGORIES.find(([k]) => k === item.category)[1];
  execFileSync('python3', [ART, 'og', `${previewBase}.jpg`, ogPath, item.title, `Free printable · ${cat}`]);
  manifest.push({
    slug: item.slug, title: item.title, category: item.category, age: item.age, description: item.description,
    pages: doc.getPageCount(), bytes: fs.statSync(pdfPath).size,
    pdf: `/printables/free/${item.slug}.pdf`, preview: `/images/printables/${item.slug}.jpg`, og: `/images/printables/og/${item.slug}.jpg`,
    page: `/printables/${item.slug}.html`,
  });
  console.log(`${doc.getPageCount()}p`);
}

fs.writeFileSync(MANIFEST, JSON.stringify({
  generated: 'scripts/build-printables.mjs',
  categories: CATEGORIES.map(([key, label]) => ({ key, label })),
  items: manifest,
}, null, 2) + '\n');
console.log(`\n${manifest.length} printables → ${path.relative(REPO, MANIFEST)}`);
