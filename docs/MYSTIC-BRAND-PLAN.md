# Mystic line — recommendation: launch as its own brand

## Why not put it on littlepoppin.com
Little Poppin is a **baby / nursery** brand (newborn swaddles, dreamy nursery prints). The
**Mystic line** (`collection-04`: moon goddesses, celestial wolves, cosmic whales, the Tree of
Life, tarot-ish ethereal art) speaks to a **completely different buyer** — teens, adults, the
celestial / boho / "witchy" decor crowd. Mixing them:
- confuses the brand and hurts conversion on both,
- makes SEO/positioning muddy,
- mismatches price points and product mix.

The art is genuinely strong and very commercial — it just deserves its **own home**.

## Recommended: a sibling brand
A separate site + Stripe presence (it can sit under the **same Wild Hearts org**, like the others):
- **Name ideas:** Lunamystic · Moon & Myth · Celestia · Wildren · Stardust & Sage · Mystic Poppin.
- **Domain + Vercel project** of its own; reuse this repo's stack (static + serverless + Stripe +
  Vercel Blob + the digital-download system already built here — it's portable).
- **Same Wild Hearts Stripe account** with `metadata.brand = 'mystic_<name>'` so the shared-account
  webhook fan-out stays clean (see the brand-filter pattern in [project notes]).

## Product mix (broad + high-margin, all from the 30 designs)
Digital prints · framed/canvas wall art · **moon journals** · mugs · tote bags · sticker sheets ·
phone cases · tapestries & wallpaper (Spoonflower) · and a flagship **oracle / affirmation card
deck** or **art-print box set** (the 30 designs are basically a ready-made deck).

## Fast path to launch (reuses what's built)
1. Pick a name + grab the domain.
2. Clone this repo's structure into a new Vercel project (the store, checkout, webhook, digital
   downloads all transfer — just swap branding/colours and the catalogue).
3. Run the same prints pipeline on `collection-04` (generate previews → catalogue → shop page).
4. Wire Blob + Stripe, launch digital prints first, add POD products via Printify/Spoonflower.

## Next step
Say the word and I'll scaffold the Mystic brand site next session — same proven stack, new identity,
its 30 designs wired as a prints shop from day one.
