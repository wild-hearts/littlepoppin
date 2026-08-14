// guides-content.mjs. The written guides, kept apart from the page machinery.
//
// WHY THESE EXIST: product pages can only rank for their own design's name. Nobody
// searches "Sleepy Moon & Stars print" before they know it exists. They search "how
// high to hang nursery art" or "what size print above a cot". These answer the
// questions people actually type on the way to buying, and link through to the shop.
//
// Written to be genuinely useful on their own. A thin page stuffed with keywords ranks
// badly and reads worse; the measurements and advice here are real and specific.

export const GUIDES = [
  {
    slug: 'nursery-gallery-wall',
    title: 'How to Style a Nursery Gallery Wall',
    description: 'A practical guide to hanging a nursery gallery wall. How many prints, what spacing, how high, and the one safety rule that matters most above a cot.',
    intro: 'A gallery wall is the fastest way to make a nursery feel finished. It is also the easiest thing to get slightly wrong, in ways that nag at you every time you walk in. Here is how to get it right the first time.',
    image: '/images/mockups/set-sweet-dreams.jpg',
    imageAlt: 'Three framed nursery prints hung as a gallery wall',
    updated: '2026-08-07',
    sections: [
      {
        h: 'Start with three',
        p: [
          'Odd numbers sit more comfortably than even ones, and three is the sweet spot for a nursery. Two can look like something is missing; five needs a lot of wall and careful spacing to avoid looking busy.',
          'Three prints in matching frames, hung in a row, will look deliberate in almost any room. It is the arrangement to choose if you want this done in an afternoon.',
        ],
      },
      {
        h: 'Pick a thread, not a theme',
        p: [
          'The prints do not need to match. They need one thing in common. A shared palette, a repeated subject, or the same illustration style. That thread is what makes three separate pictures read as one piece.',
          'The easiest version: pick three from the same collection. A sleepy bunny, a dreaming bear and a lamb on a cloud already share a palette and a hand, so the wall holds together without you having to think about it.',
        ],
      },
      {
        h: 'Spacing: 5 to 8 cm, and be consistent',
        p: [
          'Leave 5–8 cm between frames. Closer than that and they crowd; wider and they stop reading as a group. Whatever gap you choose, keep it identical between every pair. The eye forgives an unusual gap far more readily than an inconsistent one.',
          'Lay the frames out on the floor first and adjust until it looks right. Ten minutes on the carpet saves a wall full of nail holes.',
        ],
      },
      {
        h: 'Height: measure to the centre, not the top',
        p: [
          'Hang so the centre of the arrangement sits about 145–150 cm from the floor. That is standing eye level, and it is the same rule galleries use.',
          'Above furniture, work from the furniture instead: leave 20–25 cm between the top of a dresser or change table and the bottom of the frames, so the two read as one composition rather than two unrelated things.',
        ],
      },
      {
        h: 'The rule that actually matters: nothing heavy above the cot',
        p: [
          'Do not hang framed glass directly above where your baby sleeps. It is the one piece of nursery styling advice worth being firm about. Red Nose and equivalent safe-sleep guidance is consistent that the cot area should be clear.',
          'If you want art in that eyeline, hang it on the opposite wall, or on the wall beside the cot rather than over it. Lightweight, unframed prints mounted with removable strips are a safer option if you want something directly above.',
        ],
      },
      {
        h: 'Frames: keep them the same',
        p: [
          'Vary the art, not the frames. Identical frames are what let three different pictures hang together without looking like a jumble sale. Simple black, white or natural oak all work; the frame should disappear.',
          'A mat (the card border inside the frame) makes even an inexpensive print look considered. If your frame comes with one, use it.',
        ],
      },
    ],
    faq: [
      ['How many prints should a nursery gallery wall have?', 'Three is the reliable choice. Odd numbers sit more comfortably than even ones, and three fills a wall without needing careful balancing. Five works if you have the space and are willing to lay it out properly first.'],
      ['How high should nursery wall art be hung?', 'Centre the arrangement about 145–150 cm from the floor, which is standing eye level. Above a dresser or change table, instead leave 20–25 cm between the furniture and the bottom of the frames.'],
      ['How much space should there be between frames?', 'Between 5 and 8 cm, and identical between every pair. Consistent spacing matters more than the exact number.'],
      ['Is it safe to hang pictures above a cot?', 'Framed art with glass should not be hung directly above where a baby sleeps. Hang it on an adjacent or opposite wall instead, or use a lightweight unframed print if you want something in that space.'],
    ],
    cta: { text: 'Our gallery sets are three matching prints chosen to hang together. The thread is already done for you.', href: 'prints.html#sets', label: 'See the gallery sets' },
  },

  {
    slug: 'nursery-art-print-sizes',
    title: 'What Size Should Nursery Wall Art Be?',
    description: 'How to choose a print size for a nursery. The two-thirds rule, what 8×10, A4 and 16×20 actually look like on a wall, and which sizes suit a cot, dresser or empty wall.',
    intro: 'Print size is the single most common thing people get wrong, and it is almost always the same mistake: going too small. Here is how to choose with confidence.',
    image: '/images/mockups/sleepy-moon-and-stars.jpg',
    imageAlt: 'A framed nursery print shown on a wall',
    updated: '2026-08-07',
    sections: [
      {
        h: 'The two-thirds rule',
        p: [
          'Art hung above furniture should span roughly two-thirds of that furniture\'s width. A 120 cm dresser wants about 80 cm of art. One large print, or three smaller ones with their gaps included.',
          'This one rule solves most sizing questions. When something looks "off" on a wall, undersized art is usually why.',
        ],
      },
      {
        h: 'What the common sizes actually look like',
        p: [
          '<strong>8×10 inch (20×25 cm)</strong>, modest. Right for a narrow wall, a shelf, or as one of three in a group. On its own above a dresser it will look lost.',
          '<strong>A4 (21×30 cm)</strong>, the size most home printers and frame shops default to. Slightly taller and narrower than 8×10. Good for a group.',
          '<strong>16×20 inch (40×50 cm)</strong>, a proper statement piece. This is the size to choose for a single print above a cot or dresser, and the one most people wish they had chosen.',
        ],
      },
      {
        h: 'A word about ratios',
        p: [
          'Every Little Poppin print is 4:5. That ratio prints exactly at 8×10 and 16×20 inches with nothing cropped.',
          'A4 is slightly narrower than 4:5, so printing to A4 leaves a thin margin at the top and bottom. Which usually looks intentional inside a frame with a mat. If you want an exact fit with no margin, choose 8×10 or 16×20.',
        ],
      },
      {
        h: 'Quick picks',
        p: [
          '<strong>Single print above a cot or dresser:</strong> 16×20 inch.',
          '<strong>Three-print gallery wall:</strong> 8×10 inch each, 5–8 cm apart.',
          '<strong>Shelf or narrow wall:</strong> 8×10 inch, or A4 in a frame with a mat.',
          '<strong>Above a bed in a older child\'s room:</strong> 16×20 inch, or two side by side.',
        ],
      },
    ],
    faq: [
      ['What size print is best above a cot?', 'A single 16×20 inch print, or three 8×10 inch prints hung as a group. Aim for the arrangement to span about two-thirds the width of the furniture below it. And hang it on an adjacent wall rather than directly over where the baby sleeps.'],
      ['Will a 4:5 print fit an A4 frame?', 'Almost. A4 is slightly narrower than 4:5, so you will get a thin margin at the top and bottom. Inside a frame with a mat this reads as deliberate. For an exact fit choose 8×10 or 16×20 inches.'],
      ['Is 8×10 too small for nursery wall art?', 'On its own above furniture, usually yes. As one of a group of three it works well. If you are hanging a single print, 16×20 is the safer choice.'],
    ],
    cta: { text: 'Every design comes as one file that prints at 8×10, A4 and 16×20. So you can decide the size after you see the wall.', href: 'prints.html', label: 'Browse the prints' },
  },

  {
    slug: 'how-to-print-digital-art',
    title: 'How to Print Digital Wall Art',
    description: 'What to do with a digital art download. Paper choice, printing at home, and using an online or local print service for larger sizes, wherever you are.',
    intro: 'You have bought a digital print and there is a file on your computer. Here is exactly what to do next, whether you are printing at home or having it done.',
    image: '/images/mockups/unicorn-dreams.jpg',
    imageAlt: 'A framed printed artwork on a wall',
    updated: '2026-08-07',
    sections: [
      {
        h: 'Choose matte, not gloss',
        p: [
          'For soft, illustrated artwork, matte paper is almost always the better choice. Gloss adds contrast and reflections that fight watercolour-style work, and it shows every fingerprint.',
          'Ask for matte photo paper or a heavy matte card, ideally 200–250 gsm. That weight is what makes a print feel bought rather than printed.',
        ],
      },
      {
        h: 'Printing at home',
        p: [
          'Home printing is fine up to A4. Load good matte photo paper, and in the print dialogue choose <em>Actual size</em> or <em>100%</em> rather than "fit to page", "fit" quietly scales the image and can crop it.',
          'Set the paper type in your printer settings to match what you loaded. Skipping that step is the most common reason a home print comes out dull or over-inked.',
        ],
      },
      {
        h: 'Getting it printed',
        p: [
          'For anything above A4, a print service will beat a home printer for very little money. Almost every country has an online one that posts to your door, and most high-street print and copy shops will print from an emailed file or a USB stick. Photo counters in large supermarkets and pharmacies handle the standard sizes like 8×10 cheaply.',
          'Ask for matte, and tell them not to auto-crop or auto-enhance. Both will alter the artwork.',
        ],
      },
      {
        h: 'Or skip the printing entirely',
        p: [
          'If you would rather it simply arrive, we print any design as a poster, framed print or stretched canvas and post it to you. Each order is produced by the printing partner nearest you rather than shipped from one country, so it arrives in days rather than weeks wherever you are.',
        ],
      },
      {
        h: 'Framing on a budget',
        p: [
          'Inexpensive frames in 8×10, A4 and larger are sold by most large homeware and department stores. A frame with a mat will make a modest print look considerably more expensive than it was.',
          'Keep frames identical if you are hanging more than one. That consistency does more for the finished look than the price of the frame.',
        ],
      },
    ],
    faq: [
      ['What paper should I use to print digital wall art?', 'Matte photo paper or heavy matte card, ideally 200–250 gsm. Matte suits soft illustrated artwork better than gloss, which adds reflections and shows fingerprints.'],
      ['Where can I get digital art printed?', 'Any online print service that posts to your address, or any local print and copy shop. Most will print from an emailed file or a USB stick. Photo counters in large supermarkets and pharmacies cover the standard sizes such as 8×10.'],
      ['Why did my print come out cropped?', 'Almost always the "fit to page" setting, which scales the image to the paper and trims the edges. Choose "actual size" or 100% instead, and make sure the paper size matches the print size you want.'],
    ],
    cta: { text: 'Rather not print it yourself? We will have any design framed and posted to you, printed close to wherever you are.', href: 'prints.html', label: 'Choose a design' },
  },
];
