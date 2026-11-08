// build-tadavite-pins.mjs. One Pinterest bulk-upload CSV for Tadavite's live advent calendars
// (tadavite.com/advent), the lighter cousin of build-pins.mjs. Run: node scripts/build-tadavite-pins.mjs
//
// Tadavite is read from its live site only: each calendar page's <title>, Open Graph description and
// first real picture. The picture is drawn into a 2:3 pin with the same caption strip as the Little
// Poppin pins (scripts/pin-image.mjs) and saved as images/pins/tadavite-<slug>.jpg, served from
// littlepoppin.com, because Tadavite's own share images are 1200×630 banners, the wrong shape for a
// pin. The Link on every pin is the Tadavite page, tagged utm_source=pinterest.
//
// Output: pinterest/tadavite-advent.csv (same header as the Little Poppin files) and the pin images.
// Needs the network; fails loudly when a page or picture cannot be fetched rather than writing a
// half-empty CSV.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPin } from './pin-image.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TADAVITE = 'https://tadavite.com';
const LP = 'https://littlepoppin.com';
const UTM = 'utm_source=pinterest&utm_medium=social&utm_campaign=catalogue';
const BOARD = 'Christmas/Advent calendars';
const FORCE = process.argv.includes('--force');

// The calendars to pin, with the words Pinterest searches for. `pin` is the short name on the picture.
const CALENDARS = [
  { slug: 'unhinged-elf', pin: 'The Unhinged Elf', line: 'digital advent calendar for families', keywords: ['elf advent calendar', 'digital advent calendar', 'kids advent calendar', 'elf on the shelf alternative', 'christmas countdown for kids', 'family christmas games'] },
  { slug: 'luxury', pin: 'Luxury Christmas Advent', line: 'digital advent calendar to send', keywords: ['luxury advent calendar', 'digital advent calendar', 'advent calendar for her', 'advent calendar gift', 'christmas gift ideas', 'personalised advent calendar'] },
  { slug: 'for-couples', pin: '24 Days of Us', line: 'advent calendar for couples', keywords: ['advent calendar for couples', 'couples advent calendar', 'long distance relationship gift', 'romantic christmas ideas', 'advent calendar for boyfriend', 'advent calendar for girlfriend'] },
  { slug: 'rude', pin: 'Rude Christmas', line: 'adults-only advent calendar (18+)', keywords: ['rude advent calendar', 'adult advent calendar', 'funny advent calendar', 'naughty christmas', 'christmas gift for friends', 'secret santa ideas'] },
  { slug: 'ukraine', pin: 'Support for Ukraine', line: 'advent calendar for humanitarian aid', keywords: ['charity advent calendar', 'support ukraine', 'ukraine christmas', 'advent calendar donation', 'meaningful christmas gift', 'digital advent calendar'] },
  { slug: 'for-kids', pin: 'Advent Calendars for Kids', line: 'online advent calendars for families', keywords: ['online advent calendar for kids', 'digital advent calendar', 'christmas countdown', 'kids christmas activities', 'advent calendar ideas', 'family advent calendar'] },
];
// Pictures on the page that are chrome, not the calendar.
const SKIP = /\/brand\/|logo|seal|\.svg($|\?)/i;

const attr = (html, re) => { const m = html.match(re); return m ? m[1].replace(/&#x27;/g, '’').replace(/&amp;/g, '&').replace(/&quot;/g, '"') : ''; };
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, '')}…`);
const cell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

async function fetchText(url) { const r = await fetch(url, { headers: { 'user-agent': 'littlepoppin-pins/1.0 (+https://littlepoppin.com)' } }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.text(); }
async function fetchBuffer(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }

fs.mkdirSync(path.join(REPO, 'images', 'pins'), { recursive: true });
fs.mkdirSync(path.join(REPO, 'pinterest'), { recursive: true });
const rows = [];
const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1, 14));
for (const [i, cal] of CALENDARS.entries()) {
  const page = `${TADAVITE}/advent/${cal.slug}`;
  const html = await fetchText(page);
  const ogTitle = attr(html, /<meta property="og:title" content="([^"]*)"/) || attr(html, /<title>([^<]*)<\/title>/);
  const title = ogTitle.replace(/\s*·\s*Tadavite\s*$/, '');
  const description = attr(html, /<meta property="og:description" content="([^"]*)"/) || attr(html, /<meta name="description" content="([^"]*)"/);
  const pictures = [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]).filter((src) => !SKIP.test(src) && !/^data:/.test(src));
  if (!pictures.length) throw new Error(`${page}: no picture found on the page`);
  const pic = new URL(pictures[0], TADAVITE).href;
  const out = path.join(REPO, 'images', 'pins', `tadavite-${cal.slug}.jpg`);
  if (FORCE || !fs.existsSync(out)) {
    await renderPin({ src: await fetchBuffer(pic), out, caption: { title: cal.pin, line: cal.line, small: 'tadavite.com' }, force: true });
  }
  const when = new Date(start.getTime() + i * 86400000).toISOString().replace(/\.\d{3}Z$/, '');
  rows.push([
    clip(`${title} | Digital advent calendar from Tadavite`, 100),
    `${LP}/images/pins/tadavite-${cal.slug}.jpg`,
    BOARD,
    '',
    clip(`${description} Fully digital, one door each morning from 1 December: nothing to post and nothing to hide on a shelf. From Tadavite, Little Poppin’s big sister.`, 500),
    `${page}?${UTM}`,
    when,
    cal.keywords.join(', '),
  ]);
  console.log(`${cal.slug}: "${title}" ← ${pic}`);
}
const HEADER = 'Title,Media URL,Pinterest board,Thumbnail,Description,Link,Publish date,Keywords';
fs.writeFileSync(path.join(REPO, 'pinterest', 'tadavite-advent.csv'), `${HEADER}\n${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`);
console.log(`${rows.length} Tadavite pins → pinterest/tadavite-advent.csv`);
