// etsy-content.mjs. Etsy listing copy for the products not yet listed.
//
// NO CHARITY LINE. Only swaddle sales fund the children's-charity giving (confirmed
// 8 Aug 2026); every listing here is a digital download, so the claim would be false and
// an unsubstantiated donation claim is misleading conduct under the Australian Consumer
// Law. The ~97 listings already live still carry the old wording and need bulk-editing.
//
// PRICING follows the convention the live shop already set: Etsy sits at roughly two
// thirds of the website price ($12 print -> $7.95, $30 set -> $19.95). Worth revisiting, // Etsy takes ~9% in fees, so the cheaper channel is also the less profitable one. But
// changing it for 22 new listings while 97 keep the old ratio would just be inconsistent.
//
// Etsy limits: title <= 140 chars, exactly 13 tags, each tag <= 20 chars.

/** Website price in cents -> Etsy price in dollars, on the established ~2/3 ratio. */
export const ETSY_PRICE = (cents) => {
  const map = { 1200: 7.95, 3000: 19.95, 4500: 29.95, 5900: 39.95, 8900: 59.95, 14900: 99.95,
                995: 6.95, 1500: 9.95, 795: 5.95 };
  return map[cents] ?? Math.round(cents * 0.66) / 100;
};

const SET_BODY = (a, b, c) => `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. A ready-made gallery wall of 3 prints
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• 3 high-resolution PNG files (4:5 ratio, ~300 DPI)
  1. ${a}
  2. ${b}
  3. ${c}
• Each prints beautifully at 8×10" and 16×20", and fits an A4 frame with a small mat
• No physical item is shipped. Download instantly after purchase

WHY A SET
Three prints chosen to hang together. Same palette, same hand. So the wall reads as
one piece instead of three separate pictures. Hang them in a row with 5–8 cm between
frames, centred about 145 cm from the floor.

HOW TO PRINT
At home on matte photo paper, through an online print service, or at any local print
shop. Matte (200–250 gsm) suits the soft watercolour style far better than gloss.

IF ANYTHING IS WRONG
Message me. Wrong size, won't open, anything at all. I'll fix it or refund you.
No forms, no argument.

LICENCE
Personal use only. Print for your home, nursery or as a gift. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`;

const set = (sku, title, tags, [a, b, c]) => ({ sku, title, tags, description: SET_BODY(a, b, c) });

export const ETSY_LISTINGS = [
  // ---- Gallery sets (14) ---------------------------------------------------
  set('set-woodland-friends',
    'Woodland Nursery Print Set of 3, Fawn Fox Owl Wall Art, Forest Animal Gallery Set Printable, Neutral Nursery Decor, Digital Download',
    ['woodland nursery', 'nursery print set', 'set of 3 prints', 'fox nursery art', 'deer nursery print', 'owl nursery art', 'forest animal art', 'gallery wall set', 'neutral nursery', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Little Fawn', 'Autumn Fox Kit', 'Owl Family']),

  set('set-garden-magic',
    'Garden Nursery Print Set of 3, Butterfly Hummingbird Bee Wall Art, Floral Gallery Set Printable, Girls Room Decor, Digital Download',
    ['garden nursery art', 'butterfly nursery', 'nursery print set', 'set of 3 prints', 'hummingbird print', 'floral nursery art', 'gallery wall set', 'girls room decor', 'bee nursery art', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Butterfly Garden', 'Hummingbird Garden', 'Bumblebee Meadow']),

  set('set-ocean-dreams',
    'Ocean Nursery Print Set of 3, Mermaid Under the Sea Sailboat Wall Art, Nautical Gallery Set Printable, Kids Room, Digital Download',
    ['ocean nursery art', 'mermaid nursery', 'nursery print set', 'set of 3 prints', 'under the sea art', 'nautical nursery', 'gallery wall set', 'sailboat nursery', 'kids room decor', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Under the Sea', 'Mermaid Lagoon', 'Little Sailboat']),

  set('set-little-australians',
    'Australian Animal Nursery Print Set of 3, Koala Penguin Gum Blossom Wall Art, Aussie Gallery Set Printable, Digital Download',
    ['australian nursery', 'koala nursery art', 'nursery print set', 'set of 3 prints', 'aussie baby gift', 'gum blossom art', 'penguin nursery', 'gallery wall set', 'native flora art', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Sleepy Koala', 'Gum Blossom Dreams', 'Little Penguin']),

  set('set-up-and-away',
    'Hot Air Balloon Nursery Print Set of 3, Adventure Sky Wall Art, Travel Gallery Set Printable, Gender Neutral Nursery, Digital Download',
    ['hot air balloon', 'nursery print set', 'set of 3 prints', 'adventure nursery', 'travel nursery art', 'gallery wall set', 'neutral nursery', 'sky nursery print', 'balloon wall art', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Hot Air Balloon Dreams', 'Hot Air Balloon Voyage', 'Up & Away']),

  set('set-fairy-hollow',
    'Fairy Nursery Print Set of 3, Enchanted Garden Mushroom Wall Art, Woodland Fairy Gallery Set Printable, Girls Room, Digital Download',
    ['fairy nursery art', 'nursery print set', 'set of 3 prints', 'mushroom wall art', 'enchanted garden', 'fairy girls room', 'gallery wall set', 'woodland fairy', 'magical nursery', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Enchanted Fairy Garden', 'Fairy Blossom', 'Mushroom Hollow']),

  set('set-brave-explorers',
    'Adventure Nursery Print Set of 3, Space Dinosaur Jungle Wall Art, Explorer Gallery Set Printable, Boys Room Decor, Digital Download',
    ['dinosaur nursery', 'space nursery art', 'nursery print set', 'set of 3 prints', 'jungle nursery art', 'boys room decor', 'gallery wall set', 'adventure nursery', 'explorer wall art', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Dreamy Space Adventure', 'Jungle Explorers', 'Little Dinosaurs']),

  set('set-sunshine-and-rainbows',
    'Rainbow Nursery Print Set of 3, Sunshine Swan Cloud Wall Art, Bright Gallery Set Printable, Cheerful Kids Room Decor, Digital Download',
    ['rainbow nursery art', 'nursery print set', 'set of 3 prints', 'sunshine nursery', 'swan nursery art', 'gallery wall set', 'bright kids room', 'cloud nursery art', 'cheerful nursery', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    ['Rainbow & Clouds', 'Sunshine Smile', 'Swan Lake Dream']),

  set('set-wizarding-study',
    'Wizard Study Print Set of 3, Spellbook Quill Book Nook Wall Art, Dark Academia Gallery Set Printable, Bookish Decor, Digital Download',
    ['dark academia', 'wizard decor', 'print set of 3', 'spellbook wall art', 'bookish gift', 'book lover gift', 'gallery wall set', 'magical library', 'academia decor', 'study room art', 'printable wall art', 'digital download', 'instant download'],
    ['The Open Spellbook', 'Quill & Ink', 'The Study Nook']),

  set('set-potions-and-spells',
    'Potion Print Set of 3, Cauldron Apothecary Alchemy Wall Art, Witchy Dark Academia Gallery Set Printable, Digital Download',
    ['potion wall art', 'witchy decor', 'print set of 3', 'cauldron print', 'dark academia', 'apothecary art', 'gallery wall set', 'alchemy print', 'magic wall art', 'halloween decor', 'printable wall art', 'digital download', 'instant download'],
    ['Potions Shelf', 'The Cauldron', "The Alchemist's Desk"]),

  set('set-star-gazing',
    'Astronomy Print Set of 3, Observatory Telescope Crystal Ball Wall Art, Celestial Gallery Set Printable, Study Decor, Digital Download',
    ['astronomy print', 'celestial wall art', 'print set of 3', 'observatory art', 'telescope print', 'gallery wall set', 'crystal ball art', 'dark academia', 'star gazing decor', 'science wall art', 'printable wall art', 'digital download', 'instant download'],
    ['The Observatory', "The Astronomer's Desk", 'The Crystal Ball']),

  set('set-christmas-magic',
    'Christmas Print Set of 3, Tree Reindeer Santa Sleigh Wall Art, Festive Gallery Set Printable, Holiday Nursery Decor, Digital Download',
    ['christmas printable', 'christmas nursery', 'print set of 3', 'reindeer wall art', 'santa print', 'festive wall art', 'gallery wall set', 'holiday printable', 'xmas decor print', 'christmas gift art', 'holiday wall art', 'digital download', 'instant download'],
    ['The Christmas Tree', 'Little Reindeer', "Santa's Sleigh Ride"]),

  set('set-winter-friends',
    'Winter Animal Print Set of 3, Penguin Polar Bear Robin Wall Art, Christmas Gallery Set Printable, Holiday Nursery, Digital Download',
    ['winter wall art', 'penguin print', 'print set of 3', 'polar bear art', 'christmas nursery', 'robin wall art', 'gallery wall set', 'holiday printable', 'festive wall art', 'christmas gift art', 'winter nursery', 'digital download', 'instant download'],
    ['Skating Penguins', "Polar Bear's First Christmas", 'Christmas Robin']),

  set('set-cosy-christmas',
    'Cosy Christmas Print Set of 3, Hot Cocoa Candle Kitten Wall Art, Hygge Festive Gallery Set Printable, Holiday Decor, Digital Download',
    ['cosy christmas', 'hot cocoa print', 'print set of 3', 'candle wall art', 'kitten christmas', 'hygge wall art', 'gallery wall set', 'holiday printable', 'festive wall art', 'christmas gift art', 'xmas decor print', 'digital download', 'instant download'],
    ['Hot Cocoa Night', 'The Candlelit Window', 'Kitten Under the Tree']),

  // ---- The one bundle that fits Etsy's file limits -------------------------
  {
    sku: 'bundle-zodiac',
    zipParts: 4,
    title: 'Complete Baby Zodiac Print Set, All 12 Star Sign Nursery Wall Art, Astrology Constellation Bundle Printable, Digital Download',
    tags: ['zodiac nursery art', 'star sign print', 'astrology baby art', 'zodiac wall art', 'zodiac baby gift', 'constellation art', 'nursery print set', 'celestial nursery', 'new baby gift', 'baby shower gift', 'printable nursery', 'digital download', 'instant download'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. All twelve star signs
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• All 12 Little Zodiac prints as high-resolution PNG files (4:5 ratio, ~300 DPI)
  Aries · Taurus · Gemini · Cancer · Leo · Virgo
  Libra · Scorpio · Sagittarius · Capricorn · Aquarius · Pisces
• Each print carries its own date range and constellation
• Delivered as 4 zip files (Etsy limits each file to 20 MB). Unzip and you have all twelve
• Each prints beautifully at 8×10" and 16×20"
• No physical item is shipped. Download instantly after purchase

WHO BUYS THE WHOLE SET
Anyone making baby gifts more than once. The sign is always right, whenever the baby
arrives. Also lovely as a set of twelve on a long wall.

HOW TO PRINT
At home on matte photo paper, through an online print service, or at any local print
shop. Matte (200–250 gsm) suits the soft watercolour style best.

IF ANYTHING IS WRONG
Message me. Wrong size, won't open, anything at all. I'll fix it or refund you.

LICENCE
Personal use only. Print for your home, nursery or as a gift. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },

  // ---- Printables (7) ------------------------------------------------------
  {
    sku: 'extra-colouring-nursery',
    title: 'Printable Nursery Colouring Book, 20 Page Baby Animal Colouring Pages PDF, Kids Activity Book, Instant Digital Download',
    tags: ['colouring book', 'coloring pages pdf', 'kids activity book', 'printable colouring', 'baby animal pages', 'toddler activity', 'quiet time activity', 'nursery colouring', 'rainy day activity', 'kids printable', 'digital download', 'instant download', 'homeschool printable'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. 20-page printable colouring book
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• A print-ready PDF, 20 pages plus a cover, A4
• Delivered as 2 files. Etsy caps each file at 20 MB, and I would rather split the
  book than compress the line art and put grey halos around every drawing
• Twenty of our dreamiest nursery designs redrawn as clean line art. Bunnies,
  balloons, whales, foxes and more
• Print as many copies as you like, forever, for your own family

WHY IT IS NICE
The same artwork that hangs on nursery walls, turned into something a small person can
actually do something with. Thick, forgiving lines for little hands.

HOW TO PRINT
Ordinary A4 paper is fine. Plain printer paper works for crayons; 120 gsm holds up
better to felt pens. Choose "actual size" rather than "fit to page".

IF ANYTHING IS WRONG
Message me and I'll fix it or refund you. No forms, no argument.

LICENCE
Personal and single-classroom use. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },
  {
    sku: 'extra-colouring-academia',
    title: 'Printable Dark Academia Colouring Book, 20 Page Adult Colouring Pages PDF, Magical Library Potions, Instant Digital Download',
    tags: ['adult colouring', 'dark academia', 'coloring pages pdf', 'colouring book', 'magical library', 'bookish gift', 'potion colouring', 'witchy printable', 'book lover gift', 'mindfulness activity', 'digital download', 'instant download', 'printable pdf'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. 20-page printable colouring book
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• A print-ready PDF, 20 pages plus a cover, A4
• Delivered as 2 files. Etsy caps each file at 20 MB, and I would rather split the
  book than compress the line art and put grey halos around every drawing
• Enchanted libraries, potion shelves, candlelit studies and observatories as
  intricate line art
• Print as many copies as you like, forever, for your own use

WHO IT IS FOR
Grown-ups. The detail is finer than a children's book. Closer to an hour with a cup
of tea than ten minutes at the kitchen table.

HOW TO PRINT
A4 paper. 120 gsm or heavier if you are using felt pens or markers, so nothing bleeds
through. Choose "actual size" rather than "fit to page".

IF ANYTHING IS WRONG
Message me and I'll fix it or refund you.

LICENCE
Personal use only. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },
  {
    sku: 'extra-colouring-festive',
    title: 'Printable Christmas Colouring Book, 20 Page Holiday Colouring Pages PDF, Kids Christmas Activity, Instant Digital Download',
    tags: ['christmas colouring', 'coloring pages pdf', 'kids activity book', 'holiday printable', 'christmas activity', 'advent activity', 'colouring book', 'xmas printable', 'stocking filler', 'kids printable', 'digital download', 'instant download', 'classroom activity'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. 20-page printable colouring book
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• A print-ready PDF, 20 pages plus a cover, A4
• Delivered as 2 files. Etsy caps each file at 20 MB, and I would rather split the
  book than compress the line art and put grey halos around every drawing
• Twenty enchanted Christmas scenes as line art. Reindeer, gingerbread villages,
  candlelit windows, skating penguins
• Print as many copies as you like, every December, forever

WHY PARENTS BUY IT
One page a day through December is a quieter advent than chocolate, and it costs
nothing after the first print.

HOW TO PRINT
Ordinary A4 paper. Choose "actual size" rather than "fit to page".

IF ANYTHING IS WRONG
Message me and I'll fix it or refund you.

LICENCE
Personal and single-classroom use. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },
  {
    sku: 'extra-milestone-cards',
    title: 'Printable Baby Milestone Cards, 16 Card Monthly Photo Prop PDF, Watercolour Newborn Keepsake, Instant Digital Download',
    tags: ['milestone cards', 'baby milestone', 'monthly photo prop', 'newborn keepsake', 'baby shower gift', 'printable baby', 'first year cards', 'baby photo props', 'new baby gift', 'baby announcement', 'digital download', 'instant download', 'printable pdf'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. 16 printable milestone cards
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• A print-ready PDF with 16 cards
• Newborn, then every month to one year, plus the moments in between
• Soft watercolour artwork in the same hand as our nursery prints
• Print as many sets as you like. One for you, one for the grandparents

HOW TO USE THEM
Photograph the card beside your baby each month. Twelve months later you have a
sequence that actually holds together, instead of twelve unrelated phone photos.

HOW TO PRINT
Card stock, 250–300 gsm, so they hold their shape in a photo. A print shop will do
this for a couple of dollars. Choose "actual size" rather than "fit to page".

IF ANYTHING IS WRONG
Message me and I'll fix it or refund you.

LICENCE
Personal use only. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },
  {
    sku: 'extra-name-banner',
    title: 'Printable Nursery Name Banner, Full Alphabet Bunting PDF, Custom Baby Name Garland, Birthday Decor, Instant Digital Download',
    tags: ['name banner', 'nursery bunting', 'printable banner', 'baby name garland', 'birthday banner', 'nursery decor', 'party decoration', 'alphabet bunting', 'baby shower decor', 'printable party', 'digital download', 'instant download', 'printable pdf'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. Spell any name you like
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• A print-ready PDF with every letter A–Z, each on its own piece of magical artwork
• Plus stars and hearts to hang between the letters
• Print only the letters you need. Any name, any length, as many times as you like

WHY IT BEATS A SHOP-BOUGHT BANNER
No waiting, no wrong spelling, and if a letter tears you simply print another one.
Works for a nursery wall, a first birthday, or a baby shower.

HOW TO PRINT
A4 card, 250 gsm. Cut out, punch two holes at the top of each, thread with ribbon
or twine. Choose "actual size" rather than "fit to page".

IF ANYTHING IS WRONG
Message me and I'll fix it or refund you.

LICENCE
Personal use only. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },
  {
    sku: 'extra-bookmarks',
    title: 'Printable Bookmarks Set of 8, Dark Academia Magical Library Bookmark PDF, Bookish Gift, Instant Digital Download',
    tags: ['printable bookmarks', 'bookish gift', 'dark academia', 'book lover gift', 'magical library', 'bookmark pdf', 'reader gift', 'stocking filler', 'book club gift', 'printable pdf', 'digital download', 'instant download', 'teacher gift'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. 8 printable bookmarks
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• A print-ready PDF with 8 bookmarks, laid out to print together on one A4 sheet
• Drawn from the Magical Academia collection. Enchanted libraries, candlelit
  studies, potion shelves, observatories
• Print as many sheets as you like, forever

WHY THEY MAKE GOOD GIFTS
Eight bookmarks for the price of a coffee, and you can print a fresh set whenever
someone in your life finishes a book and loses their place again.

HOW TO PRINT
A4 card, 250 gsm. Cut along the guides. Laminate if you want them to last years
rather than months. Choose "actual size" rather than "fit to page".

IF ANYTHING IS WRONG
Message me and I'll fix it or refund you.

LICENCE
Personal use only. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },
  {
    sku: 'extra-calendar',
    title: 'Printable Wall Calendar Undated, 12 Month Magical Art Calendar PDF, Perpetual Nursery Calendar, Instant Digital Download',
    tags: ['printable calendar', 'wall calendar', 'undated calendar', 'perpetual calendar', 'monthly calendar', '12 month calendar', 'nursery calendar', 'art calendar', 'home organisation', 'printable pdf', 'digital download', 'instant download', 'family calendar'],
    description: `━━━━━━━━━━━━━━━━━━
✨ INSTANT DOWNLOAD. A full twelve-month wall calendar
━━━━━━━━━━━━━━━━━━

WHAT YOU GET
• A print-ready PDF, 12 pages, A4
• Each month led by one of our magical prints
• Undated day grids with space to write. So it never expires, and you can start it
  in any month of any year
• Print it again next year at no extra cost

WHY UNDATED
A dated calendar is worthless by January. This one you print in whatever month you
happen to buy it, and again the year after that.

HOW TO PRINT
A4, 160–250 gsm for a calendar that hangs properly rather than curling. Bind at the
top with a bulldog clip, or punch and ring-bind at a print shop.

IF ANYTHING IS WRONG
Message me and I'll fix it or refund you.

LICENCE
Personal use only. Not for resale.

💝 Personalised name prints, custom songs & stories at littlepoppin.com`,
  },
];
