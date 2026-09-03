// lib/printclub.js. The Little Poppin Print Club (monthly subscription).
//
// $12/month, and every month THREE prints land in the member's inbox. The picks are
// DERIVED, not chosen by hand, so the club runs with no monthly admin. The header said
// "$5/month" and "a print" until 3 Sep 2026, both stale by a repricing and a count change,
// and stale enough to make a reader distrust the rest of the file:
//
//   • the rotation is a deterministic round-robin across the shop's sections, so
//     consecutive months feel varied rather than working through nursery for 41 months;
//   • December always draws from the festive collection, because a Christmas print in
//     December is worth more than strict rotation order;
//   • the same month always resolves to the same print, so a re-run of the sender (or a
//     retry) delivers the same thing rather than a second, different print.
//
// Adding new prints to the catalogue appends to the end of each section's list, so past
// months keep resolving to what was actually sent.

export const PRINT_CLUB = {
  sku: 'print-club',
  name: 'Little Poppin Print Club',
  description: 'Three hand-picked magical prints delivered to your inbox every month. Cancel any time.',
  price: 1200,             // $12.00 AUD per month
  interval: 'month',
  // PRICING NOTE: at $12 a month, ONE print would cost a member exactly what a single
  // print costs in the shop. No reason to subscribe. Three prints makes the membership
  // worth $36 and the saving obvious. If the count changes, change PRINTS_PER_MONTH and
  // the copy on printclub.html together, or the offer stops making sense.
  printsPerMonth: 3,
  preview: '/images/prints/05-sleepy-moon-and-stars.jpg',
};

export const PRINTS_PER_MONTH = PRINT_CLUB.printsPerMonth;

// Club membership starts here; month 0 is August 2026.
const EPOCH = { year: 2026, month: 8 };

export function monthIndex(date = new Date()) {
  return (date.getUTCFullYear() - EPOCH.year) * 12 + (date.getUTCMonth() + 1 - EPOCH.month);
}

// `p.section` must be present, not merely non-festive: the catalogue also contains the
// printable ranges (colouring books, milestone cards, calendar), which carry no section.
// Without this check they group under an "undefined" section and get mailed out as the
// month's print. A colouring book is not what a member subscribed for.
const publishable = (products, section) => Object.values(products)
  .filter((p) => !p.items && p.file && p.section && (section ? p.section === section : p.section !== 'festive'))
  .map((p) => p.sku).sort();

/**
 * Round-robin the single prints across sections: nursery, zodiac, academia, …
 * Festive is deliberately EXCLUDED. A Christmas robin arriving in May reads as a
 * mistake, so those are held back for December only (see pickForMonth).
 */
export function rotationOrder(products) {
  const bySection = {};
  for (const sku of publishable(products)) {
    const p = products[sku];
    (bySection[p.section] ||= []).push(sku);
  }
  const sections = Object.keys(bySection).sort();
  sections.forEach((s) => bySection[s].sort());
  const total = sections.reduce((n, s) => n + bySection[s].length, 0);
  const order = [];
  for (let i = 0; order.length < total; i++) {
    for (const s of sections) if (bySection[s][i]) order.push(bySection[s][i]);
  }
  return order;
}

/** How many non-December months have elapsed since the epoch, up to `date`. */
function rotationSlot(date) {
  let n = 0;
  const cur = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const d = new Date(Date.UTC(EPOCH.year, EPOCH.month - 1, 1));
  while (d.getTime() < cur) {
    if (d.getUTCMonth() + 1 !== 12) n++;
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return n;
}

/**
 * The prints for a given month. An array of skus (empty if nothing is publishable).
 * December draws from the festive collection; every other month advances the main
 * rotation, so Decembers don't silently consume (and skip) rotation slots.
 *
 * Consecutive slots are taken from the rotation, which round-robins across sections,
 * so a month's three prints come from three different collections rather than three
 * near-identical bunnies.
 */
export function picksForMonth(products, date = new Date(), count = PRINTS_PER_MONTH) {
  if (monthIndex(date) < 0) return [];
  const take = (list, start) => {
    if (!list.length) return [];
    const n = Math.min(count, list.length);
    return Array.from({ length: n }, (_, i) => list[(start + i) % list.length]);
  };

  if (date.getUTCMonth() + 1 === 12) {
    const festive = publishable(products, 'festive');
    if (festive.length) {
      const decembersSoFar = Math.max(0, date.getUTCFullYear() - EPOCH.year);
      return take(festive, decembersSoFar * count);
    }
  }
  return take(rotationOrder(products), rotationSlot(date) * count);
}

/** Convenience for callers that only need the headline print (emails, previews). */
export function pickForMonth(products, date = new Date()) {
  return picksForMonth(products, date)[0] ?? null;
}

export function monthLabel(date = new Date()) {
  return date.toLocaleString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
