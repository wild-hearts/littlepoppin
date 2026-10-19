// keepsakes/pages/invite-editor.js. Create (no eventId) or edit (eventId + initial) an invitation, with
// the card redrawn live as the host types. The host page imports mountInviteEditor for editing.
import { design, inviteOccasion, withFont, themeVars, money, INVITE_PRICE } from '../designs.js';
import { backdrop, inviteCard, esc } from '../render.js';
import { api, track, err, letteringPicker, tzNow } from './common.js';

function nextSaturday() { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7) + 14); return d.toISOString().slice(0, 10); }
const price = money(INVITE_PRICE);

export function mountInviteEditor(root, { d, initial = null, eventId = null, onSaved = null, onCancel = null }) {
  const o = inviteOccasion(d.occasion);
  const f = initial ? { ...initial, question_choices: (initial.question_choices || []).join('\n') } : {
    design: d.slug, title: d.sample.title, label: d.sample.label, lede: d.sample.lede, date: nextSaturday(), time: '14:00', tz: tzNow(),
    venue: '', address: '', dress: '', host_name: '', host_email: '', note: '', rsvp_by: '', ask_dietary: true, allow_plus_ones: false, max_plus_ones: 1,
    question: '', question_choices: '', surprise_for: '', font: '',
  };
  let busy = false, started = false;
  const v = (k) => esc(f[k] ?? '');
  root.innerHTML = `<div class="kp-editor"><form class="panel kp-form" id="f" novalidate>
    <div id="form-err"></div>
    <div class="field"><label for="e-title">Name of the party</label><input id="e-title" name="title" value="${v('title')}" maxlength="80" required><span data-err="title"></span></div>
    <div class="field"><label for="e-label">Small line above the title</label><input id="e-label" name="label" value="${v('label')}" maxlength="60"></div>
    <div class="field"><label for="e-lede">A line or two for your guests</label><textarea id="e-lede" name="lede" rows="2" maxlength="240">${v('lede')}</textarea>
      ${o?.wording?.length ? `<div class="chips" style="margin-top:8px">${o.wording.map((w) => `<button type="button" class="chip" data-wording="${esc(w)}">${esc(w.length > 42 ? w.slice(0, 40) + '…' : w)}</button>`).join('')}</div>` : ''}</div>
    <div class="row2">
      <div class="field"><label for="e-date">Date</label><input id="e-date" name="date" type="date" value="${v('date')}" required><span data-err="date"></span></div>
      <div class="field"><label for="e-time">Start time</label><input id="e-time" name="time" type="time" value="${v('time')}" required><span data-err="time"></span></div>
    </div>
    <div class="row2">
      <div class="field"><label for="e-venue">Venue</label><input id="e-venue" name="venue" value="${v('venue')}" maxlength="100" placeholder="Our place"></div>
      <div class="field"><label for="e-addr">Address</label><input id="e-addr" name="address" value="${v('address')}" maxlength="200" placeholder="12 Example St, Fitzroy"></div>
    </div>
    <p class="hint" style="margin-top:-6px">Times are shown in ${esc(String(f.tz).replace(/_/g, ' '))}. Guests elsewhere still get the right countdown and calendar time.</p>
    <div class="row2">
      <div class="field"><label for="e-dress">Dress code or theme</label><input id="e-dress" name="dress" value="${v('dress')}" maxlength="100" placeholder="Optional"></div>
      <div class="field"><label for="e-host">Your name, as host</label><input id="e-host" name="host_name" value="${v('host_name')}" maxlength="60" autocomplete="given-name"></div>
    </div>
    ${letteringPicker(f.font || '', d.font, 'Lettering on your invitation')}
    <div class="field"><label for="e-note">Anything else guests should know</label><textarea id="e-note" name="note" rows="3" maxlength="600" placeholder="Pick-up time, parking, gifts, what to bring… (optional)">${v('note')}</textarea></div>
    <fieldset><legend class="lbl">Replies</legend>
      <div class="field" style="max-width:240px"><label for="e-by">Reply by</label><input id="e-by" name="rsvp_by" type="date" value="${v('rsvp_by')}"><span data-err="rsvp_by"></span></div>
      <label class="check"><input type="checkbox" name="ask_dietary" ${f.ask_dietary !== false ? 'checked' : ''}> <span>Ask about dietary needs and allergies</span></label>
      <label class="check"><input type="checkbox" name="allow_plus_ones" ${f.allow_plus_ones ? 'checked' : ''}> <span>Guests can bring someone (siblings, a parent)</span></label>
      <div class="field" id="maxwrap" style="max-width:160px" ${f.allow_plus_ones ? '' : 'hidden'}><label for="e-max">Up to</label><input id="e-max" name="max_plus_ones" type="number" min="1" max="10" value="${v('max_plus_ones') || 1}"></div>
    </fieldset>
    <details class="more" ${f.question || f.surprise_for ? 'open' : ''}><summary>More options</summary>
      <div class="field"><label for="e-q">Ask guests a question <span class="opt">(optional)</span></label><input id="e-q" name="question" value="${v('question')}" maxlength="140" placeholder="Which cake flavour?"></div>
      <div class="field" id="qcwrap" ${f.question ? '' : 'hidden'}><label for="e-qc">Answer choices, one per line <span class="opt">(leave empty for a written answer)</span></label><textarea id="e-qc" name="question_choices" rows="3" placeholder="Chocolate&#10;Vanilla&#10;Strawberry">${v('question_choices')}</textarea><span data-err="question_choices"></span></div>
      <div class="field"><label for="e-surprise">Is it a surprise? Who for <span class="opt">(optional)</span></label><input id="e-surprise" name="surprise_for" value="${v('surprise_for')}" maxlength="60" placeholder="Their first name"><p class="hint">Guests are asked to keep it quiet, and link previews in chats won’t show the party name.</p></div>
    </details>
    ${eventId ? '' : `<div class="field"><label for="e-email">Your email <span class="opt">(for your receipt and your private links)</span></label><input id="e-email" name="host_email" type="email" value="${v('host_email')}" maxlength="120" autocomplete="email"><span data-err="host_email"></span></div>`}
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn btn--primary btn--lg" type="submit" id="go">${eventId ? 'Save changes' : `Continue to payment · ${price}`}</button>
    ${eventId ? `<button class="btn btn--ghost" type="button" id="cancel" style="width:100%;margin-top:10px">Cancel</button>` : `<p class="hint" style="text-align:center;margin-top:10px">${price} AUD for this event, paid securely with Stripe. Your invitation goes live as soon as it’s paid. No account needed: you get a private host link for replies.</p>`}
  </form>
  <div class="kp-preview" aria-label="Live preview"><div class="ed-stage" id="stage">${backdrop(d, { priority: true })}<div class="ed-card" id="pc"></div></div></div></div>`;
  const form = root.querySelector('#f'), pc = root.querySelector('#pc');
  const preview = () => { pc.innerHTML = inviteCard(withFont(d, f.font), f); };
  form.addEventListener('input', (e) => {
    const t = e.target; if (!(t.name in f) && t.name !== 'host_email') return;
    f[t.name] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.name === 'allow_plus_ones') root.querySelector('#maxwrap').hidden = !t.checked;
    if (t.name === 'question') root.querySelector('#qcwrap').hidden = !t.value;
    preview();
  });
  form.addEventListener('focusin', () => { if (!started && !eventId) { started = true; track('create_start', { item_id: d.slug, item_name: d.name }); } });
  form.querySelectorAll('.chip[data-font]').forEach((b) => b.addEventListener('click', () => { f.font = b.dataset.font; form.querySelectorAll('.chip[data-font]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); preview(); }));
  form.querySelectorAll('.chip[data-wording]').forEach((b) => b.addEventListener('click', () => { f.lede = b.dataset.wording; form.querySelector('#e-lede').value = f.lede; preview(); }));
  root.querySelector('#cancel')?.addEventListener('click', () => onCancel?.());
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return;
    busy = true; const btn = root.querySelector('#go'); btn.disabled = true; btn.textContent = eventId ? 'Saving…' : 'Taking you to payment…';
    const { ok, j } = await api(eventId ? 'manage' : 'create-invite', { method: eventId ? 'PATCH' : 'POST', query: eventId ? `&id=${eventId}` : '', body: { ...f, website: form.website.value } });
    if (ok && eventId) { busy = false; onSaved?.(j.event); return; }
    if (ok) {
      // Host access is already set by an HttpOnly cookie. The private key is kept in this tab only, so the
      // host can copy their link once; it is not stored anywhere else.
      try { sessionStorage.setItem(`lp_hk_${j.id}`, j.host_key); } catch {}
      if (j.checkout_url) { track('begin_checkout', { currency: 'AUD', value: INVITE_PRICE / 100, items: [{ item_id: d.slug, item_name: `${o?.name || ''} invitation` }] }); location.assign(j.checkout_url); return; }
      location.assign(`/manage/${j.id}?new=1`); return;
    }
    busy = false; btn.disabled = false; btn.textContent = eventId ? 'Save changes' : `Continue to payment · ${price}`;
    const errors = j.errors || { form: j.error || 'That didn’t save. Check your connection and try again.' };
    root.querySelector('#form-err').innerHTML = errors.form ? `<p class="err" role="alert">${errors.form}</p>` : '';
    form.querySelectorAll('[data-err]').forEach((s) => (s.innerHTML = err(errors, s.dataset.err)));
    form.querySelector('.err')?.closest('.field')?.querySelector('input,textarea')?.focus();
  });
  preview();
}

const root = document.getElementById('editor');
if (root?.dataset.design) {
  const d = design(root.dataset.design);
  if (!d) root.innerHTML = '<p class="plain">That design isn’t in the collection any more. <a href="../invitations.html">See every design</a>.</p>';
  else mountInviteEditor(root, { d });
}
