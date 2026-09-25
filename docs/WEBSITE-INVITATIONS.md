# Website Invitations (built 26 Sep 2026)

A personalised invitation page at its own link, sold for AUD $29 (`INVITE_PRICE` in
`invite-themes.js`). Modelled on the "website invitation" products sold as Canva
templates, but ours is real code: sealed-envelope opening, hero art, invitation card,
live countdown, Google Maps button, add-to-calendar (.ics), gift note, built-in RSVP
and a private host page listing every reply.

## Files
```
invite-themes.js        24 themes (one per shop print), 9 event types, price. SHARED browser + server.
invite-engine.js        Browser renderer. Same code draws the builder preview and the live page.
invites.html            Shop page: hero with a live demo in a phone, 24 designs, FAQ.
invite-builder.html     The customer builds it here; live preview in a phone frame; Buy -> /api/checkout.
lib/invites.js          Validation, Blob storage, activation after payment, RSVP store, host emails, HTML shell.
api/invite-page.js      Serves /i/<code> (live), /i/<code>?key= (host page), /invite-preview (builder frame).
api/invite.js           JSON: public config, or config + RSVPs with the host key.
api/rsvp.js             Guest reply -> Blob + email to the host.
api/checkout.js         `sku: 'invite'` branch: validates, saves a draft to Blob, creates the session.
api/stripe-webhook.js   `type: 'invite'` -> lib publishInvite() (idempotent).
api/order.js            Success page also calls publishInvite() so the link shows immediately.
vercel.json             rewrites /i/:code and /invite-preview to api/invite-page.
```

## Storage (private Vercel Blob, same store as the artwork)
```
invites/draft/<id>.json          saved before checkout (draft id is the only thing in Stripe metadata)
invites/live/<code>.json         published invitation; includes hostEmail + manageKey (never sent to guests)
invites/session/<sessionId>.json { code, key } so a second activation returns the same link
invites/rsvp/<code>/<iso>.json   one file per reply, never overwritten
```
Codes look like `sophie-x7k2m`. Host page key is 24 chars from the same alphabet.

## Demo links
`/i/demo-<theme-id>` renders a sample without touching Blob. RSVPs on demos are refused.

## Changing a customer's wording
There is no self-serve edit yet. Read `invites/live/<code>.json`, change the field, write it
back (`allowOverwrite: true`), and the CDN cache (s-maxage 300) refreshes within 5 minutes.

## Not built yet (deliberate)
- Self-serve editing after purchase (email Naomi for now; the emails say so).
- QR code download for printed cards.
- Photo upload (a personal photo in place of the print).
- Expiry enforcement past the 12-month `expiresAt` is a 410 page; no renewal flow.
