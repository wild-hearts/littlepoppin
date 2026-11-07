// keepsakes-pages.mjs. Every page of the cards-and-invitations feature, generated so they all share
// one head, one nav and one footer with the rest of the shop, and so every gallery tile is a real link
// a crawler can follow. Called by build-keepsakes.mjs; the catalogue it reads is keepsakes/designs.js.
import fs from 'node:fs';
import path from 'node:path';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FONTS = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Serif+Display&family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Italiana&family=Lato:wght@300;400;700&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Syne:wght@400..800&display=swap';

// `up` is the relative prefix back to the site root ('' at the root, '../' one level down). Pages reached
// by a rewrite (/c/<slug>, /i/<slug>, /manage/<id>, /sent/<key>) sit at the root but are served one
// level down, so they use absolute paths.
const head = ({ title, description, canonical, image, jsonLd = [], up, noindex = false, extraCss = '' }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  ${noindex ? '<meta name="robots" content="noindex, nofollow" />\n  <meta name="referrer" content="no-referrer" />' : `<link rel="canonical" href="${canonical}" />`}
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Little Poppin" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  ${canonical ? `<meta property="og:url" content="${canonical}" />` : ''}
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${image}" />
${jsonLd.map((j) => `  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
  <link rel="stylesheet" href="${up}styles.css" />
  <link rel="stylesheet" href="${up}keepsakes/keepsakes.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONTS}" rel="stylesheet" />
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-TD4975MVCS"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-TD4975MVCS');
  </script>${extraCss ? `\n  <style>${extraCss}</style>` : ''}
</head>
<body>`;


// Cross-link to Tadavite (tadavite.com), the family-wide home of the same cards and invitations,
// with the party planner, wish lists and advent calendars that Little Poppin does not carry.
const TADAVITE = { cards: 'https://tadavite.com/cards', invitations: 'https://tadavite.com/invitations' };
const tadaviteLine = (kind) => `      <p class="kp-tadavite" style="margin-top:10px;font-size:15px;color:var(--ink-soft,#6b5f55)">Also on Tadavite: ${kind === 'cards'
  ? 'cards for everyone else in the family, plus wish lists and advent calendars'
  : 'invitations for the whole family, with a party planner, wish lists and advent calendars'}. <a href="${TADAVITE[kind]}" rel="noopener" style="color:var(--red);border-bottom:1px solid currentColor">Visit Tadavite →</a></p>`;

// Tadavite's Christmas advent calendars for children, advertised on the galleries (and, by hand, on index.html:
// keep the two copies the same). Prices as on tadavite.com/advent/for-kids, 8 Nov 2026.
const UTM = 'utm_source=littlepoppin&utm_medium=site&utm_campaign=advent';
export const adventBand = (up) => `  <section class="xmas-band" aria-labelledby="xmas-h">
    <div class="container">
      <div class="section-label">Christmas, from our big sister Tadavite</div>
      <h2 id="xmas-h">A door a day until Christmas</h2>
      <p class="xmas-band__intro">Digital advent calendars for children and the whole family. A new door opens every morning in December on a phone or tablet. Nothing to hide on a shelf, nothing the dog can eat at six in the morning.</p>
      <div class="xmas-band__grid">
        <a class="xmas-card xmas-card--elf" href="https://tadavite.com/advent/unhinged-elf?${UTM}" rel="noopener">
          <span class="xmas-card__img"><img src="${up}images/tadavite/elf-door-01.webp" alt="Door 1 of The Unhinged Elf: a small elf in a red velvet coat, mid-mischief" loading="lazy" width="960" height="536"></span>
          <span class="xmas-card__body">
            <span class="xmas-card__tag">Ages 4 to 10 · door 1 is free to try</span>
            <span class="xmas-card__title">The Unhinged Elf</span>
            <span class="xmas-card__text">An elf has moved in, and he is trouble. Every morning he tells you what he has been up to, on video, then there is a little game, a hidden surprise and the day's badge. By Christmas Eve he has been sued by Rudolph and fired by Santa, and he needs your help.</span>
            <span class="xmas-card__price">$19 for the whole household</span>
            <span class="xmas-card__go">Meet the elf →</span>
          </span>
        </a>
        <a class="xmas-card" href="https://tadavite.com/advent/for-kids?${UTM}" rel="noopener">
          <span class="xmas-card__img"><img src="${up}images/tadavite/family-door-01.webp" alt="A family at a Christmas table opening the first door of a Tadavite advent calendar" loading="lazy" width="640" height="366"></span>
          <span class="xmas-card__body">
            <span class="xmas-card__tag">For children and families</span>
            <span class="xmas-card__title">More calendars for kids</span>
            <span class="xmas-card__text"><b>Winter Wonderland</b>, a five-minute bedtime chapter each morning with their own name in it. <b>The Great Christmas Family Challenge</b>, quizzes, puzzles and a scavenger dash for the whole table. <b>Christmas Around the World</b>, a country, a carol and a recipe a day.</span>
            <span class="xmas-card__price">From $15</span>
            <span class="xmas-card__go">See the calendars →</span>
          </span>
        </a>
      </div>
    </div>
  </section>`;

const nav = (up) => `
  <nav class="nav nav--scrolled" id="nav">
    <div class="nav__inner">
      <a href="${up}index.html" class="nav__logo"><img src="${up}images/logo.png" alt="Little Poppin" /></a>
      <button class="nav__toggle" aria-label="Toggle menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav__links">
        <li><a href="${up}prints.html">Art Prints</a></li>
        <li><a href="${up}personalise.html">Personalise</a></li>
        <li><a href="${up}cards.html">Cards &amp; Invites</a></li>
        <li><a href="${up}printclub.html">Print Club</a></li>
        <li><a href="${up}printables.html">Printables</a></li>
        <li><a href="${up}guides.html">Guides</a></li>
        <li><a href="${up}custom.html">Made for You</a></li>
        <li><a href="${up}index.html#contact">Contact</a></li>
      </ul>
    </div>
  </nav>
`;
const footer = (up) => `
  <footer class="footer">
    <div class="container">
      <div class="footer__bottom">
        <nav class="footer__legal" aria-label="Legal">
          <a href="${up}shipping.html">Shipping</a>
          <a href="${up}refunds.html">Refunds &amp; Returns</a>
          <a href="${up}privacy.html">Privacy</a>
          <a href="${up}terms.html">Terms</a>
        </nav>
        <p>&copy; 2025 Little Poppin. All rights reserved.</p>
      </div>
    </div>
  </footer>
  <script src="${up}store.js" defer></script>`;

const faq = (items) => `
  <section class="prints-faq">
    <div class="container container--narrow">
      <h2 class="prints-section__title">Questions</h2>
      <div class="faq">${items.map(([q, a]) => `
        <details><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}
      </div>
    </div>
  </section>`;
const faqLd = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
const crumbs = (list) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })) });

export async function buildPages({ REPO, SITE }) {
  const D = await import('../keepsakes/designs.js');
  const R = await import('../keepsakes/render.js');
  const { CARD_OCCASIONS, cardsFor, CARDS, card, INVITE_OCCASIONS, invitesFor, INVITES, money, CARD_PRICE, INVITE_PRICE } = D;
  const write = (rel, html) => { const f = path.join(REPO, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
  const img = (p) => `${SITE}${p}`;
  const cardPrice = money(CARD_PRICE), invPrice = money(INVITE_PRICE);
  const written = [];

  // ---------------------------------------------------------------- cards: the one door
  const cardFaq = [
    ['How does an e-card arrive?', 'You get a private link to send by text, WhatsApp or email. It opens on their phone as a wax-sealed envelope; they tap the seal, the flap lifts and the card opens with your words inside.'],
    ['What does it cost?', `${cardPrice} a card, paid securely with Stripe. No account, no subscription.`],
    ['Can I see it before I pay?', 'Yes. The editor shows the front and the inside as you type, and “Open it as they will” plays the whole envelope opening.'],
    ['Can I change the words after sending?', 'Not after it is paid for: the link they open is the card you wrote. Check the spelling in the preview first. If something is wrong, <a href="index.html#contact">contact us</a> and we will sort it out.'],
  ];
  {
    const occ = CARD_OCCASIONS.map((o) => ({ o, cs: cardsFor(o.slug) })).filter((x) => x.cs.length);
    const ranked = [...occ].sort((a, b) => b.cs.length - a.cs.length).slice(0, Math.max(1, Math.round(occ.length / 8)));
    const big = new Set(ranked.map((x) => x.o.slug));
    // The season leads (the site is rebuilt on every deploy, so this follows the calendar), then the big tiles,
    // so the wall opens with what people are sending now instead of ending on an orphan.
    const month = new Date().getMonth() + 1;
    const SEASON = { christmas: [10, 11, 12], 'first-christmas': [10, 11, 12], halloween: [9, 10], 'mothers-day': [4, 5], 'fathers-day': [8, 9], 'first-day-of-school': [1, 2] };
    const inSeason = (slug) => (SEASON[slug] || []).includes(month);
    occ.sort((a, b) => Number(inSeason(b.o.slug)) - Number(inSeason(a.o.slug)) || Number(big.has(b.o.slug)) - Number(big.has(a.o.slug)));
    // Each occasion tile is a small stack of its cards: the first on top, two more peeking out behind it. On hover
    // the stack fans; left alone, the cards shuffle to the front one by one (keepsakes/render.js shuffle()).
    const stackOf = (cs, i) => `<span class="wall-stack" data-n="${Math.min(3, cs.length)}">${cs.slice(0, 3).reverse().map((c, k) => R.cardFront(c, { priority: i < 3 && k === 2 })).join('')}</span>`;
    const tiles = occ.map(({ o, cs }, i) => R.occasionTile(o.name, `${cs.length} ${cs.length === 1 ? 'card' : 'cards'}`, `cards/${o.slug}.html`, stackOf(cs, i), { feature: big.has(o.slug), priority: i < 3 }).replace('class="wall-cover"', 'class="wall-cover wall-cover--stack"')).join('\n');
    // A hand of five cards under the hero, one from each of the first five occasions, and a rail of every occasion.
    const fan = occ.slice(0, 5).map(({ cs }, i) => `<span class="kp-fan__card" style="--i:${i}">${R.cardFront(cs[Math.min(1, cs.length - 1)], { priority: true })}</span>`).join('');
    const chips = occ.map(({ o, cs }) => `<a href="cards/${o.slug}.html">${esc(o.name)} <small>${cs.length}</small></a>`).join('');
    write('cards.html', `${head({ title: 'E-cards for Every Little Occasion | Little Poppin', description: `${CARDS.length} e-cards on Little Poppin’s nursery art, opened from a wax-sealed envelope on their phone. New baby, birthdays, Christmas, thank you and more, with your words inside. ${cardPrice} a card.`, canonical: `${SITE}/cards.html`, image: img(cardsFor('new-baby')[0].design.preview), up: '', jsonLd: [faqLd(cardFaq)] })}
${nav('')}
  <header class="kp-hero kp-hero--art" style="--hero-art:url('/images/banners/woodland-masquerade.jpg');--hero-art-sm:url('/images/banners/woodland-masquerade-sm.jpg')">
    <div class="container">
      <div class="section-label">E-cards</div>
      <h1>A card for <em>every little occasion.</em></h1>
      <p>${CARDS.length} cards on our own nursery art. Your words inside, a wax-sealed envelope outside, opened on their phone. ${cardPrice} a card.</p>
      <p style="margin-top:14px"><a href="invitations.html" style="color:var(--red);border-bottom:1px solid currentColor">Throwing a party? See the invitations →</a></p>
${tadaviteLine('cards')}
      <div class="kp-fan" aria-hidden="true">${fan}</div>
    </div>
  </header>
  <main class="kp-wrap kp">
    <nav class="kp-chips" aria-label="Card occasions">${chips}</nav>
    <div class="wall"><div class="wall-grid" data-sheen-root data-reveal data-shuffle>${tiles}</div></div>
  </main>
${adventBand('')}
${faq(cardFaq)}
${footer('')}
  <script type="module">import{sheen,reveal,shuffle}from"./keepsakes/render.js";const g=document.querySelector("[data-sheen-root]");sheen(g);reveal(g);shuffle(g);</script>
</body>
</html>`);
    written.push('cards.html');
    for (const { o, cs } of occ) {
      const tiles = cs.map((c, i) => R.cardTile(c, `../card/${c.slug}.html`, { feature: cs.length > 6 && i % 11 === 0, priority: i < 4 })).join('\n');
      write(`cards/${o.slug}.html`, `${head({ title: `${o.name} E-cards | Little Poppin`, description: `${cs.length} ${o.name.toLowerCase()} e-cards on Little Poppin’s nursery art, opened like a real envelope, with your message inside. ${cardPrice} a card.`, canonical: `${SITE}/cards/${o.slug}.html`, image: img(cs[0].design.preview), up: '../', jsonLd: [crumbs([['Home', `${SITE}/`], ['E-cards', `${SITE}/cards.html`], [o.name, `${SITE}/cards/${o.slug}.html`]])] })}
${nav('../')}
  <header class="kp-hero kp-hero--art" style="--hero-art:url('/images/banners/moonlit-garden-railway.jpg');--hero-art-sm:url('/images/banners/moonlit-garden-railway-sm.jpg')">
    <div class="container">
      <p class="crumb"><a href="../cards.html">E-cards</a>, ${esc(o.name)}</p>
      <h1>${esc(o.greeting)}</h1>
      <p>${cs.length} cards. Pick one, write your message, and we deliver it in a sealed envelope. ${cardPrice} a card.</p>
${tadaviteLine('cards')}
    </div>
  </header>
  <main class="kp-wrap kp"><div class="wall"><div class="wall-grid" data-sheen-root>${tiles}</div></div></main>
${footer('../')}
  <script type="module">import{sheen}from"../keepsakes/render.js";sheen(document.querySelector("[data-sheen-root]"));</script>
</body>
</html>`);
      written.push(`cards/${o.slug}.html`);
    }
    // the editor, one page per card
    for (const c of CARDS) {
      const o = D.cardOccasion(c.occasion);
      write(`card/${c.slug}.html`, `${head({ title: `${c.front}: ${c.name} e-card | Little Poppin`, description: `Send the ${c.name} ${o.name.toLowerCase()} e-card with your own message, opened like a real envelope on their phone. ${cardPrice}.`, canonical: `${SITE}/card/${c.slug}.html`, image: img(c.design.preview), up: '../', jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: `${c.name} ${o.name} e-card`, description: `${c.front}: a Little Poppin e-card on the ${c.name} print, with your message inside.`, image: img(c.design.preview), brand: { '@type': 'Brand', name: 'Little Poppin' }, offers: { '@type': 'Offer', price: (CARD_PRICE / 100).toFixed(2), priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: `${SITE}/card/${c.slug}.html` } }, crumbs([['Home', `${SITE}/`], ['E-cards', `${SITE}/cards.html`], [o.name, `${SITE}/cards/${o.slug}.html`], [c.name, `${SITE}/card/${c.slug}.html`]])] })}
${nav('../')}
  <header class="kp-hero" style="padding-bottom:0">
    <div class="container">
      <p class="crumb"><a href="../cards.html">E-cards</a> · <a href="../cards/${o.slug}.html">${esc(o.name)}</a> · ${esc(c.name)}</p>
      <h1>Write it <em>inside.</em></h1>
${tadaviteLine('cards')}
    </div>
  </header>
  <main class="kp-wrap kp" id="editor" data-card="${esc(c.slug)}"><p class="hint" style="padding:30px 0">Loading the card…</p></main>
${footer('../')}
  <script type="module" src="../keepsakes/pages/card-editor.js"></script>
</body>
</html>`);
      written.push(`card/${c.slug}.html`);
    }
  }

  // ---------------------------------------------------------------- invitations
  const invFaq = [
    ['How do guests reply?', 'They open your link on their phone, break the seal, read the card and tap Yes, No or Maybe. Replies land on your private host page with the headcount, dietary needs and any notes.'],
    ['What does it cost?', `${invPrice} for the event: unlimited guests, replies, the headcount and the guest list. Paid securely with Stripe. No account needed.`],
    ['Can I change the details after sending?', 'Yes. Your host page has Edit details; every guest sees the new version at the same link.'],
    ['Does it work for parents of small children?', 'That is who it is for. Add a pick-up time in the note, ask about allergies, and let families bring siblings with the plus-ones setting.'],
  ];
  {
    const occ = INVITE_OCCASIONS.map((o) => ({ o, ds: invitesFor(o.slug) })).filter((x) => x.ds.length);
    const tiles = occ.map(({ o, ds }, i) => R.occasionTile(o.name, `${ds.length} designs`, `invitations/${o.slug}.html`, R.backdrop(ds[0], { priority: i < 3 }) + `<span class="mini" aria-hidden="true" style="--tilt:${((i * 7) % 9 - 4) * 1.1}deg">${R.envelope(ds[0], ds[0].sample.title, { still: true })}</span>`, { feature: i === 0, priority: i < 3 })).join('\n');
    write('invitations.html', `${head({ title: 'Kids’ Party Invitations Online | Little Poppin', description: `${INVITES.length} online invitations on Little Poppin’s nursery art: kids’ birthdays, first birthdays, baby showers, christenings and more. A wax-sealed envelope, replies and a guest list. ${invPrice} an event.`, canonical: `${SITE}/invitations.html`, image: img(invitesFor('kids-birthday')[0].preview), up: '', jsonLd: [faqLd(invFaq)] })}
${nav('')}
  <header class="kp-hero kp-hero--art" style="--hero-art:url('/images/banners/midnight-carousel.jpg');--hero-art-sm:url('/images/banners/midnight-carousel-sm.jpg')">
    <div class="container">
      <div class="section-label">Online invitations</div>
      <h1>The party starts when they <em>break the seal.</em></h1>
      <p>${INVITES.length} designs on our own art. A wax-sealed envelope, your details, a countdown, and replies that land on your private host page. ${invPrice} an event, as many guests as you like.</p>
      <p style="margin-top:14px"><a href="cards.html" style="color:var(--red);border-bottom:1px solid currentColor">Just sending a card? See the e-cards →</a></p>
${tadaviteLine('invitations')}
    </div>
  </header>
  <main class="kp-wrap kp"><div class="wall"><div class="wall-grid" data-sheen-root>${tiles}</div></div></main>
${adventBand('')}
${faq(invFaq)}
${footer('')}
  <script type="module">import{sheen}from"./keepsakes/render.js";sheen(document.querySelector("[data-sheen-root]"));</script>
</body>
</html>`);
    written.push('invitations.html');
    for (const { o, ds } of occ) {
      const tiles = ds.map((d, i) => R.inviteThumb(d, `../invitation/${d.slug}.html`, o.name, { priority: i < 4 })).join('\n');
      write(`invitations/${o.slug}.html`, `${head({ title: `${o.plural} | Little Poppin`, description: `${ds.length} ${o.plural.toLowerCase()} on Little Poppin’s nursery art, opened from a wax-sealed envelope, with replies and a guest list. ${o.blurb}`, canonical: `${SITE}/invitations/${o.slug}.html`, image: img(ds[0].preview), up: '../', jsonLd: [crumbs([['Home', `${SITE}/`], ['Invitations', `${SITE}/invitations.html`], [o.name, `${SITE}/invitations/${o.slug}.html`]])] })}
${nav('../')}
  <header class="kp-hero kp-hero--art" style="--hero-art:url('/images/banners/treasure-island.jpg');--hero-art-sm:url('/images/banners/treasure-island-sm.jpg')">
    <div class="container">
      <p class="crumb"><a href="../invitations.html">Invitations</a>, ${esc(o.name)}</p>
      <h1>${esc(o.plural)}</h1>
      <p>${esc(o.blurb)} When to send: ${esc(o.send)}</p>
${tadaviteLine('invitations')}
    </div>
  </header>
  <main class="kp-wrap kp"><div class="thumb-grid">${tiles}</div></main>
${footer('../')}
</body>
</html>`);
      written.push(`invitations/${o.slug}.html`);
    }
    for (const d of INVITES) {
      const o = D.inviteOccasion(d.occasion);
      write(`invitation/${d.slug}.html`, `${head({ title: `${d.name} ${o.name} invitation | Little Poppin`, description: `Make a ${o.name.toLowerCase()} invitation on the ${d.name} print: a wax-sealed envelope, your details, a countdown and replies on your private host page. ${invPrice}.`, canonical: `${SITE}/invitation/${d.slug}.html`, image: img(d.preview), up: '../', jsonLd: [{ '@context': 'https://schema.org', '@type': 'Product', name: `${d.name} ${o.name} invitation`, description: `A Little Poppin online invitation on the ${d.name} print, with replies and a guest list.`, image: img(d.preview), brand: { '@type': 'Brand', name: 'Little Poppin' }, offers: { '@type': 'Offer', price: (INVITE_PRICE / 100).toFixed(2), priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: `${SITE}/invitation/${d.slug}.html` } }, crumbs([['Home', `${SITE}/`], ['Invitations', `${SITE}/invitations.html`], [o.name, `${SITE}/invitations/${o.slug}.html`], [d.name, `${SITE}/invitation/${d.slug}.html`]])] })}
${nav('../')}
  <header class="kp-hero" style="padding-bottom:0">
    <div class="container">
      <p class="crumb"><a href="../invitations.html">Invitations</a> · <a href="../invitations/${o.slug}.html">${esc(o.name)}</a> · ${esc(d.name)}</p>
      <h1>Make it <em>yours.</em></h1>
${tadaviteLine('invitations')}
    </div>
  </header>
  <main class="kp-wrap kp" id="editor" data-design="${esc(d.slug)}"><p class="hint" style="padding:30px 0">Loading the design…</p></main>
${footer('../')}
  <script type="module" src="../keepsakes/pages/invite-editor.js"></script>
</body>
</html>`);
      written.push(`invitation/${d.slug}.html`);
    }
  }

  // ---------------------------------------------------------------- the private and the sent-to pages
  // Served by rewrite one level down, so links are absolute. All noindex.
  const shell = (file, { title, description, main, script, chrome = true }) => {
    write(file, `${head({ title, description, canonical: '', image: img('/images/prints/05-sleepy-moon-and-stars.jpg'), up: '/', noindex: true })}
${chrome ? nav('/') : ''}
  ${main}
${chrome ? footer('/') : ''}
  <script type="module" src="/keepsakes/pages/${script}"></script>
</body>
</html>`);
    written.push(file);
  };
  shell('sent.html', { title: 'Your card | Little Poppin', description: 'Pay for your card and get the link to send.', main: '<main class="kp-wrap kp" id="sent" style="padding:120px 24px 70px"><p class="hint">Finding your card…</p></main>', script: 'card-sent.js' });
  shell('open.html', { title: 'A card for you | Little Poppin', description: 'Open the envelope to read it.', main: '<main class="copen kp" id="open" style="min-height:100svh"><p class="hint">Fetching your card…</p></main>', script: 'card-open.js', chrome: false });
  shell('manage.html', { title: 'Your invitation | Little Poppin', description: 'Replies, headcount and the guest list for your party.', main: '<main class="kp-wrap kp" id="manage" style="padding:120px 24px 70px"><p class="hint">Opening your host page…</p></main>', script: 'manage.js' });
  shell('invite.html', { title: 'You’re invited | Little Poppin', description: 'Open the envelope to see the details and reply.', main: '<main id="invite"><p class="plain">Opening your invitation…</p></main>', script: 'invite.js', chrome: false });

  const indexable = written.filter((f) => !['sent.html', 'open.html', 'manage.html', 'invite.html'].includes(f));
  fs.writeFileSync(path.join(REPO, 'data', 'keepsakes-urls.json'), JSON.stringify(indexable, null, 1));
  console.log(`keepsakes: ${written.length} pages written (${CARDS.length} card editors, ${INVITES.length} invitation editors)`);
  return written;
}
