// keepsakes/pages/card-open.js. What the recipient sees: the envelope, the seal, the card.
import { card, withCardFont, themeVars } from '../designs.js';
import { backdrop, cardFront, cardInside, cardSpread, cardMotion, ritual, linerStyle } from '../render.js';
import { api, pathPart } from './common.js';

const root = document.getElementById('open');
const { ok, j } = await api('card', { query: `&slug=${encodeURIComponent(pathPart(1))}` });
if (!ok) root.innerHTML = '<div class="plain"><h1>We couldn’t find that card</h1><p>Check the link you were sent.</p></div>';
else if (j.status !== 'live') root.innerHTML = '<div class="plain"><h1>This card isn’t ready yet</h1><p>It’s still being finished. Try the link again a little later.</p></div>';
else {
  const c = withCardFont(card(j.card), j.font);
  const d = { ...c.design, seal: (j.from_name || '✦').trim()[0] || '✦' };
  document.title = `A card for ${j.to_name} | Little Poppin`;
  root.className = 'stage copen kp'; root.dataset.tone = d.card.dark ? 'dark' : 'light'; root.style.cssText = themeVars(d);
  root.innerHTML = `${backdrop(d, { priority: true, className: 'fixed' })}<div class="kp-wrap"><h1 class="sr-only">A card for ${j.to_name}</h1><div id="rt"></div><p class="sent-with" hidden style="text-align:center;margin:26px 0 0;font-family:var(--ui);font-size:14px"><a href="/cards.html" style="color:inherit;border-bottom:1px solid currentColor">Sent with Little Poppin. Send one back?</a></p></div>`;
  const style = document.createElement('style'); style.textContent = '.stage[data-tone="dark"] .sent-with{color:#fff;text-shadow:0 1px 8px #000}.stage[data-tone="light"] .sent-with{color:#2c2c2c}'; document.head.appendChild(style);
  ritual(root.querySelector('#rt'), {
    to: j.to_name, seal: d.seal, title: c.greeting, theme: themeVars(d), lining: linerStyle(d), peek: cardFront(c),
    reading: cardSpread({ front: cardFront(c, { priority: true }), inside: cardInside(c, { to: j.to_name, from: j.from_name, message: j.message }), motion: cardMotion(c), theme: themeVars(d), animate: true }),
    onOpened: () => { root.querySelector('.sent-with').hidden = false; },
  });
}
