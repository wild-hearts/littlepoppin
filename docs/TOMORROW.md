# Starting checklist. 10 August 2026

State verified live at the end of 9 August: env vars read off Vercel, endpoints called,
git clean and pushed. Nothing here is assumed.

Tick as you go. **YOU** = only you can do it. **ME** = say the word and I'll do it.

---

## 🔴 Do first. Real money involved

- [ ] **One real test purchase**, *YOU*, ~30 min
  Nothing in the delivery chain has ever completed for real. Every path *creates* a Stripe
  session, but no order has been paid, so `/api/download`, the Printify submission and the
  tracking email have never actually run.
  Buy a **$19 poster** (11×14, to yourself). One purchase exercises checkout → payment →
  webhook → Printify order → confirmation email → tracking email.
  Then check `https://littlepoppin.com/api/ops?key=<CRON_SECRET>` for
  `printify-submitted`, then later `printify-order-shipment-created` and `shipping-email`.
  Refund yourself afterwards.
  > Four *silent* failures turned up on 9 Aug. This is the best half-hour available.

- [ ] **Delete the OLD Printify token**, *YOU*, 2 min
  The new one is in Vercel and verified. The old one is still live and was exposed in chat.
  Printify → Connections → delete the older token.

---

## 🟠 Sort out the account question

- [ ] **Find out which email the Etsy account actually uses**, *YOU*, 1 min
  etsy.com → Account settings. I could not confirm this and may have told you wrong: the
  Etsy emails I found (April/May) went to `medariaaid@gmail.com` addressed to "Medaria", but
  the shop opened 2 July and Shop Manager shows "Naomi". Likely **two accounts**.

- [ ] **If it IS on the charity email, move it**, *YOU*, 5 min
  Little Poppin is a Wild Hearts Publishing brand; Medaria Aid is a charity. Reasons this
  matters: commercial income under a charity identity is an audit question; your Medaria
  PayPal is *already* stuck with an ex-trustee, and the same could happen to the shop;
  password resets and Etsy support all route through that inbox.
  Etsy lets you change the account email in settings. Shop, listings and history move with
  it. Easiest before the shop has sales history.

- [ ] **Check Etsy notification settings**, *YOU*, 2 min
  No Etsy email has reached that inbox since **25 June**, despite 97 listings going live on
  2 July. If seller notifications are off, **a sale will not reach you either.**

---

## 🟡 Blocked on one credential each

- [ ] **GA4**, *YOU (3 min)*, then *ME*
  No analytics at all: no pageviews, no idea what sells or where buyers come from.
  analytics.google.com → Admin → Create → Property (`Little Poppin`, Australia, AUD) →
  Web stream for `https://littlepoppin.com` → copy the **Measurement ID**
  (`G-XXXXXXXXXX`) and paste it in chat. It is public, not a secret.
  Everything else is built: snippet on all 135 pages, plus `view_item`, `begin_checkout`
  and `purchase`.

- [ ] **The 22 Etsy listings**, *YOU registers the app*, then *ME*
  Staged and validated. 14 gallery sets, the 12-print zodiac bundle, 7 printables. Dry run
  passes with **zero warnings**. Cannot go through a browser: 475 MB across 48 files >5 MB.
  - Register an app: https://www.etsy.com/developers/create
  - Redirect URI, exactly: `http://localhost:3003/callback`
  - Put the keystring in `.env.local` as `ETSY_KEYSTRING=…`, a **file**, not chat
  Then I run OAuth and create all 22 **as drafts** (no fee). You review, then publish:
  about **US$4.40**.
  ⚠️ Etsy sometimes reviews new apps. If yours lands in review, fall back to uploading by
  hand from `etsy-stage/`, each folder has photos, files and a `listing.json` with the
  exact title, tags and description. ~1 hour.

- [ ] **Lunamystic**, *YOU decides the name*
  Live at https://lunamystic.vercel.app with all 30 prints, but **zero env vars**, so
  checkout returns 503 and it cannot take a cent.
  - Keep "Lunamystic" or rename? Free now, expensive once it has traffic.
  - Buy a domain.
  - Then I set `STRIPE_SECRET_KEY` + `BLOB_READ_WRITE_TOKEN` and create its **own** Stripe
    webhook. Reusing Little Poppin's secret will not verify signatures for a different URL.

---

## 🟢 Worth doing, nothing blocking

- [ ] **Resubmit the sitemap** in Search Console, *YOU*, 2 min
  The site changed enormously today; 132 URLs. Search Console is already verified.

- [ ] **Confirm Printify billing currency**, *YOU*, 2 min
  Costs come back in USD but the shop prices in AUD. Worth knowing what you are actually
  charged in, since the print margins were set at ~1.55 AUD/USD.

- [ ] **Deal with the overdue Printify "Australia shipping requirement" email**, *YOU*
  Sitting on `medariaaid@gmail.com` since before the account switch.

- [ ] **Tidy the extra blank line in the Etsy descriptions**, *ME*, cosmetic
  Removing the charity sentence left a double blank line in all 97. Harmless; I did not run
  a second pass over live listings for cosmetics, but I will if you want.

- [ ] **Decide about `REPLICATE_API_TOKEN`**, *YOU*
  Exists in `.env.local`, never in Vercel. Only matters if something server-side needs it.

- [ ] **Consider Crewible agents as the fulfilment VA**, *YOU + ME*
  You asked about this. It is now genuinely feasible: the manual work is agent-shaped
  (watch the fulfilment inbox, draft the custom song/story, chase unshipped Printify orders,
  flag downloads that never happened) and. As of today. The events exist for an agent to
  watch. It could not have worked before, because nothing was recorded.

- [ ] **Revisit Etsy pricing**, *YOU*
  Etsy sits at ~⅔ of website prices while taking ~9% in fees, so the cheaper channel is also
  the less profitable one. Deliberately left alone: changing 22 new listings while 97 keep
  the old ratio would just be inconsistent.

---

## ✅ Done and verified (9 August)

| | Evidence |
|---|---|
| Charity claims scoped to swaddles | Site fixed + live; all **97 Etsy listings** edited; 4 spot-checked on public pages |
| Went global | 279 Printify products on **Printify Choice**, printed near the buyer in 53 countries |
| Postage by destination | US/AU/NZ $15 · CA $25 · ROW $32; unknown country falls back to ROW |
| Collections repriced | Was 69–87% off (down to $1.60/print); now 52–78%, top tier $149 → **$249** |
| Gallery sets can be printed | All 3 as one order, 10% off; capped at 5 prints in page **and** server |
| `CRON_SECRET` | Cron confirmed firing, **200 at 23:00:34** |
| `PRINTIFY_API_TOKEN` | Rotated, verified against 3 endpoints, redeployed |
| Printify webhook | 4 topics registered, key-gated; **forged shipment test sent no email** |
| Order visibility | Downloads, submissions, failures, `/api/ops` |
| Legal for global | EU/UK 14-day withdrawal, GDPR, consent shown at checkout |
| AEO | `llms.txt` published |
| Tests | **52 checks**, site audit clean, 4,805 links, none broken |

### Bugs caught along the way. All of them silent
- Physical checkout 500'd on every order: `printShippingFor` used but never imported.
  `node --check` cannot see a missing import; only the live logs did.
- Success page treated "not digital" as "swaddle", so print buyers were about to be thanked
  for a charity donation they never made.
- The Printify webhook verified an HMAC signature **Printify never sends**, it would have
  rejected every real delivery, silently, forever.
- A delete loop reported four successful removals and removed nothing (Printify's DELETE
  needs `?host=`), leaving keyless webhooks live beside the keyed ones.

> The pattern worth remembering: none of these threw an error. They all looked healthy.
> That is why the test purchase at the top of this list is worth more than it sounds.
