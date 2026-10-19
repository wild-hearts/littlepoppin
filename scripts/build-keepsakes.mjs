// build-keepsakes.mjs. The cards-and-invitations catalogue, built from the print library.
//
// WHAT IT WRITES
//   keepsakes/art.generated.js   one entry per print: slug, title, preview, section and a palette
//                                read off the picture itself (paper, ink, accent, foil), so every
//                                envelope and card takes its colour from the art it sits on.
//   card/<slug>.html             one indexable page per e-card (the editor)
//   invitation/<slug>.html       one indexable page per invitation design (the editor)
//   cards.html, invitations.html the galleries, with every tile a real link for crawlers
//
// Re-runnable and safe: it only writes those files. Run after build-prints-shop.mjs
// whenever a print is added, then commit the output. `npm run build:keepsakes`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.littlepoppin.com';
const data = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'prints.json'), 'utf8'));

// ---------------------------------------------------------------- colour
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

// Read the picture: its overall tone (how dark the scene is, which hue it leans to) and its
// strongest coloured note (the accent). Sampled every few pixels; the previews are 800px wide.
function readArt(file) {
  const { data: px, width, height } = jpeg.decode(fs.readFileSync(file), { useTArray: true, formatAsRGBA: true });
  const step = 4;
  let n = 0, lum = 0, hx = 0, hy = 0, sat = 0;
  const buckets = Array.from({ length: 12 }, () => ({ n: 0, h: 0, s: 0, l: 0 }));
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);
    n++; lum += l; sat += s;
    const w = s * (1 - Math.abs(l - 0.5) * 1.4);           // weight towards coloured, mid-tone pixels
    hx += Math.cos(h * Math.PI / 180) * w; hy += Math.sin(h * Math.PI / 180) * w;
    if (s > 0.28 && l > 0.22 && l < 0.82) { const k = buckets[Math.floor(h / 30) % 12]; k.n++; k.h += h; k.s += s; k.l += l; }
  }
  const tone = ((Math.atan2(hy, hx) * 180 / Math.PI) + 360) % 360;
  const top = buckets.reduce((a, b) => (b.n > a.n ? b : a), buckets[0]);
  const accent = top.n ? { h: top.h / top.n, s: top.s / top.n, l: top.l / top.n } : { h: tone, s: 0.4, l: 0.5 };
  return { lum: lum / n, sat: sat / n, tone, accent };
}

// Turn a reading into a card palette. Dark scenes get a dark card with cream lettering, light
// scenes a pale paper tinted toward the picture. The foil follows the accent: warm hues gold,
// pinks rose, blues and greys silver (the same rule Tadavite uses, lib/designs.js pickFoil).
function palette(a) {
  const dark = a.lum < 0.46;
  const h = a.tone, ah = a.accent.h;
  const paper = dark ? hslToHex(h, 0.28, 0.13) : hslToHex(h, 0.45, 0.965);
  const ink = dark ? hslToHex(h, 0.35, 0.93) : hslToHex(h, 0.3, 0.17);
  const accent = hslToHex(ah, clamp(a.accent.s * 0.9, 0.35, 0.6), dark ? 0.62 : 0.4);
  const foil = (ah > 185 && ah < 265) || a.accent.s < 0.2 ? 'silver' : (ah > 300 || ah < 12) && a.accent.s > 0.3 ? 'rose' : 'gold';
  const metal = { gold: dark ? '#d8b25a' : '#b48a3c', rose: dark ? '#e8b4a4' : '#c4847a', silver: dark ? '#cfd6dd' : '#8a949e' }[foil];
  return { paper, ink, accent, metal, dark, foil };
}

// Section defaults: type, ornament and where the greeting sits on the picture. Nursery, zodiac
// and festive prints keep their subject in the lower two thirds under a quiet sky, so the
// greeting goes in a band at the top. The academia scenes are busy to the edges: a soft gradient
// at the foot covers the least.
const SECTION = {
  nursery:  { fonts: ['fraunces', 'cormorant', 'playfair', 'dmserif'], border: 'stars', layout: 'banner' },
  zodiac:   { fonts: ['italiana', 'cormorant', 'playfair'], border: 'stars', layout: 'banner' },
  academia: { fonts: ['playfair', 'bodoni', 'cormorant', 'fraunces'], border: 'deco', layout: 'foot' },
  festive:  { fonts: ['playfair', 'dmserif', 'cormorant', 'fraunces'], border: 'vine', layout: 'banner' },
};

const art = [];
data.prints.forEach((p, i) => {
  if (!p.available || p.sku.startsWith('set-')) return;
  const file = path.join(REPO, p.preview.replace(/^\//, ''));
  if (!fs.existsSync(file)) return;
  const s = SECTION[p.section] || SECTION.nursery;
  const pal = palette(readArt(file));
  art.push({
    slug: p.sku.replace(/^print-/, ''), sku: p.sku, title: p.title, description: p.description, preview: p.preview, section: p.section,
    font: s.fonts[i % s.fonts.length], border: s.border, layout: s.layout,
    card: { paper: pal.paper, ink: pal.ink, accent: pal.accent, metal: pal.metal, dark: pal.dark }, foil: pal.foil,
  });
});

const out = `// GENERATED by scripts/build-keepsakes.mjs from data/prints.json and images/prints/. Do not edit by hand.
// One entry per print: the art and a palette read from the picture (see the script for how).
export const ART = ${JSON.stringify(art, null, 1)};
`;
fs.writeFileSync(path.join(REPO, 'keepsakes', 'art.generated.js'), out);
console.log(`keepsakes: ${art.length} prints → keepsakes/art.generated.js`);

// The pages need the catalogue, which needs the file just written.
const { buildPages } = await import('./keepsakes-pages.mjs');
await buildPages({ REPO, SITE });
