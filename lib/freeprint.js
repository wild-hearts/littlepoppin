// lib/freeprint.js. The free welcome print given to everyone who joins the mailing list.
//
// Why give away a $12 print: the signup form has always promised "a free printable", the
// marginal cost of a digital file is zero, and an email address is worth considerably more
// than one download. It is also the cheapest way to prove the product is good. Someone
// who has framed a Little Poppin print is far likelier to buy the next one.
//
// Chosen deliberately: gender-neutral, suits any nursery, and NOT one of the hero designs
// that carry the shop, so the giveaway doesn't undercut the best sellers.
// To swap it, change `sku` to any published print. Nothing else needs to change.

import { MAX_TTL_MS } from './blob-link.js';

export const FREE_PRINT = {
  sku: 'print-cloud-dreams',
  // How long the emailed link stays valid. As generous as the platform allows: people
  // sign up on a phone and download on a laptop days later, and a dead link is a bad
  // first impression. Vercel Blob caps this at 7 days. See lib/blob-link.js.
  ttlMs: MAX_TTL_MS,
};
