// keepsakes/render.js. How an envelope, a card and an invitation are drawn.
//
// Two halves. The first returns HTML strings, so the build script (Node) and the browser draw the
// same markup: gallery tiles come out of the build fully formed for crawlers, and the editors redraw
// the same pieces live as the sender types. The second half is browser-only behaviour: breaking the
// seal, the opening ritual, the book-style card spread, the countdown, the gold dust.
import { themeVars, foilStops, niceDate, niceTime } from './shared.js';
import { patternCss } from './patterns.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uid = 0;
const nextId = (p) => `${p}${(uid++).toString(36)}`;

// ---------------------------------------------------------------- pieces
// A wax seal with an irregular poured edge, a pressed inner ring and an embossed initial. Colour from --seal.
export function waxSeal(letter = '✦', size = 72) {
  const u = nextId('wx');
  const pts = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2, r = 46 + (i % 3 === 0 ? 3.5 : i % 2 ? -1.5 : 1.5);
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`);
  }
  const small = String(letter).length > 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" class="wax"><defs>
<radialGradient id="${u}" cx=".36" cy=".32" r=".8"><stop offset="0" style="stop-color:color-mix(in srgb,var(--seal) 55%,#fff)"/><stop offset=".45" style="stop-color:var(--seal)"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--seal) 55%,#000)"/></radialGradient>
<filter id="${u}s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".45"/></filter></defs>
<polygon points="${pts.join(' ')}" fill="url(#${u})" filter="url(#${u}s)"/>
<circle cx="50" cy="50" r="33" fill="none" style="stroke:color-mix(in srgb,var(--seal) 60%,#000)" stroke-width="3" opacity=".55"/>
<circle cx="50" cy="50" r="33" fill="none" style="stroke:color-mix(in srgb,var(--seal) 40%,#fff)" stroke-width="1" opacity=".5" transform="translate(-.8 -.8)"/>
<text x="50" y="${small ? 57 : 62}" text-anchor="middle" font-size="${small ? 18 : 34}" font-family="var(--c-font),Georgia,serif" font-weight="700" style="paint-order:stroke;fill:color-mix(in srgb,var(--seal) 70%,#000);stroke:color-mix(in srgb,var(--seal) 30%,#fff)" stroke-width=".8">${esc(letter)}</text>
<ellipse cx="36" cy="30" rx="12" ry="6" fill="#fff" opacity=".18" transform="rotate(-30 36 30)"/></svg>`;
}

const CORNERS = {
  deco: 'M2 60 V2 H60 M10 60 V10 H60 M18 44 V18 H44 M2 26 H26 V2',
  double: 'M4 70 V4 H70 M12 70 V12 H70',
  ornate: 'M4 80 C4 40 20 20 60 16 C40 22 26 36 24 60 M4 80 C10 60 22 50 36 50 C30 44 30 36 36 32 M16 4 C40 4 60 12 80 4 M24 60 C26 50 32 44 42 42',
  vine: 'M4 90 C8 60 24 36 60 22 C70 18 80 16 92 16 M22 58 C12 54 10 44 16 38 C24 42 26 50 22 58 M40 34 C38 24 44 18 52 16 C52 26 48 32 40 34 M64 22 C62 14 68 8 76 8 C76 16 72 20 64 22',
  stars: 'M20 6 L23 17 L34 20 L23 23 L20 34 L17 23 L6 20 L17 17Z M46 10 L47.5 14.5 L52 16 L47.5 17.5 L46 22 L44.5 17.5 L40 16 L44.5 14.5Z M12 44 L13.5 48.5 L18 50 L13.5 51.5 L12 56 L10.5 51.5 L6 50 L10.5 48.5Z',
  arch: 'M4 90 V40 A36 36 0 0 1 40 4 H90',
};
const FILLED = new Set(['stars']);
function foilDef(id, foil, light) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${foilStops(foil, light).map((c, i, a) => `<stop offset="${(i / (a.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('')}</linearGradient>`;
}
// Corner and divider ornaments, filled with the design's foil so they shine like the lettering.
export function corners(type, foil, light) {
  const d = CORNERS[type];
  if (!d) return '';
  const id = nextId('fo');
  const one = (style) => `<svg class="orn-corner" style="${style}" width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"><defs>${foilDef(id, foil, light)}</defs><path d="${d}" fill="${FILLED.has(type) ? `url(#${id})` : 'none'}" stroke="${FILLED.has(type) ? 'none' : `url(#${id})`}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  return one('top:8px;left:8px') + one('top:8px;right:8px;transform:scaleX(-1)') + one('bottom:8px;left:8px;transform:scaleY(-1)') + one('bottom:8px;right:8px;transform:scale(-1,-1)');
}
export function divider(foil, light) {
  const id = nextId('fd');
  return `<svg class="orn-div" width="150" height="18" viewBox="0 0 150 18" aria-hidden="true"><defs>${foilDef(id, foil, light)}</defs><g fill="none" stroke="url(#${id})" stroke-width="1.2" stroke-linecap="round"><path d="M4 9 H56 M94 9 H146"/><path d="M60 9 C66 2 70 2 75 9 C80 16 84 16 90 9 C84 2 80 2 75 9 C70 16 66 16 60 9Z"/></g><circle cx="75" cy="9" r="2.2" fill="url(#${id})"/></svg>`;
}

export function backdrop(d, { priority = false, className = '' } = {}) {
  return `<div class="backdrop ${className}" aria-hidden="true"><img src="${esc(d.preview)}" width="800" height="993" alt="" loading="${priority ? 'eager' : 'lazy'}" ${priority ? 'fetchpriority="high"' : ''} decoding="async"></div>`;
}
export const linerStyle = (d) => `background-image:url(${d.preview});background-size:cover;background-position:center 30%`;

// The sealed envelope. A real <button> that opens on click, tap, Enter or Space; `still` draws the same
// envelope as a plain picture (gallery thumbnails sit inside a link).
export function envelope(d, title, { still = false, label = '', controls = '', open = false } = {}) {
  const tag = still ? 'span' : 'button';
  const attrs = still ? 'aria-hidden="true"' : `type="button" aria-expanded="${open}" ${controls ? `aria-controls="${controls}"` : ''} aria-label="${esc(label || `Open the invitation: ${title}`)}"`;
  return `<${tag} class="env env-luxe${open ? ' open' : ''}${still ? ' env-still' : ''}" style="${themeVars(d)}" ${attrs}>
<span class="back"></span><span class="liner" style="${linerStyle(d)}"></span><span class="peek">${esc(title)}</span><span class="front"></span>
<span class="flap"><i style="--liner:url(${esc(d.preview)})"></i></span><span class="seal" aria-hidden="true">${waxSeal(d.seal || '✦')}</span><span class="glint" aria-hidden="true"></span></${tag}>`;
}

// The invitation itself. ev may be a saved event or the design's sample.
export function inviteCard(d, ev = {}, { id = '' } = {}) {
  const s = d.sample || {};
  const date = ev.date ? niceDate(ev.date, ev.time, ev.tz) : ev.dateText;
  const time = ev.date ? niceTime(ev.date, ev.time, ev.tz) : ev.timeText;
  const foil = d.finish?.foil || 'gold', border = d.finish?.border || 'double', light = !d.card.dark;
  const lede = ev.lede ?? s.lede;
  return `<article class="card luxe${d.card.dark ? ' dk' : ''} b-${border}" ${id ? `id="${id}"` : ''} data-font="${esc(d.font)}" style="${themeVars(d)}">
${corners(border, foil, light)}
<p class="lab">${esc(ev.label || s.label || '')}</p>
<h2 class="ttl" tabindex="-1">${esc(ev.title || s.title || '')}</h2>
${d.script && d.font !== 'pinyon' ? '<p class="script" aria-hidden="true">you are invited</p>' : ''}
${lede ? `<p class="ld">${esc(lede)}</p>` : ''}
${divider(foil, light)}
<div class="when"><div><span>When</span><b>${esc(date || 'Date to come')}</b></div><div><span>Time</span><b>${esc(time || 'TBC')}</b></div><div><span>Where</span><b>${esc(ev.venue || 'Venue to come')}</b></div></div>
${ev.address ? `<p class="addr">${esc(ev.address)}</p>` : ''}
${ev.dress ? `<p class="dress"><b>Dress</b>${esc(ev.dress)}</p>` : ''}
${ev.host_name ? `<p class="host">with love, ${esc(ev.host_name)}</p>` : ''}
</article>`;
}

// The front of an e-card. Seven formats (designs.js FORMATS): the picture edge to edge with the line on a
// band, or the picture mounted, arched, in a medallion, split with a type block, stamped small, or no
// picture at all on a pattern in the card's colours. All keep the print's 4:5 shape.
export function cardFront(c, { priority = false, className = '' } = {}) {
  const d = c.design, words = c.front || c.greeting, fmt = c.format || 'full';
  const len = words.length > 30 ? 'long' : words.length > 16 ? 'mid' : '';
  const greet = `<p class="cf-greet" ${len ? `data-len="${len}"` : ''}>${esc(words)}</p>`;
  // Dense patterns (checks, stripes) are drawn faintly so the line stays readable; sparse ones can be bolder.
  const dense = ['checker', 'stripes', 'candy', 'gingham'].includes(c.pattern);
  const pat = fmt === 'full' || fmt === 'mount' ? '' : patternCss(c.pattern || 'dots', d.card, { tint: dense ? 0.14 : fmt === 'type' ? 0.4 : 0.32, seed: 7 + (c.slug.length % 5) });
  const img = (cls) => `<span class="cf-window ${cls}" aria-hidden="true"><img src="${esc(d.preview)}" width="800" height="993" alt="" loading="${priority ? 'eager' : 'lazy'}" decoding="async"></span>`;
  const open = `<div class="cfront ${className}" style="${themeVars(d)}" data-font="${esc(d.font)}" data-format="${fmt}" data-layout="${esc(c.layout || 'plaque')}" data-tone="${d.card.dark ? 'dark' : 'light'}">`;
  if (fmt === 'full') return `${open}${backdrop(d, { priority })}<div class="cf-plaque">${greet}</div></div>`;
  const stock = `<div class="cf-stock" style="${pat}">`;
  if (fmt === 'mount') return `${open}${stock}${img('cf-mount')}${greet}</div></div>`;
  if (fmt === 'arch') return `${open}${stock}${img('cf-arch')}${greet}</div></div>`;
  if (fmt === 'circle') return `${open}${stock}${img('cf-circle')}${greet}</div></div>`;
  if (fmt === 'split') return `${open}${stock}${img('cf-split')}<div class="cf-block">${greet}</div></div></div>`;
  if (fmt === 'stamp') return `${open}${stock}${img('cf-stamp')}${greet}</div></div>`;
  return `${open}${stock}${corners(d.finish?.border || 'double', d.finish?.foil || 'gold', !d.card.dark)}${greet}</div></div>`;   // type
}
// The inside: the sender's words on foil-edged card.
export function cardInside(c, { to = '', from = '', message = '' } = {}) {
  const d = c.design, foil = d.finish?.foil || 'gold', border = d.finish?.border || 'double';
  return `<article class="card luxe cinside${d.card.dark ? ' dk' : ''} b-${border}" data-font="${esc(d.font)}" style="${themeVars(d)}">${corners(border, foil, !d.card.dark)}
${to ? `<p class="lab">Dear ${esc(to)}</p>` : ''}<p class="ci-msg">${esc(message)}</p>${from ? `<p class="host">with love, ${esc(from)}</p>` : ''}</article>`;
}

// Motion is decorative and never sits over the personal message. Quiet occasions stay still.
export function cardMotion(c) {
  if (['get-well', 'expecting'].includes(c.occasion)) return 'still';
  const s = c.design.art?.section;
  if (s === 'zodiac') return 'starlight';
  if (s === 'festive') return 'frost';
  if (s === 'academia') return 'candlelight';
  return 'sunlight';
}

// One reading surface for every card: the front and the inside, opened like a book.
export function cardSpread({ front, inside, motion = 'lustre', theme = '', label = 'Your open card', animate = false }) {
  return `<section class="sp-scene" data-motion="${motion}" role="region" aria-label="${esc(label)}" style="${theme}">
<div class="sp-book${animate ? ' sp-reveal' : ''}"><div class="sp-cover">${front}${motion !== 'still' ? `<span class="sp-atmo sp-${motion}" aria-hidden="true"></span>` : ''}</div><div class="sp-inside">${inside}</div></div>
<div class="sp-controls">${motion !== 'still' ? '<button type="button" data-act="replay">Replay opening</button><button type="button" data-act="pause" aria-pressed="false">Pause motion</button>' : ''}<button type="button" data-act="expand" aria-pressed="false">Full view</button></div></section>`;
}

// Gallery pieces.
export function cardTile(c, href, { feature = false, priority = false } = {}) {
  return `<a href="${esc(href)}" class="wall-tile${feature ? ' wall-feature' : ''}" data-sheen aria-label="${esc(`${c.front || c.greeting} card: ${c.name}`)}"><span class="wall-cover">${cardFront(c, { priority })}<span class="wall-foil" aria-hidden="true"></span></span><span class="wall-info"><b>${esc(c.name)}</b></span></a>`;
}
export function occasionTile(name, sub, href, inner, { feature = false, priority = false } = {}) {
  return `<a href="${esc(href)}" class="wall-tile${feature ? ' wall-feature' : ''}" data-sheen aria-label="${esc(name)}"><span class="wall-cover">${inner}<span class="wall-foil" aria-hidden="true"></span></span><span class="wall-info"><b>${esc(name)}</b><small>${esc(sub)}</small></span></a>`;
}
function tilt(slug) { let h = 0; for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % 9) - 4) * 1.1; }
export function inviteThumb(d, href, occasionName, { priority = false } = {}) {
  return `<a class="thumb" href="${esc(href)}" aria-label="${esc(`${d.name}, ${occasionName} invitation`)}">${backdrop(d, { priority })}<div class="mini" aria-hidden="true" style="--tilt:${tilt(d.slug)}deg">${envelope(d, d.sample.title, { still: true })}</div><div class="meta"><span><b>${esc(d.name)}</b><br><small>${esc(occasionName)}</small></span></div></a>`;
}

// ---------------------------------------------------------------- browser behaviour
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function haptic(pattern) { try { if (!reduced()) navigator.vibrate?.(pattern); } catch {} }

// Wire the controls under a card spread: replay, pause, full view (a dialog that traps focus).
export function mountSpread(scene) {
  const book = scene.querySelector('.sp-book');
  const btn = (k) => scene.querySelector(`[data-act="${k}"]`);
  btn('replay')?.addEventListener('click', () => { book.classList.remove('sp-reveal', 'sp-paused'); btn('pause')?.setAttribute('aria-pressed', 'false'); void book.offsetWidth; book.classList.add('sp-reveal'); });
  btn('pause')?.addEventListener('click', (e) => { const on = book.classList.toggle('sp-paused'); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? 'Resume motion' : 'Pause motion'; });
  const ex = btn('expand');
  let prev = null;
  const close = () => { scene.classList.remove('sp-expanded'); scene.removeAttribute('aria-modal'); scene.setAttribute('role', 'region'); document.body.style.overflow = ''; ex.setAttribute('aria-pressed', 'false'); ex.textContent = 'Full view'; prev?.focus?.(); };
  ex?.addEventListener('click', () => {
    if (scene.classList.contains('sp-expanded')) return close();
    prev = document.activeElement; scene.classList.add('sp-expanded'); scene.setAttribute('role', 'dialog'); scene.setAttribute('aria-modal', 'true'); document.body.style.overflow = 'hidden';
    ex.setAttribute('aria-pressed', 'true'); ex.textContent = 'Close full view'; ex.focus();
  });
  scene.addEventListener('keydown', (e) => {
    if (!scene.classList.contains('sp-expanded')) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { const bs = [...scene.querySelectorAll('button')], f = bs[0], l = bs[bs.length - 1]; if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); } else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); } }
  });
}

// A pointer-following band of foil light on every [data-sheen] tile under `root`. Nothing re-renders.
export function sheen(root) {
  if (!root || reduced()) return;
  let last = null;
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const t = e.target.closest?.('[data-sheen]'); if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`); t.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`); last = t;
  }, { passive: true });
  root.addEventListener('pointerleave', () => { if (last) { last.style.removeProperty('--mx'); last.style.removeProperty('--my'); last = null; } }, { passive: true });
}

// A soft light that follows the pointer, or the tilt of the phone, written as CSS variables on `el`.
export function ambient(el) {
  if (!el || reduced()) return () => {};
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  let raf = 0, nx = 0.5, ny = 0.32, tilting = false, listening = false;
  const paint = () => { raf = 0; el.style.setProperty('--lx', `${(nx * 100).toFixed(1)}%`); el.style.setProperty('--ly', `${(ny * 100).toFixed(1)}%`); el.style.setProperty('--tx', ((nx - 0.5) * 2).toFixed(3)); el.style.setProperty('--ty', ((ny - 0.5) * 2).toFixed(3)); };
  const aim = (x, y) => { nx = x; ny = y; if (!raf) raf = requestAnimationFrame(paint); };
  el.addEventListener('pointermove', (e) => { if (tilting && e.pointerType !== 'mouse') return; const r = el.getBoundingClientRect(); aim(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)); }, { passive: true });
  el.addEventListener('pointerleave', () => aim(0.5, 0.32), { passive: true });
  const onTilt = (e) => { if (e.gamma == null || e.beta == null) return; tilting = true; aim(0.5 + clamp(e.gamma / 45, -0.5, 0.5), 0.34 + clamp((e.beta - 50) / 70, -0.34, 0.6)); };
  const listen = () => { if (listening) return; listening = true; addEventListener('deviceorientation', onTilt, { passive: true }); };
  const D = window.DeviceOrientationEvent, coarse = matchMedia('(pointer: coarse)').matches;
  if (D && typeof D.requestPermission !== 'function' && coarse) listen();
  return () => { if (!D || !coarse || listening) return; if (typeof D.requestPermission === 'function') D.requestPermission().then((s) => { if (s === 'granted') listen(); }).catch(() => {}); else listen(); };
}

// Gold dust on a full-page canvas. burst() throws a shower from a point; ambient keeps a few motes drifting.
export function magic(canvas, { colors = ['#f7e7b0', '#e0c07a', '#fff6dc', '#c9a55a'] } = {}) {
  const off = { burst() {}, ambient() {} };
  if (!canvas || reduced()) return off;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, parts = [], raf = 0, amb = false, last = performance.now();
  const dpr = Math.min(2, devicePixelRatio || 1);
  const size = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); addEventListener('resize', size);
  const tick = (t) => {
    const dt = Math.min(50, t - last) / 16.67; last = t;
    ctx.clearRect(0, 0, W, H);
    if (amb && parts.filter((p) => p.amb).length < 26 && Math.random() < 0.08) parts.push({ amb: 1, x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 0.3, vy: -(0.25 + Math.random() * 0.5), r: 0.8 + Math.random() * 1.8, life: 1, decay: 0.0018, c: colors[(Math.random() * colors.length) | 0], tw: Math.random() * 6 });
    parts = parts.filter((p) => p.life > 0 && p.y > -20);
    for (const p of parts) {
      p.x += p.vx * dt; p.y += p.vy * dt; if (!p.amb) { p.vy += 0.045 * dt; p.vx *= 0.99; }
      p.life -= p.decay * dt; p.tw += 0.2 * dt;
      ctx.globalAlpha = Math.max(0, p.life) * (0.55 + 0.45 * Math.sin(p.tw)); ctx.fillStyle = p.c;
      if (p.star) { const s = p.r * 2.6; ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s); ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y); ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    raf = parts.length || amb ? requestAnimationFrame(tick) : 0;
  };
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); });
  return {
    burst(ox = 0.5, oy = 0.5) { const x = W * ox, y = H * oy; for (let i = 0; i < 140; i++) { const a = Math.random() * Math.PI * 2, sp = 3.5 + Math.random() * 6; parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3.2, r: 0.8 + Math.random() * 2.4, life: 1, decay: 0.012 + Math.random() * 0.014, c: colors[(Math.random() * colors.length) | 0], tw: Math.random() * 6, star: Math.random() < 0.28 }); } start(); },
    ambient(on) { amb = on; if (on) start(); },
  };
}
export function magicColors(d) {
  const f = d.finish?.foil;
  if (f === 'silver') return ['#ffffff', '#dfe5ea', '#b9c3cc', '#eef6ff'];
  if (f === 'rose') return ['#fde6dc', '#f4cbbd', '#e8b4a4', '#fff3ea'];
  return ['#f7e7b0', '#e0c07a', '#fff6dc', '#c9a55a'];
}

// A live countdown inside `el` for an event at date/time in tz.
export function countdown(el, date, time, tz, { eventInstant }) {
  const at = eventInstant(date, time, tz);
  if (!at) { el.hidden = true; return; }
  const L = ['Days', 'Hours', 'Minutes', 'Seconds'];
  const draw = () => {
    const n = Math.max(0, at - Date.now());
    if (n === 0) { el.innerHTML = '<p class="cd-done">It’s happening.</p>'; return clearInterval(t); }
    const v = [Math.floor(n / 864e5), Math.floor(n / 36e5) % 24, Math.floor(n / 6e4) % 60, Math.floor(n / 1e3) % 60];
    el.setAttribute('role', 'timer'); el.setAttribute('aria-label', `${v[0]} days and ${v[1]} hours to go`);
    el.innerHTML = v.map((x, i) => `<div><b>${String(x).padStart(2, '0')}</b><span>${L[i]}</span></div>`).join('');
  };
  draw(); const t = setInterval(draw, 1000);
}

// The opening ritual every card recipient gets: a pearl envelope, a wax seal, a light that follows
// the pointer; the seal cracks, the flap lifts, the card rises and the reading view is set down.
// Reduced motion skips straight to the reading view.
const OPEN_MS = 2900, HANDOFF_MS = 620;
const CRUMBS = Array.from({ length: 15 }, (_, i) => { const a = (i * 137.5 + 24) * Math.PI / 180, r = 9 + (i * 7 % 11); return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8 - 5, s: 3 + (i * 5 % 4), gold: i % 3 !== 0, d: (i % 5) * 0.012 }; });
export function ritual(mount, { to = '', seal = '✦', peek = '', title = '', hint = 'Tap to break the seal', openingHint = 'A little something, just for you', reading = '', theme = '', lining = '', onOpened }) {
  const id = nextId('rt');
  mount.innerHTML = `<div class="rt-stage rt-themed" data-phase="sealed" style="--seal:#7a1f2b;${theme}">
<div class="rt-sealed"><p class="rt-address">${to ? `For ${esc(to)}` : 'A card for you'}</p>
<div class="rt-tilt"><span class="rt-shadow" aria-hidden="true"></span>
<button type="button" class="rt-envelope" aria-expanded="false" aria-controls="${id}" aria-label="${esc(`Open your card${to ? `, ${to}` : ''}`)}">
<span class="rt-back"></span><span class="rt-liner" style="${lining}"></span>
<span class="rt-letter" aria-hidden="true">${peek || `<span class="rt-peekTitle">${esc(title)}</span>`}</span>
<span class="rt-pocket"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0,100 L50,54 L100,100" class="rt-crease"/><path d="M0,0 L50,54 L100,0" class="rt-vShade"/><path d="M0,0 L50,54 L100,0" class="rt-vEdge"/></svg></span>
<span class="rt-flap"><i class="rt-faceOut"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0,0 L50,57 L100,0" class="rt-keyline"/></svg></i><i class="rt-faceIn"></i></span>
<span class="rt-seal" aria-hidden="true"><b class="rt-flash"></b><span class="rt-half rt-halfL">${waxSeal(seal, 200)}<b class="rt-sheen"></b></span><span class="rt-half rt-halfR">${waxSeal(seal, 200)}<b class="rt-sheen"></b></span><span class="rt-crumbs"></span></span>
<span class="rt-light" aria-hidden="true"></span></button></div>
<p class="rt-hint" aria-live="polite">${esc(hint)}</p></div>
<div id="${id}" class="rt-reading" tabindex="-1" hidden aria-label="Your open card">${reading}</div></div>`;
  const stage = mount.firstElementChild, sealed = stage.querySelector('.rt-sealed'), btn = stage.querySelector('.rt-envelope'), read = stage.querySelector('.rt-reading'), hintEl = stage.querySelector('.rt-hint');
  const enableTilt = ambient(stage);
  const show = (instant) => { read.hidden = false; read.classList.add(instant ? 'rt-fade' : 'rt-arrive'); read.querySelectorAll('.sp-scene').forEach(mountSpread); read.focus({ preventScroll: true }); onOpened?.(); };
  btn.addEventListener('click', () => {
    if (stage.dataset.phase !== 'sealed') return;
    enableTilt();
    if (reduced()) { stage.dataset.phase = 'reading'; sealed.remove(); show(true); return; }
    haptic([14, 38, 8]);
    stage.dataset.phase = 'opening'; sealed.classList.add('rt-opening'); btn.disabled = true; btn.setAttribute('aria-expanded', 'true'); hintEl.textContent = openingHint;
    stage.querySelector('.rt-crumbs').innerHTML = CRUMBS.map((c) => `<i class="rt-crumb ${c.gold ? 'rt-gold' : 'rt-wax'}" style="--dx:${c.dx.toFixed(1)}cqw;--dy:${c.dy.toFixed(1)}cqw;--s:${c.s}px;animation-delay:${c.d}s"></i>`).join('');
    setTimeout(() => { stage.dataset.phase = 'handoff'; sealed.classList.add('rt-out'); sealed.setAttribute('aria-hidden', 'true'); haptic(7); show(false); }, OPEN_MS);
    setTimeout(() => { stage.dataset.phase = 'reading'; sealed.remove(); }, OPEN_MS + HANDOFF_MS);
  });
}

// Break the seal on an invitation envelope (the simpler one): the seal cracks, the flap lifts, then `onOpen`.
export function openEnvelope(btn, onOpen) {
  if (btn.classList.contains('open')) return;
  btn.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
  const rm = reduced();
  setTimeout(() => onOpen?.('burst'), rm ? 0 : 260);
  setTimeout(() => onOpen?.('shown'), rm ? 0 : 1000);
}
