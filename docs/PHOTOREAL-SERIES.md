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

## Known risk, pre-existing
The personalised keepsake (`/api/download` with `type=personalised`) embeds the full
master PNG in a PDF and buffers it in the response. A series master is ~21 MB (the
library's are ~6.6 MB), so a personalised PDF of a series print will be ~21 MB. Check
that a personalised series order downloads on production before promoting the
personalise link for these; if it fails, render the keepsake from a downscaled copy.

## Also
- `scripts/build-mockups-pil.py` makes the framed mockups with Pillow when ImageMagick
  is not installed (it is not, on this Mac). Same look, same size.
- `scripts/build-prints-shop.mjs` no longer needs `~/Downloads/LittlePoppin-Designs`:
  when a master folder is absent the section is carried forward from `data/prints.json`.
- A seventh folder, `little-poppin-photorealistic-series-02` (20 PNGs: trucks, space,
  ocean animals, woodland), was not in the handoff package and is not in the shop.
