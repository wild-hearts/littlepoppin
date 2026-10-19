# Little Poppin. Stripe Checkout store

Static HTML site (Vercel) + serverless functions for a real card checkout. No Facebook, no Shopify.
Buy button → `/api/checkout` → Stripe-hosted checkout (collects shipping + phone) → `/api/stripe-webhook` on payment.

## What's in here

```
lib/products.js          Catalogue: prices (AUD cents), shipping rules, stock. SINGLE SOURCE OF TRUTH.
api/checkout.js          POST {sku,quantity} -> creates Checkout Session -> { url }
api/stripe-webhook.js    Verifies signature, handles checkout.session.completed (notify + stock TODO)
api/order.js             GET ?session_id= -> safe order summary for success.html
api/stock.js             GET -> { sku: stockLeft } so the storefront can show "Sold out"
store.js                 Wires every <button data-sku> to checkout + sold-out check
success.html / cancel.html
privacy/terms/refunds/shipping.html   Legal pages (drafts. See [CONFIRM] markers)
.env.example             Env var names (never commit real keys)
```

Buy buttons live in `pink-swaddle.html` (`data-sku="pink"`), `green-swaddle.html` (`green`), and the
homepage gift banner (`bundle`). Prices and copy come from `lib/products.js`.

## The 5 numbers to confirm before going live (all in `lib/products.js`)
1. Pink price. Currently **$15.00** (`1500`)
2. Green price. Currently **$15.00** (`1500`)
3. Bundle price. Currently **$27.00** (`2700`) ← assumption, change if you like
4. Shipping flat rate, **$9.95** (`995`)
5. Free-shipping threshold, **$80** (`8000`)

## Run it locally (test mode)
```bash
npm install
npm i -g vercel        # if you don't have it
vercel link            # link to the Vercel project once
vercel env pull        # or set the vars below in .env.local
vercel dev             # serves the static site AND the /api functions at http://localhost:3000
```
Static file servers (e.g. the preview pane) render the pages but CANNOT run `/api/*`, you need
`vercel dev` (or a deploy) for checkout to actually work.

## Environment variables (Vercel → Settings → Environment Variables)
| Name | Required | Notes |
|------|----------|-------|
| `STRIPE_SECRET_KEY` | yes | Use a **restricted** key (Checkout Sessions: write). `sk_test_…` then `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | yes | From the webhook endpoint you create (below). `whsec_…` |
| `RESEND_API_KEY` | optional | To email order notices. Without it, notices are logged. |
| `ORDER_NOTIFY_EMAIL` | optional | Where order notices go. |
| `SITE_URL` | optional | Auto-detected from the request if unset. |

## Stripe webhook
Stripe Dashboard → Developers → Webhooks → **Add endpoint**
- URL: `https://littlepoppin.com/api/stripe-webhook`
- Event: `checkout.session.completed`
- Copy the **Signing secret** → set `STRIPE_WEBHOOK_SECRET`.

## End-to-end test (test keys)
1. Deploy with test keys (or `vercel dev`).
2. Open a product page → **Buy Now** → Stripe checkout.
3. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC, enter an AU shipping address.
4. You land on `success.html` with the order summary.
5. Stripe → Developers → Webhooks → your endpoint → check the `checkout.session.completed` delivery is **200**.
6. Order notice arrives by email (if Resend configured) or appears in the function logs.
Then swap test keys → live keys and re-test once with a real card.

## Still TODO (flagged in code)
- **Stock persistence**, `lib/products.js` stock is in-memory (set to 999 for testing) and the webhook's
  `decrementStock()` is a no-op. For a real "Sold out", move stock to Supabase / Vercel KV and decrement there.
- **Resend domain**, the order email "from" is `orders@littlepoppin.com`; verify that domain in Resend.
- **Bundle price**, confirm $27 (or change `bundle.price`).
- **Legal pages**, fill the `[CONFIRM]` markers (ABN, dispatch times, change-of-mind window, contact email).

## Cards and invitations (added 19 Oct 2026)

E-cards and online party invitations on the shop's own art, ported from Tadavite onto this site's
stack. Nothing new to host: static pages, one serverless function, the private Blob store, the shared
Stripe account and Resend.

| Path | What it is |
|------|------------|
| `cards.html`, `cards/<occasion>.html`, `card/<slug>.html` | The e-card galleries and the editor (one page per card, 206 of them) |
| `invitations.html`, `invitations/<occasion>.html`, `invitation/<slug>.html` | The invitation galleries and the editor (154 designs) |
| `/sent/<key>` | The sender's private page: pay, then the link to send (`sent.html` by rewrite) |
| `/c/<slug>` | The recipient's card: envelope, seal, card (`open.html`) |
| `/manage/<id>` | The host's private page: share link, headcount, guest list, CSV, edit (`manage.html`) |
| `/i/<slug>` | The guest's invitation: envelope, card, countdown, calendar, map, reply (`invite.html`) |
| `/host/<key>` | The private host link. Checks the key, puts it in an HttpOnly cookie, redirects to `/manage/<id>` |
| `keepsakes/designs.js` | The catalogue: occasions, cards, invitation designs, lettering, **prices** |
| `keepsakes/art.generated.js` | One entry per print with a palette read off the picture. `npm run build:keepsakes` |
| `keepsakes/render.js`, `keepsakes/keepsakes.css` | The envelope, wax seal, card, opening ritual and card spread |
| `api/keepsakes.js` | The one function behind it all (`?op=…`). Keeps the api/ folder at 11 functions |
| `lib/keepsakes/store.js` | Records as JSON files in the private Blob store; `.data/keepsakes/` locally |
| `lib/keepsakes/pay.js` | Stripe Checkout, confirmation on return, and what happens when paid |

**Two numbers to confirm** in `keepsakes/designs.js`: `CARD_PRICE` ($3) and `INVITE_PRICE` ($19). They
match Tadavite; change them there and run `npm run build:keepsakes` so the pages agree.

Money: sessions are tagged `brand=little_poppin` and `type=card|invitation`; `api/stripe-webhook.js`
hands those to `lib/keepsakes/pay.js`, which switches the record on and emails the links. The return
pages confirm with Stripe straight away too, so nobody waits on the webhook. Nothing is charged
without `STRIPE_SECRET_KEY`; in development without it, cards and invitations go live unpaid so the
whole flow can be tried. Production refuses (503).

Keys: a sender's or host's key is a bearer credential. Only its SHA-256 is stored; the key is shown
once and emailed if they gave an address. The host page is reached only through `/host/<key>`.

Run it locally without Vercel: `npm run dev:keepsakes` (port 3050), then
`node scripts/dev/keepsakes-smoke.mjs http://localhost:3050` (25 API checks) and, after
`npm i --no-save playwright-core`, `node scripts/dev/keepsakes-ui.mjs http://localhost:3050` (44
checks in a real Chromium at phone and desktop width, screenshots in `.data/ui-shots/`).
`npm test` has a "Cards and invitations" group too.

Known gaps, deliberately not built yet: emailing the invitation to guests from the site (hosts share
the link themselves), host sign-in (the private link is the account), image uploads (every design is
shop art), scheduled sending.

## Guardrails (kept)
- Restricted Stripe key only; keys live in env vars, never committed.
- This handles the customer's own purchase only. It never issues refunds or moves money programmatically.
