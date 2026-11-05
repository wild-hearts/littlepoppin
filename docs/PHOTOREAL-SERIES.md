# Photorealistic print series (added 4 Nov 2026)

Sixty new prints in six shop sections, each artwork its own $12 product with its own page:

| Section | Prints | Originals folder (outside the repo) |
|---|---|---|
| Magical Stories | 10 | little-poppin-photorealistic-magical-stories-series-01 |
| Magical Realms | 11 | little-poppin-photorealistic-magical-series-03 |
| Photo Art | 13 | little-poppin-photo-art-collection |
| Australian Wildlife | 6 | little-poppin-australian-wildlife-series-01 |
| Mermaid Dreams | 10 | little-poppin-mermaid-series-01 |
| Dogs | 10 | little-poppin-dog-series-01 |

Originals live under `/Users/naomi/Documents/Codex/2026-11-03/www/outputs/` (override with
`LP_SERIES_SRC=<dir>`). Config, slugs and sku rules: `scripts/print-series.mjs`.
Skus are `print-<section>-<slug>`, so the new mermaid prints never collide with the
original "Mermaid Lagoon".

## State on merge (updated 4 Nov 2026, evening)
All 60 series prints are **sellable**. Each master was upscaled 3x with Real-ESRGAN
(`scripts/upscale-series.mjs`, Replicate) to 3366 × 4206 px, uploaded to the private
Blob store under `prints/<series>-<slug>-<suffix>.png`, and its pathname written into
`lib/digital-products.generated.js`. The shop shows buy buttons, `available: true`,
InStock in the structured data, and the product pages carry the library's standard
resolution wording (~300 DPI at 8×10, prints to 16×20). The $249 everything bundle is
still pinned to the original 93 prints.

Verified before merge: every one of the 60 Blob files fetched through `presignGet()`
(the same call `/api/download` makes) as a PNG of 3366 × 4206 px, and `/api/checkout`
created a live Checkout Session for a series print (expired straight after, nothing paid).

## Masters
- Originals (1122 × 1402 px, untouched): `/Users/naomi/Documents/Codex/2026-11-03/www/outputs/little-poppin-*`
- Upscaled masters (what was uploaded): `/Users/naomi/Downloads/littlepoppin-masters-upscaled/<series folder>/<same filename>`
  Override with `LP_SERIES_MASTERS`. `listSeriesMasters()` prefers an upscaled file when
  it exists, so both the shop build (pixel size) and `publish-prints.mjs` use it.
- Re-running `node scripts/upscale-series.mjs` only does masters that are missing or at
  the wrong size; `--force` redoes everything (about 15 GPU-seconds per image).

## Resolution note
The originals were 1122 × 1402 px (140 DPI at 8×10). The 3x upscale was reviewed at
full size: individual hairs and fabric texture resolve cleanly, no halos or invented
detail. The product-page bullets are still computed from the real pixel size
(`fileBullets()` in `scripts/build-product-pages.mjs`), so a future lower-resolution
series would describe itself honestly rather than inherit the 16×20 promise.

## Personalised keepsake delivery (fixed 5 Nov 2026)
Checking the risk above found a pre-existing bug: `/api/download` buffered the keepsake
PDF in the response, and Vercel refuses a function response body over 4.5 MB. The
smallest keepsake (a library print) is 9.5 MB, a series print's is 36 MB. Stripe shows
no personalised keepsake had ever been bought, so it had never been exercised. The
route now writes the PDF once per paid session to the private Blob store
(`keepsakes/<session>/<Name>-little-poppin-print.pdf`) and redirects to a presigned
link, the same way a single print is delivered; a repeat download skips the render.
Measured locally for a series print: 12 s render plus upload, 36 MB, 405 MB RSS.
`api/download.js` has `maxDuration: 60` in vercel.json for cold starts.

## Also
- `scripts/build-mockups-pil.py` makes the framed mockups with Pillow when ImageMagick
  is not installed (it is not, on this Mac). Same look, same size.
- `scripts/build-prints-shop.mjs` no longer needs `~/Downloads/LittlePoppin-Designs`:
  when a master folder is absent the section is carried forward from `data/prints.json`.
- A seventh folder, `little-poppin-photorealistic-series-02` (20 PNGs: trucks, space,
  ocean animals, woodland), was not in the handoff package and is not in the shop.


## Series 02 added (6 Nov 2026)

Four more collections from `little-poppin-photorealistic-series-02/` (one source folder,
four themed subfolders): Woodland Magic (10), Ocean (4), Space (3), Vehicles (3). They go
through the same pipeline as the first six: `scripts/upscale-series.mjs` (3x Real-ESRGAN,
3366x4206 masters in `~/Downloads/littlepoppin-masters-upscaled/`), `npm run build:site`,
`scripts/publish-prints.mjs` (private Blob, 20/20 verified through `presignGet`), rebuild.
The nested `dir` is fine because every reader joins the series root with `s.dir` and keys
previews and skus off `s.id`. Titles and descriptions live in `lib/print-meta.js`.

Catalogue is now 173 prints across 14 sections. Home-page copy and the "173 designs" tag
were updated by hand in `index.html`.

## Atelier scenes as page heroes (6 Nov 2026)

The 25 landscape atelier scenes (September 2026, previously only in the stale Documents
copy) now carry the page heroes. Web copies live in `images/banners/` (1800px and 900px
JPEGs, `--hero-art` / `--hero-art-sm`), the modifier is `.prints-hero--art` /
`.kp-hero--art` in `styles.css`, and the image is set inline on each `<header>` with an
absolute `/images/banners/` path so nested pages resolve it. Assignments: home = Starlight
Circus; prints = Magical Celestial; Print Club = Clockwork Library; guides = Enchanted
Toyshop; printables = Secret Dinosaur Museum; personalise = Teddy Moonlight Picnic;
custom = Little Astronomer; cards landing = Woodland Masquerade; card categories =
Moonlit Garden Railway; invitations landing = Midnight Carousel; invitation categories =
Treasure Island. The home "Step inside" band uses Fairy Garden, Magical Swan and Balloon
Regatta. Bright scenes (Moonbeam Patisserie, Rainbow Wishes) were tried and dropped: the
white type did not read over them. The full set, with a contact sheet, is in
`~/Downloads/littlepoppin-image-library/atelier-scenes/`.
