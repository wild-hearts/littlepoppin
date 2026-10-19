// keepsakes/pages/card-editor.js. Write the inside, see it as they will, then pay and send.
import { card, cardOccasion, withCardFont, themeVars, money, CARD_PRICE } from '../designs.js';
import { cardFront, cardInside, cardSpread, cardMotion, mountSpread, ritual, linerStyle, esc } from '../render.js';
import { api, track, err, letteringPicker } from './common.js';

const root = document.getElementById('editor');
const base = card(root.dataset.card);
const o = base && cardOccasion(base.occasion);
if (!base) root.innerHTML = '<p class="plain">That card isn’t in the collection any more. <a href="../cards.html">See every card</a>.</p>';
else {
  const f = { to_name: '', from_name: '', message: o.message, sender_email: '', font: '' };
  let errors = {}, busy = false, trying = false;
  const price = money(CARD_PRICE);
  root.innerHTML = `<div class="kp-editor card-editor"><div class="kp-preview" id="pv"></div>
  <form class="panel kp-form" id="f" novalidate>
    <div id="form-err"></div>
    <div class="row2">
      <div class="field"><label for="c-to">To</label><input id="c-to" name="to_name" maxlength="60" placeholder="Their name" required><span data-err="to_name"></span></div>
      <div class="field"><label for="c-from">From</label><input id="c-from" name="from_name" maxlength="60" placeholder="Your name" autocomplete="given-name" required><span data-err="from_name"></span></div>
    </div>
    <div class="field"><label for="c-msg">Your message</label><textarea id="c-msg" name="message" rows="6" maxlength="700" required>${esc(f.message)}</textarea><span data-err="message"></span></div>
    ${letteringPicker('', base.design.font, 'Lettering on your card')}
    <div class="field"><label for="c-email">Your email <span class="opt">(for your receipt and a copy of the link)</span></label><input id="c-email" name="sender_email" type="email" maxlength="120" autocomplete="email"><span data-err="sender_email"></span></div>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn btn--ghost" type="button" id="try" style="width:100%;margin-bottom:10px">Open it as they will</button>
    <button class="btn btn--primary btn--lg" type="submit" id="pay">Pay and send · ${price}</button>
    <p class="hint" style="text-align:center;margin-top:10px">${price} AUD, paid securely with Stripe. You’ll get a private link to send by text, WhatsApp or email.</p>
  </form></div>`;
  const pv = root.querySelector('#pv'), form = root.querySelector('#f');
  const current = () => withCardFont(base, f.font);
  function preview() {
    const c = current();
    pv.innerHTML = cardSpread({ front: cardFront(c, { priority: true }), inside: cardInside(c, { to: f.to_name || 'Them', from: f.from_name || 'You', message: f.message }), motion: cardMotion(c), theme: themeVars(c.design) });
    mountSpread(pv.firstElementChild);
  }
  function tryIt() {
    trying = true;
    const c = current(), d = { ...c.design, seal: (f.from_name || '✦').trim()[0] || '✦' };
    pv.innerHTML = `<div class="kp-try"><button type="button" class="btn btn--ghost btn--sm back-btn" id="back">Back to editing</button><div id="rt"></div></div>`;
    ritual(pv.querySelector('#rt'), { to: f.to_name, seal: d.seal, title: c.greeting, theme: themeVars(d), lining: linerStyle(d), peek: cardFront(c), reading: cardSpread({ front: cardFront(c, { priority: true }), inside: cardInside(c, { to: f.to_name, from: f.from_name, message: f.message }), motion: cardMotion(c), theme: themeVars(d), animate: true }) });
    pv.querySelector('#back').addEventListener('click', () => { trying = false; preview(); });
    pv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  form.addEventListener('input', (e) => { if (e.target.name in f) { f[e.target.name] = e.target.value; if (!trying) preview(); } });
  form.querySelectorAll('.chip[data-font]').forEach((b) => b.addEventListener('click', () => { f.font = b.dataset.font; form.querySelectorAll('.chip[data-font]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); if (!trying) preview(); }));
  root.querySelector('#try').addEventListener('click', tryIt);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return;
    busy = true; errors = {}; const btn = root.querySelector('#pay'); btn.disabled = true; btn.textContent = 'Taking you to payment…';
    const { ok, j } = await api('create-card', { method: 'POST', body: { ...f, card: base.slug, website: form.website.value } });
    if (ok && j.checkout_url) { track('begin_checkout', { currency: 'AUD', value: CARD_PRICE / 100, items: [{ item_id: base.slug, item_name: `${o.name} e-card` }] }); location.assign(j.checkout_url); return; }
    if (ok && j.sender_key) { location.assign(`/sent/${j.sender_key}`); return; }
    busy = false; btn.disabled = false; btn.textContent = `Pay and send · ${price}`;
    errors = j.errors || { form: j.error || 'That didn’t work. Check your connection and try again.' };
    root.querySelector('#form-err').innerHTML = errors.form ? `<p class="err" role="alert">${errors.form}</p>` : '';
    form.querySelectorAll('[data-err]').forEach((s) => (s.innerHTML = err(errors, s.dataset.err)));
    form.querySelector('.err')?.closest('.field')?.querySelector('input,textarea')?.focus();
  });
  preview();
}
