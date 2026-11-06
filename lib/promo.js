// lib/promo.js. The one promo code the site honours, checked here rather than in Stripe.
//
// WHY here: a Stripe promotion code needs a coupon created in the dashboard and
// `allow_promotion_codes` on the session, and a code that exists in copy but not in
// Stripe is a checkout that fails in front of a customer. Validating in /api/checkout
// keeps the code, the discount and the wording in one file that the tests can read.
//
// Scope: PRINTED orders only (poster, canvas, framed). Digital prints already have the
// free welcome print and the pick-any-3 rule; discounting a $12 file further is not
// what the code is for. The welcome email and the signup popup both quote this code,
// so change it in one place only.

export const WELCOME_PROMO = {
  code: 'WELCOME10',
  percentOff: 10,
  appliesTo: 'printed orders',
};

/** Normalise what a buyer typed. */
export function normalisePromo(code) {
  return String(code || '').trim().toUpperCase();
}

/** True when the typed code is the welcome code. */
export function isWelcomePromo(code) {
  return normalisePromo(code) === WELCOME_PROMO.code;
}

/** Price in cents after the welcome discount, rounded to the nearest cent. */
export function applyWelcomePromo(cents) {
  return Math.round(cents * (100 - WELCOME_PROMO.percentOff) / 100);
}
