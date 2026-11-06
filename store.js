// --- analytics ---------------------------------------------------------------
// No-ops entirely when GA4 is not configured, so these calls are safe to leave in.
function lpTrack(event, params) {
  try { if (typeof window.gtag === 'function') window.gtag('event', event, params || {}); } catch (e) {}
}
// store.js. Little Poppin storefront checkout wiring.
// Any <button data-sku="pink|green|bundle"> starts Stripe Checkout when clicked.
(function () {
  async function startCheckout(btn) {
    if (btn.disabled) return;
    const sku = btn.getAttribute('data-sku');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.innerHTML = 'Redirecting to checkout…';
    try {
      lpTrack('begin_checkout', { currency: 'AUD', items: [{ item_id: sku }] });
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: sku, quantity: 1 }),
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.url) { showNote(btn, data.error, res.status); throw new Error(data.error || 'Checkout failed'); }
      window.location.href = data.url;
    } catch (err) {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.innerHTML = original;
      console.error(err);
    }
  }

  // Friendly inline message under the button instead of a browser alert.
  function showNote(btn, message, status) {
    var note = btn.parentNode.querySelector('.buy-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'buy-note';
      btn.parentNode.insertBefore(note, btn.nextSibling);
    }
    note.textContent = status === 409
      ? (message || 'This one isn’t quite ready. Check back soon! ✨')
      : 'Sorry. Checkout hiccuped. Please try again, or contact us to order.';
  }

  function markSoldOut(btn) {
    btn.disabled = true;
    btn.classList.add('is-soldout');
    btn.innerHTML = 'Sold out';
  }

  // --- mobile navigation ----------------------------------------------------
  // At <=768px the stylesheet slides .nav__links off-screen and expects a hamburger
  // to bring it back. prints.html and custom.html shipped without that button, so the
  // shop has had NO navigation on mobile. Where most of its visitors are. Handling it
  // here means every page that loads store.js gets a working menu, rather than each new
  // page having to remember to copy the markup and the script.
  //
  // Pages with their own inline handler (index, the swaddle pages) mark the button
  // data-nav-bound="1" so we don't bind twice and cancel their toggle out.
  function initNav() {
    var toggle = document.querySelector('.nav__toggle');
    var links = document.querySelector('.nav__links');
    if (!toggle || !links || toggle.dataset.navBound) return;
    toggle.dataset.navBound = '1';
    function close() {
      links.classList.remove('nav__links--open');
      toggle.classList.remove('nav__toggle--open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('nav__links--open');
      toggle.classList.toggle('nav__toggle--open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  // --- "Pick any 3" ---------------------------------------------------------
  // A tiny basket for single prints, kept in localStorage. Every print page has an
  // "+ Add to my set" button; a bar at the foot of the page shows what is picked and
  // starts one checkout for all of them (POST /api/checkout { picks: [...] }). The
  // price rule lives in lib/picks.js on the server; the numbers here only label the
  // bar and must agree with it: 3 or more prints are $10 each, fewer are $12 each.
  var PICK_KEY = 'lp-picks';
  var PICK_MIN = 3, PICK_MAX = 6, PICK_DEAL = 1000, PICK_FULL = 1200;
  function readPicks() {
    try { var v = JSON.parse(localStorage.getItem(PICK_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writePicks(list) { try { localStorage.setItem(PICK_KEY, JSON.stringify(list)); } catch (e) {} }
  function pickTotal(n) { return n * (n >= PICK_MIN ? PICK_DEAL : PICK_FULL); }
  function money(cents) { return '$' + (cents % 100 === 0 ? (cents / 100) : (cents / 100).toFixed(2)); }

  function initPicks() {
    var btn = document.querySelector('[data-pick-sku]');
    var picks = readPicks();
    if (!btn && !picks.length) return;

    var bar = document.createElement('div');
    bar.className = 'picks';
    bar.hidden = true;
    bar.innerHTML = '<div class="picks__inner">'
      + '<div class="picks__thumbs" aria-hidden="true"></div>'
      + '<div class="picks__text"><strong class="picks__count"></strong><span class="picks__hint"></span></div>'
      + '<div class="picks__actions"><button type="button" class="btn btn--primary picks__go"></button>'
      + '<button type="button" class="picks__clear" aria-label="Clear my picks">Clear</button></div>'
      + '<p class="buy-note picks__err" role="alert" hidden></p></div>';
    document.body.appendChild(bar);
    var thumbs = bar.querySelector('.picks__thumbs'), count = bar.querySelector('.picks__count'),
        hint = bar.querySelector('.picks__hint'), go = bar.querySelector('.picks__go'),
        clear = bar.querySelector('.picks__clear'), err = bar.querySelector('.picks__err');

    function here() { return btn ? btn.getAttribute('data-pick-sku') : null; }
    function render() {
      picks = readPicks();
      var n = picks.length;
      if (btn) {
        var picked = picks.some(function (p) { return p.sku === here(); });
        btn.textContent = picked ? '✓ In my set. Remove' : '+ Add to my set';
        btn.classList.toggle('is-picked', picked);
      }
      bar.hidden = n === 0;
      document.body.classList.toggle('has-picks', n > 0);
      if (!n) return;
      thumbs.innerHTML = picks.map(function (p) { return '<img src="' + p.preview + '" alt="" />'; }).join('');
      count.textContent = n + ' print' + (n === 1 ? '' : 's') + ' picked';
      if (n < PICK_MIN) {
        var more = PICK_MIN - n;
        hint.textContent = ' · add ' + more + ' more and they drop to ' + money(PICK_DEAL) + ' each';
      } else {
        hint.textContent = ' · ' + money(PICK_DEAL) + ' each, you save ' + money(n * PICK_FULL - pickTotal(n));
      }
      go.textContent = 'Download ' + n + ' for ' + money(pickTotal(n));
    }

    if (btn) btn.addEventListener('click', function () {
      var list = readPicks();
      var sku = here();
      var i = list.map(function (p) { return p.sku; }).indexOf(sku);
      if (i >= 0) { list.splice(i, 1); }
      else {
        if (list.length >= PICK_MAX) { err.hidden = false; err.textContent = 'Six at a time is the most we can bundle. Download these first, then pick more.'; render(); return; }
        list.push({ sku: sku, title: btn.getAttribute('data-pick-title') || sku, preview: btn.getAttribute('data-pick-preview') || '' });
        lpTrack('add_to_cart', { currency: 'AUD', items: [{ item_id: sku }] });
      }
      err.hidden = true;
      writePicks(list);
      render();
    });
    clear.addEventListener('click', function () { writePicks([]); render(); });
    go.addEventListener('click', async function () {
      var list = readPicks();
      if (!list.length) return;
      var label = go.textContent;
      go.disabled = true; go.textContent = 'Redirecting to checkout…'; err.hidden = true;
      try {
        lpTrack('begin_checkout', { currency: 'AUD', items: list.map(function (p) { return { item_id: p.sku }; }) });
        var res = await fetch('/api/checkout', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ picks: list.map(function (p) { return p.sku; }) }),
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
        window.location.href = data.url;
      } catch (e) {
        go.disabled = false; go.textContent = label;
        err.hidden = false; err.textContent = e.message || 'Sorry. Checkout hiccuped. Please try again.';
      }
    });
    render();
  }

  // Clear the basket once a pick order has been paid for (success.html adds ?picked=1).
  try { if (/[?&]session_id=/.test(location.search) && /success\.html$/.test(location.pathname)) localStorage.removeItem(PICK_KEY); } catch (e) {}

  // --- Kind Words on product pages -----------------------------------------
  // data/testimonials.json is the only source. Nothing shows until there are at least
  // three real reviews in it: one or two reads thinner than none. Same threshold as
  // the homepage section. Only publish words a real customer wrote.
  var KIND_MIN = 3;
  function initKindWords() {
    var slot = document.querySelector('[data-kind-words]');
    if (!slot) return;
    var base = /\/(print|set)\//.test(location.pathname) ? '../' : '';
    fetch(base + 'data/testimonials.json')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (!Array.isArray(items) || items.length < KIND_MIN) return;
        var h = document.createElement('h2'); h.className = 'pd__kindTitle'; h.textContent = 'What parents say';
        slot.appendChild(h);
        items.slice(0, 3).forEach(function (t) {
          var f = document.createElement('figure'); f.className = 'pd__say';
          var q = document.createElement('blockquote'); q.textContent = '\u201c' + t.quote + '\u201d';
          var c = document.createElement('figcaption'); c.textContent = (t.name || 'A customer') + (t.detail ? ', ' + t.detail : '');
          f.appendChild(q); f.appendChild(c); slot.appendChild(f);
        });
        slot.hidden = false;
      })
      .catch(function () {});
  }

  // --- Email popup ---------------------------------------------------------
  // Offers the free welcome print (the same /api/subscribe the homepage band uses)
  // after 25 seconds on a page, or when the pointer leaves the top of the window.
  // Shown once per browser; never on the homepage (which has the band), never on
  // checkout result pages, and never again once someone has signed up or closed it.
  var POPUP_KEY = 'lp-popup';
  function initPopup() {
    var path = location.pathname;
    if (path === '/' || /index\.html$|success\.html$|cancel\.html$|open\.html$|invite\.html$|manage\.html$|sent\.html$/.test(path)) return;
    try { if (localStorage.getItem(POPUP_KEY)) return; } catch (e) { return; }
    if (window.innerWidth < 600 && window.innerHeight < 500) return;
    var shown = false;
    function markDone(v) { try { localStorage.setItem(POPUP_KEY, v); } catch (e) {} }
    function show() {
      if (shown) return; shown = true;
      var up = /\/(print|set|guides|card|invitation)\//.test(path) ? '../' : '';
      var wrap = document.createElement('div');
      wrap.className = 'popup';
      wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'popupTitle');
      wrap.innerHTML = '<div class="popup__card">'
        + '<button type="button" class="popup__close" aria-label="Close">×</button>'
        + '<img class="popup__art" src="' + up + 'images/prints/15-cloud-dreams.jpg" alt="Cloud Dreams, the free welcome print" />'
        + '<div class="popup__body">'
        + '<div class="section-label">A gift to start</div>'
        + '<h2 id="popupTitle">Have a print, on us</h2>'
        + '<p>Join the Poppin\u2019 list and we\u2019ll email you this print, free and high-resolution, straight away. You\u2019ll also get 10% off your first printed order with the code in that email.</p>'
        + '<form class="subscribe" novalidate><div class="subscribe__row">'
        + '<input type="email" name="email" placeholder="Your email address" required aria-label="Email address" />'
        + '<button type="submit" class="btn btn--primary">Send my free print</button></div>'
        + '<p class="subscribe__note" hidden></p></form>'
        + '<p class="popup__fine">No spam, one-click unsubscribe on every email.</p>'
        + '</div></div>';
      document.body.appendChild(wrap);
      lpTrack('view_promotion', { promotion_name: 'free_print_popup' });
      function close() { wrap.remove(); markDone('closed'); }
      wrap.querySelector('.popup__close').addEventListener('click', close);
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
      document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
      var form = wrap.querySelector('form');
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var input = form.querySelector('input[name="email"]'), note = form.querySelector('.subscribe__note'), b = form.querySelector('button[type="submit"]');
        b.disabled = true;
        try {
          var res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: input.value }) });
          var data = await res.json().catch(function () { return {}; });
          note.hidden = false;
          if (res.ok) {
            note.textContent = 'You\u2019re on the list. Your free print is on its way to your inbox! \u2728';
            form.querySelector('.subscribe__row').hidden = true;
            markDone('subscribed');
            lpTrack('sign_up', { method: 'popup' });
            setTimeout(function () { wrap.remove(); }, 3500);
          } else { note.textContent = data.error || 'Something hiccuped. Please try again.'; b.disabled = false; }
        } catch (err) { note.hidden = false; note.textContent = 'Something hiccuped. Please try again.'; b.disabled = false; }
      });
      setTimeout(function () { try { form.querySelector('input').focus(); } catch (e) {} }, 50);
    }
    setTimeout(show, 25000);
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) show(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initPicks();
    initKindWords();
    initPopup();
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-sku]'));
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { startCheckout(btn); });
    });

    // Mailing-list signup (homepage prints teaser).
    var form = document.getElementById('subscribeForm');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var input = form.querySelector('input[name="email"]');
        var note = form.querySelector('.subscribe__note');
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          var res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: input.value }),
          });
          var data = await res.json().catch(function () { return {}; });
          note.hidden = false;
          if (res.ok) {
            note.textContent = data.gift
              ? 'You’re on the list. Your free print is on its way to your inbox! ✨'
              : 'You’re on the list! Your free print will follow shortly. ✨';
            form.querySelector('.subscribe__row').hidden = true;
          } else {
            note.textContent = data.error || 'Something hiccuped. Please try again.';
            btn.disabled = false;
          }
        } catch (err) {
          note.hidden = false;
          note.textContent = 'Something hiccuped. Please try again.';
          btn.disabled = false;
        }
      });
    }

    // Reflect live stock. Disable + relabel any sold-out SKU.
    fetch('/api/stock')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (stock) {
        if (!stock) return;
        buttons.forEach(function (btn) {
          var sku = btn.getAttribute('data-sku');
          if (stock[sku] !== undefined && stock[sku] <= 0) markSoldOut(btn);
        });
      })
      .catch(function () {});
  });
})();
