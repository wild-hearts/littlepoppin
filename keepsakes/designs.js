// keepsakes/designs.js. The cards-and-invitations catalogue. Pure data, safe in the browser and
// on the server (no node imports), so the galleries, the editors and the API all read one list.
//
// A design is a print from the shop (keepsakes/art.generated.js: the picture plus a palette read
// from it) dressed for an occasion: a greeting in foil for a card, or sample wording for an
// invitation. Adding an occasion is adding an entry below; adding a print is re-running
// scripts/build-keepsakes.mjs.
import { ART } from './art.generated.js';
import { CARD_FRONTS } from './card-fronts.js';

// ---------------------------------------------------------------- prices (AUD cents)
// TODO confirm with Naomi. Tadavite charges A$3 a card and A$19 an invitation; these match.
export const CARD_PRICE = 300;
export const INVITE_PRICE = 1900;
export const money = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

// ---------------------------------------------------------------- lettering
// The faces a sender or host may choose. Every one is on Google Fonts and loaded on the keepsake
// pages (keepsakes/fonts.css). An empty choice means the design's own face.
export const LETTERING = [
  { key: 'cormorant', label: 'Classic' },
  { key: 'playfair', label: 'Elegant' },
  { key: 'italiana', label: 'Fine' },
  { key: 'bodoni', label: 'Capitals' },
  { key: 'dmserif', label: 'Statement' },
  { key: 'fraunces', label: 'Warm' },
  { key: 'syne', label: 'Modern' },
  { key: 'pinyon', label: 'Script' },
];
export const LETTERING_KEYS = LETTERING.map((l) => l.key);
export const isLettering = (k) => LETTERING_KEYS.includes(k);
export const cleanLettering = (k) => (isLettering(k) ? k : '');
export const withFont = (d, font) => (d && isLettering(font) && font !== d.font ? { ...d, font } : d);

// ---------------------------------------------------------------- art lookups
const BY_SLUG = Object.fromEntries(ART.map((a) => [a.slug, a]));
export const artBySlug = (slug) => BY_SLUG[slug];
const pick = (slugs) => slugs.map((s) => BY_SLUG[s]).filter(Boolean);
const section = (id) => ART.filter((a) => a.section === id);

// Curated groups of prints, by feel rather than by shop section.
const SLEEPY = ['sleepy-bunny', 'little-fawn', 'sleepy-moon-and-stars', 'cloud-dreams', 'sleepy-lamb-on-a-cloud', 'dreamy-bear-cub', 'cuddly-elephant', 'star-catcher', 'sleepy-koala', 'little-penguin', 'swan-lake-dream', 'hot-air-balloon-dreams', 'rainbow-and-clouds', 'butterfly-garden', 'owl-family'];
const ADVENTURE = ['unicorn-dreams', 'little-dinosaurs', 'dreamy-space-adventure', 'mermaid-lagoon', 'jungle-explorers', 'under-the-sea', 'baby-dragon', 'pegasus-in-the-clouds', 'dream-castle-in-the-clouds', 'carousel-dreams', 'hot-air-balloon-voyage', 'up-and-away', 'little-sailboat', 'teddy-bears-picnic', 'enchanted-fairy-garden', 'fairy-blossom', 'sunshine-smile', 'bumblebee-meadow', 'magical-woodland', 'mushroom-hollow', 'autumn-fox-kit', 'lighthouse-dreams', 'paper-boat-stream', 'wildflower-meadow', 'gum-blossom-dreams', 'hummingbird-garden', 'rainbow-and-clouds'];
const GARDEN = ['bumblebee-meadow', 'wildflower-meadow', 'butterfly-garden', 'gum-blossom-dreams', 'hummingbird-garden', 'fairy-blossom', 'enchanted-fairy-garden', 'sunshine-smile', 'teddy-bears-picnic', 'the-enchanted-tea-party', 'mushroom-hollow', 'autumn-fox-kit', 'magical-woodland'];
const SKY = ['cloud-dreams', 'star-catcher', 'hot-air-balloon-dreams', 'rainbow-and-clouds', 'sleepy-moon-and-stars', 'up-and-away', 'pegasus-in-the-clouds', 'hot-air-balloon-voyage'];
const SPOOKY = ['potions-shelf', 'the-cauldron', 'the-crystal-ball', 'the-magic-broom', 'the-wizard-s-hat', 'the-open-spellbook', 'floating-candles', 'the-magic-mirror', 'the-dragon-s-egg', 'owl-post', 'lantern-path'];
const WIZARD = ['the-enchanted-library', 'the-magic-wand', 'the-magic-castle', 'the-astronomer-s-desk', 'the-observatory', 'the-enchanted-tea-party', 'the-study-nook', 'quill-and-ink', 'the-alchemist-s-desk', 'the-wizard-s-hat', 'the-magic-broom', 'owl-post', 'floating-candles', 'lantern-path'];
const FIRST_XMAS = ['polar-bear-s-first-christmas', 'little-reindeer', 'christmas-mice', 'kitten-under-the-tree', 'the-snow-globe', 'star-of-wonder', 'silent-snowfall', 'snowman-s-midnight', 'skating-penguins'];

export const SIGNS = { aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces' };
const signOf = (a) => SIGNS[a.slug.replace(/^little-/, '')];

// ---------------------------------------------------------------- e-cards
// greeting: the occasion's line for page titles. front(art): the words in foil on that card.
export const CARD_OCCASIONS = [
  { slug: 'new-baby', name: 'New Baby', greeting: 'Welcome, Little One', art: () => pick(SLEEPY), message: 'Congratulations on your beautiful new arrival. Sending so much love to you all.' },
  { slug: 'star-sign', name: 'Star Sign Baby', greeting: 'Written in the Stars', art: () => section('zodiac'), front: (a) => `A Little ${signOf(a)} Has Arrived`, message: 'Written in the stars and finally here. Congratulations on your little one.' },
  { slug: 'birthday', name: 'Birthday', greeting: 'Happy Birthday', art: () => pick(ADVENTURE), message: 'Happy birthday! Wishing you a day full of cake, giggles and a little bit of magic.' },
  { slug: 'first-birthday', name: 'First Birthday', greeting: 'Happy First Birthday', art: () => pick(['sunshine-smile', 'star-catcher', 'rainbow-and-clouds', 'hot-air-balloon-dreams', 'cloud-dreams', 'sleepy-moon-and-stars', 'little-sailboat', 'up-and-away', 'teddy-bears-picnic', 'carousel-dreams', 'cuddly-elephant']), message: 'One whole year of you. Happy first birthday, little one.' },
  { slug: 'expecting', name: 'Expecting', greeting: 'Oh, Baby', art: () => pick(['sleepy-moon-and-stars', 'hot-air-balloon-dreams', 'cloud-dreams', 'star-catcher', 'butterfly-garden', 'pegasus-in-the-clouds', 'swan-lake-dream', 'sleepy-lamb-on-a-cloud']), message: 'Such wonderful news. Congratulations, and enjoy every moment of the wait.' },
  { slug: 'christening', name: 'Christening', greeting: 'On Your Christening Day', art: () => pick(['swan-lake-dream', 'cloud-dreams', 'star-catcher', 'sleepy-lamb-on-a-cloud', 'butterfly-garden', 'wildflower-meadow', 'sleepy-moon-and-stars', 'hummingbird-garden', 'gum-blossom-dreams']), message: 'Wishing you a lifetime of love, light and blessings on your special day.' },
  { slug: 'big-sibling', name: 'Big Sibling', greeting: 'Hello, Big Sibling', art: () => pick(['owl-family', 'little-dinosaurs', 'jungle-explorers', 'autumn-fox-kit', 'little-penguin', 'teddy-bears-picnic', 'skating-penguins', 'under-the-sea']), message: 'Being a big sibling is a very important job. We know you will be brilliant at it.' },
  { slug: 'thank-you', name: 'Thank You', greeting: 'Thank You', art: () => pick(GARDEN), message: 'Thank you so much. It meant more than you know.' },
  { slug: 'get-well', name: 'Get Well', greeting: 'Get Well Soon', art: () => pick(['sleepy-bunny', 'dreamy-bear-cub', 'sleepy-koala', 'cuddly-elephant', 'sunshine-smile', 'rainbow-and-clouds', 'hot-cocoa-night', 'sleepy-lamb-on-a-cloud']), message: 'Sending big cuddles and get-well wishes. Rest up, little one.' },
  { slug: 'congratulations', name: 'Congratulations', greeting: 'Congratulations', art: () => pick(['star-catcher', 'up-and-away', 'hot-air-balloon-voyage', 'the-magic-castle', 'lighthouse-dreams', 'pegasus-in-the-clouds', 'dream-castle-in-the-clouds', 'sunshine-smile']), message: 'So proud of you. Congratulations!' },
  { slug: 'first-day-of-school', name: 'First Day of School', greeting: 'Happy First Day of School', art: () => pick(['the-study-nook', 'quill-and-ink', 'the-enchanted-library', 'owl-post', 'the-magic-wand', 'little-sailboat', 'up-and-away', 'the-observatory']), message: 'A big day for a big kid. Have the best first day.' },
  { slug: 'mothers-day', name: 'Mother’s Day', greeting: 'Happy Mother’s Day', art: () => pick(['swan-lake-dream', 'owl-family', 'butterfly-garden', 'hummingbird-garden', 'fairy-blossom', 'wildflower-meadow', 'gum-blossom-dreams', 'the-enchanted-tea-party', 'bumblebee-meadow']), message: 'Thank you for everything you do. Happy Mother’s Day, with all our love.' },
  { slug: 'fathers-day', name: 'Father’s Day', greeting: 'Happy Father’s Day', art: () => pick(['lighthouse-dreams', 'little-sailboat', 'paper-boat-stream', 'dreamy-space-adventure', 'the-observatory', 'the-astronomer-s-desk', 'jungle-explorers', 'little-dinosaurs', 'hot-air-balloon-voyage']), message: 'For the best dad in the whole wide world. Happy Father’s Day.' },
  { slug: 'new-home', name: 'New Home', greeting: 'Happy New Home', art: () => pick(['the-magic-castle', 'dream-castle-in-the-clouds', 'the-candlelit-window', 'mushroom-hollow', 'gingerbread-village', 'lantern-path', 'lighthouse-dreams']), message: 'Congratulations on your new home. May it be full of happy days and very few flat-pack arguments.' },
  { slug: 'just-because', name: 'Just Because', greeting: 'You Are Magic', art: () => pick(WIZARD), message: 'Just a little note to say you are wonderful. Never forget it.' },
  { slug: 'halloween', name: 'Halloween', greeting: 'Happy Halloween', art: () => pick(SPOOKY), message: 'Wishing you a spellbinding Halloween. Mind the cauldron.' },
  { slug: 'christmas', name: 'Christmas', greeting: 'Merry Christmas', art: () => section('festive'), message: 'Wishing you a Christmas full of magic, mischief and far too many mince pies.' },
  { slug: 'first-christmas', name: 'First Christmas', greeting: 'Baby’s First Christmas', art: () => pick(FIRST_XMAS), message: 'A very merry first Christmas, little one. The first of many magical ones.' },
];

// Variety: each card in an occasion takes its face in turn from the faces that suit it, and one of
// three front layouts, so neighbouring tiles never look alike. The sender can still choose another face.
const FACES = ['playfair', 'fraunces', 'cormorant', 'dmserif', 'italiana', 'pinyon', 'bodoni', 'syne'];
export const FRONT_LAYOUTS = ['banner', 'plaque', 'foot'];
// How the front is built (19 Oct 2026, Naomi: "the collection is really boring"). A picture with a band was
// every card; now a wall mixes seven looks, taken in turn so neighbours differ:
//   full    the picture edge to edge, the line on a band at the top or a gradient at the foot
//   mount   coloured card stock with the picture in a keylined window, the line beneath
//   arch    the picture in an arched window on a patterned card
//   circle  the picture in a round medallion on a patterned card
//   split   the picture across the top, a big typographic block across the bottom
//   stamp   the picture small and tilted like a stamp, the line large
//   type    no picture at all: a pattern in the card's colours and the line, large
export const FORMATS = ['full', 'mount', 'type', 'split', 'arch', 'full', 'stamp', 'circle'];
// The pattern behind a card, by occasion: gentle for the quiet ones, confetti where there is cake.
const PATTERNS = {
  'new-baby': ['dots', 'stars', 'waves', 'scallop'], 'star-sign': ['stars', 'sparkle'], birthday: ['confetti', 'sparkle', 'stripes', 'checker', 'rainbow'],
  'first-birthday': ['confetti', 'rainbow', 'dots', 'stars'], expecting: ['dots', 'waves', 'scallop', 'stars'], christening: ['scallop', 'arches', 'dots', 'waves'],
  'big-sibling': ['stripes', 'confetti', 'stars', 'checker'], 'thank-you': ['gingham', 'dots', 'scallop', 'hearts'], 'get-well': ['dots', 'waves', 'gingham', 'hearts'],
  congratulations: ['sparkle', 'confetti', 'stars', 'stripes'], 'first-day-of-school': ['gingham', 'checker', 'stripes', 'dots'], 'mothers-day': ['hearts', 'scallop', 'gingham', 'dots'],
  'fathers-day': ['stripes', 'checker', 'arches', 'waves'], 'new-home': ['arches', 'gingham', 'checker', 'dots'], 'just-because': ['hearts', 'sparkle', 'stars', 'dots'],
  halloween: ['checker', 'stars', 'stripes', 'sparkle'], christmas: ['snow', 'candy', 'stars', 'sparkle', 'gingham'], 'first-christmas': ['snow', 'stars', 'dots', 'scallop'],
};
const offset = (s) => [...s].reduce((a, ch) => a + ch.charCodeAt(0), 0);

// A print dressed as a design: the shape Card, Envelope and Backdrop render.
function designFrom(a, occasion, extra = {}) {
  return { slug: a.slug, name: a.title, occasion, art: a, preview: a.preview, font: a.font, card: a.card, finish: { foil: a.foil, border: a.border }, layout: a.layout, seal: '✦', ...extra };
}

export const CARDS = CARD_OCCASIONS.flatMap((o) => {
  const k = offset(o.slug);
  return o.art().map((a, i) => ({
    // Every card's own line on the front (keepsakes/card-fronts.js); the occasion's greeting is for page titles.
    slug: `${o.slug}--${a.slug}`, occasion: o.slug, greeting: o.greeting, front: CARD_FRONTS[`${o.slug}--${a.slug}`] || (o.front ? o.front(a) : o.greeting), name: a.title,
    design: designFrom(a, o.slug, { font: FACES[(i + k) % FACES.length] }),
    // The art's own layout keeps the subject clear; a plaque in the centre only where the scene is quiet there.
    layout: a.layout === 'foot' ? 'foot' : FRONT_LAYOUTS[(i + k) % 2 === 0 ? 0 : 2],
    format: FORMATS[(i + Math.floor(k / 3)) % FORMATS.length],
    pattern: (PATTERNS[o.slug] || PATTERNS.birthday)[(i + k) % (PATTERNS[o.slug] || PATTERNS.birthday).length],
  }));
});
export const cardOccasion = (slug) => CARD_OCCASIONS.find((o) => o.slug === slug);
export const cardsFor = (slug) => CARDS.filter((c) => c.occasion === slug);
export const card = (slug) => CARDS.find((c) => c.slug === slug);
export const withCardFont = (c, font) => (c && isLettering(font) ? { ...c, design: withFont(c.design, font) } : c);

// ---------------------------------------------------------------- invitations
// Each occasion: the gallery filter, the sample words on the preview, and wording ideas for the editor.
export const INVITE_OCCASIONS = [
  { slug: 'kids-birthday', name: 'Kids’ birthday', plural: 'Kids’ birthday invitations', blurb: 'Cake, games and a very small guest of honour.', send: 'Two to three weeks ahead, with a pick-up time for parents.',
    sample: { label: 'You’re invited', title: 'Tilly Turns Five', lede: 'Cake, games and one very excited birthday girl.' }, art: () => pick(ADVENTURE),
    wording: ['Tilly is turning five and would love you to come and celebrate!', 'Party hats on. Cake at three. Pick-up at five.', 'Come in costume, leave with a party bag.'] },
  { slug: 'first-birthday', name: 'First birthday', plural: 'First birthday invitations', blurb: 'One candle, a very big deal.', send: 'Three to four weeks ahead.',
    sample: { label: 'One whole year', title: 'Leo Is One!', lede: 'Smash cake at two o’clock. Naps optional.' }, art: () => pick(['sunshine-smile', 'star-catcher', 'rainbow-and-clouds', 'hot-air-balloon-dreams', 'cloud-dreams', 'sleepy-moon-and-stars', 'up-and-away', 'teddy-bears-picnic', 'carousel-dreams', 'little-sailboat', 'cuddly-elephant', 'sleepy-lamb-on-a-cloud']),
    wording: ['Our little one is turning one! Come and celebrate with cake and cuddles.', 'One year of wonder. Join us for a first birthday.', 'Look who’s one! Smash cake at two o’clock.'] },
  { slug: 'baby-shower', name: 'Baby shower', plural: 'Baby shower invitations', blurb: 'Soft colours for a very small arrival.', send: 'Four to six weeks ahead, with registry details if there are any.',
    sample: { label: 'Oh baby', title: 'A Shower for Sophie', lede: 'Tea, cake and advice nobody asked for.' }, art: () => pick(SLEEPY),
    wording: ['A little one is on the way. Join us for a shower in honour of Sophie.', 'Tea, cake and advice nobody asked for.', 'Oh baby! Please join us to celebrate.'] },
  { slug: 'meet-the-baby', name: 'Meet the baby', plural: 'Meet-the-baby invitations', blurb: 'A sip and see for the newest star in the family.', send: 'Two to three weeks ahead, once everyone is sleeping a little.',
    sample: { label: 'Come and meet', title: 'Baby Arlo', lede: 'Cuddles, cake and a very small guest of honour. Born under Leo, naturally.' }, art: () => section('zodiac').concat(pick(['cuddly-elephant', 'sleepy-bunny', 'little-fawn'])),
    wording: ['Come and meet the newest member of the family.', 'Cuddles, cake and a very small guest of honour.', 'Drop in any time between two and five. Bring nothing but yourselves.'] },
  { slug: 'christening', name: 'Christening & naming day', plural: 'Christening and naming day invitations', blurb: 'A blessing for a little one.', send: 'Four weeks ahead.',
    sample: { label: 'Christening', title: 'The Christening of Grace', lede: 'Please join us for the service, and lunch afterwards.' }, art: () => pick(['swan-lake-dream', 'cloud-dreams', 'star-catcher', 'sleepy-lamb-on-a-cloud', 'butterfly-garden', 'wildflower-meadow', 'sleepy-moon-and-stars', 'hummingbird-garden', 'gum-blossom-dreams', 'little-fawn']),
    wording: ['Please join us for the christening of our daughter, Grace.', 'We invite you to celebrate the naming day of baby Thomas.', 'Join us as we welcome our little one into the church.'] },
  { slug: 'gender-reveal', name: 'Gender reveal', plural: 'Gender reveal invitations', blurb: 'Pink or blue? Come and find out.', send: 'Two to three weeks ahead.',
    sample: { label: 'He or she?', title: 'Pink or Blue?', lede: 'Come and find out with us. Cake at three, the big reveal straight after.' }, art: () => pick(SKY),
    wording: ['Pink or blue? Come and find out with us.', 'A little surprise is on the way. Help us find out who.', 'Wear your guess. Cake reveals all.'] },
  { slug: 'teddy-bears-picnic', name: 'Picnic & playdate', plural: 'Picnic and playdate invitations', blurb: 'Blankets, bears and the garden.', send: 'One to two weeks ahead, with a wet-weather plan.',
    sample: { label: 'Picnic party', title: 'Ava’s Teddy Bears’ Picnic', lede: 'Bring a bear and a blanket. We’ll bring the cake.' }, art: () => pick(GARDEN),
    wording: ['Bring a bear and a blanket. We’ll bring the cake.', 'A picnic in the garden, weather permitting and possibly regardless.', 'Sandwiches cut into triangles. Lemonade. Grass stains guaranteed.'] },
  { slug: 'sleepover', name: 'Sleepover', plural: 'Sleepover invitations', blurb: 'Pyjamas, popcorn and not much sleeping.', send: 'Two weeks ahead, with a pick-up time.',
    sample: { label: 'Pyjama party', title: 'Mia’s Sleepover', lede: 'Pyjamas on, movies at seven, sleep at some point.' }, art: () => pick(['sleepy-moon-and-stars', 'cloud-dreams', 'star-catcher', 'sleepy-bunny', 'dreamy-bear-cub', 'hot-cocoa-night', 'silent-snowfall', 'sleepy-koala', 'owl-family']),
    wording: ['Pyjamas on, movies at seven, sleep at some point.', 'Bring a sleeping bag and your favourite teddy.', 'Popcorn, pillow forts and pancakes in the morning.'] },
  { slug: 'wizard-party', name: 'Wizard party', plural: 'Wizard party invitations', blurb: 'Wands at the ready.', send: 'Three weeks ahead; robes take time.',
    sample: { label: 'You are summoned', title: 'Oliver’s Wizard Party', lede: 'Wands at the ready. Potions class starts at two.' }, art: () => pick(WIZARD),
    wording: ['Wands at the ready. Potions class starts at two.', 'Robes optional, wands compulsory.', 'Owls have been dispatched. Please reply by return owl, or text.'] },
  { slug: 'halloween', name: 'Halloween', plural: 'Halloween party invitations', blurb: 'Cute, not scary. Mostly.', send: 'Two to three weeks ahead; costumes take time.',
    sample: { label: '31 October', title: 'The Little Witches’ Ball', lede: 'Costumes on, cauldron bubbling. Little monsters welcome.' }, art: () => pick(SPOOKY),
    wording: ['Costumes on, cauldron bubbling. Little monsters welcome.', 'Trick or treat at ours. Pumpkin punch from four.', 'Come dressed to scare. Mildly.'] },
  { slug: 'kids-christmas', name: 'Christmas party', plural: 'Christmas party invitations', blurb: 'Crafts, cookies and a visit from the man in red.', send: 'Three to four weeks ahead; December books out.',
    sample: { label: 'Kids’ Christmas party', title: 'Santa’s Workshop', lede: 'Crafts, cookies and a visit from someone in a red suit.' }, art: () => section('festive'),
    wording: ['Crafts, cookies and a visit from someone in a red suit.', 'The tree is up and there is a seat with your name on it.', 'Mince pies, carols and a little too much tinsel.'] },
];

export const INVITES = INVITE_OCCASIONS.flatMap((o) => {
  const k = offset(o.slug);
  return o.art().map((a, i) => designFrom(a, o.slug, {
    slug: `${o.slug}--${a.slug}`, font: FACES[(i + k) % FACES.length], sample: o.sample, seal: o.sample.title.replace(/^(The|A|An)\s+/i, '').trim()[0],
    script: i % 3 === 0,
  }));
});
export const inviteOccasion = (slug) => INVITE_OCCASIONS.find((o) => o.slug === slug);
export const invitesFor = (slug) => INVITES.filter((d) => d.occasion === slug);
export const design = (slug) => INVITES.find((d) => d.slug === slug);

// ---------------------------------------------------------------- theme
// Metallic foils: a banded gradient that reads as real foil when it moves. Light paper gets a
// deeper foil, because the bright bands vanish on it.
export const FOILS = {
  gold: ['#7a5a22', '#e9d08c', '#b08735', '#fbecb8', '#9c7630', '#e6c77e', '#7a5a22'],
  rose: ['#8f4f47', '#f4cbbd', '#c4847a', '#fde6dc', '#a3645a', '#eab7a8', '#8f4f47'],
  silver: ['#6f7a86', '#eef2f6', '#a3adb7', '#ffffff', '#848e99', '#dfe5ea', '#6f7a86'],
};
export const FOILS_ON_LIGHT = {
  gold: ['#6b4c17', '#c79a3f', '#8a6522', '#d8b25e', '#74551c', '#b98c35', '#6b4c17'],
  rose: ['#7a3a33', '#c98474', '#9b574d', '#d99c8b', '#84443c', '#b8705f', '#7a3a33'],
  silver: ['#3f4953', '#8f9aa5', '#5a6570', '#a8b2bc', '#47515b', '#7d8893', '#3f4953'],
};
export const foilStops = (name, onLight) => (onLight ? FOILS_ON_LIGHT : FOILS)[name] || FOILS.gold;
export const foilGradient = (name, onLight) => `linear-gradient(110deg, ${foilStops(name, onLight).map((c, i, a) => `${c} ${Math.round((i / (a.length - 1)) * 100)}%`).join(', ')})`;

// CSS custom properties for a design's card and envelope, as one inline style string.
export function themeVars(d) {
  const c = d.card;
  const env = c.dark
    ? { '--e-paper': `color-mix(in srgb, ${c.paper} 78%, #fff)`, '--e-shade': c.paper, '--e-flap': `color-mix(in srgb, ${c.paper} 62%, #fff)`, '--seal': c.accent }
    : { '--e-paper': '#f6ede4', '--e-shade': '#e2cfb8', '--e-flap': '#efe1cf', '--seal': c.accent };
  const foil = d.finish?.foil || 'gold';
  const vars = {
    '--c-paper': c.paper, '--c-ink': c.ink, '--c-accent': c.accent, '--c-metal': c.metal,
    '--c-accent-ink': c.dark ? c.metal : c.accent, '--c-font': `var(--f-${d.font})`,
    '--c-title': d.font === 'pinyon' ? 'var(--f-playfair)' : `var(--f-${d.font})`,
    '--foil': foilGradient(foil, !c.dark), ...env,
  };
  return Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
}
