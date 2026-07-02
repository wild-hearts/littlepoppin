# Printify — physical prints on littlepoppin.com

Let customers order posters / framed prints / canvas of any art print. The existing Stripe
checkout collects the order + shipping address; the webhook submits it to **Printify** for
printing and shipping. All the code is built and safely gated — physical checkout returns a
"not available yet" until the setup below is done (so no order can be taken that Printify can't fulfil).

Printify pulls artwork by direct upload, so this path does **not** need Vercel Blob — only your
Printify API token.

## What's built
- `lib/printify.js` — order submission + price lookup, reads `lib/printify-config.generated.js`
- `api/checkout.js` — physical-print branch: `POST {sku, format, size}` → Stripe session (with shipping)
- `api/stripe-webhook.js` — on payment, submits the order to Printify
- `scripts/printify-setup.mjs` — discovery + product creation + writes the config

## Setup (one time)
1. **Get a token:** Printify → **Account → Connections → API tokens** → create one with scopes
   *shops, catalog, products (read/write), uploads (read/write), orders (write)*. Put it in
   `~/Downloads/skills/littlepoppin/.env.local`:
   ```
   PRINTIFY_API_TOKEN=your_token
   ```
2. **Discover ids** (run each; note the numbers):
   ```
   node scripts/printify-setup.mjs shops                    # → your shopId
   node scripts/printify-setup.mjs blueprints poster        # → poster blueprint id
   node scripts/printify-setup.mjs blueprints framed
   node scripts/printify-setup.mjs blueprints canvas
   node scripts/printify-setup.mjs providers <blueprintId>  # pick an AU provider for fast local shipping
   node scripts/printify-setup.mjs variants <blueprintId> <providerId>   # → size → variantId
   ```
3. **Fill `CHOICES`** at the top of `scripts/printify-setup.mjs` — for each format set the
   `blueprintId`, `providerId`, and the `sizes` you want (key/label/variantId + your RETAIL price
   in cents; keep retail ≈ 2.5–3× the Printify base cost).
4. **Build the products:**
   ```
   node scripts/printify-setup.mjs build
   ```
   This uploads every art file to Printify, creates a poster/framed/canvas product per print,
   and writes `lib/printify-config.generated.js`.
5. **Deploy:** also add `PRINTIFY_API_TOKEN` in Vercel → Environment Variables (Production), then
   commit + push. Physical checkout unblocks automatically.
6. **Add the buy UI + test:** ping me and I'll add the format/size selector to each print card
   (it reads the now-populated config), then place one test order end-to-end.

## Notes
- I couldn't pre-fill the blueprint/provider/variant ids or test the live API — those are specific
  to your Printify account, which needs your token. Everything else is ready.
- Shipping is charged at checkout ($9.95 AU, free over $80 — shared with swaddles). Adjust in
  lib/products.js SHIPPING if print shipping should differ.

## Expanded product line-up (add as formats in CHOICES — the code supports any number)
The checkout/webhook already handle arbitrary formats generically. Recommended, in order of
margin & fit for the art (discover each blueprint the same way as posters):
| Format key | Product | Why |
|---|---|---|
| poster / framed / canvas | wall art | core line |
| mug | ceramic mug 11/15oz | huge gifting seller, art wraps beautifully |
| journal | hardcover journal / notebook | perfect for academia + mystic art |
| tote | tote bag | everyday visibility, good margin |
| pillow | throw pillow 18" | nursery decor upsell |
| puzzle | jigsaw 500/1000pc | magical scenes are ideal puzzle art |
| card | greeting card packs | zodiac + festive = birthday/Christmas cards |
| sticker | kiss-cut stickers | pocket-money price point, kids love them |
| phonecase | phone case | zodiac + mystic art audience |
| blanket | velveteen plush blanket | premium nursery gift |
| ornament | ceramic ornament | festive collection, seasonal spike |
Future: per-order personalised POD (child's name printed on the zodiac art) — the webhook can
create a one-off Printify product per order via the API; build after the base line-up is live.
