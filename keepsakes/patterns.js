// keepsakes/patterns.js. Tileable SVG patterns generated from a card's palette, so a patterned card needs
// no artwork file at all. Each returns a CSS background declaration string. Ported from Tadavite's
// lib/patterns.js, with a mixer so a pattern can be drawn in a tint of the card's own accent.
// Single-quoted and with every apostrophe escaped, so the value survives inside a double-quoted style attribute.
const enc = (svg) => `url('data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim()).replace(/'/g, '%27')}')`;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// A hex colour `k` of the way from a to b (0 = a, 1 = b), for tints without color-mix() in an SVG.
export function mix(a, b, k) {
  const h = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [ar, ag, ab] = h(a), [br, bg, bb] = h(b);
  return '#' + [ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

const P = {
  dots: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26'><circle cx='13' cy='13' r='2.2' fill='${a}'/></svg>`), color: bg, size: '26px 26px' }),
  confetti: ({ bg, a, b, c }, seed = 7) => {
    const r = rng(seed), cols = [a, b || a, c || a]; let s = '';
    for (let i = 0; i < 26; i++) {
      const x = (r() * 180).toFixed(1), y = (r() * 180).toFixed(1), rot = Math.round(r() * 180), col = cols[i % cols.length];
      s += r() > 0.45 ? `<rect x='${x}' y='${y}' width='${(4 + r() * 5).toFixed(1)}' height='${(2 + r() * 2).toFixed(1)}' rx='1' fill='${col}' transform='rotate(${rot} ${x} ${y})'/>` : `<circle cx='${x}' cy='${y}' r='${(1.5 + r() * 2.2).toFixed(1)}' fill='${col}'/>`;
    }
    return { image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>${s}</svg>`), color: bg, size: '180px 180px' };
  },
  stripes: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='56' height='10'><rect width='28' height='10' fill='${a}'/></svg>`), color: bg, size: '56px 10px' }),
  candy: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M-10 40 L40 -10 M0 50 L50 0 M10 60 L60 10' stroke='${a}' stroke-width='9' fill='none'/></svg>`), color: bg, size: '40px 40px' }),
  scallop: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20'><g fill='none' stroke='${a}' stroke-width='1.3'><path d='M0 20 A20 20 0 0 1 40 20'/><path d='M-20 10 A20 20 0 0 1 20 10'/><path d='M20 10 A20 20 0 0 1 60 10'/></g></svg>`), color: bg, size: '40px 20px' }),
  sparkle: ({ bg, a, b }) => {
    const star = (x, y, s, col) => `<path d='M${x} ${y - s} C${x + s * 0.18} ${y - s * 0.18} ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} C${x + s * 0.18} ${y + s * 0.18} ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} C${x - s * 0.18} ${y + s * 0.18} ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} C${x - s * 0.18} ${y - s * 0.18} ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z' fill='${col}'/>`;
    return { image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>${star(24, 30, 9, a)}${star(84, 22, 4, b || a)}${star(70, 84, 7, a)}${star(18, 92, 3.5, b || a)}${star(104, 62, 3, a)}</svg>`), color: bg, size: '120px 120px' };
  },
  checker: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='20' height='20' fill='${a}'/><rect x='20' y='20' width='20' height='20' fill='${a}'/></svg>`), color: bg, size: '40px 40px' }),
  waves: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='18'><path d='M0 9 Q15 0 30 9 T60 9' fill='none' stroke='${a}' stroke-width='1.4'/></svg>`), color: bg, size: '60px 18px' }),
  gingham: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='16' height='32' fill='${a}' opacity='.45'/><rect width='32' height='16' fill='${a}' opacity='.45'/></svg>`), color: bg, size: '32px 32px' }),
  arches: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='64'><path d='M6 64 V26 A18 18 0 0 1 42 26 V64' fill='none' stroke='${a}' stroke-width='1.3'/></svg>`), color: bg, size: '48px 64px' }),
  hearts: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><path d='M24 36 L12 24 A6 6 0 0 1 24 16 A6 6 0 0 1 36 24 Z' fill='${a}'/></svg>`), color: bg, size: '48px 48px' }),
  stars: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><path d='M16 4 L18.4 11.6 L26 12 L20 16.6 L22 24 L16 19.6 L10 24 L12 16.6 L6 12 L13.6 11.6Z' fill='${a}'/><path d='M48 36 L49.5 40.5 L54 41 L50.5 43.8 L51.5 48 L48 45.6 L44.5 48 L45.5 43.8 L42 41 L46.5 40.5Z' fill='${a}'/></svg>`), color: bg, size: '64px 64px' }),
  rainbow: ({ bg, a, b, c }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='48'><g fill='none' stroke-width='4'><path d='M8 48 A40 40 0 0 1 88 48' stroke='${a}'/><path d='M16 48 A32 32 0 0 1 80 48' stroke='${b || a}'/><path d='M24 48 A24 24 0 0 1 72 48' stroke='${c || a}'/></g></svg>`), color: bg, size: '96px 48px' }),
  snow: ({ bg, a }) => ({ image: enc(`<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'><g fill='${a}'><circle cx='10' cy='12' r='2.4'/><circle cx='44' cy='8' r='1.6'/><circle cx='60' cy='34' r='2.8'/><circle cx='26' cy='40' r='1.8'/><circle cx='8' cy='60' r='1.4'/><circle cx='40' cy='62' r='2.2'/></g></svg>`), color: bg, size: '70px 70px' }),
};
export const PATTERN_KINDS = Object.keys(P);

// A CSS background declaration for a pattern in the card's colours. `tint` is how far the pattern colour
// sits from the paper toward the accent (0.22 is a whisper, 0.5 is bold).
export function patternCss(kind, { paper, accent, metal, dark }, { tint = 0.22, seed } = {}) {
  const fn = P[kind] || P.dots;
  const a = mix(paper, accent, dark ? tint + 0.1 : tint), b = mix(paper, metal, dark ? tint + 0.05 : tint * 0.9), c = mix(paper, accent, tint * 0.6);
  const out = fn({ bg: paper, a, b, c }, seed);
  return `background-color:${out.color};background-image:${out.image};background-size:${out.size}`;
}
