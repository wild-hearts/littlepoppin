// pin-image.mjs. Draws a Pinterest pin: the artwork on top, a quiet caption strip in the house fonts below,
// 1000×1500 (2:3). Shared by build-pins.mjs (the Little Poppin catalogue) and build-tadavite-pins.mjs.
//
// Text is drawn as SVG paths through opentype.js (assets/fonts), not through fontconfig, so the pins look
// the same on any machine. Images are composed with sharp. Both are devDependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as opentype from 'opentype.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PIN_W = 1000, PIN_H = 1500, ART_H = 1250;   // 2:3 pin, 4:5 artwork on top, caption strip below
const CREAM = '#FEF9F5', RED = '#B5223E', INK = '#2b2320', INK_SOFT = '#7a6e66';

// ---------------------------------------------------------------- fonts → SVG paths
const parseFont = (file) => { const b = fs.readFileSync(path.join(REPO, 'assets', 'fonts', file)); return (opentype.parse || opentype.default.parse)(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const CORMORANT = parseFont('CormorantGaramond.ttf');
const LATO = parseFont('Lato-Regular.ttf');
const num = (n) => String(Math.round(n * 100) / 100);
// opentype's own serialiser writes exponent floats and (in 2.x) flips Y when given options, both of which
// librsvg rejects, so the commands are written out by hand with two decimals.
const pathData = (p) => p.commands.map((c) => c.type === 'M' || c.type === 'L' ? `${c.type}${num(c.x)} ${num(c.y)}`
  : c.type === 'C' ? `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`
  : c.type === 'Q' ? `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}` : 'Z').join('');
const width = (font, text, size, spacing = 0) => font.getAdvanceWidth(text, size, { letterSpacing: spacing });
const textPath = (font, text, size, y, fill, { spacing = 0, centre = PIN_W / 2 } = {}) => {
  const x = centre - width(font, text, size, spacing) / 2;
  return `<path d="${pathData(font.getPath(text, x, y, size, { letterSpacing: spacing }))}" fill="${fill}"/>`;
};
// A title on one line when it fits, else balanced over two.
const titleLines = (text) => {
  const fits = (t, s) => width(CORMORANT, t, s) <= PIN_W - 120;
  for (const size of [62, 56, 50]) if (fits(text, size)) return { size, lines: [text] };
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(width(CORMORANT, a, 48), width(CORMORANT, b, 48));
    if (!best || w < best.w) best = { w, lines: [a, b] };
  }
  return { size: 48, lines: best.lines };
};

// ---------------------------------------------------------------- the caption strip
const strip = ({ title, line, small }) => {
  const t = titleLines(title);
  const top = ART_H;
  const parts = [`<rect x="0" y="${top}" width="${PIN_W}" height="${PIN_H - top}" fill="${CREAM}"/>`,
    `<rect x="${PIN_W / 2 - 28}" y="${top + 34}" width="56" height="2" fill="${RED}"/>`];
  if (t.lines.length === 1) {
    parts.push(textPath(CORMORANT, t.lines[0], t.size, top + 112, INK));
  } else {
    parts.push(textPath(CORMORANT, t.lines[0], t.size, top + 96, INK), textPath(CORMORANT, t.lines[1], t.size, top + 148, INK));
  }
  parts.push(textPath(LATO, line.toUpperCase(), 19, top + 190, RED, { spacing: 0.18 }));
  parts.push(textPath(LATO, small, 15, top + 228, INK_SOFT, { spacing: 0.06 }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}">${parts.join('')}</svg>`;
};

// ---------------------------------------------------------------- the pin image
/**
 * Render one pin. `src` is the artwork (a path in the repo or a Buffer), `out` the JPEG to write, `caption`
 * { title, line, small }. Skips the work when `out` is newer than the artwork and this module, unless `force`.
 * Returns true when it rendered, false when it kept the existing file.
 */
export async function renderPin({ src, out, caption, force = false }) {
  const srcTime = Buffer.isBuffer(src) ? Infinity : fs.statSync(src).mtimeMs;
  if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs > srcTime && fs.statSync(out).mtimeMs > SELF_MTIME) return false;
  const meta = await sharp(src).metadata();
  const landscape = meta.width / meta.height > 1;
  // Portrait art fills the 4:5 window (cover); a landscape set mock-up sits inside it on cream (contain).
  const art = landscape
    ? await sharp(src).resize({ width: PIN_W - 100, height: ART_H - 100, fit: 'inside' }).toBuffer()
    : await sharp(src).resize({ width: PIN_W, height: ART_H, fit: 'cover', position: 'attention' }).toBuffer();
  const artMeta = await sharp(art).metadata();
  await sharp({ create: { width: PIN_W, height: PIN_H, channels: 3, background: CREAM } })
    .composite([
      { input: art, top: landscape ? Math.round((ART_H - artMeta.height) / 2) : 0, left: landscape ? Math.round((PIN_W - artMeta.width) / 2) : 0 },
      { input: Buffer.from(strip(caption)), top: 0, left: 0 },
    ])
    .jpeg({ quality: 74, mozjpeg: true })
    .toFile(out);
  return true;
}
const SELF_MTIME = fs.statSync(fileURLToPath(import.meta.url)).mtimeMs;

