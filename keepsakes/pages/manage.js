// keepsakes/pages/manage.js. The host's private page: pay if needed, share the link, watch replies,
// download the guest list, edit the details.
import { design, withFont, themeVars, money, INVITE_PRICE } from '../designs.js';
import { backdrop, inviteCard, esc } from '../render.js';
import { niceDate, niceTime } from '../time.js';
import { api, pathPart, qs, track, shareRow, wireShare, linkBox } from './common.js';
import { mountInviteEditor } from './invite-editor.js';

const root = document.getElementById('manage');
const id = pathPart(1), paid = qs().get('paid'), cancelled = qs().get('cancelled') === '1', isNew = qs().get('new') === '1';
const ST = { yes: 'Coming', maybe: 'Maybe', no: 'Can’t come' };
let knownKey = ''; try { knownKey = sessionStorage.getItem(`lp_hk_${id}`) || ''; } catch {}

async function load() {
  const { ok, status, j } = await api('manage', { query: `&id=${encodeURIComponent(id)}${paid ? `&paid=${encodeURIComponent(paid)}` : ''}` });
  if (!ok) { root.innerHTML = `<div class="panel"><p class="eyebrow">${status === 403 ? 'Private page' : 'Hmm'}</p><h1>Open your private host link.</h1><p class="hint">This page only opens from the host link you were given when you made the invitation (it’s in your email if you gave one). That link puts a key in this browser; nothing else can. If you’ve lost it, <a href="/index.html#contact">contact us</a> with the party name.</p></div>`; return; }
  render(j);
}

function render({ event: ev, rsvps, link }) {
  const d = withFont(design(ev.design), ev.font);
  const live = ev.status === 'live';
  const yes = rsvps.filter((r) => r.status === 'yes'), maybe = rsvps.filter((r) => r.status === 'maybe'), no = rsvps.filter((r) => r.status === 'no');
  const extras = yes.reduce((n, r) => n + (r.plus_ones || 0), 0);
  const hostLink = knownKey ? `${location.origin}/host/${knownKey}` : '';
  document.title = `${ev.title} | Little Poppin`;
  root.innerHTML = `
  <div class="host-top" style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:22px">
    <div><p class="eyebrow">Your invitation</p><h1 style="font-family:var(--display);font-weight:600;font-size:clamp(1.9rem,4vw,2.8rem);margin:0 0 6px;line-height:1.05">${esc(ev.title)}</h1><p class="hint" style="font-size:15px">${esc(niceDate(ev.date, ev.time, ev.tz))} at ${esc(niceTime(ev.date, ev.time, ev.tz))}${ev.venue ? `, ${esc(ev.venue)}` : ''}</p></div>
    <div class="acts start">${live ? `<a class="btn btn--ghost btn--sm" href="${link}" target="_blank" rel="noopener">View as a guest</a>` : ''}<button type="button" class="btn btn--ghost btn--sm" id="edit">Edit details</button></div>
  </div>
  <div id="editor-slot" hidden style="margin-bottom:24px"></div>
  ${!live ? `<section class="panel" style="margin-bottom:18px;border-color:#e2c38b;background:#fbf3e3">
    <p class="eyebrow">${cancelled ? 'Payment not finished' : 'Almost there'}</p>
    <h2>Your invitation is <em style="color:var(--red);font-style:italic">saved.</em></h2>
    <p class="hint">Guests can’t open it until it’s paid for. ${money(INVITE_PRICE)} AUD for this event, as many guests as you like, paid securely with Stripe.</p>
    <button type="button" class="btn btn--primary btn--lg" id="pay">Pay and go live · ${money(INVITE_PRICE)}</button><p class="err" id="payerr"></p></section>` : isNew ? `<section class="panel" style="margin-bottom:18px;border-color:#bcd8c6;background:#eef7f1"><p class="eyebrow" style="color:#2f7a55">Live</p><h2>Your invitation is ready to send.</h2><p class="hint">Send the guest link below. Replies land here.</p></section>` : ''}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;align-items:start">
    <div style="display:grid;gap:18px">
      <section class="panel"><h2>Send to your guests</h2><p class="hint">${live ? 'Anyone with this link can see the party details and reply.' : 'This link starts working as soon as the invitation is paid for.'}</p>${linkBox(link, 'Guest link')}${live ? shareRow({ link, text: `${ev.host_name ? ev.host_name + ' has invited you' : 'You’re invited'}: ${ev.title}`, subject: `You’re invited: ${ev.title}` }) : ''}</section>
      <section class="panel"><h2>Your private link</h2>${hostLink ? `<p class="hint">This is the only way back to this page. Bookmark it or save the email${ev.host_email ? ` we sent to ${esc(ev.host_email)}` : ''}. Never send it to guests.</p>${linkBox(hostLink, 'Host link').replace('data-copy', 'data-copy-host')}` : `<p class="hint">You opened this page from your private host link${ev.host_email ? `, which is in the email we sent to ${esc(ev.host_email)}` : ''}. It is the only way back in, so keep it safe and never send it to guests.</p>`}</section>
      <section class="panel"><h2>Headcount</h2>
        <div class="cd" style="justify-content:flex-start;gap:28px;margin:10px 0 6px"><div><b>${yes.length + extras}</b><span>Coming</span></div><div><b>${maybe.length}</b><span>Maybe</span></div><div><b>${no.length}</b><span>Can’t</span></div></div>
        <p class="hint">${yes.length} ${yes.length === 1 ? 'reply' : 'replies'} coming${extras ? `, bringing ${extras} more` : ''}. ${rsvps.length} ${rsvps.length === 1 ? 'reply' : 'replies'} so far.</p>
        ${rsvps.length ? `<a class="btn btn--ghost btn--sm" href="/api/keepsakes?op=csv&id=${encodeURIComponent(id)}">Download the guest list (CSV)</a>` : ''}</section>
    </div>
    <div style="display:grid;gap:18px">
      <section class="panel"><h2>Guest list</h2>${rsvps.length ? `<div style="overflow-x:auto"><table class="guests" style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left;color:var(--k-muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em"><th style="padding:8px 6px">Name</th><th style="padding:8px 6px">Reply</th>${ev.allow_plus_ones ? '<th style="padding:8px 6px">Bringing</th>' : ''}${ev.ask_dietary ? '<th style="padding:8px 6px">Dietary</th>' : ''}${ev.question ? `<th style="padding:8px 6px">${esc(ev.question)}</th>` : ''}<th style="padding:8px 6px">Note</th></tr></thead><tbody>${rsvps.map((r) => `<tr style="border-top:1px solid var(--k-line)"><td style="padding:9px 6px;font-weight:700">${esc(r.name)}</td><td style="padding:9px 6px">${ST[r.status] || esc(r.status)}</td>${ev.allow_plus_ones ? `<td style="padding:9px 6px">${r.plus_ones || 0}</td>` : ''}${ev.ask_dietary ? `<td style="padding:9px 6px">${esc(r.dietary || '')}</td>` : ''}${ev.question ? `<td style="padding:9px 6px">${esc(r.answer || '')}</td>` : ''}<td style="padding:9px 6px;color:var(--k-muted)">${esc(r.message || '')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="hint">No replies yet. They appear here the moment a guest answers.</p>`}</section>
      <section class="panel" style="padding:0;overflow:hidden"><div class="ed-stage" style="min-height:0;padding:30px 16px;border-radius:0">${backdrop(d, { priority: true })}<div class="ed-card">${inviteCard(d, ev)}</div></div></section>
    </div>
  </div>`;
  wireShare(root, { link, title: ev.title, text: `You’re invited: ${ev.title}` });
  root.querySelector('[data-copy-host]')?.addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(hostLink); e.target.textContent = 'Copied'; setTimeout(() => (e.target.textContent = 'Copy link'), 2000); } catch {} });
  root.querySelector('#pay')?.addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'One moment…';
    const r = await api('pay', { method: 'POST', body: { kind: 'invitation', id } });
    if (r.ok && r.j.checkout_url) { track('begin_checkout', { currency: 'AUD', value: INVITE_PRICE / 100, items: [{ item_id: ev.design, item_name: 'invitation' }] }); location.assign(r.j.checkout_url); return; }
    if (r.status === 409) { location.reload(); return; }
    e.target.disabled = false; e.target.textContent = `Pay and go live · ${money(INVITE_PRICE)}`; root.querySelector('#payerr').textContent = r.j.error || 'That didn’t work. Try again.';
  });
  root.querySelector('#edit').addEventListener('click', () => {
    const slot = root.querySelector('#editor-slot'); slot.hidden = false;
    mountInviteEditor(slot, { d: design(ev.design), initial: ev, eventId: id, onSaved: (next) => { history.replaceState(null, '', `/manage/${id}`); render({ event: next, rsvps, link }); window.scrollTo({ top: 0, behavior: 'smooth' }); }, onCancel: () => { slot.hidden = true; slot.innerHTML = ''; } });
    slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (live && paid) { track('purchase', { transaction_id: paid, currency: 'AUD', value: (ev.paid_amount || INVITE_PRICE) / 100, items: [{ item_id: ev.design, item_name: 'invitation' }] }); history.replaceState(null, '', `/manage/${id}?new=1`); }
}
load();
