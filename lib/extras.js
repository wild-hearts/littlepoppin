// lib/extras.js — product definitions for the printable ranges built FROM the existing art.
//
// The art library is the asset; each of these turns it into a different product without
// commissioning a single new design:
//
//   colouring  — line-art conversions bound into a colouring book PDF
//   milestone  — monthly baby milestone cards
//   calendar   — a twelve-month wall calendar
//
// Each entry is built by scripts/build-extras.mjs into dist/extras/<sku>.pdf, then
// uploaded and registered by scripts/publish-extras.mjs. They deliberately carry NO
// `section` field: lib/printclub.js rotates over prints with a section, so leaving it
// off keeps colouring books out of the monthly Print Club pick.

// Card labels live here with the product definitions rather than in the build script,
// so lib/ never has to import from scripts/ — that would be circular (the build script
// imports EXTRAS) and would drag filesystem work into the serverless runtime.
export const MILESTONES = [
  'Newborn', '1 month', '2 months', '3 months', '4 months', '5 months', '6 months', '7 months',
  '8 months', '9 months', '10 months', '11 months', 'One year!', 'Coming home', 'First smile', 'First tooth',
];

// A-Z plus spacers, so a banner can spell any name and hang with something between words.
export const BANNER_LETTERS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '\u2605', '\u2665', '\u00b7',
];

export const EXTRAS = [
  // --- Colouring books -------------------------------------------------------
  {
    sku: 'extra-colouring-nursery',
    kind: 'colouring',
    title: 'Nursery Colouring Book',
    name: 'Nursery Colouring Book — 20 Printable Pages',
    description: 'Twenty of our dreamiest nursery designs turned into beautiful line drawings — bunnies, balloons, whales and woodland friends, ready to print and colour.',
    price: 995,
    fromSection: 'nursery',
    pages: 20,
    coverBlurb: 'Twenty magical pages to colour',
  },
  {
    sku: 'extra-colouring-academia',
    kind: 'colouring',
    title: 'Magical Academia Colouring Book',
    name: 'Magical Academia Colouring Book — 20 Printable Pages',
    description: 'Enchanted libraries, potion shelves and candlelit studies as intricate line art — a grown-up colouring book with real detail to lose an afternoon in.',
    price: 995,
    fromSection: 'academia',
    pages: 20,
    coverBlurb: 'Twenty intricate pages to colour',
  },
  {
    sku: 'extra-colouring-festive',
    kind: 'colouring',
    title: 'Christmas Colouring Book',
    name: 'Christmas Colouring Book — 20 Printable Pages',
    description: 'Twenty enchanted Christmas scenes to colour — reindeer, gingerbread villages and candlelit windows. Print as many copies as you like, all December long.',
    price: 995,
    fromSection: 'festive',
    pages: 20,
    coverBlurb: 'Twenty festive pages to colour',
  },

  // --- Milestone cards -------------------------------------------------------
  {
    sku: 'extra-milestone-cards',
    kind: 'cards',
    title: 'Baby Milestone Cards',
    name: 'Baby Milestone Cards — 16 Printable Cards',
    description: "Newborn to one year, plus the moments in between — sixteen beautiful cards to photograph beside your baby each month. Print on card, cut out, and you're done.",
    price: 1200,
    fromSection: 'nursery',
    labels: MILESTONES,
    coverBlurb: 'Sixteen cards · newborn to one year',
    howToTitle: 'How to use your cards',
    howTo: [
      'Print these pages on white card (200-300 gsm gives the nicest result).',
      'Cut along the outside of each square - a paper trimmer makes short work of it.',
      'Photograph the card beside your baby each month as they grow.',
      '',
      "Print as many copies as you like for your own family. Please don't resell them.",
    ],
  },
  {
    sku: 'extra-name-banner',
    kind: 'cards',
    title: 'Nursery Name Banner',
    name: 'Nursery Name Banner - A-Z Printable Letters',
    description: "Every letter of the alphabet on its own piece of magical artwork, plus stars and hearts to hang between - print only the letters you need and string up any name you like.",
    price: 1200,
    fromSection: 'nursery',
    labels: BANNER_LETTERS,
    coverBlurb: 'A-Z plus spacers - spell any name',
    howToTitle: 'How to hang your banner',
    howTo: [
      'Print only the pages holding the letters you need.',
      'White card of 200-300 gsm hangs far better than paper.',
      'Cut out each letter, punch two holes at the top, and thread ribbon or twine.',
      'Use the star, heart and dot cards as spacers between words.',
      '',
      "Print as many copies as you like for your own family. Please don't resell them.",
    ],
  },
  {
    sku: 'extra-bookmarks',
    kind: 'bookmarks',
    title: 'Magical Bookmarks',
    name: 'Magical Bookmarks - 8 Printable Bookmarks',
    description: 'Eight bookmarks drawn from the Magical Academia collection - enchanted libraries, candlelit studies and potion shelves. A small, lovely gift for anyone who reads late.',
    price: 795,
    fromSection: 'academia',
    count: 8,
    coverBlurb: 'Eight bookmarks to print and cut',
  },

  // --- Wall calendar ---------------------------------------------------------
  {
    sku: 'extra-calendar',
    kind: 'calendar',
    title: 'Magical Wall Calendar',
    name: 'Magical Wall Calendar — 12 Printable Months',
    description: 'A full twelve-month wall calendar, each month led by one of our magical prints. Undated day grids, so it works for any year you print it.',
    price: 1500,
    fromSection: 'nursery',
    coverBlurb: 'Twelve months of magic',
  },
];

export function getExtra(sku) {
  return EXTRAS.find((e) => e.sku === sku) || null;
}
