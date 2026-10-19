// keepsakes/pages/card-sent.js. The sender's private page: pay if needed, then the link to send.
import { card, withCardFont, themeVars, money, CARD_PRICE } from '../designs.js';
import { cardFront, cardInside, cardSpread, cardMotion, mountSpread, waxSeal, esc } from '../render.js';
import { api, pathPart, qs, track, shareRow, wireShare, linkBox } from './common.js';

const root = document.getElementById('sent');
const key = pathPart(1), paid = qs().get('paid'), cancelled = qs().get('cancelled') === '1';
const { ok, status, j } = await api('sent', { query: `&key=${encodeURIComponent(key)}${paid ? `&paid=${encodeURIComponent(paid)}` : ''}` });
if (!ok) root.innerHTML = `<div class="panel"><p class="eyebrow">${status === 404 ? 'Not found' : 'Hmm'}</p><h1>We couldn’t find that card.</h1><p class="hint">Check the link in your email, or <a href="/cards.html">send a new one</a>.</p></div>`;
else {
  const c = withCardFont(card(j.card), j.font);
  const live = j.status === 'live';
  const text = `${j.from_name || 'Someone'} has sent you a card:`;
  root.innerHTML = `<div class="kp-editor card-editor"><div class="kp-preview" id="pv"></div><div class="panel kp-form" id="p">${live ? `
    <span class="stamp" aria-hidden="true" style="--seal:${c.design.card.accent};--c-font:var(--f-${c.design.font});display:block;width:64px;margin-bottom:8px">${waxSeal((j.from_name || 'L').trim()[0].toUpperCase(), 64)}</span>
    <p class="eyebrow">Paid and ready</p>
    <h1>Now send it to <em>${esc(j.to_name)}.</em></h1>
    <p class="hint">Anyone with this link can open the card, so send it only to ${esc(j.to_name)}. Bookmark this page to find the link again.</p>
    ${linkBox(j.link, 'Card link')}
    ${shareRow({ link: j.link, text, subject: `A card for you from ${j.from_name}` })}
    <p class="hint" style="margin-top:18px">Like it? <a href="/cards.html">Send another</a>.</p>` : `
    <p class="eyebrow">${cancelled ? 'Payment not finished' : 'Almost there'}</p>
    <h1>Your card is <em>saved.</em></h1>
    <p class="hint">It can’t be opened until it’s paid for. ${money(CARD_PRICE)} AUD, paid securely with Stripe.</p>
    <button type="button" class="btn btn--primary btn--lg" id="pay">Pay and send · ${money(CARD_PRICE)}</button><p class="err" id="e"></p>`}
  </div></div>`;
  const pv = root.querySelector('#pv');
  pv.innerHTML = cardSpread({ front: cardFront(c, { priority: true }), inside: cardInside(c, { to: j.to_name, from: j.from_name, message: j.message }), motion: cardMotion(c), theme: themeVars(c.design) });
  mountSpread(pv.firstElementChild);
  if (live) { wireShare(root, { link: j.link, title: `A card for ${j.to_name}`, text }); if (paid) track('purchase', { transaction_id: paid, currency: 'AUD', value: (j.paid_amount || CARD_PRICE) / 100, items: [{ item_id: j.card, item_name: 'e-card' }] }); }
  else root.querySelector('#pay').addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'One moment…';
    const r = await api('pay', { method: 'POST', body: { kind: 'card', key } });
    if (r.ok && r.j.checkout_url) { location.assign(r.j.checkout_url); return; }
    if (r.status === 409) { location.reload(); return; }
    e.target.disabled = false; e.target.textContent = `Pay and send · ${money(CARD_PRICE)}`; root.querySelector('#e').textContent = r.j.error || 'That didn’t work. Try again.';
  });
}
