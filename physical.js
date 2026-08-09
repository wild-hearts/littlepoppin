// physical.js — the "have it printed and posted" picker on a product page.
//
// api/checkout.js has always accepted { sku, format, size } for a Printify order, but no
// page offered the controls, so physical prints were unreachable. This supplies them.
//
// It is deliberately inert until Printify is set up: data/print-options.json is written
// on every build and reports `configured: false` while lib/printify-config.generated.js
// is still empty. In that state the block stays hidden rather than showing a control that
// 409s — nothing to remove or re-add when the token finally lands.
(function () {
  'use strict';

  var block = document.querySelector('[data-physical-for]');
  if (!block) return;

  var sku = block.getAttribute('data-physical-for');
  var formatSel = block.querySelector('[data-physical-format]');
  var sizeSel = block.querySelector('[data-physical-size]');
  var countrySel = block.querySelector('[data-physical-country]');
  var buyBtn = block.querySelector('[data-physical-buy]');
  var errEl = block.querySelector('[data-physical-err]');
  var formats = [];

  var money = function (cents) { return '$' + (cents / 100).toFixed(2); };

  function renderSizes() {
    var fmt = formats.filter(function (f) { return f.key === formatSel.value; })[0];
    sizeSel.innerHTML = '';
    if (!fmt) return;
    fmt.sizes.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.key;
      o.textContent = s.label + ' — ' + money(s.price);
      sizeSel.appendChild(o);
    });
    updateLabel();
  }

  function updateLabel() {
    var fmt = formats.filter(function (f) { return f.key === formatSel.value; })[0];
    var size = fmt && fmt.sizes.filter(function (s) { return s.key === sizeSel.value; })[0];
    buyBtn.textContent = size ? 'Order a printed copy — ' + money(size.price) : 'Order a printed copy';
  }

  function buy() {
    errEl.textContent = '';
    var label = buyBtn.textContent;
    buyBtn.disabled = true;
    buyBtn.textContent = 'Taking you to checkout…';
    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: sku, format: formatSel.value, size: sizeSel.value,
        // Destination decides the postage rate, and Stripe fixes rates when the session
        // is created — so it has to be sent now, not collected on the Stripe page.
        country: countrySel ? countrySel.value : '' }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.url) throw new Error(res.d.error || 'Could not start checkout');
        window.location.href = res.d.url;
      })
      .catch(function (e) {
        buyBtn.disabled = false;
        buyBtn.textContent = label;
        errEl.textContent = e.message || 'Sorry — checkout hiccuped. Please try again.';
      });
  }

  fetch('../data/print-options.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg || !cfg.configured) return;                       // Printify not set up yet
      if (cfg.availableFor.indexOf(sku) === -1) return;           // no product for this design
      formats = cfg.formats || [];
      if (!formats.length) return;

      formats.forEach(function (f) {
        var o = document.createElement('option');
        o.value = f.key;
        o.textContent = f.label;
        formatSel.appendChild(o);
      });
      renderSizes();
      formatSel.addEventListener('change', renderSizes);
      sizeSel.addEventListener('change', updateLabel);
      buyBtn.addEventListener('click', buy);
      block.hidden = false;
    })
    .catch(function () { /* stay hidden */ });
})();
