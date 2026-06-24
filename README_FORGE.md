# Little Poppin — Stripe Checkout store

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
privacy/terms/refunds/shipping.html   Legal pages (drafts — see [CONFIRM] markers)
.env.example             Env var names (never commit real keys)
```

Buy buttons live in `pink-swaddle.html` (`data-sku="pink"`), `green-swaddle.html` (`green`), and the
homepage gift banner (`bundle`). Prices and copy come from `lib/products.js`.

## The 5 numbers to confirm before going live (all in `lib/products.js`)
1. Pink price — currently **$15.00** (`1500`)
2. Green price — currently **$15.00** (`1500`)
3. Bundle price — currently **$27.00** (`2700`) ← assumption, change if you like
4. Shipping flat rate — **$9.95** (`995`)
5. Free-shipping threshold — **$80** (`8000`)

## Run it locally (test mode)
```bash
npm install
npm i -g vercel        # if you don't have it
vercel link            # link to the Vercel project once
vercel env pull        # or set the vars below in .env.local
vercel dev             # serves the static site AND the /api functions at http://localhost:3000
```
Static file servers (e.g. the preview pane) render the pages but CANNOT run `/api/*` — you need
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
- **Stock persistence** — `lib/products.js` stock is in-memory (set to 999 for testing) and the webhook's
  `decrementStock()` is a no-op. For a real "Sold out", move stock to Supabase / Vercel KV and decrement there.
- **Resend domain** — the order email "from" is `orders@littlepoppin.com`; verify that domain in Resend.
- **Bundle price** — confirm $27 (or change `bundle.price`).
- **Legal pages** — fill the `[CONFIRM]` markers (ABN, dispatch times, change-of-mind window, contact email).

## Guardrails (kept)
- Restricted Stripe key only; keys live in env vars, never committed.
- This handles the customer's own purchase only — it never issues refunds or moves money programmatically.
