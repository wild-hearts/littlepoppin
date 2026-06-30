# Little Poppin — Digital Downloads (instant print delivery)

Sell digital art prints through the existing Stripe checkout. No shipping, no inventory,
~100% margin. Flow: **Buy → Stripe checkout → success page download button + emailed link.**
Files are hosted privately in **Vercel Blob** (unguessable URLs) and only revealed after
the webhook/`/api/download` confirms the payment.

## How it works (already built)
- `lib/products.js` → `DIGITAL_PRODUCTS` map (sku, name, price, optional `preview`, private `file`).
- `api/checkout.js` → digital SKUs get a no-shipping Checkout Session (`metadata.type=digital`).
- `api/download.js` → verifies the session is **paid** for that SKU, then 302-redirects to the Blob file.
- `success.html` → shows a "Download your print" button for digital orders.
- `api/stripe-webhook.js` → emails the buyer their download link (via Resend, from your verified domain).

## One-time setup
1. **Enable Vercel Blob:** Vercel → your project → **Storage → Create → Blob** → connect.
   Vercel adds `BLOB_READ_WRITE_TOKEN` to the project automatically. Copy that token into
   `littlepoppin/.env.local` too (for the upload script): `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...`
2. **Install the upload dep:** `npm i @vercel/blob` (already in package.json if committed).

## Publishing a print (repeat per design)
1. **Upload the high-res file** to Blob:
   ```
   node scripts/upload-to-blob.mjs ~/Downloads/LittlePoppin-Designs/collection-04/21-moon-goddess.png
   ```
   It prints a `file:` URL.
2. **Add it to `lib/products.js` → `DIGITAL_PRODUCTS`:**
   ```js
   'print-moon-goddess': {
     sku: 'print-moon-goddess',
     name: 'Moon Goddess — Digital Art Print',
     description: 'High-resolution digital download (4:5) for personal printing.',
     price: 1200,                 // $12.00 AUD (cents)
     preview: 'https://<blob>/preview-moon-goddess.png', // optional public thumbnail
     file: 'https://<blob>/prints/21-moon-goddess-XXXX.png', // the URL from step 1
   },
   ```
3. **Add a buy button** anywhere on the site (store.js wires it automatically):
   ```html
   <button type="button" data-sku="print-moon-goddess" class="btn btn--primary">
     Download Print — $12
   </button>
   ```
   (Best: build a dedicated "Prints" / gallery page listing all of them.)
4. **Commit + deploy.** Done — buyers can purchase and download instantly.

## Notes
- **Previews:** the `file` is private (only sent after payment). For the checkout thumbnail and
  the storefront, upload a separate lower-res/watermarked `preview` image (also public Blob).
- **Buyer emails** send from `ORDER_FROM_EMAIL` (your verified `wildheartspublishing.com.au`),
  so they reach any inbox — already configured.
- **Security:** the link is gated by Stripe payment + tied to the order. Unguessable Blob URL.
  Good enough for low-stakes art; not hardened DRM (a buyer could re-share their own link).
- **Pricing:** digital is near-pure profit (minus Stripe ~2.9% + 30¢). Typical $9–15 per print.
