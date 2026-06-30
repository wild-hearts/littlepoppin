# Launch checklist — Little Poppin Art Prints (digital downloads)

Everything is built and deployed; the shop page (`prints.html`) exists with 31 enchanted nursery
prints, but it is **NOT yet linked from the homepage** and **checkout is blocked** until the
high-res files are hosted — so nothing can be bought-without-delivery. Three short steps to go live:

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

## 3. Commit, deploy & link it
```
git add -A && git commit -m "Launch Art Prints shop" && git push origin main
```
Then add the shop to the homepage nav so customers can find it — in `index.html`, add to the
`<ul class="nav__links">`:
```html
<li><a href="prints.html">Art Prints</a></li>
```
(Optional: add a "Shop Art Prints" button in a homepage section too.) Commit + push again.

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
