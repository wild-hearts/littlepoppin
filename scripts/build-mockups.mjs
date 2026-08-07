// build-mockups.mjs — framed-on-wall mockups for every print, set and bundle.
//
// WHY: the shop showed every design as flat artwork on a white card. People buying wall
// art are not buying a JPEG, they are buying how it will look above the cot — and every
// competitor on Etsy leads with a framed mockup. This is the highest-leverage image work
// on the site, and it feeds the product pages, Etsy listings and social posts alike.
//
// Deliberately a clean studio mockup rather than a faked lifestyle photo: a real room
// would need real photography, and a composited "nursery scene" made from stock would
// misrepresent the product. A framed print on a warm wall is honest and still does the
// contextual work.
//
// Output: images/mockups/<slug>.jpg          single prints (4:5, 1200x1500)
//         images/mockups/<set-sku>.jpg        gallery walls (1600x1100)
// Re-runnable: existing files are skipped unless --force.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(REPO, 'images', 'mockups');
const TMP = path.join(REPO, 'dist', '.mockup-tmp');
const FORCE = process.argv.includes('--force');

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const catalogue = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'prints.json'), 'utf8'));
const slugOf = (sku) => sku.replace(/^(print|set|bundle)-/, '');

const WALL_TOP = '#F3EDE6';
const WALL_BOTTOM = '#E1D8CE';
const MAT = '#FBF7F2';
const FRAME = '#2E2A26';

/** A wall panel with a soft vertical gradient and a whisper of texture. */
function wall(w, h, out) {
  execFileSync('magick', [
    '-size', `${w}x${h}`, `gradient:${WALL_TOP}-${WALL_BOTTOM}`,
    '(', '-size', `${w}x${h}`, 'xc:gray50', '+noise', 'Gaussian', '-attenuate', '0.35', '-colorspace', 'gray', ')',
    '-compose', 'overlay', '-composite', out,
  ]);
  return out;
}

/** Artwork → matted, framed panel with transparent surround. */
function framed(src, artW, artH, mat, frame, out) {
  execFileSync('magick', [
    src, '-resize', `${artW}x${artH}^`, '-gravity', 'center', '-extent', `${artW}x${artH}`,
    '-bordercolor', MAT, '-border', String(mat),
    '-bordercolor', FRAME, '-border', String(frame),
    out,
  ]);
  return out;
}

/** Drop the framed panel(s) onto the wall with a soft shadow. */
function onWall(wallPath, panel, out) {
  execFileSync('magick', [
    wallPath,
    '(', panel, '(', '+clone', '-background', 'black', '-shadow', '42x20+0+16', ')',
    '+swap', '-background', 'none', '-layers', 'merge', '+repage', ')',
    '-gravity', 'center', '-composite', '-quality', '88', out,
  ]);
}

// --- single prints ----------------------------------------------------------
const wallSingle = wall(1200, 1500, path.join(TMP, 'wall-single.png'));
let made = 0, skipped = 0;

for (const p of catalogue.prints) {
  const out = path.join(OUT, `${slugOf(p.sku)}.jpg`);
  if (fs.existsSync(out) && !FORCE) { skipped++; continue; }
  const src = path.join(REPO, p.preview.replace(/^\//, ''));
  if (!fs.existsSync(src)) { console.log(`  ! missing preview for ${p.sku}`); continue; }
  const panel = framed(src, 560, 700, 62, 26, path.join(TMP, 'panel.png'));
  onWall(wallSingle, panel, out);
  made++;
  process.stdout.write('.');
}
console.log(`\n${made} print mockups (${skipped} already existed)`);

// --- sets and bundles -------------------------------------------------------
// A three-print set becomes a gallery wall of three. A big collection shows six, which
// reads as "lots of prints" without shrinking each to an unreadable stamp.
const wallWide = wall(1600, 1100, path.join(TMP, 'wall-wide.png'));
const bySku = Object.fromEntries(catalogue.prints.map((p) => [p.sku, p]));
let setsMade = 0, setsSkipped = 0;

for (const s of catalogue.sets) {
  const out = path.join(OUT, `${s.sku}.jpg`);
  if (fs.existsSync(out) && !FORCE) { setsSkipped++; continue; }

  const comps = s.items.map((sku) => bySku[sku]).filter(Boolean);
  if (!comps.length) continue;

  // Sample evenly so a big collection's mockup isn't just its first six designs.
  const count = comps.length <= 3 ? comps.length : 6;
  const picks = Array.from({ length: count }, (_, i) => comps[Math.floor((i * comps.length) / count)]);

  const panels = picks.map((c, i) => {
    const src = path.join(REPO, c.preview.replace(/^\//, ''));
    return framed(src, 300, 375, 30, 16, path.join(TMP, `g${i}.png`));
  });

  const strip = path.join(TMP, 'strip.png');
  if (count <= 3) {
    execFileSync('magick', [...panels, '-background', 'none', '+smush', '34', strip]);
  } else {
    const rowA = path.join(TMP, 'rowA.png');
    const rowB = path.join(TMP, 'rowB.png');
    execFileSync('magick', [...panels.slice(0, 3), '-background', 'none', '+smush', '30', rowA]);
    execFileSync('magick', [...panels.slice(3), '-background', 'none', '+smush', '30', rowB]);
    execFileSync('magick', [rowA, rowB, '-background', 'none', '-smush', '26', strip]);
  }

  onWall(wallWide, strip, out);
  setsMade++;
  process.stdout.write('+');
}
console.log(`\n${setsMade} set/bundle mockups (${setsSkipped} already existed)`);
console.log(`\nWrote to images/mockups/`);
