// lib/print-meta.js — editorial titles + descriptions for every print.
// Used by scripts/build-prints-shop.mjs (falls back to auto-generated title-case if a
// sku is missing here). Keep descriptions to one evocative sentence — they appear on
// the shop cards, in Stripe checkout, and in search/social previews.

export const PRINT_META = {
  // ── Nursery: Enchanted Garden & friends (collection-01) ──
  'print-butterfly-garden': {
    title: 'Butterfly Garden',
    description: 'Glowing butterflies drift through a moonlit blossom garden — a soft pink dream for above the crib.',
  },
  'print-hummingbird-garden': {
    title: 'Hummingbird Garden',
    description: 'Tiny hummingbirds sip starlight in an enchanted twilight garden of teal and gold.',
  },
  'print-sleepy-bunny': {
    title: 'Sleepy Bunny',
    description: 'A little bunny curled up in a glowing meadow beneath the stars — pure bedtime calm.',
  },
  'print-little-fawn': {
    title: 'Little Fawn',
    description: 'A gentle baby deer rests in a firefly-lit forest glade, wrapped in sage-green magic.',
  },
  'print-sleepy-moon-and-stars': {
    title: 'Sleepy Moon & Stars',
    description: 'A softly smiling crescent moon dozes in a sparkling lavender sky — the classic nursery night-light in print form.',
  },
  'print-hot-air-balloon-dreams': {
    title: 'Hot Air Balloon Dreams',
    description: 'A little glowing balloon sails through a starry dreamscape, carrying wishes to sleep.',
  },
  'print-rainbow-and-clouds': {
    title: 'Rainbow & Clouds',
    description: 'A shimmering pastel rainbow arches over glowing dream clouds — instant joy on a nursery wall.',
  },
  'print-cuddly-elephant': {
    title: 'Cuddly Elephant',
    description: 'A sweet baby elephant holds a glowing balloon under the stars — gentle, warm and huggable.',
  },
  'print-wildflower-meadow': {
    title: 'Wildflower Meadow',
    description: 'Fireflies and butterflies dance over a glowing twilight meadow of soft sage and gold.',
  },
  'print-gum-blossom-dreams': {
    title: 'Gum Blossom Dreams',
    description: 'A tiny wren sleeps among glowing eucalyptus blossoms — an Australian twilight lullaby.',
  },

  // ── Nursery: Adventures & Creatures (collection-02) ──
  'print-dreamy-space-adventure': {
    title: 'Dreamy Space Adventure',
    description: 'A little astronaut floats through a sparkling galaxy of pastel planets — for small dreamers with big journeys ahead.',
  },
  'print-mermaid-lagoon': {
    title: 'Mermaid Lagoon',
    description: 'A sweet mermaid glides through a glowing coral lagoon scattered with starlight.',
  },
  'print-little-dinosaurs': {
    title: 'Little Dinosaurs',
    description: 'Adorable baby dinosaurs wander a glowing fern jungle — prehistoric magic, nursery-soft.',
  },
  'print-unicorn-dreams': {
    title: 'Unicorn Dreams',
    description: 'A baby unicorn leaps through a starry sky trailing stardust — every magical wish in one print.',
  },
  'print-enchanted-fairy-garden': {
    title: 'Enchanted Fairy Garden',
    description: 'Tiny fairies glow among toadstools and fireflies in a secret evening garden.',
  },
  'print-jungle-explorers': {
    title: 'Jungle Explorers',
    description: 'A monkey, toucan and tiger cub adventure through a golden, firefly-lit jungle.',
  },
  'print-under-the-sea': {
    title: 'Under the Sea',
    description: 'A gentle baby whale drifts through a luminous ocean of bubbles and starlight.',
  },
  'print-magical-woodland': {
    title: 'Magical Woodland',
    description: 'A fox, owl and hedgehog gather in an enchanted forest lit by fireflies and glowing mushrooms.',
  },
  'print-hot-air-balloon-voyage': {
    title: 'Hot Air Balloon Voyage',
    description: 'A fleet of glowing balloons drifts over a starlit landscape — up, up and away to dreamland.',
  },
  'print-dream-castle-in-the-clouds': {
    title: 'Dream Castle in the Clouds',
    description: 'A golden fairytale castle floats on clouds beneath a rainbow — where every bedtime story lives.',
  },

  // ── Nursery: Magical Additions (collection-03) ──
  'print-fairy-blossom': {
    title: 'Fairy Blossom',
    description: 'A tiny fairy sleeps in a bed of glowing blossoms, wrapped in stardust and fairy lights.',
  },
  'print-mushroom-hollow': {
    title: 'Mushroom Hollow',
    description: 'Luminous toadstools glow in a firefly hollow — a little door into the fairy world.',
  },
  'print-dreamy-bear-cub': {
    title: 'Dreamy Bear Cub',
    description: 'A sleepy bear cub curls up on a glowing cloud beneath a sky full of golden stars.',
  },
  'print-sleepy-lamb-on-a-cloud': {
    title: 'Sleepy Lamb on a Cloud',
    description: 'A fluffy lamb dozes on a soft glowing cloud — the gentlest goodnight there is.',
  },
  'print-sunshine-smile': {
    title: 'Sunshine Smile',
    description: 'A gently smiling sun radiates warm golden light through soft sparkling clouds.',
  },
  'print-star-catcher': {
    title: 'Star Catcher',
    description: 'A little one in pyjamas catches falling stars in a net of stardust — chase your dreams, always.',
  },
  'print-cloud-dreams': {
    title: 'Cloud Dreams',
    description: 'Sleepy clouds rain tiny twinkling stars across a dusty-blue night — softness itself.',
  },
  'print-baby-dragon': {
    title: 'Baby Dragon',
    description: 'A friendly baby dragon breathes tiny sparkles among the clouds — fierce-ly adorable.',
  },
  'print-pegasus-in-the-clouds': {
    title: 'Pegasus in the Clouds',
    description: 'A baby pegasus soars through a glowing aurora sky trailing ribbons of stardust.',
  },
  'print-little-sailboat': {
    title: 'Little Sailboat',
    description: 'A tiny sailboat crosses a starlit sea while a friendly whale peeks up to say hello.',
  },
  'print-up-and-away': {
    title: 'Up & Away',
    description: 'A small adventurer flies a glowing kite through magical, sun-warmed clouds.',
  },

  // ── ✨ Magical Academia (collection-05) ──
  'print-the-enchanted-library': {
    title: 'The Enchanted Library',
    description: 'Towering shelves, floating books and warm candlelight — a grand library where the books read back.',
  },
  'print-potions-shelf': {
    title: 'Potions Shelf',
    description: 'Glowing potion bottles, an open spellbook and a flickering candle — brew something wonderful.',
  },
  'print-the-magic-wand': {
    title: 'The Magic Wand',
    description: 'An ornate wand sparks golden light atop a stack of well-loved spellbooks.',
  },
  'print-owl-post': {
    title: 'Owl Post',
    description: 'A wise owl delivers a wax-sealed letter by candlelight — special post from a magical world.',
  },
  'print-floating-candles': {
    title: 'Floating Candles',
    description: 'A grand hall glows under hundreds of softly floating candles — pure enchanted-castle wonder.',
  },
  'print-the-magic-castle': {
    title: 'The Magic Castle',
    description: 'A castle of golden windows rises from the mist beneath a glittering night sky.',
  },
  'print-the-cauldron': {
    title: 'The Cauldron',
    description: 'A bubbling cauldron sends up emerald sparks in a cosy candlelit study.',
  },
  'print-the-crystal-ball': {
    title: 'The Crystal Ball',
    description: 'A glowing crystal ball reveals its secrets beside candles and scattered fortune cards.',
  },
  'print-lantern-path': {
    title: 'Lantern Path',
    description: 'Hanging lanterns light a misty forest path — follow the glow into the enchanted dark.',
  },
  'print-the-astronomer-s-desk': {
    title: "The Astronomer's Desk",
    description: 'Star charts, an astrolabe and a quill by candlelight — where the night sky gets mapped.',
  },
};
