// personalise-app.js. Design picker + live preview for personalised name prints.
//
// The preview MUST match what lib/personalise.js renders into the PDF, or buyers will
// feel misled. To guarantee that, the layout is computed in PDF points against the same
// 8x10" base page (576 x 720) the renderer uses, then scaled up to the canvas. Any change
// to the layout constants here must be mirrored there, and vice versa.
(function () {
  'use strict';

  var BASE_W = 576, BASE_H = 720;          // 8x10" in PDF points
  var ART_ASPECT = 1856 / 2304;            // every design in the library
  var LIMITS = { name: 22, line2: 40, line3: 40 };
  var CREAM = '#FDFAF7', INK = '#2C2C2C', MUTED = '#6B6B6B';
  var SERIF = "'Cormorant Garamond', Georgia, serif";

  var canvas = document.getElementById('pzCanvas');
  var ctx = canvas.getContext('2d');
  var picker = document.getElementById('pzPicker');
  var filters = document.getElementById('pzFilters');
  var search = document.getElementById('pzSearch');
  var chosenEl = document.getElementById('pzChosen');
  var errEl = document.getElementById('pzErr');
  var buyBtn = document.getElementById('pzBuy');

  var fields = {
    name: document.getElementById('pzName'),
    line2: document.getElementById('pzLine2'),
    line3: document.getElementById('pzLine3'),
  };
  var counts = {
    name: document.getElementById('pzNameCount'),
    line2: document.getElementById('pzLine2Count'),
    line3: document.getElementById('pzLine3Count'),
  };

  var prints = [];
  var sections = [];
  var selected = null;
  var artImg = null;
  var activeSection = 'all';

  // --- layout (shared contract with lib/personalise.js) ----------------------
  function fitSize(text, maxWidth, max, min) {
    var size = max;
    ctx.font = '400 ' + size + 'px ' + SERIF;
    while (size > (min || 8) && ctx.measureText(text).width > maxWidth) {
      size -= 0.5;
      ctx.font = '400 ' + size + 'px ' + SERIF;
    }
    return size;
  }

  function draw() {
    var k = canvas.width / BASE_W;            // points -> canvas pixels
    var W = BASE_W, H = BASE_H;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(k, k);

    var sideMargin = W * 0.104;
    var topMargin = H * 0.058;
    var textBand = H * 0.17;
    var boxW = W - sideMargin * 2;
    var boxH = H - topMargin - textBand;

    var artW = boxW, artH = artW / ART_ASPECT;
    if (artH > boxH) { artH = boxH; artW = artH * ART_ASPECT; }
    var artX = (W - artW) / 2;

    if (artImg && artImg.complete && artImg.naturalWidth) {
      ctx.drawImage(artImg, artX, topMargin, artW, artH);
    } else {
      ctx.fillStyle = '#F0EDE9';
      ctx.fillRect(artX, topMargin, artW, artH);
      ctx.fillStyle = '#B9B3AD';
      ctx.font = '400 16px ' + SERIF;
      ctx.textAlign = 'center';
      ctx.fillText('Choose a design →', W / 2, topMargin + artH / 2);
    }

    // Text block. `bandTop` is the art's lower edge measured from the page bottom,
    // exactly as the PDF renderer sees it.
    var bandTop = H - topMargin - artH;
    var name = (fields.name.value || '').trim() || 'Their name';
    var isPlaceholder = !(fields.name.value || '').trim();
    var detailLines = [fields.line2.value.trim(), fields.line3.value.trim()].filter(Boolean);

    var nameSize = fitSize(name, boxW * 0.92, H * 0.058);
    var detailSize = Math.max(8, nameSize * 0.30);
    var blockH = nameSize + detailLines.length * detailSize * 1.95;
    var minBottom = H * 0.045;
    var slack = Math.max(0, bandTop - blockH - minBottom);
    var cursor = bandTop - slack / 2 - nameSize * 0.80;

    ctx.textAlign = 'center';
    ctx.fillStyle = isPlaceholder ? '#C9C3BD' : INK;
    ctx.font = '400 ' + nameSize + 'px ' + SERIF;
    ctx.fillText(name, W / 2, H - cursor);       // PDF y-up -> canvas y-down
    cursor -= detailSize * 2.05;

    ctx.fillStyle = MUTED;
    for (var i = 0; i < detailLines.length; i++) {
      var s = fitSize(detailLines[i], boxW * 0.86, detailSize);
      ctx.font = '400 ' + s + 'px ' + SERIF;
      ctx.fillText(detailLines[i], W / 2, H - cursor);
      cursor -= detailSize * 1.95;
    }
    ctx.restore();
  }

  // --- picker ---------------------------------------------------------------
  function visiblePrints() {
    var q = (search.value || '').trim().toLowerCase();
    return prints.filter(function (p) {
      if (!p.available) return false;
      if (activeSection !== 'all' && p.section !== activeSection) return false;
      if (q && (p.title + ' ' + p.description).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderPicker() {
    var list = visiblePrints();
    picker.innerHTML = '';
    if (!list.length) {
      picker.innerHTML = '<p class="pz__empty">No designs match that. Try another word.</p>';
      return;
    }
    var frag = document.createDocumentFragment();
    list.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pz__thumb' + (selected && selected.sku === p.sku ? ' is-selected' : '');
      b.title = p.title;
      b.setAttribute('aria-label', 'Use the ' + p.title + ' design');
      b.innerHTML = '<img src="' + p.preview + '" alt="' + p.title + '" loading="lazy" />';
      b.addEventListener('click', function () { select(p); });
      frag.appendChild(b);
    });
    picker.appendChild(frag);
  }

  function select(p) {
    selected = p;
    chosenEl.innerHTML = 'Design: <strong>' + p.title + '</strong>';
    artImg = new Image();
    artImg.onload = draw;
    artImg.onerror = draw;
    artImg.src = p.preview;
    renderPicker();
    draw();
  }

  function renderFilters() {
    var all = [{ id: 'all', nav: 'All designs' }].concat(sections);
    filters.innerHTML = '';
    all.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pz__chip' + (s.id === activeSection ? ' is-active' : '');
      b.textContent = s.nav;
      b.addEventListener('click', function () {
        activeSection = s.id;
        renderFilters();
        renderPicker();
      });
      filters.appendChild(b);
    });
  }

  // --- buy ------------------------------------------------------------------
  function buy() {
    errEl.textContent = '';
    if (!selected) { errEl.textContent = 'Please choose a design first.'; return; }
    var name = fields.name.value.trim();
    if (!name) { errEl.textContent = 'Please enter a name for the print.'; fields.name.focus(); return; }

    var original = buyBtn.textContent;
    buyBtn.disabled = true;
    buyBtn.textContent = 'Taking you to checkout…';

    fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: selected.sku,
        personalise: {
          name: name,
          line2: fields.line2.value.trim(),
          line3: fields.line3.value.trim(),
        },
      }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.url) throw new Error(res.d.error || 'Checkout failed');
        window.location.href = res.d.url;
      })
      .catch(function (e) {
        buyBtn.disabled = false;
        buyBtn.textContent = original;
        errEl.textContent = e.message || 'Sorry. Checkout hiccuped. Please try again.';
      });
  }

  // --- wiring ---------------------------------------------------------------
  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener('input', function () {
      counts[key].textContent = fields[key].value.length + '/' + LIMITS[key];
      draw();
    });
    counts[key].textContent = '0/' + LIMITS[key];
  });
  search.addEventListener('input', renderPicker);
  buyBtn.addEventListener('click', buy);

  draw();

  fetch('data/prints.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      prints = data.prints || [];
      sections = data.sections || [];
      renderFilters();
      renderPicker();
      // ?print=<sku> deep-links straight to a design (used by the product pages).
      var want = new URLSearchParams(location.search).get('print');
      var pre = want && prints.filter(function (p) { return p.sku === want && p.available; })[0];
      select(pre || prints.filter(function (p) { return p.available; })[0]);
    })
    .catch(function () {
      picker.innerHTML = '<p class="pz__empty">Couldn\'t load the designs. Please refresh.</p>';
    });

  // Re-draw once the web font is ready, otherwise the first paint uses a fallback
  // serif and the name jumps size when Cormorant arrives.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
})();
