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

## State on merge
Every series print has `file: null`, so it shows as **Coming soon** on prints.html and on
its own page, `available: false` in data/prints.json, PreOrder in the structured data, and
no buy button anywhere. `npm test` enforces exactly that. The $249 everything bundle is
pinned to the original 93 prints so an unpublished series print can never block it.

## Making them sellable
1. Put the Production `BLOB_READ_WRITE_TOKEN` in `.env.local` (Vercel dashboard →
   Storage → Blob store → the `.env.local` tab). It is a sensitive variable and cannot be
   pulled with `vercel env pull`.
2. `node scripts/publish-prints.mjs` uploads every print with `file: null` whose original
   it can find (the series folders are searched automatically) and writes the Blob
   pathnames into `lib/digital-products.generated.js`.
3. `npm run build:site` turns the Coming soon buttons into buy buttons.
4. `npm test`, commit, push, merge.

## Resolution warning
The series originals are **1122 × 1402 px**: 140 DPI at 8×10, 70 DPI at 16×20. The
original library is 1856 × 2304. Product pages for series prints therefore say
"prints beautifully at 4×5" only, computed from the real file size. Before publishing,
decide whether to upscale (a 2× to 4× AI upscale would bring them to or past library
size) or sell them as small-format prints.

## Also
- `scripts/build-mockups-pil.py` makes the framed mockups with Pillow when ImageMagick
  is not installed (it is not, on this Mac). Same look, same size.
- `scripts/build-prints-shop.mjs` no longer needs `~/Downloads/LittlePoppin-Designs`:
  when a master folder is absent the section is carried forward from `data/prints.json`.
- A seventh folder, `little-poppin-photorealistic-series-02` (20 PNGs: trucks, space,
  ocean animals, woodland), was not in the handoff package and is not in the shop.
