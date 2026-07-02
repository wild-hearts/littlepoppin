# Launch checklist — Little Poppin Art Prints (digital downloads)

Everything is built and deployed. The shop (`prints.html`, 63 prints + 4 gallery sets) is now
**browsable and linked from the homepage** (nav + "Magical Art Prints" showcase with a
"Launching soon" ribbon + email signup). **Checkout stays blocked** until the high-res files are
hosted — buy buttons show a friendly "check back soon" — so nothing can be bought-without-delivery.
Steps to go live:

## 1. Enable Vercel Blob (~1 min)
Vercel → **littlepoppin → Storage → Create → Blob → connect**. Vercel adds `BLOB_READ_WRITE_TOKEN`
to the project automatically. Copy that token into `~/Downloads/skills/littlepoppin/.env.local`:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

## 2. Publish the prints (ONE command)
```
cd ~/Downloads/skills/littlepoppin
node scripts/publish-prints.mjs
```
This uploads all 31 high-res originals to Blob and fills their `file:` URLs into
`lib/digital-products.generated.js` (checkout unblocks automatically for each).

## 3. Commit, deploy & flip the ribbon
```
git add -A && git commit -m "Launch Art Prints shop" && git push origin main
```
The homepage nav + showcase are already live. At launch, in `index.html` change the ribbon:
`<span class="prints-teaser__ribbon">✨ Launching soon</span>` → `✨ Now available` (and update the
teaser copy from "the moment they launch" to "the moment you buy"). Then email the signup list
(Resend → Audiences → "Little Poppin") their promised free printable + launch note.

## 4. Test one purchase
Buy a print with your own card → you should hit the success page with a **Download** button, and
get a **download-link email**. Refund yourself. Done — you're selling digital art.

---
### Notes
- **Previews** are watermark-free but only 1000px (not print-quality), so they can't be used as the
  free print. The real high-res file is delivered only after payment.
- **Pricing** is $12/print (`PRICE` in build-prints-shop.mjs, or edit per-item in the generated file).
- **Curate:** if 31 feels like a lot, delete entries you don't want from `digital-products.generated.js`
  and their cards from `prints.html` (or re-run the generator after pruning the source folders).
- **SEO:** prints.html already has a meta description and is GA-tracked. Consider adding it to `sitemap.xml`.
