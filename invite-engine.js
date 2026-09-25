// invite-engine.js. Renders a Little Poppin Website Invitation in the browser.
//
// Used in two places with the same code path, so the preview in the builder is exactly
// what the guests will see:
//   1. /i/<code>        the live invitation (config embedded by api/invite-page.js)
//   2. /invite-preview  the builder's live preview (config arrives by postMessage)
//
// Structure, top to bottom, mirroring what sells well in this category:
//   sealed envelope cover ("tap to open") -> hero art + script title -> the invitation
//   card -> countdown -> where (maps + add to calendar) -> gift note -> RSVP -> credit.
import { themeById, eventById, INVITE_HOSTED_MONTHS } from './invite-themes.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

let styleInjected = false;
function injectStyles() {
  if (styleInjected) return; styleInjected = true;
  const css = `
  :root { --iv-accent:#b8607e; --iv-deep:#8a3f5c; --iv-ribbon:#e8b4c6; --iv-bg:#fbf3f5; --iv-card:#fffaf9; --iv-ink:#3a2a31;
          --iv-script:'Pinyon Script', cursive; --iv-serif:'Cormorant Garamond', Georgia, serif; --iv-sans:'Lato', system-ui, sans-serif; }
  html, body { margin:0; padding:0; }
  body.iv-body { background: var(--iv-bg); color: var(--iv-ink); font-family: var(--iv-serif); line-height:1.55; -webkit-font-smoothing:antialiased;
                 font-variant-numeric: lining-nums; font-feature-settings:'lnum' 1; }
  .iv * { box-sizing:border-box; }
  .iv { max-width: 560px; margin: 0 auto; padding: 0 0 40px; position:relative; }
  .iv .script { font-family: var(--iv-script); font-weight:400; color: var(--iv-accent); line-height:1.1; }
  .iv .caps { font-family: var(--iv-sans); font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--iv-deep); }
  .iv .caps--soft { color: var(--iv-ink); opacity:.7; letter-spacing:.16em; }
  .iv-section { padding: 34px 26px; text-align:center; }
  .iv-rule { width: 64px; height:1px; background: var(--iv-ribbon); margin: 18px auto; position:relative; }
  .iv-rule::after { content:'❀'; position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); background:var(--iv-bg); color:var(--iv-accent); padding:0 8px; font-size:.8rem; }
  .iv-panel { background: var(--iv-card); border: 1px solid var(--iv-ribbon); border-radius: 18px; padding: 30px 24px; box-shadow: 0 10px 40px rgba(0,0,0,.06); position:relative; }
  .iv-panel::before { content:''; position:absolute; inset:7px; border:1px solid var(--iv-ribbon); border-radius: 13px; pointer-events:none; opacity:.7; }
  .iv-btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; padding: 13px 26px; border-radius: 999px; border:1.5px solid var(--iv-accent);
            background: var(--iv-accent); color:#fff; font-family: var(--iv-sans); font-size:.78rem; letter-spacing:.18em; text-transform:uppercase; text-decoration:none; cursor:pointer;
            transition: transform .2s ease, box-shadow .2s ease; }
  .iv-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,.15); }
  .iv-btn--ghost { background: transparent; color: var(--iv-accent); }
  .iv-btn + .iv-btn { margin-left: 8px; }
  @media (max-width: 420px) { .iv-btn { width:100%; } .iv-btn + .iv-btn { margin: 10px 0 0; } }

  /* ---- cover / envelope ---- */
  .iv-cover { position: fixed; inset:0; z-index: 50; background: var(--iv-bg); display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 30px 20px; text-align:center;
              transition: opacity .8s ease .9s, visibility 0s linear 1.7s; }
  .iv-cover--gone { opacity:0; visibility:hidden; pointer-events:none; }
  .iv-cover__kicker { font-size: clamp(2.6rem, 11vw, 3.6rem); margin: 0 0 26px; }
  .iv-env { position:relative; width: 300px; height: 210px; margin: 20px auto 30px; perspective: 1200px; cursor:pointer; }
  .iv-env__back { position:absolute; inset:0; background: var(--iv-card); border-radius: 10px; box-shadow: 0 18px 50px rgba(0,0,0,.12); border:1px solid var(--iv-ribbon); }
  .iv-env__card { position:absolute; left: 30px; right: 30px; top: 18px; height: 178px; border-radius: 8px; overflow:hidden; background:#fff; box-shadow: 0 6px 20px rgba(0,0,0,.18);
                  transition: transform 1s cubic-bezier(.2,.7,.2,1) .55s; }
  .iv-env__card img { width:100%; height:100%; object-fit:cover; display:block; }
  .iv-env__card::after { content: attr(data-title); position:absolute; left:0; right:0; bottom:0; padding: 14px 10px 12px; text-align:center; color:#fff; font-family: var(--iv-script); font-size:1.7rem; line-height:1;
                         background: linear-gradient(to top, rgba(0,0,0,.45), transparent); text-shadow: 0 1px 6px rgba(0,0,0,.5); }
  .iv-env__pocket { position:absolute; inset:0; border-radius: 10px; overflow:hidden; pointer-events:none; }
  .iv-env__pocket::before { content:''; position:absolute; inset:0; background: var(--iv-card); clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%); filter: brightness(.985); }
  .iv-env__pocket::after { content:''; position:absolute; inset:0; background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.04)); clip-path: polygon(0 100%, 50% 52%, 100% 100%); }
  .iv-env__flap { position:absolute; left:0; right:0; top:0; height: 120px; transform-origin: top center; transform: rotateX(0deg); transition: transform .7s ease; z-index:3; }
  .iv-env__flap::before { content:''; position:absolute; inset:0; background: var(--iv-card); filter: brightness(.97); clip-path: polygon(0 0, 100% 0, 50% 100%); border-radius:10px 10px 0 0; box-shadow: 0 4px 10px rgba(0,0,0,.1); }
  .iv-env--open .iv-env__flap { transform: rotateX(180deg); z-index:-1; transition-delay: 0s; }
  .iv-env--open .iv-env__card { transform: translateY(-175px) scale(1.06); z-index: 2; }
  .iv-seal { position:absolute; left:50%; top: 92px; transform: translate(-50%,-50%); width: 62px; height: 62px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--iv-deep) 70%, #fff), var(--iv-deep) 65%);
             box-shadow: 0 3px 10px rgba(0,0,0,.25), inset 0 0 0 4px rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; color:#fff; font-family: var(--iv-script); font-size: 1.9rem; z-index:4;
             transition: opacity .4s ease; }
  .iv-seal::before { content:''; position:absolute; inset:-5px; border-radius:50%; border: 3px solid color-mix(in srgb, var(--iv-deep) 80%, #000); opacity:.35; clip-path: polygon(0 0, 100% 0, 100% 40%, 60% 100%, 0 70%); }
  .iv-env--open .iv-seal { opacity:0; }
  .iv-cover__open { font-family: var(--iv-sans); font-size:.72rem; letter-spacing:.3em; text-transform:uppercase; color: var(--iv-deep); background:none; border:0; cursor:pointer; padding: 10px; animation: iv-pulse 2.2s ease-in-out infinite; }
  @keyframes iv-pulse { 0%,100% { opacity:.55 } 50% { opacity:1 } }
  .iv-page { opacity:0; transform: translateY(14px); transition: opacity .9s ease 1.4s, transform .9s ease 1.4s; }
  .iv-page--in { opacity:1; transform:none; }
  .iv-page--nocover { opacity:1; transform:none; transition:none; }

  /* ---- hero ---- */
  .iv-hero { padding: 28px 18px 8px; text-align:center; }
  .iv-hero__art { width: min(100%, 420px); aspect-ratio: 4/5; margin: 0 auto 6px; border-radius: 200px 200px 18px 18px; overflow:hidden; box-shadow: 0 20px 50px rgba(0,0,0,.14); position:relative; border: 6px solid var(--iv-card); }
  .iv-hero__art img { width:100%; height:100%; object-fit:cover; display:block; }
  .iv-hero__art::after { content:''; position:absolute; inset:0; box-shadow: inset 0 -60px 60px -30px var(--iv-bg); }
  .iv-hero h1 { font-size: clamp(3rem, 13vw, 4.4rem); margin: 10px 0 4px; }
  .iv-hero .caps { margin: 0; }

  /* ---- card ---- */
  .iv-card .iv-panel { text-align:center; }
  .iv-card h2 { font-size: clamp(2.6rem, 11vw, 3.6rem); margin: 8px 0 4px; }
  .iv-card__intro { max-width: 300px; margin: 0 auto; line-height:1.9; }
  .iv-card__when { font-family: var(--iv-sans); font-size: .8rem; letter-spacing:.2em; text-transform:uppercase; color: var(--iv-ink); margin: 6px 0; }
  .iv-card__where { font-size: 1.1rem; margin: 16px 0 0; }
  .iv-card__where small { display:block; font-family: var(--iv-sans); font-size:.72rem; letter-spacing:.1em; opacity:.75; margin-top:2px; }
  .iv-card__hosts { font-style: italic; margin: 18px 0 0; opacity:.85; }
  .iv-card__msg { margin: 18px auto 0; max-width: 360px; font-size: 1.08rem; }
  .iv-card__dress { margin-top: 14px; }

  /* ---- countdown ---- */
  .iv-count { display:flex; justify-content:center; gap: 10px; margin-top: 14px; }
  .iv-count div { min-width: 64px; }
  .iv-count b { display:block; font-family: var(--iv-serif); font-weight:400; font-size: 2.6rem; line-height:1; color: var(--iv-accent); }
  .iv-count span { display:block; font-family: var(--iv-sans); font-size:.6rem; letter-spacing:.2em; text-transform:uppercase; margin-top:6px; opacity:.7; }
  .iv-count__done { font-size:1.3rem; font-style:italic; color: var(--iv-accent); margin-top:10px; }

  /* ---- where ---- */
  .iv-where__actions { margin-top: 18px; }
  .iv-where__addr { margin: 6px 0 0; font-size: 1.05rem; }

  /* ---- gift ---- */
  .iv-gift h3 { font-size: clamp(2.2rem, 9vw, 2.8rem); margin: 0 0 6px; }
  .iv-gift p { max-width: 360px; margin: 0 auto; font-size: 1.05rem; }
  .iv-gift .iv-btn { margin-top: 16px; }

  /* ---- rsvp ---- */
  .iv-rsvp h3 { font-size: clamp(2.4rem, 10vw, 3.2rem); margin: 0; }
  .iv-rsvp h3 small { display:block; font-size: 1.6rem; opacity:.85; }
  .iv-rsvp__by { margin: 6px 0 0; }
  .iv-rsvp__miniseal { width: 44px; height:44px; border-radius:50%; margin: 14px auto 0; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--iv-deep) 70%, #fff), var(--iv-deep) 65%); color:#fff; display:flex; align-items:center; justify-content:center; font-family: var(--iv-script); font-size:1.3rem; box-shadow: 0 3px 8px rgba(0,0,0,.2); }
  .iv-form { text-align:left; margin-top: 20px; font-family: var(--iv-sans); }
  .iv-form label { display:block; font-size:.7rem; letter-spacing:.16em; text-transform:uppercase; color: var(--iv-deep); margin: 14px 0 6px; }
  .iv-form input, .iv-form textarea, .iv-form select { width:100%; padding: 12px 14px; border: 1px solid var(--iv-ribbon); border-radius: 10px; background:#fff; font: inherit; font-size: 1rem; color: var(--iv-ink); }
  .iv-form input:focus, .iv-form textarea:focus, .iv-form select:focus { outline: 2px solid var(--iv-accent); outline-offset: 1px; }
  .iv-choice { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .iv-choice label { margin:0; }
  .iv-choice input { position:absolute; opacity:0; width:0; height:0; }
  .iv-choice span { display:block; padding: 14px 10px; border: 1.5px solid var(--iv-ribbon); border-radius: 12px; text-align:center; cursor:pointer; font-family: var(--iv-serif); font-size: 1.05rem; text-transform:none; letter-spacing:0; color: var(--iv-ink); background:#fff; }
  .iv-choice input:checked + span { border-color: var(--iv-accent); background: color-mix(in srgb, var(--iv-accent) 10%, #fff); color: var(--iv-deep); }
  .iv-form .iv-btn { width:100%; margin-top: 20px; }
  .iv-form__note { font-size:.72rem; opacity:.65; text-align:center; margin-top: 10px; }
  .iv-form__err { color:#b5223e; font-size:.85rem; margin-top:10px; text-align:center; }
  .iv-hp { position:absolute; left:-9999px; }
  .iv-thanks { padding: 10px 0 0; }
  .iv-thanks .script { font-size: 2.6rem; }

  /* ---- credit ---- */
  .iv-credit { text-align:center; font-family: var(--iv-sans); font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; opacity:.6; padding: 22px 20px 0; }
  .iv-credit a { color: inherit; text-decoration:none; border-bottom: 1px solid currentColor; }

  /* ---- manage (host) ---- */
  .iv-manage { font-family: var(--iv-sans); padding: 24px 20px; }
  .iv-manage h1 { font-family: var(--iv-script); color: var(--iv-accent); font-size: 3rem; margin: 0; font-weight:400; }
  .iv-manage__stats { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }
  .iv-manage__stats div { background: var(--iv-card); border:1px solid var(--iv-ribbon); border-radius: 12px; padding: 14px 8px; text-align:center; }
  .iv-manage__stats b { display:block; font-size: 1.8rem; color: var(--iv-accent); font-family: var(--iv-serif); font-weight:400; }
  .iv-manage__stats span { font-size:.65rem; letter-spacing:.14em; text-transform:uppercase; opacity:.7; }
  .iv-manage table { width:100%; border-collapse: collapse; font-size:.9rem; background: var(--iv-card); border-radius: 12px; overflow:hidden; }
  .iv-manage th, .iv-manage td { text-align:left; padding: 10px 12px; border-bottom: 1px solid var(--iv-ribbon); vertical-align:top; }
  .iv-manage th { font-size:.65rem; letter-spacing:.14em; text-transform:uppercase; color: var(--iv-deep); }
  .iv-manage__yes { color:#2f7a4f; font-weight:700; } .iv-manage__no { color:#9a3b3b; }
  .iv-manage__link { word-break: break-all; background: var(--iv-card); border:1px dashed var(--iv-ribbon); padding: 12px; border-radius: 10px; font-size:.85rem; margin: 10px 0; }
  .iv-manage .iv-btn { margin-top: 8px; }
  `;
  const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el);
}

const loadedFonts = new Set();
function loadFont(family) {
  if (loadedFonts.has(family)) return; loadedFonts.add(family);
  const link = document.createElement('link'); link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+') + '&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Lato:wght@400;700&display=swap';
  document.head.appendChild(link);
}

export function applyTheme(theme) {
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.colors)) r.setProperty('--iv-' + k, v);
  r.setProperty('--iv-script', `'${theme.script}', cursive`);
  loadFont(theme.script);
}

/* ---- date helpers (all from the Y-M-D + HH:MM strings the host typed, so they never shift by timezone) ---- */
function parts(config) {
  const [y, m, d] = String(config.date || '').split('-').map(Number);
  const [hh, mm] = String(config.time || '').split(':').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d, hh: hh || 0, mm: mm || 0 };
}
export function longDate(config) {
  const p = parts(config); if (!p) return '';
  const dt = new Date(p.y, p.m - 1, p.d);
  return dt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function timeLabel(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am'; const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}
function icsStamp(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function makeIcs(config) {
  const start = Number(config.startsAt) || Date.now();
  let end = start + 3 * 3600e3;
  const p = parts(config);
  if (p && config.endTime) { const [eh, em] = String(config.endTime).split(':').map(Number); const dur = ((eh * 60 + (em || 0)) - (p.hh * 60 + p.mm)) * 60e3; if (dur > 0) end = start + dur; }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Little Poppin//Invitation//EN', 'BEGIN:VEVENT',
    `UID:${(config.code || 'preview')}@littlepoppin.com`, `DTSTAMP:${icsStamp(Date.now())}`, `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
    `SUMMARY:${(config.title || 'Celebration').replace(/[,;]/g, ' ')} for ${(config.honouree || '').replace(/[,;]/g, ' ')}`,
    `LOCATION:${[config.venue, config.address].filter(Boolean).join(', ').replace(/[,;]/g, '\\,')}`,
    `DESCRIPTION:${(config.message || '').replace(/\n/g, '\\n')}`, 'END:VEVENT', 'END:VCALENDAR'];
  return lines.join('\r\n');
}

/* ---- render ---- */
export function renderInvite(root, config, opts = {}) {
  injectStyles();
  const theme = themeById(config.theme);
  const ev = eventById(config.event);
  applyTheme(theme);
  document.body.classList.add('iv-body');
  const initial = (config.honouree || 'L').trim().charAt(0).toUpperCase() || 'L';
  const showCover = opts.cover !== false;
  const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([config.venue, config.address].filter(Boolean).join(', '));
  const announcement = !!ev.announcement;

  root.innerHTML = `
  ${showCover ? `
  <div class="iv-cover" id="ivCover">
    <p class="script iv-cover__kicker">You’ve been invited</p>
    <div class="iv-env" id="ivEnv" role="button" tabindex="0" aria-label="Open the invitation">
      <div class="iv-env__back"></div>
      <div class="iv-env__card" data-title="${esc(config.title)}"><img src="${esc(theme.art)}" alt="" /></div>
      <div class="iv-env__pocket"></div>
      <div class="iv-env__flap"></div>
      <div class="iv-seal">${esc(initial)}</div>
    </div>
    <button type="button" class="iv-cover__open" id="ivOpen">Tap to open</button>
  </div>` : ''}

  <main class="iv iv-page ${showCover ? '' : 'iv-page--nocover'}" id="ivPage">
    <section class="iv-hero">
      <div class="iv-hero__art"><img src="${esc(theme.art)}" alt="${esc(theme.name)} artwork by Little Poppin" /></div>
      <h1 class="script">${esc(config.title)}</h1>
      <p class="caps">${esc(ev.label)}</p>
    </section>

    <section class="iv-section iv-card">
      <div class="iv-panel">
        <p class="caps caps--soft iv-card__intro">${esc(config.intro || ev.intro)}</p>
        <h2 class="script">${esc(config.honouree)}</h2>
        <div class="iv-rule"></div>
        ${config.date ? `<p class="iv-card__when">${esc(longDate(config))}</p>` : ''}
        ${config.time ? `<p class="iv-card__when">${esc(timeLabel(config.time))}${config.endTime ? ' – ' + esc(timeLabel(config.endTime)) : ''}</p>` : ''}
        ${(config.venue || config.address) && !announcement ? `<p class="iv-card__where">${esc(config.venue)}${config.address ? `<small>${esc(config.address)}</small>` : ''}</p>` : ''}
        ${config.hosts ? `<p class="iv-card__hosts">${esc(config.hosts)}</p>` : ''}
        ${config.message ? `<p class="iv-card__msg">${nl2br(config.message)}</p>` : ''}
        ${config.dress ? `<p class="caps caps--soft iv-card__dress">${esc(config.dress)}</p>` : ''}
      </div>
    </section>

    ${config.showCountdown !== false && ev.countdown && config.startsAt ? `
    <section class="iv-section iv-countdown">
      <p class="caps">The countdown</p>
      <div class="iv-count" id="ivCount">
        <div><b data-u="d">0</b><span>days</span></div><div><b data-u="h">0</b><span>hours</span></div>
        <div><b data-u="m">0</b><span>minutes</span></div><div><b data-u="s">0</b><span>seconds</span></div>
      </div>
    </section>` : ''}

    ${(config.venue || config.address) && !announcement ? `
    <section class="iv-section iv-where">
      <p class="caps">Where to find us</p>
      <p class="iv-card__where">${esc(config.venue)}</p>
      <p class="iv-where__addr">${esc(config.address)}</p>
      <div class="iv-where__actions">
        ${config.showMap !== false && config.address ? `<a class="iv-btn" href="${esc(mapUrl)}" target="_blank" rel="noopener">◎&nbsp; Google Maps</a>` : ''}
        ${config.startsAt ? `<a class="iv-btn iv-btn--ghost" href="#" id="ivIcs">☆&nbsp; Add to calendar</a>` : ''}
      </div>
    </section>` : ''}

    ${config.showGift !== false && (config.giftTitle || config.giftText) ? `
    <section class="iv-section iv-gift">
      <div class="iv-panel">
        <h3 class="script">${esc(config.giftTitle)}</h3>
        <p>${nl2br(config.giftText)}</p>
        ${config.registryUrl ? `<a class="iv-btn iv-btn--ghost" href="${esc(config.registryUrl)}" target="_blank" rel="noopener">View the registry</a>` : ''}
      </div>
    </section>` : ''}

    ${config.showRsvp !== false && ev.rsvp ? `
    <section class="iv-section iv-rsvp" id="ivRsvp">
      <div class="iv-panel">
        <h3 class="script"><small>kindly</small>RSVP</h3>
        ${config.rsvpBy ? `<p class="caps caps--soft iv-rsvp__by">Please reply by ${esc(longDate({ date: config.rsvpBy }))}</p>` : ''}
        <div class="iv-rsvp__miniseal">${esc(initial)}</div>
        <form class="iv-form" id="ivForm" novalidate>
          <label for="ivName">Your name</label>
          <input id="ivName" name="name" type="text" maxlength="80" autocomplete="name" required placeholder="Who is this from?" />
          <label>Are you coming?</label>
          <div class="iv-choice">
            <label><input type="radio" name="attending" value="yes" checked /><span>Absolutely, wouldn’t miss it</span></label>
            <label><input type="radio" name="attending" value="no" /><span>Can’t make it this time</span></label>
          </div>
          <label for="ivGuests">How many of you?</label>
          <select id="ivGuests" name="guests"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select>
          <label for="ivNote">A note for the host <span style="opacity:.6;text-transform:none;letter-spacing:0">(optional)</span></label>
          <textarea id="ivNote" name="note" rows="3" maxlength="400" placeholder="Dietary needs, a message, anything at all"></textarea>
          <input class="iv-hp" type="text" name="website" tabindex="-1" autocomplete="off" />
          <button type="submit" class="iv-btn">RSVP now</button>
          <p class="iv-form__err" id="ivErr" hidden></p>
          <p class="iv-form__note">Your reply goes straight to ${esc(config.hostName || 'the host')}. Nothing is shared with anyone else.</p>
        </form>
        <div class="iv-thanks" id="ivThanks" hidden></div>
      </div>
    </section>` : ''}

    <p class="iv-credit">Made with <a href="https://littlepoppin.com/invites.html?ref=invite" target="_blank" rel="noopener">Little Poppin</a></p>
  </main>`;

  // Cover: tap the envelope or the button. Keyboard too.
  if (showCover) {
    const cover = root.querySelector('#ivCover'), env = root.querySelector('#ivEnv'), page = root.querySelector('#ivPage');
    document.body.style.overflow = 'hidden';
    const open = () => {
      if (env.classList.contains('iv-env--open')) return;
      env.classList.add('iv-env--open'); cover.classList.add('iv-cover--gone'); page.classList.add('iv-page--in');
      setTimeout(() => { document.body.style.overflow = ''; }, 1500);
    };
    env.addEventListener('click', open); root.querySelector('#ivOpen').addEventListener('click', open);
    env.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    if (opts.autoOpen) setTimeout(open, 600);
  }

  // Countdown.
  const count = root.querySelector('#ivCount');
  if (count) {
    const target = Number(config.startsAt);
    const tick = () => {
      if (!count.isConnected) return; // a re-render in the builder replaced this node
      let diff = Math.max(0, target - Date.now());
      if (diff === 0) { count.innerHTML = `<p class="iv-count__done">Today is the day!</p>`; return; }
      const d = Math.floor(diff / 864e5); diff -= d * 864e5; const h = Math.floor(diff / 36e5); diff -= h * 36e5; const m = Math.floor(diff / 6e4); const s = Math.floor((diff - m * 6e4) / 1e3);
      count.querySelector('[data-u=d]').textContent = d; count.querySelector('[data-u=h]').textContent = String(h).padStart(2, '0');
      count.querySelector('[data-u=m]').textContent = String(m).padStart(2, '0'); count.querySelector('[data-u=s]').textContent = String(s).padStart(2, '0');
      setTimeout(tick, 1000);
    };
    tick();
  }

  // Add to calendar: a generated .ics, works on iPhone, Android and desktop.
  const ics = root.querySelector('#ivIcs');
  if (ics) ics.addEventListener('click', (e) => {
    e.preventDefault();
    const blob = new Blob([makeIcs(config)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'invitation.ics'; document.body.appendChild(a); a.click(); a.remove();
  });

  // RSVP.
  const form = root.querySelector('#ivForm');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = root.querySelector('#ivErr'); err.hidden = true;
    const fd = new FormData(form);
    const payload = { code: config.code || '', name: String(fd.get('name') || '').trim(), attending: fd.get('attending') === 'yes' ? 'yes' : 'no',
                      guests: Number(fd.get('guests')) || 1, note: String(fd.get('note') || '').trim(), website: String(fd.get('website') || '') };
    if (!payload.name) { err.textContent = 'Please tell us your name so the host knows who is coming.'; err.hidden = false; return; }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    try {
      if (opts.preview || !config.code) { await new Promise((r) => setTimeout(r, 500)); }
      else {
        const r = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Could not send your RSVP. Please try again.');
      }
      form.hidden = true;
      const t = root.querySelector('#ivThanks'); t.hidden = false;
      t.innerHTML = payload.attending === 'yes'
        ? `<p class="script">Wonderful!</p><p>Thank you, ${esc(payload.name)}. ${esc(config.hostName || 'The host')} has your RSVP and can’t wait to see you there.</p>`
        : `<p class="script">You’ll be missed</p><p>Thank you for letting us know, ${esc(payload.name)}. ${esc(config.hostName || 'The host')} will be sorry not to see you.</p>`;
      if (opts.preview) t.innerHTML += `<p class="iv-form__note">(Preview only. Real replies are emailed to you and listed on your host page.)</p>`;
    } catch (ex) {
      err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'RSVP now';
    }
  });
}

/* ---- host management view: link, stats and the guest list ---- */
export function renderManage(root, data) {
  injectStyles();
  const config = data.invite; const theme = themeById(config.theme); applyTheme(theme); document.body.classList.add('iv-body');
  const rs = data.rsvps || [];
  const yes = rs.filter((r) => r.attending === 'yes'); const heads = yes.reduce((n, r) => n + (Number(r.guests) || 1), 0);
  const url = data.url || (location.origin + '/i/' + config.code);
  root.innerHTML = `
  <main class="iv iv-manage">
    <p class="caps">Host page</p>
    <h1>${esc(config.title)}</h1>
    <p>This page is just for you. Share the invitation link below with your guests, not this page.</p>
    <p class="caps">Your invitation link</p>
    <div class="iv-manage__link" id="ivShareUrl">${esc(url)}</div>
    <button type="button" class="iv-btn" id="ivCopy">Copy link</button>
    <a class="iv-btn iv-btn--ghost" href="${esc(url)}" target="_blank" rel="noopener">Open invitation</a>
    <a class="iv-btn iv-btn--ghost" href="https://wa.me/?text=${encodeURIComponent((config.title || 'You’re invited') + ' — ' + url)}" target="_blank" rel="noopener">Share on WhatsApp</a>
    <div class="iv-manage__stats">
      <div><b>${yes.length}</b><span>coming</span></div><div><b>${heads}</b><span>guests total</span></div><div><b>${rs.length - yes.length}</b><span>can’t make it</span></div>
    </div>
    ${rs.length ? `<table><thead><tr><th>Name</th><th>Reply</th><th>Guests</th><th>Note</th><th>When</th></tr></thead><tbody>
      ${rs.map((r) => `<tr><td>${esc(r.name)}</td><td class="${r.attending === 'yes' ? 'iv-manage__yes' : 'iv-manage__no'}">${r.attending === 'yes' ? 'Coming' : 'Not coming'}</td><td>${esc(r.guests)}</td><td>${esc(r.note)}</td><td>${esc(new Date(r.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }))}</td></tr>`).join('')}
    </tbody></table>` : `<p style="opacity:.7">No replies yet. They will appear here as guests RSVP, and each one is emailed to you too.</p>`}
    <p class="iv-credit" style="padding-top:30px">Your invitation stays live for ${INVITE_HOSTED_MONTHS} months · <a href="https://littlepoppin.com/invites.html">Little Poppin</a></p>
  </main>`;
  root.querySelector('#ivCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); root.querySelector('#ivCopy').textContent = 'Copied!'; } catch { /* ignore */ }
  });
}
