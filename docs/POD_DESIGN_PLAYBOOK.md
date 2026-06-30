# Little Poppin — Midjourney → Printify Design Playbook

How to generate Little Poppin product art in Midjourney that drops straight onto Printify
products (no-inventory print-on-demand). Use the fixed style block + the per-product spec
table so every prompt comes out print-ready at the right size. (MJ plan = paid tier, commercial use OK.)

## 1. Brand style block — paste into EVERY prompt (swap the bracketed bits)
**Direction: FULL MAGIC — enchanted, glowing, immersive fairytale scenes. Sparkles, stardust, fairy lights, luminous magical glow, soft watercolour. Sweet & tender, never dark. (The earlier clean "nursery decor" version read too plain — magic is the house style.)**
```
enchanted magical nursery illustration, [SUBJECT in a MAGICAL SETTING], glowing magical lights,
floating sparkles and stardust, luminous dreamy magical glow, soft [COLOURWAY] pastel palette,
whimsical fairytale wonder, ethereal twinkling light, soft watercolour with magical luminescence,
sweet and tender, no text, no logos
```
- Write [SUBJECT in a MAGICAL SETTING] as an IMMERSIVE SCENE — e.g. "a sleepy bunny in a glowing
  enchanted meadow beneath the stars" — NOT an isolated subject on white. The scene + glow is the magic.
- All-over items, add: `, seamless repeating pattern --tile`
- Always end with: `--ar 4:5 --stylize 500`  (push `--stylize 600–700` for more painterly)
- Cleaner CUTOUT variant for apparel/decals: use a single subject + `, on soft white background`, drop
  the immersive scene/heavy glow.

**MOTIF library (nursery classics, cute & sweet):** sleepy baby animals (bunny, fawn, elephant, fox, bear);
soft florals & butterflies; hummingbirds in a magical garden; meadow wildflowers; sleepy moon & stars;
hot air balloons; pastel rainbows & clouds; eucalyptus gum blossoms & a little wren.

**COLOURWAY system** (name collections so they stay cohesive; ≤4 soft pastels each):
Rose Garden (rose/blush pink) · Wild Garden (soft teal/green) · Sage Meadow · Buttercream ·
Lavender Dream · Cloud Neutral (greige).

**Avoid:** harsh/neon colour, sharp/sophisticated linework, cluttered, embedded text/letters,
copyrighted characters (e.g. don't reference "Gumnut Babies" / May Gibbs — use generic gum blossoms).

## 2. Per-product print spec table
| Product | `--ar` | Seamless `--tile`? | Target px @300 DPI | MJ enough? | Layout |
|---|---|---|---|---|---|
| Baby bodysuit / onesie | 4:5 | no | ~1500×1875 | ✅ MJ upscale | small centred motif |
| Bib | 1:1 | no | ~1500×1500 | ✅ | small centred motif |
| Burp cloth | 4:5 | optional | ~2000×2500 | ✅ | centred motif / light pattern |
| Greeting card 5×7 | 5:7 | no | 1500×2100 | ✅ | art + room for message |
| Tote bag | 4:5 | optional | ~2400×3000 | ✅ / light upscale | centred motif |
| Throw pillow 18" | 1:1 | optional | ~2000×2000 | ✅ | centred or pattern |
| Mum / bub tee | 4:5 | no | ~1500×1800 | ✅ | small chest motif |
| Milestone cards | 1:1 or 5:7 | no | 1500×1500+ | ✅ | motif frame around number |
| Nursery print A4 / 8×10 | 4:5 | no | 2400×3000 | ✅ MJ max upscale | framed art, full-bleed |
| Nursery print A3 / 11×14 / 16×20 | 4:5 or 3:4 | no | 3300×4200 → 4800×6000 | ❌ external upscale (Topaz/Gigapixel) | framed art |
| Muslin swaddle / wrap (all-over) | 1:1 | **YES** | ~6000×6000+ | ❌ make tile, repeat in Canva/PS | ADVANCED — later |
| Wrapping paper (all-over) | 1:1 | **YES** | large | ❌ tile + repeat | ADVANCED — later |
| Notebook / journal cover | 3:4 | no | ~1800×2400 | ✅ | front-cover art, full-bleed |
| Sticker sheet / die-cut sticker | 1:1 | no | ~1500×1500 | ✅ + cutout | single subject, transparent bg |
| Postcard / gift tag | 5:7 | no | 1500×2100 | ✅ | art + space |
| Canvas / large framed print | 4:5 or 2:3 | no | 4800×6000+ | ❌ external upscale | full-bleed scene |
| Wall decal | varies | no | high + transparent | ✅ + cutout | single subject, clean edges, transparent bg |
| Removable wallpaper / mural (Spoonflower) | 1:1 | **YES** | very large | ❌ seamless tile + Spoonflower | ADVANCED — repeat pattern |

**Rule of thumb:** small print-area items (apparel, bibs, cards, A4 prints) = Midjourney alone
is fine. Large prints = upscale externally to 300 DPI at full size. All-over (swaddles, wrap) =
`--tile` for a seamless tile, then repeat to size in Canva/Photoshop — leave till last.

## 3. Repeatable workflow (per design)
1. Pick the product → read its row (ar / tile / target px / upscale).
2. Prompt = `[motif]` + style block (§1) + `--ar [from table]` (+ `--tile` if seamless) + `--stylize 400`.
3. Generate → upscale in Midjourney.
4. If "external upscale" flagged → Topaz/Gigapixel up to target px @300 DPI.
5. Export PNG/JPG at target px → upload to Printify product → check Printify's print preview.

## 4. Build sequence
① Printify with a first new collection on 3–4 small-print products → ② expand collections →
③ automate Stripe→Printify fulfilment (extend the existing LP webhook to call Printify's API on
paid order) → ④ digital downloads → ⑤ gift cards (branded voucher + redemption logic; manual to
start). Use an AU/nearby Printify print provider per product. Price for POD base cost + the
children's-charity cut.

**Product ladder (one art library, zero inventory):** swaddles → nursery prints → stationery
(notebooks, journals, cards, stickers, gift tags) → kids' bedroom art → wall decals → wallpaper/murals.

## 5. Decals, wallpaper & big prints — extra rules
- **Wall decals & die-cut stickers:** prompt a SINGLE subject and add `, die-cut sticker, isolated
  on plain white background, clean crisp edges` — then knock the background out (Canva / remove.bg)
  for a transparent PNG. Avoid full scenes.
- **Removable wallpaper & murals:** seamless `--tile` patterns at large scale. Printify is weak here —
  use **Spoonflower** (peel-and-stick wallpaper + fabric, ships to AU). Same tile workflow as swaddles:
  make the seamless tile, repeat to size.
- **Canvas / large prints & murals:** always **external upscale** (Topaz/Gigapixel) to 300 DPI at full
  size — Midjourney alone won't hold up large.

## 6. "Big-kid" bedroom style variant (older kids — bolder + adventurous, still dreamy)
Swap §1's opener for the kids-room version (a touch more colour & story):
```
soft dreamy watercolour kids bedroom wall art illustration, [MOTIF], gentle [COLOURWAY] palette,
whimsical magical storybook adventure, playful childlike wonder, soft glowing dreamy light,
calming modern kids room decor, airy with cloud-soft edges, sweet and magical, no text, no logos
```
**Big-kid MOTIF library:** space & rockets · mermaids & under-the-sea · cute dinosaurs · unicorns ·
fairy gardens · jungle explorers · magical woodland · hot air balloons · fairytale castles.
Ready prompts: COLLECTION-02-KIDS-BEDROOM-PROMPTS.md.
