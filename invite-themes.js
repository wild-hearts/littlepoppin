// invite-themes.js. The catalogue behind Little Poppin Website Invitations.
//
// SHARED between the browser (the builder and the live invitation page load it as an ES
// module) and the serverless functions (lib/invites.js imports it). So: no DOM, no Node
// APIs, plain data and pure functions only.
//
// Every theme is built on one of the shop's own prints, which is the whole point: the
// invitation matches the nursery art the family may already own, and every guest who
// opens one sees Little Poppin artwork with a link back to the shop.

export const INVITE_PRICE = 2900; // $29.00 AUD. One invitation, unlimited guests, RSVP included.
export const INVITE_SKU = 'invite';
export const INVITE_HOSTED_MONTHS = 12;

// Script faces are loaded from Google Fonts on demand, one per theme.
export const SCRIPT_FONTS = ['Pinyon Script', 'Parisienne', 'Great Vibes', 'Allura', 'Sacramento', 'Cookie', 'Dancing Script', 'Satisfy', 'Alex Brush'];

// Event types. `intro` is the small-caps line above the honouree's name. `gift` is the
// default "one small request" panel. Announcements have no RSVP and no countdown.
export const EVENTS = {
  'baby-shower':    { label: 'Baby Shower',    intro: 'Please join us for a baby shower honouring', rsvp: true, countdown: true,
                      gift: { title: 'Books for baby', text: 'One small request: instead of a card, please bring a book with a little note inside, to start a library that lasts long after the party.' } },
  'baby-sprinkle':  { label: 'Baby Sprinkle',  intro: 'A little sprinkle of love for', rsvp: true, countdown: true,
                      gift: { title: 'A little something', text: 'No gifts needed, your company is the gift. If you would like to bring something, nappies and books are always loved.' } },
  'gender-reveal':  { label: 'Gender Reveal',  intro: 'Pink or blue? Come and see! Join us for the reveal of', rsvp: true, countdown: true,
                      gift: { title: 'Cast your vote', text: 'Wear pink or blue for the team you are backing. The big reveal happens at the party.' } },
  'sip-and-see':    { label: 'Sip & See',      intro: 'Come and meet our newest little love', rsvp: true, countdown: true,
                      gift: { title: 'Just bring yourself', text: 'No gifts, please. Come for a cuddle, a cup of something and a look at those tiny toes.' } },
  'christening':    { label: 'Christening',    intro: 'You are warmly invited to the christening of', rsvp: true, countdown: true,
                      gift: { title: 'A small request', text: 'Your presence is the greatest gift. If you wish to give, a book with a note inside will be treasured.' } },
  'naming-day':     { label: 'Naming Day',     intro: 'Please join us as we celebrate the naming of', rsvp: true, countdown: true,
                      gift: { title: 'A small request', text: 'Your presence is the greatest gift. If you wish to give, a book with a note inside will be treasured.' } },
  'first-birthday': { label: 'First Birthday', intro: 'Someone special is turning one! Please join us to celebrate', rsvp: true, countdown: true,
                      gift: { title: 'Gifts', text: 'Your company is all we ask. Books and outdoor toys are the favourites in this house.' } },
  'birthday':       { label: 'Birthday Party', intro: 'Please join us to celebrate the birthday of', rsvp: true, countdown: true,
                      gift: { title: 'Gifts', text: 'No need to bring anything but your dancing shoes.' } },
  'welcome-baby':   { label: 'Birth Announcement', intro: 'With full hearts we welcome', rsvp: false, countdown: false, announcement: true,
                      gift: { title: 'Come and visit', text: 'We would love visitors once we have found our feet. Message us and we will put the kettle on.' } },
};

// One theme per print. `colors` are hand-tuned to the artwork: accent for the script
// headings and buttons, deep for the wax seal and small caps, ribbon for soft accents,
// bg for the page wash, card for panels, ink for body text.
export const THEMES = [
  { id: 'butterfly-garden', name: 'Butterfly Garden', art: '/images/prints/01-butterfly-garden.jpg', event: 'baby-shower',
    script: 'Pinyon Script', tagline: 'Blush blossom and moonlit butterflies', sampleTitle: 'Baby in Bloom',
    colors: { accent: '#b8607e', deep: '#8a3f5c', ribbon: '#e8b4c6', bg: '#fbf3f5', card: '#fffaf9', ink: '#3a2a31' } },
  { id: 'sleepy-bunny', name: 'Sleepy Bunny', art: '/images/prints/03-sleepy-bunny.jpg', event: 'baby-shower',
    script: 'Parisienne', tagline: 'Sage meadow, gentle and gender-neutral', sampleTitle: 'Some Bunny Special',
    colors: { accent: '#7a8a63', deep: '#566243', ribbon: '#d9c7a3', bg: '#f7f6ef', card: '#fffdf8', ink: '#31352a' } },
  { id: 'little-fawn', name: 'Little Fawn', art: '/images/prints/04-little-fawn.jpg', event: 'baby-shower',
    script: 'Great Vibes', tagline: 'Golden woodland glade', sampleTitle: 'A Little Deer is on the Way',
    colors: { accent: '#8a7a3e', deep: '#5f5328', ribbon: '#cfc08a', bg: '#f8f6ec', card: '#fffdf6', ink: '#33301f' } },
  { id: 'moon-and-stars', name: 'Moon & Stars', art: '/images/prints/05-sleepy-moon-and-stars.jpg', event: 'baby-shower',
    script: 'Allura', tagline: 'Twinkle twinkle, navy and gold', sampleTitle: 'Twinkle Twinkle Little Star',
    colors: { accent: '#3d4a8f', deep: '#2a3266', ribbon: '#d8b56a', bg: '#f2f3fa', card: '#fbfbff', ink: '#23263a' } },
  { id: 'hot-air-balloon', name: 'Hot Air Balloon', art: '/images/prints/06-hot-air-balloon-dreams.jpg', event: 'baby-shower',
    script: 'Sacramento', tagline: 'Up, up and away', sampleTitle: 'Up, Up and Away',
    colors: { accent: '#3f6fb0', deep: '#2b4c7c', ribbon: '#e2c281', bg: '#eef4fb', card: '#fafcff', ink: '#222c39' } },
  { id: 'cuddly-elephant', name: 'Cuddly Elephant', art: '/images/prints/08-cuddly-elephant.jpg', event: 'baby-sprinkle',
    script: 'Cookie', tagline: 'A little peanut in the clouds', sampleTitle: 'A Little Peanut',
    colors: { accent: '#3d6ba5', deep: '#2a4a78', ribbon: '#f1d58d', bg: '#eef3fa', card: '#fafcff', ink: '#222d39' } },
  { id: 'bumblebee-meadow', name: 'Bumblebee Meadow', art: '/images/prints/05-bumblebee-meadow.jpg', event: 'gender-reveal',
    script: 'Alex Brush', tagline: 'What will it bee?', sampleTitle: 'What Will It Bee?',
    colors: { accent: '#b58a1f', deep: '#7d5f14', ribbon: '#f3d47a', bg: '#fbf7e9', card: '#fffdf4', ink: '#39321f' } },
  { id: 'rainbow-clouds', name: 'Rainbow & Clouds', art: '/images/prints/07-rainbow-and-clouds.jpg', event: 'gender-reveal',
    script: 'Dancing Script', tagline: 'Pastel rainbow, pink or blue?', sampleTitle: 'Pink or Blue?',
    colors: { accent: '#8b6fb7', deep: '#5f4a86', ribbon: '#f4c2d1', bg: '#f6f2fa', card: '#fdfbff', ink: '#2b2438' } },
  { id: 'gum-blossom', name: 'Gum Blossom', art: '/images/prints/10-gum-blossom-dreams.jpg', event: 'sip-and-see',
    script: 'Parisienne', tagline: 'An Australian native welcome', sampleTitle: 'Come and Meet',
    colors: { accent: '#a2782f', deep: '#725320', ribbon: '#e6cf98', bg: '#faf6ec', card: '#fffdf6', ink: '#38311f' } },
  { id: 'swan-lake', name: 'Swan Lake', art: '/images/prints/06-swan-lake-dream.jpg', event: 'christening',
    script: 'Pinyon Script', tagline: 'Grace on still water', sampleTitle: 'With Love and Grace',
    colors: { accent: '#4a7797', deep: '#33546b', ribbon: '#d9bd7c', bg: '#eef4f8', card: '#fafdff', ink: '#223139' } },
  { id: 'lamb-on-a-cloud', name: 'Little Lamb', art: '/images/prints/10-sleepy-lamb-on-a-cloud.jpg', event: 'christening',
    script: 'Allura', tagline: 'Soft cream and sky', sampleTitle: 'Our Little Lamb',
    colors: { accent: '#a26443', deep: '#74462e', ribbon: '#cfdcea', bg: '#faf3ee', card: '#fffaf6', ink: '#392b22' } },
  { id: 'little-sailboat', name: 'Little Sailboat', art: '/images/prints/24-little-sailboat.jpg', event: 'baby-shower',
    script: 'Parisienne', tagline: 'Ahoy, it’s a boy', sampleTitle: 'Ahoy, It’s a Boy',
    colors: { accent: '#3a63a6', deep: '#274678', ribbon: '#e8d29a', bg: '#eff3fa', card: '#fafcff', ink: '#222b39' } },
  { id: 'star-catcher', name: 'Star Catcher', art: '/images/prints/14-star-catcher.jpg', event: 'naming-day',
    script: 'Dancing Script', tagline: 'A star is named', sampleTitle: 'A Star is Named',
    colors: { accent: '#33639a', deep: '#22436d', ribbon: '#f2c86b', bg: '#edf2f9', card: '#fafcff', ink: '#222f39' } },
  { id: 'wildflower-meadow', name: 'Wildflower Meadow', art: '/images/prints/09-wildflower-meadow.jpg', event: 'baby-shower',
    script: 'Alex Brush', tagline: 'Sunlit wildflowers and butterflies', sampleTitle: 'Our Little Wildflower',
    colors: { accent: '#8f8a2f', deep: '#625d1c', ribbon: '#dfe0a5', bg: '#f9f8ec', card: '#fffef6', ink: '#33321f' } },
  { id: 'space-adventure', name: 'Space Adventure', art: '/images/prints/01-dreamy-space-adventure.jpg', event: 'birthday',
    script: 'Satisfy', tagline: 'To the moon and back', sampleTitle: 'To the Moon and Back',
    colors: { accent: '#3b5ea0', deep: '#27427a', ribbon: '#f0a868', bg: '#eef2fa', card: '#fafcff', ink: '#222c39' } },
  { id: 'teddy-picnic', name: 'Teddy Bears’ Picnic', art: '/images/prints/07-teddy-bears-picnic.jpg', event: 'first-birthday',
    script: 'Cookie', tagline: 'Honey gold and picnic blankets', sampleTitle: 'Teddy Bears’ Picnic',
    colors: { accent: '#a9762f', deep: '#7a5320', ribbon: '#e7c98d', bg: '#faf5ea', card: '#fffcf4', ink: '#38301f' } },
  { id: 'carousel', name: 'Carousel Dreams', art: '/images/prints/08-carousel-dreams.jpg', event: 'first-birthday',
    script: 'Sacramento', tagline: 'Mint, cream and rose gold', sampleTitle: 'Carousel Dreams',
    colors: { accent: '#4a8f8a', deep: '#2f6763', ribbon: '#f0c3cf', bg: '#eef7f6', card: '#f9fffe', ink: '#223533' } },
  { id: 'jungle-explorers', name: 'Jungle Explorers', art: '/images/prints/06-jungle-explorers.jpg', event: 'first-birthday',
    script: 'Satisfy', tagline: 'Wild one', sampleTitle: 'Wild One',
    colors: { accent: '#7f8f3a', deep: '#55622a', ribbon: '#e6c987', bg: '#f4f6ea', card: '#fcfef5', ink: '#2e3322' } },
  { id: 'under-the-sea', name: 'Under the Sea', art: '/images/prints/07-under-the-sea.jpg', event: 'first-birthday',
    script: 'Cookie', tagline: 'Whale, whale, whale', sampleTitle: 'Whale, Someone is One',
    colors: { accent: '#2f8aa8', deep: '#1f5f75', ribbon: '#bfe1e8', bg: '#edf7f9', card: '#f8fdff', ink: '#1f3239' } },
  { id: 'unicorn-dreams', name: 'Unicorn Dreams', art: '/images/prints/04-unicorn-dreams.jpg', event: 'birthday',
    script: 'Great Vibes', tagline: 'Lilac skies and rainbow manes', sampleTitle: 'Unicorn Dreams',
    colors: { accent: '#b25a8c', deep: '#7f3d63', ribbon: '#c9b6e6', bg: '#faf1f7', card: '#fffafd', ink: '#382632' } },
  { id: 'fairy-blossom', name: 'Fairy Blossom', art: '/images/prints/04-fairy-blossom.jpg', event: 'birthday',
    script: 'Great Vibes', tagline: 'A garden party for a little fairy', sampleTitle: 'Fairy Garden Party',
    colors: { accent: '#b5654d', deep: '#82443a', ribbon: '#f2c7c0', bg: '#fbf1ee', card: '#fffaf8', ink: '#392b26' } },
  { id: 'castle-clouds', name: 'Castle in the Clouds', art: '/images/prints/10-dream-castle-in-the-clouds.jpg', event: 'birthday',
    script: 'Pinyon Script', tagline: 'Once upon a time', sampleTitle: 'Once Upon a Time',
    colors: { accent: '#b05f70', deep: '#7e3f4d', ribbon: '#f0bfa0', bg: '#fbf1f0', card: '#fffaf9', ink: '#392b2c' } },
  { id: 'mermaid-lagoon', name: 'Mermaid Lagoon', art: '/images/prints/02-mermaid-lagoon.jpg', event: 'birthday',
    script: 'Satisfy', tagline: 'Teal water and coral', sampleTitle: 'Mermaid Lagoon',
    colors: { accent: '#2f7f9c', deep: '#1f596e', ribbon: '#f3a6a0', bg: '#edf6f9', card: '#f8fdff', ink: '#1f3139' } },
  { id: 'little-dinosaurs', name: 'Little Dinosaurs', art: '/images/prints/03-little-dinosaurs.jpg', event: 'birthday',
    script: 'Cookie', tagline: 'A dino-mite party', sampleTitle: 'A Dino-mite Birthday',
    colors: { accent: '#5f8a66', deep: '#3f5f45', ribbon: '#a9d3e0', bg: '#f0f6ef', card: '#f9fef8', ink: '#25302a' } },
];

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function eventById(id) {
  return EVENTS[id] || EVENTS['baby-shower'];
}

/** Sample data used for the theme previews on the shop page (/i/demo-<theme>). */
export function demoConfig(themeId) {
  const t = themeById(themeId);
  const ev = eventById(t.event);
  const d = new Date(); d.setDate(d.getDate() + 42); d.setHours(14, 0, 0, 0);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const honouree = {
    'first-birthday': 'Harper Rose', 'birthday': 'Oliver James', 'welcome-baby': 'Isla May',
    'sip-and-see': 'Baby Ivy', 'christening': 'Charlotte Grace', 'naming-day': 'Leo Alexander',
  }[t.event] || 'Sophie Bennett';
  return {
    theme: t.id, event: t.event, title: t.sampleTitle, intro: ev.intro, honouree,
    hosts: t.event === 'birthday' || t.event === 'first-birthday' ? 'Mum, Dad and big sister Ava' : 'Hosted with love by Emma and the girls',
    date: iso, time: '14:00', endTime: '17:00', tz: 'Australia/Brisbane', startsAt: d.getTime(),
    venue: 'The Garden Room', address: '42 Sunset Lane, Paddington QLD 4064',
    message: t.event === 'welcome-baby'
      ? 'Born on a quiet Tuesday morning, 3.4 kg of pure joy. Mum and baby are resting and doing beautifully.'
      : 'Come and celebrate with an afternoon of cake, games and far too many cuddles. Little ones welcome.',
    giftTitle: ev.gift.title, giftText: ev.gift.text, registryUrl: '',
    rsvpBy: '', dress: t.event === 'gender-reveal' ? 'Wear pink or blue for your team' : '',
    hostName: 'Emma', showCountdown: ev.countdown, showRsvp: ev.rsvp, showMap: true, showGift: true,
  };
}
