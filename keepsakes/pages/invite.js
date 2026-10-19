// keepsakes/pages/invite.js. The guest's page: the envelope, the card, a countdown, the calendar and
// map, and the reply. The guest's browser keeps their guest_key so they can change their answer.
import { design, withFont, themeVars } from '../designs.js';
import { backdrop, envelope, inviteCard, openEnvelope, magic, magicColors, countdown, waxSeal, esc } from '../render.js';
import { eventInstant, niceDate, icsFor, googleCalUrl, mapUrl } from '../time.js';
import { api, pathPart } from './common.js';

const root = document.getElementById('invite');
const slug = pathPart(1);
const { ok, j } = await api('invite', { query: `&slug=${encodeURIComponent(slug)}` });
const LBL = { yes: 'Joyfully accepting', no: 'Regretfully declining', maybe: 'Hoping to make it' };

if (!ok) root.innerHTML = '<div class="plain"><h1>We couldn’t find that invitation</h1><p>Check the link you were sent.</p></div>';
else if (j.status === 'pending') root.innerHTML = '<div class="plain"><h1>This invitation isn’t ready yet</h1><p>Your host is still finishing it. Try the link again a little later.</p></div>';
else if (j.status === 'archived') root.innerHTML = `<div class="plain"><h1>${esc(j.title)}</h1><p>This party has finished and the host has closed replies. Thanks for being part of it.</p></div>`;
else {
  const ev = j.event, url = j.link;
  const d = withFont(design(ev.design), ev.font);
  const store = `lp:rsvp:${ev.slug}`;
  let saved = null; try { saved = JSON.parse(localStorage.getItem(store) || 'null'); } catch {}
  document.title = ev.surprise_for ? 'Invitation | Little Poppin' : `You’re invited: ${ev.title} | Little Poppin`;
  const map = mapUrl(ev.venue, ev.address);
  root.className = 'stage kp'; root.dataset.tone = d.card.dark ? 'dark' : 'light'; root.style.cssText = themeVars(d);
  root.innerHTML = `${backdrop(d, { priority: true, className: 'fixed' })}<canvas class="magic" aria-hidden="true"></canvas>
  <div class="stage-in"><h1 class="sr-only">${esc(ev.title)}</h1>
    <div class="env-wrap" id="envwrap"><p class="env-to">${ev.host_name ? `${esc(ev.host_name)} has invited you` : 'You’re invited'}</p>${envelope(d, ev.title, { controls: 'inv' })}<p class="env-hint">Tap to break the seal</p></div>
    <div class="opened" id="opened" hidden>
      ${inviteCard(d, ev, { id: 'inv' })}
      <div class="glass"><div class="cd" id="cd"></div><div class="acts"><button type="button" class="btn btn--ghost btn--sm" id="ics">Add to calendar</button><a class="btn btn--ghost btn--sm" href="${googleCalUrl(ev, url)}" target="_blank" rel="noopener">Google Calendar</a>${map ? `<a class="btn btn--ghost btn--sm" href="${map}" target="_blank" rel="noopener">Map</a>` : ''}</div></div>
      ${ev.surprise_for ? `<section class="glass" aria-labelledby="g-s"><h2 class="lbl" id="g-s">Shh, it’s a surprise</h2><p style="margin:0">This is a surprise for ${esc(ev.surprise_for)}. Please keep it quiet, and don’t share this link where they might see it.</p></section>` : ''}
      ${ev.note ? `<section class="glass" aria-labelledby="g-n"><h2 class="lbl" id="g-n">A note from ${esc(ev.host_name || 'your host')}</h2><p style="white-space:pre-wrap;margin:0">${esc(ev.note)}</p></section>` : ''}
      <div id="rsvp"></div>
      <p style="text-align:center;margin:22px 0 0;font-family:var(--ui);font-size:13px;opacity:.85"><a href="/invitations.html" class="sent-with" style="color:inherit">Made with Little Poppin</a></p>
    </div>
  </div>`;
  const dust = magic(root.querySelector('canvas.magic'), { colors: magicColors(d) });
  const opened = root.querySelector('#opened'), wrap = root.querySelector('#envwrap');
  function show() { wrap.hidden = true; opened.hidden = false; dust.ambient(true); countdown(root.querySelector('#cd'), ev.date, ev.time, ev.tz, { eventInstant }); setTimeout(() => opened.querySelector('.ttl')?.focus({ preventScroll: true }), 50); }
  root.querySelector('.env').addEventListener('click', (e) => openEnvelope(e.currentTarget, (phase) => { if (phase === 'burst') dust.burst(0.5, 0.5); else show(); }));
  if (saved) show();
  root.querySelector('#ics').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([icsFor(ev, url)], { type: 'text/calendar' })); a.download = (ev.title || 'invitation').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.ics';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  // ---------------------------------------------------------------- the reply
  const box = root.querySelector('#rsvp');
  const f = { name: '', status: '', plus_ones: 0, dietary: '', message: '', answer: '', email: '', updates: false, ...(saved?.form || {}) };
  let editing = false, errors = {}, busy = false;
  const by = ev.rsvp_by ? niceDate(ev.rsvp_by, '12:00', ev.tz) : null;
  function draw() {
    if (saved && !editing) {
      box.innerHTML = `<div class="glass rsvp done" aria-live="polite"><span class="done-seal" aria-hidden="true" style="--seal:${d.card.accent}">${waxSeal('✓', 46)}</span><p class="lbl">Received with thanks</p><p class="big">${LBL[saved.form.status]}${saved.form.status === 'yes' && saved.form.plus_ones > 0 ? `, plus ${saved.form.plus_ones}` : ''}</p><p style="margin:4px 0 14px">${saved.form.status === 'no' ? 'Thanks for letting them know.' : `${esc(ev.host_name || 'Your host')} has it. See you there.`}</p><button type="button" class="btn btn--ghost btn--sm" id="change">Change my reply</button></div>`;
      box.querySelector('#change').addEventListener('click', () => { editing = true; draw(); });
      return;
    }
    const e = (k) => (errors[k] ? `<p class="err" id="e-${k}">${errors[k]}</p>` : '');
    box.innerHTML = `<form class="glass rsvp" novalidate>
      <h3 class="rsvp-h">Kindly reply${by ? ` by ${esc(by)}` : ''}</h3>${errors.form ? `<p class="err" role="alert">${errors.form}</p>` : ''}
      <div class="field"><label for="r-name">Your name</label><input id="r-name" name="name" value="${esc(f.name)}" autocomplete="name" maxlength="80">${e('name')}</div>
      <fieldset class="field choice"><legend class="lbl">Can you come?</legend>${['yes', 'no', 'maybe'].map((s) => `<label class="${f.status === s ? 'on' : ''}"><input type="radio" name="status" value="${s}" ${f.status === s ? 'checked' : ''}>${s === 'yes' ? 'Yes' : s === 'no' ? 'Can’t make it' : 'Maybe'}</label>`).join('')}${e('status')}</fieldset>
      ${ev.allow_plus_ones && f.status === 'yes' ? `<div class="field"><label for="r-plus">Bringing anyone? (up to ${ev.max_plus_ones || 1})</label><input id="r-plus" name="plus_ones" type="number" min="0" max="${ev.max_plus_ones || 1}" value="${f.plus_ones}" inputmode="numeric"></div>` : ''}
      ${ev.ask_dietary && f.status !== 'no' ? `<div class="field"><label for="r-diet">Dietary needs or allergies</label><input id="r-diet" name="dietary" value="${esc(f.dietary)}" maxlength="200" placeholder="Optional"></div>` : ''}
      ${ev.question && f.status !== 'no' ? (ev.question_choices?.length ? `<fieldset class="field choice"><legend class="lbl">${esc(ev.question)}</legend>${ev.question_choices.map((c) => `<label class="${f.answer === c ? 'on' : ''}"><input type="radio" name="answer" value="${esc(c)}" ${f.answer === c ? 'checked' : ''}>${esc(c)}</label>`).join('')}</fieldset>` : `<div class="field"><label for="r-ans">${esc(ev.question)}</label><input id="r-ans" name="answer" value="${esc(f.answer)}" maxlength="300"></div>`) : ''}
      <div class="field"><label for="r-msg">A note for ${esc(ev.host_name || 'the host')}</label><textarea id="r-msg" name="message" rows="2" maxlength="500" placeholder="Optional">${esc(f.message)}</textarea></div>
      ${f.status !== 'no' ? `<div class="field"><label for="r-email">Your email <span class="opt">(optional)</span></label><input id="r-email" name="email" type="email" value="${esc(f.email)}" autocomplete="email" maxlength="120">${e('email')}${f.email ? `<label class="check" style="margin-top:8px"><input type="checkbox" name="updates" ${f.updates ? 'checked' : ''}> <span>${esc(ev.host_name || 'The host')} may email me about the party</span></label>` : ''}</div>` : ''}
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn--primary" ${busy ? 'disabled' : ''}>${busy ? 'Sending…' : 'Send my reply'}</button></form>`;
    const form = box.querySelector('form');
    form.addEventListener('input', (ev2) => { const t = ev2.target; if (!(t.name in f)) return; const was = f.status, hadEmail = Boolean(f.email); f[t.name] = t.type === 'checkbox' ? t.checked : t.value; if (t.name === 'status' && was !== f.status) { draw(); return; } if (t.name === 'email' && hadEmail !== Boolean(f.email)) { draw(); const i = box.querySelector('#r-email'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } });
    form.querySelectorAll('.choice label').forEach((l) => l.addEventListener('click', () => setTimeout(() => form.querySelectorAll('.choice label').forEach((x) => x.classList.toggle('on', x.querySelector('input').checked)), 0)));
    form.addEventListener('submit', async (ev2) => {
      ev2.preventDefault(); if (busy) return;
      busy = true; errors = {}; draw();
      const { ok, j } = await api('rsvp', { method: 'POST', body: { ...f, slug: ev.slug, guest_key: saved?.guest_key, website: form.website?.value } });
      busy = false;
      if (!ok) { errors = j.errors || { form: j.error || 'That didn’t send. Check your connection and try again.' }; draw(); return; }
      saved = { guest_key: j.guest_key, form: { ...f } }; try { localStorage.setItem(store, JSON.stringify(saved)); } catch {}
      editing = false; draw();
    });
  }
  draw();
}
