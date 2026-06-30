// sku -> Stripe LIVE Price ID. Products created in the Wild Hearts Publishing Stripe
// account (Magical Academia prints, 24 Jun 2026). When a digital print has a price ID here,
// checkout uses the Stripe Product/Price (so it shows in the Stripe dashboard catalogue);
// otherwise it falls back to inline price_data. Add nursery print IDs here if/when created.
export const STRIPE_PRICES = {
  'print-the-enchanted-library': 'price_1To1SxJDoNARRYalT199caaI',
  'print-potions-shelf':         'price_1To1TiJDoNARRYaljC9ABD3u',
  'print-the-magic-wand':        'price_1To1U8JDoNARRYalcfl83dYm',
  'print-owl-post':              'price_1To1UCJDoNARRYalzWAnrPlT',
  'print-floating-candles':      'price_1To1USJDoNARRYaldXYlAczq',
  'print-the-magic-castle':      'price_1To1UXJDoNARRYalZ2PtCZZN',
  'print-the-cauldron':          'price_1To1UaJDoNARRYalAvbcOb88',
  'print-the-crystal-ball':      'price_1To1UgJDoNARRYaloZvWmANR',
  'print-lantern-path':          'price_1To1V4JDoNARRYalIHhsoshn',
  'print-the-astronomer-s-desk': 'price_1To1VAJDoNARRYal9mEvHS4T',
};
