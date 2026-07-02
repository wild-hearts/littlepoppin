// store.js — Little Poppin storefront checkout wiring.
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
      ? (message || 'This one isn’t quite ready — check back soon! ✨')
      : 'Sorry — checkout hiccuped. Please try again, or contact us to order.';
  }

  function markSoldOut(btn) {
    btn.disabled = true;
    btn.classList.add('is-soldout');
    btn.innerHTML = 'Sold out';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-sku]'));
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { startCheckout(btn); });
    });

    // Reflect live stock — disable + relabel any sold-out SKU.
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
