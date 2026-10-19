// keepsakes/pages/common.js. Small helpers every keepsake page uses.
export { esc } from '../render.js';
export async function api(op, { method = 'GET', body, query = '' } = {}) {
  const r = await fetch(`/api/keepsakes?op=${op}${query}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  return { ok: Boolean(r?.ok), status: r?.status || 0, j };
}
export const pathPart = (n) => decodeURIComponent(location.pathname.split('/').filter(Boolean)[n] || '');
export const qs = () => new URLSearchParams(location.search);
export function track(event, params) { try { if (typeof window.gtag === 'function') window.gtag('event', event, params || {}); } catch {} }
export const err = (errors, k) => (errors?.[k] ? `<p class="err">${errors[k]}</p>` : '');
export const tzNow = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney'; } catch { return 'Australia/Sydney'; } };

// Share a link: the native sheet where there is one, else the clipboard.
export async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
export function shareRow({ link, text, subject }) {
  const msg = encodeURIComponent(`${text} ${link}`);
  return `<div class="acts start">
    <button type="button" class="btn btn--primary btn--sm" data-share>Share…</button>
    <a class="btn btn--ghost btn--sm" href="https://wa.me/?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>
    <a class="btn btn--ghost btn--sm" href="sms:?&body=${msg}">Text message</a>
    <a class="btn btn--ghost btn--sm" href="mailto:?subject=${encodeURIComponent(subject)}&body=${msg}">Email</a>
    <a class="btn btn--ghost btn--sm" href="${link}" target="_blank" rel="noopener">Open it yourself</a>
  </div>`;
}
export function wireShare(root, { link, title, text }) {
  root.querySelector('[data-share]')?.addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title, text, url: link }); return; } catch {} }
    if (await copyText(link)) { const b = root.querySelector('[data-share]'); b.textContent = 'Link copied'; setTimeout(() => (b.textContent = 'Share…'), 2000); }
  });
  root.querySelector('[data-copy]')?.addEventListener('click', async (e) => { if (await copyText(link)) { e.currentTarget.textContent = 'Copied'; setTimeout(() => (e.currentTarget.textContent = 'Copy link'), 2000); } });
  root.querySelector('[data-link]')?.addEventListener('focus', (e) => e.target.select());
}
export const linkBox = (link, label) => `<div class="linkbox"><input readonly value="${link}" aria-label="${label}" data-link><button type="button" class="btn btn--primary btn--sm" data-copy>Copy link</button></div>`;
export const letteringPicker = (value, designFont, legend) => `<fieldset class="lettering"><legend class="lbl">${legend}</legend><div class="chips" role="group" aria-label="${legend}">
  <button type="button" class="chip" data-font="" aria-pressed="${!value}" style="font-family:var(--f-${designFont}),serif">The design’s own</button>
  ${[['cormorant', 'Classic'], ['playfair', 'Elegant'], ['italiana', 'Fine'], ['bodoni', 'Capitals'], ['dmserif', 'Statement'], ['fraunces', 'Warm'], ['syne', 'Modern'], ['pinyon', 'Script']].map(([k, l]) => `<button type="button" class="chip" data-font="${k}" aria-pressed="${value === k}" style="font-family:var(--f-${k}),serif;font-size:${{ pinyon: 21, italiana: 18, cormorant: 18 }[k] || 16}px${k === 'syne' ? ';font-weight:700' : ''}">${l}</button>`).join('')}
</div></fieldset>`;
