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
    kind: 'milestone',
    title: 'Baby Milestone Cards',
    name: 'Baby Milestone Cards — 16 Printable Cards',
    description: "Newborn to one year, plus the moments in between — sixteen beautiful cards to photograph beside your baby each month. Print on card, cut out, and you're done.",
    price: 1200,
    fromSection: 'nursery',
    coverBlurb: 'Sixteen cards · newborn to one year',
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
