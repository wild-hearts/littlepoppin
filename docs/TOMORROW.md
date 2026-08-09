# Starting checklist — 10 August 2026

State verified live at the end of 9 August. Everything in "Done" was checked against the
running site or API, not assumed.

---

## 🔴 Do first — real money is involved

### 1. One real test purchase — YOU
Nothing in the delivery chain has ever completed for real. Every path *creates* a Stripe
session, but no order has ever been paid, so `/api/download`, the Printify submission and
the tracking email have never actually run end to end.

Buy a **$19 poster** (11×14, deliver to yourself). In one go it exercises: checkout →
payment → webhook → Printify order → confirmation email → tracking email.

Then check it landed: `https://www.littlepoppin.com/api/ops?key=<CRON_SECRET>` — you want to
see `printify-submitted`, and later `printify-order-shipment-created` and `shipping-email`.

> Given how many silent failures turned up on 9 Aug, this is the single most valuable
> half-hour available. Refund yourself afterwards.

### 2. Delete the OLD Printify token — YOU
The new one is in Vercel and verified working. The old one is still live and was exposed in
chat. Printify → Connections → delete the older token.

---

## 🟡 Blocked on one credential each

### 3. GA4 — YOU (3 min), then me
No analytics at all right now: no pageviews, no idea what sells or where buyers come from.

- analytics.google.com → Admin → Create → Property (`Little Poppin`, Australia, AUD)
- Add a **Web** stream for `https://www.littlepoppin.com`
- Copy the **Measurement ID** (`G-XXXXXXXXXX`) and paste it in chat — it is public, not a secret

Everything else is already built: the snippet for all 135 pages, plus `view_item`,
`begin_checkout` and `purchase` events. I paste the ID into `scripts/site-config.mjs`,
rebuild, deploy.

### 4. The 22 Etsy listings — YOU register the app, then me
Staged and validated: 14 gallery sets, 12-print zodiac bundle, 7 printables. Dry run passes
with **zero warnings**. Cannot go through the browser — 475 MB across 48 files over 5 MB.

- Register an app: https://www.etsy.com/developers/create (sign in as `medariaaid@gmail.com`)
- Redirect URI, exactly: `http://localhost:3003/callback`
- Put the keystring in `.env.local` as `ETSY_KEYSTRING=…` (a file, not chat — it behaves
  like a password)

Then I run OAuth and create all 22 **as drafts** (no fee). You review, then publish:
about **US$4.40** total.

⚠️ Etsy sometimes puts new app registrations through review. If that happens, the fallback is
uploading by hand from `etsy-stage/` — each folder has photos, files and a `listing.json`
with the exact title, tags and description. Roughly an hour.

### 5. Lunamystic — YOU decide the name
Live at **https://lunamystic.vercel.app** with all 30 prints, but **zero env vars**, so
checkout returns 503 and it cannot take a cent.

- Decide: keep "Lunamystic" or rename (free to change now, expensive once it has traffic)
- Buy a domain
- Then I set `STRIPE_SECRET_KEY` + `BLOB_READ_WRITE_TOKEN`, and create its own Stripe webhook
  endpoint — reusing Little Poppin's secret will not verify signatures for a different URL

---

## 🟢 Worth doing, nothing blocking

- **Etsy notification settings.** No Etsy email has reached `medariaaid@gmail.com` since
  25 June, despite 97 listings going live on 2 July. If seller notifications are off, a
  **sale** will not reach you either.
- **Resubmit the sitemap** in Search Console — the site changed enormously (132 URLs).
- **Cosmetic:** the Etsy description edits left one extra blank line where the charity
  sentence was. Harmless.
- **`REPLICATE_API_TOKEN`** exists locally but was never in Vercel. Only matters if something
  server-side ever needs it.
- **Printify billing currency** — costs come back in USD; worth confirming what you are
  actually billed in.
- **Overdue Printify "Australia shipping requirement" email** sitting on `medariaaid@gmail.com`.

---

## ✅ Done and verified (9 August)

| | Evidence |
|---|---|
| Charity claims scoped to swaddles | Site fixed + live; all **97 Etsy listings** edited; 4 spot-checked on public pages |
| Went global | 279 Printify products on **Printify Choice**, prints near the buyer in 53 countries |
| Postage by destination | US/AU/NZ $15 · CA $25 · ROW $32; unknown country falls back to ROW |
| Collections repriced | Was 69–87% off (down to $1.60/print); now 52–78%, top tier $149 → **$249** |
| Gallery sets can be printed | All 3 as one order, 10% off; capped at 5 prints in page **and** server |
| `CRON_SECRET` | Cron confirmed firing — **200 at 23:00:34** |
| `PRINTIFY_API_TOKEN` | Rotated, verified against 3 endpoints, redeployed |
| Printify webhook | 4 topics registered, key-gated; **forged shipment test sent no email** |
| Order visibility | Downloads, submissions, failures + `/api/ops` |
| Legal for global | EU/UK 14-day withdrawal, GDPR, consent shown at checkout |
| AEO | `llms.txt` published |
| Tests | **52 checks**, site audit clean, 4,805 links, none broken |

### Bugs caught along the way
- Physical checkout 500'd on every order — `printShippingFor` used but never imported.
  `node --check` cannot see a missing import; only the live logs did.
- Success page treated "not digital" as "swaddle", so print buyers were about to be thanked
  for a charity donation they never made.
- The Printify webhook verified an HMAC signature **that Printify never sends** — it would
  have rejected every real delivery, silently, forever.
- A delete loop reported four successful removals and removed nothing (Printify's DELETE
  needs `?host=`), leaving keyless webhooks live beside the keyed ones.
