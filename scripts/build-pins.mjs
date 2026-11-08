// build-pins.mjs. Little Poppin's Pinterest pipeline. Run: node scripts/build-pins.mjs [--force] [--start YYYY-MM-DD]
//
// From the catalogues already in the repo (data/prints.json, keepsakes/designs.js, the printable
// ranges and, when it exists, data/free-printables.json) this writes three things:
//
//   images/pins/<slug>.jpg      A 1000×1500 (2:3) pin per item: the artwork with a quiet caption
//                               strip in the house fonts. Pinterest's preferred shape, and the
//                               page builders use it as og:image so Rich Pins get the same picture.
//   pinterest/*.csv             Pinterest's bulk-upload spreadsheets, 200 pins a file, with the
//                               exact header Pinterest documents. Publish dates stagger the whole
//                               catalogue over eight weeks, a handful a day, in UTC.
//   pinterest.xml               An RSS feed of the newest 50 items (with enclosure images) at the
//                               site root, for Pinterest's auto-publish.
//
// Plus pinterest/pins.json, the manifest the test suite checks (every Media URL is a real file in
// the repo, every Link a real page). Re-running is safe: a pin image is only re-rendered when its
// artwork is newer than it (or with --force); the CSVs, feed and manifest are rewritten every time.
//
// The picture itself is drawn by scripts/pin-image.mjs (sharp + opentype.js, shared with the Tadavite CSV).
//
// Pinterest's rules (help.pinterest.com, "Bulk upload Pins", read 8 Nov 2026): Title ≤ 100 chars,
// Description ≤ 500, Media URL a public link to the image file, board created if missing (a
// "Board/Section" path makes a section), Publish date "YYYY-MM-DDTHH:MM:SS" in UTC or blank to
// publish now, Keywords comma-separated. Scheduling is allowed up to 30 days ahead, so each CSV
// covers about two weeks and docs/PINTEREST.md says when to upload each one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPin, PIN_W, PIN_H } from './pin-image.mjs';
import { SITE_URL } from './site-config.mjs';
import { CARDS, INVITES, cardOccasion, inviteOccasion, CARD_PRICE, INVITE_PRICE, money } from '../keepsakes/designs.js';
import { GENERATED_EXTRAS } from '../lib/extras-products.generated.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const startArg = args.includes('--start') ? args[args.indexOf('--start') + 1] : undefined;
const UTM = 'utm_source=pinterest&utm_medium=social&utm_campaign=catalogue';
const PER_FILE = 200;                                     // Pinterest's bulk-upload limit
const DAYS = 56;                                          // eight weeks
const FEED_SIZE = 50;

// ---------------------------------------------------------------- the catalogue → pins
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, '')}…`);
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const slugOf = (sku) => sku.replace(/^(print|set)-/, '');
const uniq = (list) => [...new Set(list.map((k) => clean(k).toLowerCase()).filter(Boolean))];
const withUtm = (page) => { const [p, hash = ''] = page.split('#'); return `${SITE_URL}${p}?${UTM}${hash ? `#${hash}` : ''}`; };

const prints = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'prints.json'), 'utf8'));
const SECTION = Object.fromEntries(prints.sections.map((s) => [s.id, s.nav]));
// Which board a print section belongs on, and the words that sell it.
const PRINT_RANGE = {
  nursery: { board: 'Nursery Art', kind: 'nursery art print', words: ['nursery art', 'nursery wall art', 'baby room decor', 'nursery prints'] },
  zodiac: { board: 'Nursery Art/Star Sign Nursery Art', kind: 'star sign nursery print', words: ['zodiac nursery art', 'star sign print', 'astrology nursery', 'personalised baby gift'] },
  academia: { board: 'Magical Academia Art', kind: 'magical academia art print', words: ['dark academia wall art', 'magical academia', 'wizard room decor', 'cosy study print'] },
  festive: { board: 'Christmas', kind: 'Christmas art print', words: ['christmas wall art', 'festive printable', 'holiday decor', 'christmas nursery'] },
  'woodland-magic': { board: 'Nursery Art/Woodland Nursery', kind: 'woodland nursery print', words: ['woodland nursery', 'forest animals nursery', 'fox nursery art'] },
  'magical-realms': { board: 'Nursery Art/Magical Nursery', kind: 'magical kids room print', words: ['dragon nursery', 'fantasy kids room', 'magical kids decor'] },
  'magical-stories': { board: 'Nursery Art/Magical Nursery', kind: 'storybook kids room print', words: ['storybook nursery', 'fairytale nursery art', 'kids bedroom art'] },
  'photo-art': { board: 'Nursery Art/Photo Art', kind: 'photo art print', words: ['nursery photo art', 'kids room photography print'] },
  'australian-wildlife': { board: 'Nursery Art/Australian Nursery', kind: 'Australian nursery print', words: ['australian nursery', 'australian animals print', 'koala nursery art'] },
  ocean: { board: 'Nursery Art/Ocean Nursery', kind: 'ocean nursery print', words: ['ocean nursery', 'under the sea nursery', 'whale nursery art'] },
  mermaid: { board: 'Nursery Art/Mermaid Nursery', kind: 'mermaid nursery print', words: ['mermaid nursery', 'mermaid bedroom', 'girls room art'] },
  dog: { board: 'Nursery Art/Dog Nursery', kind: 'dog nursery print', words: ['dog nursery art', 'puppy print', 'kids room dog art'] },
  space: { board: 'Nursery Art/Space Nursery', kind: 'space nursery print', words: ['space nursery', 'rocket nursery art', 'boys room decor'] },
  vehicles: { board: 'Nursery Art/Vehicles Nursery', kind: 'vehicles nursery print', words: ['trucks nursery', 'transport nursery art', 'toddler room art'] },
};
const PRINT_WORDS = ['printable wall art', 'digital download', 'instant download', 'kids room decor', 'nursery decor'];
const aud = (cents) => `${money(cents)} AUD`;

const printPins = prints.prints.filter((p) => p.available !== false).map((p) => {
  const r = PRINT_RANGE[p.section] || PRINT_RANGE.nursery;
  const slug = slugOf(p.sku);
  return {
    slug: `print-${slug}`, kind: 'print', group: 'prints', board: r.board, page: `/print/${slug}.html`, image: p.preview,
    title: clip(`${p.title} | ${r.kind[0].toUpperCase()}${r.kind.slice(1)}, instant download`, 100),
    description: clip(`${clean(p.description)} A ${r.kind} from Little Poppin: a high-resolution printable, in your inbox the moment you buy. Print it at home or at your local print shop; the 4:5 file fits 8×10, 16×20, A4 and A3 frames. ${aud(p.price)}.`, 500),
    keywords: uniq([...r.words, ...PRINT_WORDS, SECTION[p.section], p.title, 'little poppin']),
    caption: { title: p.title, line: `${r.kind} · instant download`, small: 'littlepoppin.com' },
    price: p.price,
  };
});
const setPins = (prints.sets || []).filter((s) => s.available !== false).map((s) => {
  const first = prints.prints.find((p) => p.sku === s.items?.[0]);
  const r = PRINT_RANGE[first?.section] || PRINT_RANGE.nursery;
  const slug = s.sku.startsWith('bundle-') ? s.sku : slugOf(s.sku);
  return {
    slug: `set-${slug}`, kind: 'set', group: 'prints', board: r.board.split('/')[0], page: `/set/${slug}.html`, image: s.preview,
    title: clip(`${s.title} | ${s.items?.length || ''} printable nursery prints, instant download`, 100),
    description: clip(`${clean(s.description)} A set of ${s.items?.length || 'matching'} high-resolution printables from Little Poppin, downloaded the moment you buy and ready to frame as a gallery wall. ${aud(s.price)} for the set.`, 500),
    keywords: uniq(['nursery gallery wall', 'nursery print set', 'kids room art set', ...r.words.slice(0, 2), ...PRINT_WORDS.slice(0, 3), s.title, 'little poppin']),
    caption: { title: s.title, line: `set of ${s.items?.length || ''} printable prints · instant download`, small: 'littlepoppin.com' },
    price: s.price,
  };
});

const CARD_WORDS = { 'new-baby': ['new baby card', 'congratulations baby card', 'welcome baby ecard'], 'star-sign': ['zodiac baby card', 'star sign baby card', 'new baby ecard'], birthday: ['kids birthday card', 'birthday ecard', 'happy birthday card for kids'], 'first-birthday': ['first birthday card', '1st birthday ecard', 'baby birthday card'], expecting: ['pregnancy congratulations card', 'expecting card', 'baby on the way card'], christening: ['christening card', 'baptism card', 'naming day card'], 'big-sibling': ['big sister card', 'big brother card', 'new sibling card'], 'thank-you': ['thank you card', 'thank you ecard', 'baby shower thank you'], 'get-well': ['get well soon card', 'get well ecard for kids', 'feel better card'], congratulations: ['congratulations card', 'congrats ecard', 'well done card'], 'first-day-of-school': ['first day of school card', 'starting school card', 'good luck at school card'], 'mothers-day': ["mother's day card", "mother's day ecard", 'card for mum'], 'fathers-day': ["father's day card", "father's day ecard", 'card for dad'], 'new-home': ['new home card', 'housewarming card', 'moving house ecard'], 'just-because': ['thinking of you card', 'just because card', 'love you card'], halloween: ['halloween card', 'halloween ecard for kids', 'cute halloween card'], christmas: ['christmas card', 'christmas ecard', 'digital christmas card'], 'first-christmas': ["baby's first christmas card", 'first christmas ecard', 'christmas card for baby'] };
const cardPins = CARDS.map((c) => {
  const o = cardOccasion(c.occasion);
  const occ = o.name.toLowerCase();
  const board = ['christmas', 'first-christmas'].includes(c.occasion) ? `Christmas/${o.name} e-cards` : `E-cards/${o.name}`;
  return {
    slug: `card-${c.slug}`, kind: 'card', group: 'cards', board, page: `/card/${c.slug}.html`, image: c.design.preview,
    title: clip(`${c.front.replace(/[.!]+$/, '')} | ${o.name} e-card on the ${c.name} print`, 100),
    description: clip(`"${c.front}" A ${occ} e-card on Little Poppin's ${c.name} art. They open a wax-sealed envelope on their phone and find your own message inside; it is written and sent in minutes, with no post and no plastic. ${aud(CARD_PRICE)} a card.`, 500),
    keywords: uniq([...(CARD_WORDS[c.occasion] || []), 'ecard', 'online greeting card', 'digital card', 'send a card online', 'nursery art card', c.name, 'little poppin']),
    caption: { title: c.front, line: `${o.name} e-card · ${money(CARD_PRICE)}`, small: 'littlepoppin.com' },
    price: CARD_PRICE,
  };
});

const BABY_OCCASIONS = ['baby-shower', 'gender-reveal', 'meet-the-baby', 'christening'];
const INVITE_WORDS = { 'kids-birthday': ['kids birthday invitation', 'kids party invite', 'online birthday invitation', 'children\'s party invitation'], 'first-birthday': ['first birthday invitation', '1st birthday invite', 'baby birthday party'], 'baby-shower': ['baby shower invitation', 'online baby shower invite', 'baby shower ideas'], 'meet-the-baby': ['sip and see invitation', 'meet the baby invitation', 'newborn party invite'], christening: ['christening invitation', 'baptism invitation', 'naming day invite'], 'gender-reveal': ['gender reveal invitation', 'gender reveal party', 'pink or blue invite'], 'teddy-bears-picnic': ['teddy bears picnic invitation', 'picnic party invite', 'playdate invitation'], sleepover: ['sleepover invitation', 'pyjama party invite', 'slumber party invitation'], 'wizard-party': ['wizard party invitation', 'magic party invite', 'wizard birthday'], halloween: ['halloween party invitation', 'kids halloween invite', 'halloween party ideas'], 'kids-christmas': ['christmas party invitation', 'kids christmas party', 'holiday party invite'] };
const invitePins = INVITES.map((d) => {
  const o = inviteOccasion(d.occasion);
  const occ = o.name.toLowerCase();
  const board = BABY_OCCASIONS.includes(d.occasion) ? `Baby Shower/${o.name}` : d.occasion === 'kids-christmas' ? 'Christmas/Kids’ Christmas party invitations' : `Kids' Party Invitations/${o.name}`;
  const painted = d.art.kind === 'invite';
  return {
    slug: `invitation-${d.slug}`, kind: 'invite', group: 'invitations', board, page: `/invitation/${d.slug}.html`, image: d.preview,
    title: clip(`${d.name} ${o.name} invitation | Online invite with RSVP`, 100),
    description: clip(`${o.blurb} An online ${occ} invitation on the ${d.name} ${painted ? 'watercolour' : 'print'} from Little Poppin: guests open a wax-sealed envelope on their phone, see the details, a countdown and the map, and reply in a tap. You keep the guest list on a private host page. ${aud(INVITE_PRICE)} for the event.`, 500),
    keywords: uniq([...(INVITE_WORDS[d.occasion] || []), 'online invitation', 'digital invitation', 'evite', 'party invitation with rsvp', painted ? 'watercolour invitation' : 'nursery art invitation', d.name, 'little poppin']),
    caption: { title: d.name, line: `${o.name} invitation · online, with replies`, small: 'littlepoppin.com' },
    price: INVITE_PRICE,
  };
});

const EXTRA_WORDS = { colouring: ['printable colouring book', 'colouring pages', 'kids colouring printable'], cards: ['baby milestone cards', 'printable nursery decor', 'new baby gift'], bookmarks: ['printable bookmarks', 'book lover gift', 'reading printable'], calendar: ['printable wall calendar', 'printable planner', 'nursery calendar'] };
const printablePins = Object.values(GENERATED_EXTRAS).filter((e) => e.preview).map((e) => ({
  slug: `printable-${e.sku}`, kind: 'printable', group: 'printables', board: 'Printables', page: `/printables.html#${e.sku}`, image: e.preview,
  title: clip(`${e.title} | Printable PDF, instant download`, 100),
  description: clip(`${clean(e.description)} A printable PDF from Little Poppin, in your inbox the moment you buy; print as many copies as your household needs. ${aud(e.price)}.`, 500),
  keywords: uniq([...(EXTRA_WORDS[e.kind] || []), 'printable', 'instant download', 'printable pdf', 'kids activities', e.title, 'little poppin']),
  caption: { title: e.title, line: 'printable pdf · instant download', small: 'littlepoppin.com' },
  price: e.price,
}));

// The free library is being built separately (data/free-printables.json). Read it when it is there, in
// whatever shape it lands: an array, or an object with the list under `printables` or `items`.
const freeFile = path.join(REPO, 'data', 'free-printables.json');
const freeRaw = fs.existsSync(freeFile) ? JSON.parse(fs.readFileSync(freeFile, 'utf8')) : [];
const freeList = Array.isArray(freeRaw) ? freeRaw : freeRaw.printables || freeRaw.items || [];
// An item is pinned once it has a public page of its own (`page`, `url` or `link`, a path on this site) and that
// page and its preview are in the repo; until then it is left out, so no pin ever points at a 404.
const pageExists = (page) => fs.existsSync(path.join(REPO, page.replace(/^\//, '').split('#')[0].split('?')[0]));
const freePins = freeList.filter((f) => (f.preview || f.image || f.thumbnail) && (f.slug || f.id) && (f.page || f.url || f.link)).map((f) => {
  const slug = f.slug || f.id;
  return {
    slug: `free-${slug}`, kind: 'free', group: 'free', board: 'Free Printables', page: (f.page || f.url || f.link).replace(SITE_URL, ''), image: f.preview || f.image || f.thumbnail,
    title: clip(`${f.title || f.name} | Free printable`, 100),
    description: clip(`${clean(f.description || '')} A free printable from Little Poppin: download the PDF and print it at home. No account, no catch.`, 500),
    keywords: uniq(['free printable', 'free printables for kids', 'printable pdf', ...(f.keywords || f.tags || []), f.title || f.name, 'little poppin']),
    caption: { title: f.title || f.name, line: 'free printable', small: 'littlepoppin.com' },
    price: 0,
  };
}).filter((f) => fs.existsSync(path.join(REPO, f.image.replace(/^\//, ''))) && pageExists(f.page));

// ---------------------------------------------------------------- order and dates
// Round-robin across the ranges so every day on Pinterest mixes prints, cards, invitations and printables.
const groups = [freePins, printablePins, invitePins, cardPins, printPins, setPins].filter((g) => g.length);
const all = [];
for (let i = 0; groups.some((g) => i < g.length); i++) for (const g of groups) if (g[i]) all.push(g[i]);

const start = startArg ? new Date(`${startArg}T00:00:00Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1));
if (Number.isNaN(start.getTime())) throw new Error(`--start wants YYYY-MM-DD, got ${startArg}`);
const perDay = Math.ceil(all.length / DAYS);
// Spread each day's pins from 13:00 to 01:00 UTC: US daytime and evening, where most of Pinterest is.
all.forEach((item, i) => {
  const day = Math.floor(i / perDay), slot = i % perDay;
  const d = new Date(start.getTime() + day * 86400000 + (13 * 60 + Math.round(slot * (12 * 60) / perDay)) * 60000);
  item.publish = d.toISOString().replace(/\.\d{3}Z$/, '');
  item.media = `${SITE_URL}/images/pins/${item.slug}.jpg`;
  item.link = withUtm(item.page);
});

// ---------------------------------------------------------------- render
fs.mkdirSync(path.join(REPO, 'images', 'pins'), { recursive: true });
fs.mkdirSync(path.join(REPO, 'pinterest'), { recursive: true });
let rendered = 0;
const queue = [...all];
await Promise.all(Array.from({ length: 6 }, async () => { for (let it; (it = queue.shift());) if (await renderPin({ src: path.join(REPO, it.image.replace(/^\//, '')), out: path.join(REPO, 'images', 'pins', `${it.slug}.jpg`), caption: it.caption, force: FORCE })) rendered++; }));

// ---------------------------------------------------------------- CSVs
const HEADER = ['Title', 'Media URL', 'Pinterest board', 'Thumbnail', 'Description', 'Link', 'Publish date', 'Keywords'];
const cell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const row = (it) => [it.title, it.media, it.board, '', it.description, it.link, it.publish, it.keywords.join(', ')].map(cell).join(',');
for (const f of fs.readdirSync(path.join(REPO, 'pinterest'))) if (/^littlepoppin-pins-\d+-of-\d+\.csv$/.test(f)) fs.unlinkSync(path.join(REPO, 'pinterest', f));
const files = Math.ceil(all.length / PER_FILE);
const batches = [];
for (let b = 0; b < files; b++) {
  const items = all.slice(b * PER_FILE, (b + 1) * PER_FILE);
  const name = `littlepoppin-pins-${String(b + 1).padStart(2, '0')}-of-${String(files).padStart(2, '0')}.csv`;
  fs.writeFileSync(path.join(REPO, 'pinterest', name), `${HEADER.join(',')}\n${items.map(row).join('\n')}\n`);
  batches.push({ file: `pinterest/${name}`, pins: items.length, first: items[0].publish.slice(0, 10), last: items.at(-1).publish.slice(0, 10) });
}

// ---------------------------------------------------------------- manifest
const boards = [...new Set(all.map((i) => i.board.split('/')[0]))];
fs.writeFileSync(path.join(REPO, 'pinterest', 'pins.json'), `${JSON.stringify({
  generated: new Date().toISOString(), site: SITE_URL, utm: UTM, start: start.toISOString().slice(0, 10), days: DAYS, perDay, boards, batches,
  pins: all.map(({ slug, kind, board, title, media, link, publish, price }) => ({ slug, kind, board, title, media, link, publish, price })),
}, null, 1)}\n`);

// ---------------------------------------------------------------- RSS for auto-publish
// "Newest" by what joined the catalogue last: the free library, the printables, the watercolour backdrops
// (8 Nov 2026), the bespoke card pictures, then the prints from the end of the catalogue backwards.
const xml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const newest = [...freePins, ...printablePins, ...invitePins.filter((d) => d.slug.includes('--wc-')), ...cardPins.filter((c) => CARDS.find((x) => `card-${x.slug}` === c.slug)?.design.art.kind === 'card'), ...[...printPins].reverse()].slice(0, FEED_SIZE);
const feedBase = new Date(Date.UTC(2026, 10, 8, 0, 0, 0));   // a fixed clock, so re-running does not re-date every item
const feedItems = newest.map((it, i) => {
  const file = path.join(REPO, 'images', 'pins', `${it.slug}.jpg`);
  const date = new Date(feedBase.getTime() - i * 3600000).toUTCString();
  return `    <item>
      <title>${xml(it.title)}</title>
      <link>${xml(it.link)}</link>
      <guid isPermaLink="true">${xml(`${SITE_URL}${it.page}`)}</guid>
      <description>${xml(it.description)}</description>
      <pubDate>${date}</pubDate>
      <enclosure url="${xml(it.media)}" length="${fs.statSync(file).size}" type="image/jpeg" />
      <media:content url="${xml(it.media)}" medium="image" type="image/jpeg" width="${PIN_W}" height="${PIN_H}" />
      <category>${xml(it.board)}</category>
    </item>`;
});
fs.writeFileSync(path.join(REPO, 'pinterest.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Little Poppin</title>
    <link>${SITE_URL}/</link>
    <description>Magical nursery art prints, e-cards, online party invitations and printables from Little Poppin. The newest ${feedItems.length}, for Pinterest.</description>
    <language>en-au</language>
    <lastBuildDate>${feedBase.toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/pinterest.xml" rel="self" type="application/rss+xml" />
    <image><url>${SITE_URL}/images/logo.png</url><title>Little Poppin</title><link>${SITE_URL}/</link></image>
${feedItems.join('\n')}
  </channel>
</rss>
`);

console.log(`${all.length} pins (${printPins.length} prints, ${setPins.length} sets, ${cardPins.length} cards, ${invitePins.length} invitations, ${printablePins.length} printables, ${freePins.length} free); ${rendered} images rendered, ${all.length - rendered} kept.`);
console.log(`${files} CSV file(s) in pinterest/, ${perDay} pins a day from ${batches[0].first} to ${batches.at(-1).last}; pinterest.xml carries ${feedItems.length} items.`);
console.log(`Boards: ${boards.join(', ')}`);
