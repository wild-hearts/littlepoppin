// lib/print-meta.js. Editorial titles + descriptions for every print.
// Used by scripts/build-prints-shop.mjs (falls back to auto-generated title-case if a
// sku is missing here). Keep descriptions to one evocative sentence. They appear on
// the shop cards, in Stripe checkout, and in search/social previews.

export const PRINT_META = {
  // ── Nursery: Enchanted Garden & friends (collection-01) ──
  'print-butterfly-garden': {
    title: 'Butterfly Garden',
    description: 'Glowing butterflies drift through a moonlit blossom garden. A soft pink dream for above the crib.',
  },
  'print-hummingbird-garden': {
    title: 'Hummingbird Garden',
    description: 'Tiny hummingbirds sip starlight in an enchanted twilight garden of teal and gold.',
  },
  'print-sleepy-bunny': {
    title: 'Sleepy Bunny',
    description: 'A little bunny curled up in a glowing meadow beneath the stars. Pure bedtime calm.',
  },
  'print-little-fawn': {
    title: 'Little Fawn',
    description: 'A gentle baby deer rests in a firefly-lit forest glade, wrapped in sage-green magic.',
  },
  'print-sleepy-moon-and-stars': {
    title: 'Sleepy Moon & Stars',
    description: 'A softly smiling crescent moon dozes in a sparkling lavender sky. The classic nursery night-light in print form.',
  },
  'print-hot-air-balloon-dreams': {
    title: 'Hot Air Balloon Dreams',
    description: 'A little glowing balloon sails through a starry dreamscape, carrying wishes to sleep.',
  },
  'print-rainbow-and-clouds': {
    title: 'Rainbow & Clouds',
    description: 'A shimmering pastel rainbow arches over glowing dream clouds. Instant joy on a nursery wall.',
  },
  'print-cuddly-elephant': {
    title: 'Cuddly Elephant',
    description: 'A sweet baby elephant holds a glowing balloon under the stars. Gentle, warm and huggable.',
  },
  'print-wildflower-meadow': {
    title: 'Wildflower Meadow',
    description: 'Fireflies and butterflies dance over a glowing twilight meadow of soft sage and gold.',
  },
  'print-gum-blossom-dreams': {
    title: 'Gum Blossom Dreams',
    description: 'A tiny wren sleeps among glowing eucalyptus blossoms. An Australian twilight lullaby.',
  },

  // ── Nursery: Adventures & Creatures (collection-02) ──
  'print-dreamy-space-adventure': {
    title: 'Dreamy Space Adventure',
    description: 'A little astronaut floats through a sparkling galaxy of pastel planets. For small dreamers with big journeys ahead.',
  },
  'print-mermaid-lagoon': {
    title: 'Mermaid Lagoon',
    description: 'A sweet mermaid glides through a glowing coral lagoon scattered with starlight.',
  },
  'print-little-dinosaurs': {
    title: 'Little Dinosaurs',
    description: 'Adorable baby dinosaurs wander a glowing fern jungle. Prehistoric magic, nursery-soft.',
  },
  'print-unicorn-dreams': {
    title: 'Unicorn Dreams',
    description: 'A baby unicorn leaps through a starry sky trailing stardust. Every magical wish in one print.',
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
    description: 'A fleet of glowing balloons drifts over a starlit landscape. Up, up and away to dreamland.',
  },
  'print-dream-castle-in-the-clouds': {
    title: 'Dream Castle in the Clouds',
    description: 'A golden fairytale castle floats on clouds beneath a rainbow. Where every bedtime story lives.',
  },

  // ── Nursery: Magical Additions (collection-03) ──
  'print-fairy-blossom': {
    title: 'Fairy Blossom',
    description: 'A tiny fairy sleeps in a bed of glowing blossoms, wrapped in stardust and fairy lights.',
  },
  'print-mushroom-hollow': {
    title: 'Mushroom Hollow',
    description: 'Luminous toadstools glow in a firefly hollow. A little door into the fairy world.',
  },
  'print-dreamy-bear-cub': {
    title: 'Dreamy Bear Cub',
    description: 'A sleepy bear cub curls up on a glowing cloud beneath a sky full of golden stars.',
  },
  'print-sleepy-lamb-on-a-cloud': {
    title: 'Sleepy Lamb on a Cloud',
    description: 'A fluffy lamb dozes on a soft glowing cloud. The gentlest goodnight there is.',
  },
  'print-sunshine-smile': {
    title: 'Sunshine Smile',
    description: 'A gently smiling sun radiates warm golden light through soft sparkling clouds.',
  },
  'print-star-catcher': {
    title: 'Star Catcher',
    description: 'A little one in pyjamas catches falling stars in a net of stardust. Chase your dreams, always.',
  },
  'print-cloud-dreams': {
    title: 'Cloud Dreams',
    description: 'Sleepy clouds rain tiny twinkling stars across a dusty-blue night. Softness itself.',
  },
  'print-baby-dragon': {
    title: 'Baby Dragon',
    description: 'A friendly baby dragon breathes tiny sparkles among the clouds. Fierce-ly adorable.',
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
    description: 'Towering shelves, floating books and warm candlelight. A grand library where the books read back.',
  },
  'print-potions-shelf': {
    title: 'Potions Shelf',
    description: 'Glowing potion bottles, an open spellbook and a flickering candle. Brew something wonderful.',
  },
  'print-the-magic-wand': {
    title: 'The Magic Wand',
    description: 'An ornate wand sparks golden light atop a stack of well-loved spellbooks.',
  },
  'print-owl-post': {
    title: 'Owl Post',
    description: 'A wise owl delivers a wax-sealed letter by candlelight. Special post from a magical world.',
  },
  'print-floating-candles': {
    title: 'Floating Candles',
    description: 'A grand hall glows under hundreds of softly floating candles. Pure enchanted-castle wonder.',
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
    description: 'Hanging lanterns light a misty forest path. Follow the glow into the enchanted dark.',
  },
  'print-the-astronomer-s-desk': {
    title: "The Astronomer's Desk",
    description: 'Star charts, an astrolabe and a quill by candlelight. Where the night sky gets mapped.',
  },

  // ── 🎄 Festive Magic (collection-06) ──
  'print-the-christmas-tree': {
    title: 'The Christmas Tree',
    description: 'A glowing tree strung with golden lights and a shining star, cosy in the falling snow.',
  },
  'print-santa-s-sleigh-ride': {
    title: "Santa's Sleigh Ride",
    description: 'A tiny glowing sleigh and reindeer soar over snowy rooftops beneath a sky full of stars.',
  },
  'print-little-reindeer': {
    title: 'Little Reindeer',
    description: 'A baby reindeer in a red scarf waits in a glowing snowy forest as soft snow falls.',
  },
  'print-snowman-s-midnight': {
    title: "Snowman's Midnight",
    description: 'A sweet snowman smiles beneath a shimmering aurora and a scattering of stars.',
  },
  'print-christmas-mice': {
    title: 'Christmas Mice',
    description: 'Tiny mice snuggle in a hanging stocking by the warm glow of the fire.',
  },
  'print-gingerbread-village': {
    title: 'Gingerbread Village',
    description: 'A glowing gingerbread village with icing rooftops sparkles under gentle snowfall.',
  },
  'print-the-nutcracker-s-dream': {
    title: "The Nutcracker's Dream",
    description: 'A toy nutcracker and a dancing ballerina twirl inside a magical glowing snow globe.',
  },
  'print-silent-snowfall': {
    title: 'Silent Snowfall',
    description: 'A fawn, bunny and robin watch soft glowing snow drift down in a hushed enchanted forest.',
  },
  'print-the-candlelit-window': {
    title: 'The Candlelit Window',
    description: 'A frosted window glows with a candle and holly wreath, looking out on a starry snowfall.',
  },
  'print-polar-bear-s-first-christmas': {
    title: "Polar Bear's First Christmas",
    description: 'An adorable baby polar bear hugs a glowing gift beneath the northern lights.',
  },

  // ── ⭐ Little Zodiac (collection-07) ──
  'print-little-aries': {
    title: 'Little Aries · 21 Mar – 19 Apr',
    description: 'A sleepy baby ram beneath the Aries constellation. For brave little fire signs.',
  },
  'print-little-taurus': {
    title: 'Little Taurus · 20 Apr – 20 May',
    description: 'A flower-crowned baby calf dozing under the Taurus stars. Steady, sweet and calm.',
  },
  'print-little-gemini': {
    title: 'Little Gemini · 21 May – 20 Jun',
    description: 'Twin baby bunnies cuddled on a cloud beneath the Gemini constellation.',
  },
  'print-little-cancer': {
    title: 'Little Cancer · 21 Jun – 22 Jul',
    description: 'A gentle little crab on a moonlit shore under the Cancer stars. Soft-hearted and true.',
  },
  'print-little-leo': {
    title: 'Little Leo · 23 Jul – 22 Aug',
    description: 'A golden lion cub asleep on his rock beneath the Leo constellation. Born to shine.',
  },
  'print-little-virgo': {
    title: 'Little Virgo · 23 Aug – 22 Sep',
    description: 'A tiny fairy child with glowing wheat and wildflowers under the Virgo stars.',
  },
  'print-little-libra': {
    title: 'Little Libra · 23 Sep – 22 Oct',
    description: 'A sweet fairy balancing scales of stars beneath the Libra constellation.',
  },
  'print-little-scorpio': {
    title: 'Little Scorpio · 23 Oct – 21 Nov',
    description: 'A friendly little scorpion with a glowing lantern tail under the Scorpio stars.',
  },
  'print-little-sagittarius': {
    title: 'Little Sagittarius · 22 Nov – 21 Dec',
    description: 'A baby centaur pony aiming a star-tipped arrow beneath the Sagittarius constellation.',
  },
  'print-little-capricorn': {
    title: 'Little Capricorn · 22 Dec – 19 Jan',
    description: 'A sleepy baby mountain goat resting on a glowing peak under the Capricorn stars.',
  },
  'print-little-aquarius': {
    title: 'Little Aquarius · 20 Jan – 18 Feb',
    description: 'A little one pouring a stream of stars beneath the Aquarius constellation.',
  },
  'print-little-pisces': {
    title: 'Little Pisces · 19 Feb – 20 Mar',
    description: 'Two little fish circling in stardust beneath the Pisces stars. The zodiac’s dreamers.',
  },

  // ── Nursery II (collection-08) ──
  'print-sleepy-koala': {
    title: 'Sleepy Koala',
    description: 'A baby koala dozes in a glowing eucalyptus tree under the stars. An Aussie lullaby.',
  },
  'print-little-penguin': {
    title: 'Little Penguin',
    description: 'A sweet penguin chick on a glowing iceberg beneath a sky full of twinkling stars.',
  },
  'print-autumn-fox-kit': {
    title: 'Autumn Fox Kit',
    description: 'A baby fox curled in glowing autumn leaves while fireflies drift by.',
  },
  'print-owl-family': {
    title: 'Owl Family',
    description: 'Three sleepy baby owls snuggled on a branch beneath the crescent moon.',
  },
  'print-bumblebee-meadow': {
    title: 'Bumblebee Meadow',
    description: 'Chubby little bumblebees bumble over a glowing meadow of honey-gold flowers.',
  },
  'print-swan-lake-dream': {
    title: 'Swan Lake Dream',
    description: 'A mother swan and her cygnet glide across a moonlit lake of pearl and silver.',
  },
  'print-teddy-bears-picnic': {
    title: 'Teddy Bears’ Picnic',
    description: 'Teddy bears share a tiny picnic under a glowing tree. The classic, made magical.',
  },
  'print-carousel-dreams': {
    title: 'Carousel Dreams',
    description: 'A glowing carousel turns softly under the stars, painted ponies mid-dream.',
  },
  'print-lighthouse-dreams': {
    title: 'Lighthouse Dreams',
    description: 'A little lighthouse guides tiny boats home beneath a starry night sky.',
  },
  'print-paper-boat-stream': {
    title: 'Paper Boat Stream',
    description: 'Paper boats sail a glowing stream of stars through a dreamy meadow.',
  },

  // ── Magical Academia II (collection-09) ──
  'print-the-open-spellbook': {
    title: 'The Open Spellbook',
    description: 'Golden magic swirls up from the pages of an ancient book by candlelight.',
  },
  'print-the-wizard-s-hat': {
    title: "The Wizard's Hat",
    description: 'A pointed hat and spectacles rest on old books, sparks still drifting from the brim.',
  },
  'print-the-magic-broom': {
    title: 'The Magic Broom',
    description: 'A well-flown broom waits by the candlelit door as autumn leaves swirl in.',
  },
  'print-the-observatory': {
    title: 'The Observatory',
    description: 'A brass telescope points through the dome at a sky of glowing constellations.',
  },
  'print-the-alchemist-s-desk': {
    title: "The Alchemist's Desk",
    description: 'Brass scales, golden ingredients and curling potion-smoke. Mid-experiment.',
  },
  'print-the-enchanted-tea-party': {
    title: 'The Enchanted Tea Party',
    description: 'A floating teapot pours glowing tea into cups that stir themselves.',
  },
  'print-the-magic-mirror': {
    title: 'The Magic Mirror',
    description: 'An ornate gilded mirror swirls with starlight in a candlelit room.',
  },
  'print-the-study-nook': {
    title: 'The Study Nook',
    description: 'A window-seat nook with books, a sleeping cat and rain on the glass. Pure cosy magic.',
  },
  'print-the-dragon-s-egg': {
    title: "The Dragon's Egg",
    description: 'A speckled egg glows and cracks with golden light in the candlelit study.',
  },
  'print-quill-and-ink': {
    title: 'Quill & Ink',
    description: 'A grand feather quill writes by itself in glowing golden ink.',
  },

  // ── Festive Magic II (collection-10) ──
  'print-christmas-robin': {
    title: 'Christmas Robin',
    description: 'A round little robin on a glowing holly branch as the snow gently falls.',
  },
  'print-skating-penguins': {
    title: 'Skating Penguins',
    description: 'Penguins in woolly scarves skate a glowing frozen pond under the stars.',
  },
  'print-santa-s-workshop': {
    title: "Santa's Workshop",
    description: 'Tiny elves wrap presents in a cosy toy workshop lit by warm lanterns.',
  },
  'print-the-snow-globe': {
    title: 'The Snow Globe',
    description: 'A snowy cottage lives inside a glowing snow globe, flakes drifting forever.',
  },
  'print-the-christmas-train': {
    title: 'The Christmas Train',
    description: 'A little steam train winds through snowy pines, windows glowing gold.',
  },
  'print-kitten-under-the-tree': {
    title: 'Kitten Under the Tree',
    description: 'A sleepy kitten curled among the presents beneath the glowing tree.',
  },
  'print-christmas-market': {
    title: 'Christmas Market',
    description: 'Cosy market stalls strung with warm lights glow through gentle snowfall.',
  },
  'print-hot-cocoa-night': {
    title: 'Hot Cocoa Night',
    description: 'Cocoa with marshmallows by a glowing fire, a sleepy puppy at your feet.',
  },
  'print-the-advent-wreath': {
    title: 'The Advent Wreath',
    description: 'An evergreen wreath with glowing candles and holly berries, sparkling softly.',
  },
  'print-star-of-wonder': {
    title: 'Star of Wonder',
    description: 'A radiant golden star shines its gentle light over a tiny snowy village.',
  },

  // ── Photorealistic series, November 2026 (scripts/print-series.mjs) ──
  'print-magical-stories-wardrobe-to-snowy-forest': {
    title: 'Wardrobe to the Snowy Forest',
    description: 'An old wardrobe door swings open onto a lamplit, snow-covered wood. The first page of every winter adventure.',
  },
  'print-magical-stories-sleeping-red-dragon-mapmakers-desk': {
    title: "Sleeping Dragon on the Mapmaker's Desk",
    description: 'A small red dragon dozes among maps, a compass and a glowing lantern. Treasure hunts start here.',
  },
  'print-magical-stories-lantern-boat-on-forest-stream': {
    title: 'Lantern Boat on the Forest Stream',
    description: 'A little wooden boat drifts past lily pads under a full moon, its lantern lighting the way home.',
  },
  'print-magical-stories-bridge-to-hidden-garden': {
    title: 'Bridge to the Hidden Garden',
    description: 'A mossy stone bridge leads through an archway into a sunlit secret garden. Somewhere worth exploring.',
  },
  'print-magical-stories-woodland-bakery': {
    title: 'The Woodland Bakery',
    description: 'A thatched cottage bakery glows at the edge of the woods, its shelves stacked with fresh bread.',
  },
  'print-magical-stories-moonlit-village-clocktower': {
    title: 'Moonlit Village Clocktower',
    description: 'Ivy climbs a tall clocktower above a village of glowing windows, all under a huge silver moon.',
  },
  'print-magical-stories-enchanted-treehouse': {
    title: 'The Enchanted Treehouse',
    description: 'A lantern-lit treehouse with a rope ladder, perched high above a sunset valley. Every child’s dream hideout.',
  },
  'print-magical-stories-woodland-fairy-tea-table': {
    title: 'Woodland Fairy Tea Table',
    description: 'A tiny tea party laid on a mushroom table beneath pink foxgloves, with the kettle still steaming.',
  },
  'print-magical-stories-wishing-well-with-golden-key': {
    title: 'Wishing Well with a Golden Key',
    description: 'A mossy well full of starry water, roses climbing its sides and a golden key waiting on the edge.',
  },
  'print-magical-stories-staircase-to-tree-doorway': {
    title: 'Staircase to the Tree Doorway',
    description: 'Winding stone steps climb a giant tree to a small glowing door. Knock, and see who answers.',
  },
  'print-magical-realms-fox-and-fairy-ring': {
    title: 'Fox and the Fairy Ring',
    description: 'A curious fox sniffs at a ring of glowing mushrooms in the bluebell woods at twilight.',
  },
  'print-magical-realms-fairy-winged-owl': {
    title: 'Fairy-Winged Owl',
    description: 'A barn owl with translucent fairy wings perches under the moon, lit by the softest glow.',
  },
  'print-magical-realms-emerald-crystal-dragon': {
    title: 'Emerald Crystal Dragon',
    description: 'A small green dragon curls around a nest of glowing crystals, scales shining like gemstones.',
  },
  'print-magical-realms-unicorn-in-lavender-meadow': {
    title: 'Unicorn in the Lavender Meadow',
    description: 'A white unicorn stands in a misty field of lavender as the sun rises behind a faint rainbow.',
  },
  'print-magical-realms-tree-root-miniature-village': {
    title: 'Tree Root Village',
    description: 'Tiny round doors and glowing windows tucked among the roots of an ancient tree, with a bridge over the stream.',
  },
  'print-magical-realms-mermaid-in-hidden-lagoon': {
    title: 'Mermaid in the Hidden Lagoon',
    description: 'A mermaid rests on a rock in a sunlit lagoon, her tail shimmering in every shade of sea green.',
  },
  'print-magical-realms-moonlit-lake-castle': {
    title: 'Moonlit Lake Castle',
    description: 'A castle on a tiny island, reflected in still water under a full moon and drifting mist.',
  },
  'print-magical-realms-fairy-lantern-bluebell': {
    title: 'Fairy with a Bluebell Lantern',
    description: 'A fairy perches among bluebells, lighting her way with a lantern in the deep blue dusk.',
  },
  'print-magical-realms-hidden-tree-library': {
    title: 'The Hidden Tree Library',
    description: 'A library grown inside a hollow tree, with spiral stairs, candlelight and shelves to the ceiling.',
  },
  'print-magical-realms-phoenix-at-sunrise': {
    title: 'Phoenix at Sunrise',
    description: 'A phoenix in red and gold feathers watches the sun rise over misty mountains from a bare branch.',
  },
  'print-magical-realms-moonlit-enchanted-greenhouse': {
    title: 'Moonlit Enchanted Greenhouse',
    description: 'A glass greenhouse glows from within on a moonlit night, roses tumbling around its door.',
  },
  'print-photo-art-enchanted-foxglove-fairy-house': {
    title: 'Foxglove Fairy House',
    description: 'A fairy house built inside a pink foxglove, with tiny windows glowing and a ladder to the door.',
  },
  'print-photo-art-moonlit-lavender-unicorn': {
    title: 'Moonlit Lavender Unicorn',
    description: 'A white unicorn in a field of lavender under a full moon. Quiet, silvery and dreamlike.',
  },
  'print-photo-art-dewdrop-fairy-cottage': {
    title: 'Dewdrop Fairy Cottage',
    description: 'A fairy sits on a toadstool outside a tiny cottage, the morning light catching every dewdrop.',
  },
  'print-photo-art-crystal-cave-baby-dragon': {
    title: 'Baby Dragon in the Crystal Cave',
    description: 'A baby dragon sleeps beside a lantern among glowing purple and blue crystals.',
  },
  'print-photo-art-rose-garden-little-witch': {
    title: 'Little Witch in the Rose Garden',
    description: 'A little witch in a velvet cloak walks her black cat through a rose garden by lantern light.',
  },
  'print-photo-art-moonlit-rose-castle': {
    title: 'Moonlit Rose Castle',
    description: 'A castle of towers and lit windows rises above a rose garden under a bright full moon.',
  },
  'print-photo-art-blue-whale-in-sunlit-water': {
    title: 'Blue Whale in Sunlit Water',
    description: 'A blue whale glides through shafts of sunlight in deep turquoise water. Calm, vast and gentle.',
  },
  'print-photo-art-sea-turtle-over-coral-reef': {
    title: 'Sea Turtle over the Coral Reef',
    description: 'A sea turtle swims above a bright coral reef in clear, sun-dappled water.',
  },
  'print-photo-art-astronaut-above-earth': {
    title: 'Astronaut above Earth',
    description: 'A young astronaut floats above the blue curve of Earth, grinning at the stars. Big dreams, small helmet.',
  },
  'print-photo-art-photoreal-solar-system': {
    title: 'The Solar System',
    description: 'The planets lined up from the sun to the edge of the dark, Saturn’s rings catching the light.',
  },
  'print-photo-art-yellow-excavator-at-golden-hour': {
    title: 'Yellow Excavator at Golden Hour',
    description: 'A big yellow digger at work in the late sun, bucket raised and dust in the air. For the truck-obsessed.',
  },
  'print-photo-art-classic-car-by-the-coast': {
    title: 'Little Red Car by the Coast',
    description: 'A cherry-red classic car parked above a sparkling bay at sunset. A holiday in one picture.',
  },
  'print-photo-art-sleeping-fox-in-a-tree-hollow': {
    title: 'Sleeping Fox in a Tree Hollow',
    description: 'A fox curled up on a velvet cushion inside a cosy tree hollow, with books and a lantern for company.',
  },
  'print-australian-wildlife-koala-in-eucalyptus': {
    title: 'Koala in the Eucalyptus',
    description: 'A koala peers out from the fork of a gum tree, fluffy ears lit by the afternoon sun.',
  },
  'print-australian-wildlife-wombat-in-bushland': {
    title: 'Wombat in the Bushland',
    description: 'A sturdy little wombat ambles along a bush track among the gums. Unhurried and utterly lovable.',
  },
  'print-australian-wildlife-quokka-by-coastal-scrub': {
    title: 'Quokka by the Coast',
    description: 'The happiest animal on Earth, mid-grin, with a turquoise bay behind. Pure joy for a nursery wall.',
  },
  'print-australian-wildlife-echidna-in-bushland': {
    title: 'Echidna in the Bushland',
    description: 'An echidna picks its way across the leaf litter, every spine catching the light.',
  },
  'print-australian-wildlife-sulphur-crested-cockatoo': {
    title: 'Sulphur-Crested Cockatoo',
    description: 'A white cockatoo with its yellow crest raised, perched on a branch and plainly in charge.',
  },
  'print-australian-wildlife-eastern-grey-kangaroo': {
    title: 'Eastern Grey Kangaroo',
    description: 'A kangaroo stands tall and alert in the grass at the edge of the bush.',
  },
  'print-mermaid-mermaid-by-hidden-lagoon': {
    title: 'Mermaid by the Hidden Lagoon',
    description: 'A red-haired mermaid rests on the rocks of a turquoise lagoon, sea caves glowing behind her.',
  },
  'print-mermaid-mermaid-in-kelp-forest': {
    title: 'Mermaid in the Kelp Forest',
    description: 'A mermaid glides through tall kelp beside a sea turtle, sunlight falling through the water.',
  },
  'print-mermaid-mermaid-at-coral-palace': {
    title: 'Mermaid at the Coral Palace',
    description: 'A mermaid swims towards a pink coral palace, her braid trailing through the bright water.',
  },
  'print-mermaid-pearls-in-mermaid-grotto': {
    title: 'Pearls in the Mermaid Grotto',
    description: 'A giant shell spills pearls across the floor of a sunlit grotto. Treasure, found.',
  },
  'print-mermaid-mermaid-and-seahorse': {
    title: 'Mermaid and the Seahorse',
    description: 'A mermaid in white drifts through clear blue water, a seahorse keeping her company.',
  },
  'print-mermaid-twilight-mermaid-lagoon': {
    title: 'Twilight Mermaid Lagoon',
    description: 'A lagoon at dusk, half above the water and half below, with palms, a stone arch and coral gardens.',
  },
  'print-mermaid-mermaid-coral-cottage': {
    title: 'The Mermaid’s Coral Cottage',
    description: 'A tiny cottage built from coral and shells, with a lantern over the door and fish for neighbours.',
  },
  'print-mermaid-mermaid-and-dolphins': {
    title: 'Mermaid and the Dolphins',
    description: 'A mermaid in emerald green swims with dolphins through a sunlit sea cave.',
  },
  'print-mermaid-mermaid-in-luminous-cave': {
    title: 'Mermaid in the Luminous Cave',
    description: 'A mermaid floats beneath a glowing cave ceiling, her lilac tail lit from below.',
  },
  'print-mermaid-underwater-coral-palace': {
    title: 'Underwater Coral Palace',
    description: 'A pearl-white palace rises from a coral garden, with a mermaid swimming towards its gates.',
  },
  'print-dog-golden-retriever-puppy': {
    title: 'Golden Retriever Puppy',
    description: 'A golden retriever puppy sits in the daisies with the happiest face on four legs.',
  },
  'print-dog-beagle-in-autumn-leaves': {
    title: 'Beagle in the Autumn Leaves',
    description: 'A beagle nose-deep in fallen leaves, hot on the trail of something wonderful.',
  },
  'print-dog-border-collie-with-ball': {
    title: 'Border Collie with a Ball',
    description: 'A border collie races across the grass with a red ball, ears flying. Pure energy.',
  },
  'print-dog-red-dachshund-on-porch': {
    title: 'Dachshund on the Porch',
    description: 'A red dachshund sits proudly on a cottage porch among the flower pots and gumboots.',
  },
  'print-dog-siberian-husky-in-snow': {
    title: 'Husky in the Snow',
    description: 'A husky with ice-blue eyes sits in fresh snow, every hair frosted and glowing.',
  },
  'print-dog-maltese-by-cottage-window': {
    title: 'Maltese by the Cottage Window',
    description: 'A fluffy white Maltese with a pink bow, curled on a blanket by a sunny cottage window.',
  },
  'print-dog-chocolate-labrador-at-beach': {
    title: 'Chocolate Labrador at the Beach',
    description: 'A chocolate lab bounds through the shallows, tongue out and water flying.',
  },
  'print-dog-corgi-in-park': {
    title: 'Corgi in the Park',
    description: 'A corgi with ears up and tongue out, sitting pretty in the sunny park grass.',
  },
  'print-dog-cocker-spaniel-in-buttercups': {
    title: 'Cocker Spaniel in the Buttercups',
    description: 'A golden cocker spaniel sits in a meadow of buttercups, ears glowing in the sun.',
  },
  'print-dog-black-pug-in-autumn-park': {
    title: 'Black Pug in the Autumn Park',
    description: 'A black pug perches on a park bench among red maple leaves, as pleased with itself as ever.',
  },

  // --- Series 02 (November 2026) -------------------------------------------------
  'print-woodland-magic-woodland-fox': {
    title: 'Fox in the Ferns',
    description: 'A red fox rests its chin on a mossy log while morning light pours through the ferns. The quietest moment in the forest.',
  },
  'print-woodland-magic-woodland-owl': {
    title: 'Owl at Dusk',
    description: 'A barn owl watches from a mossy branch as the moon rises behind the trees. Wide-eyed, soft-feathered and wise.',
  },
  'print-woodland-magic-hedgehog-in-fern': {
    title: 'Hedgehog in the Ferns',
    description: 'A little hedgehog peeks out from a hollow in the roots, dew on the ferns and a daisy at the door.',
  },
  'print-woodland-magic-white-rabbit-bluebells': {
    title: 'White Rabbit in the Bluebells',
    description: 'A white rabbit sits up among the bluebells, ears high, sunlight on its fur. Spring in one photograph.',
  },
  'print-woodland-magic-fairy-door-in-tree-roots': {
    title: 'The Fairy Door',
    description: 'Mossy steps climb to a tiny lamplit door set deep in the tree roots, foxgloves nodding beside it. Someone small is home.',
  },
  'print-woodland-magic-unicorn-by-waterfall': {
    title: 'Unicorn by the Waterfall',
    description: 'A white unicorn pauses at a forest waterfall, mist in the air and ferns underfoot. Seen for just a second.',
  },
  'print-woodland-magic-emerald-baby-dragon': {
    title: 'Emerald Baby Dragon',
    description: 'A small green dragon curls up inside a tree hollow, scales catching the light, wings not yet grown into.',
  },
  'print-woodland-magic-miniature-woodland-bakery': {
    title: 'The Woodland Bakery',
    description: 'A tiny bakery built into a tree trunk, windows glowing, toadstools by the step. Open early for the mice.',
  },
  'print-woodland-magic-rabbit-in-moonboat': {
    title: 'Rabbit in the Moon Boat',
    description: 'A sleepy rabbit tucked under a blanket in a little wooden boat, drifting through the clouds under a full moon.',
  },
  'print-woodland-magic-wizards-woodland-study': {
    title: 'The Wizard\'s Woodland Study',
    description: 'A study grown inside a tree: books on living shelves, a brass telescope, an open spellbook and a lamp left on.',
  },
  'print-ocean-humpback-mother-and-calf': {
    title: 'Humpback Mother and Calf',
    description: 'A humpback whale and her calf rise through sunlit blue water, side by side. Enormous, gentle and calm.',
  },
  'print-ocean-green-sea-turtle-over-reef': {
    title: 'Sea Turtle over the Reef',
    description: 'A green sea turtle glides over a coral reef, sunbeams rippling across its shell and the water glowing turquoise.',
  },
  'print-ocean-manta-ray-over-coral-reef': {
    title: 'Manta Ray over the Reef',
    description: 'A manta ray sweeps over the coral like a kite in slow motion, wings wide, light dancing on the reef below.',
  },
  'print-ocean-young-grey-seal-portrait': {
    title: 'Seal Pup on the Rocks',
    description: 'A young grey seal rests on the rocks with the tide coming in, whiskers wet and eyes enormous.',
  },
  'print-space-astronaut-and-lunar-rover': {
    title: 'Astronaut and Lunar Rover',
    description: 'An astronaut stands beside the rover on the grey lunar surface, Earth rising small and blue behind.',
  },
  'print-space-lunar-lander': {
    title: 'The Lunar Lander',
    description: 'A gold-foiled lander rests on the moon, its shadow long across the dust, Earth watching from the black sky.',
  },
  'print-space-saturn-and-rings': {
    title: 'Saturn and Her Rings',
    description: 'Saturn fills the frame, bands of cream and gold, rings sweeping out into the dark. The best planet, settled.',
  },
  'print-vehicles-fire-engine-at-station': {
    title: 'Fire Engine at the Station',
    description: 'A red fire engine gleams outside the brick station as the sun goes down. Polished, ready and very big.',
  },
  'print-vehicles-yellow-dump-truck': {
    title: 'Yellow Dump Truck',
    description: 'A huge yellow dump truck rolls along a quarry road, tyres taller than a grown-up, dust in the sunshine.',
  },
  'print-vehicles-classic-camper-van': {
    title: 'Camper Van by the Sea',
    description: 'A mint-green classic camper van parked under a tree above the beach, roof up, the whole summer ahead of it.',
  },
};
