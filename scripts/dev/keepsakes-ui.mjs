// keepsakes-ui.mjs. Drives the cards-and-invitations pages in a real Chromium at phone and desktop
// width, screenshots each one and fails on any console error. Needs a dev server
// (scripts/dev/keepsakes-server.mjs) and `npm i --no-save playwright-core`.
//   node scripts/dev/keepsakes-ui.mjs http://localhost:3050 [outdir]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { CARDS, INVITES } from '../../keepsakes/designs.js';

const BASE = (process.argv[2] || 'http://localhost:3050').replace(/\/$/, '');
const OUT = process.argv[3] || path.join(process.cwd(), '.data', 'ui-shots');
fs.mkdirSync(OUT, { recursive: true });
const exe = process.env.CHROME_PATH || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
let passed = 0; const failures = [], consoleErrors = [];
const check = (what, ok, detail = '') => { if (ok) { passed++; console.log(`  ✓ ${what}`); } else { failures.push(what); console.log(`  ✗ ${what}${detail ? `\n      ${detail}` : ''}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 820 : 900 }, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  const page = await ctx.newPage();
  // Blocked third parties (fonts, analytics) and the favicon are not this feature's errors.
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|favicon|404/.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  page.on('requestfailed', (r) => { if (!/fonts\.g|gtag|googletagmanager|favicon/.test(r.url())) consoleErrors.push(`${page.url()}: failed ${r.url()}`); });
  return page;
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });

for (const width of [390, 1280]) {
  const tag = width < 600 ? 'phone' : 'desktop';
  console.log(`\n${tag} (${width}px)`);
  const page = await newPage(width);

  // ------------------------------------------------ cards
  await page.goto(`${BASE}/cards.html`); await page.waitForLoadState('networkidle');
  check(`${tag}: the card wall shows every occasion`, (await page.locator('.wall-tile').count()) >= 15);
  await shot(page, `${tag}-cards`);
  await page.goto(`${BASE}/cards/birthday.html`); await page.waitForLoadState('networkidle');
  check(`${tag}: the birthday wall shows cards with a greeting on each`, (await page.locator('.cfront .cf-greet').count()) >= 20);
  await shot(page, `${tag}-cards-birthday`);
  const c = CARDS.find((x) => x.occasion === 'birthday');
  await page.goto(`${BASE}/card/${c.slug}.html`); await page.waitForSelector('#f');
  await page.fill('#c-to', 'Willow'); await page.fill('#c-from', 'Nan'); await page.fill('#c-msg', 'Happy birthday, little one. Love you to the moon and back.');
  await page.click('.chip[data-font="pinyon"]');
  await sleep(300);
  check(`${tag}: the editor preview shows the recipient and the message`, (await page.locator('.sp-inside .lab').textContent()).includes('Willow') && (await page.locator('.sp-inside .ci-msg').textContent()).includes('moon'));
  check(`${tag}: choosing a face changes the card's lettering`, (await page.locator('.sp-cover .cfront').getAttribute('data-font')) === 'pinyon');
  await shot(page, `${tag}-card-editor`);
  await page.click('#try'); await page.waitForSelector('.rt-envelope');
  await shot(page, `${tag}-card-try-sealed`);
  await page.click('.rt-envelope'); await sleep(3800);
  check(`${tag}: "open it as they will" ends on the reading view`, await page.locator('.rt-reading .sp-scene').isVisible());
  await shot(page, `${tag}-card-try-open`);
  await page.click('#back'); await page.waitForSelector('#pay');
  await Promise.all([page.waitForURL(/\/sent\//), page.click('#pay')]);
  await page.waitForSelector('[data-link]');
  const link = await page.locator('[data-link]').inputValue();
  check(`${tag}: paying (dev: free) lands on the sender page with a /c/ link`, /\/c\/[a-km-z2-9]{10}$/.test(link), link);
  await shot(page, `${tag}-card-sent`);
  await page.goto(link); await page.waitForSelector('.rt-envelope');
  check(`${tag}: the recipient sees the envelope addressed to them`, (await page.locator('.rt-address').textContent()).includes('Willow'));
  await shot(page, `${tag}-card-open-sealed`);
  await page.click('.rt-envelope'); await sleep(3800);
  check(`${tag}: breaking the seal shows the card with the message inside`, (await page.locator('.rt-reading .ci-msg').textContent()).includes('moon'));
  await shot(page, `${tag}-card-open`);
  await page.click('[data-act="expand"]'); await sleep(300);
  check(`${tag}: full view opens as a dialog`, (await page.locator('.sp-scene').getAttribute('role')) === 'dialog');
  await page.keyboard.press('Escape'); await sleep(200);
  check(`${tag}: Escape closes full view`, (await page.locator('.sp-scene').getAttribute('role')) === 'region');

  // ------------------------------------------------ invitations
  await page.goto(`${BASE}/invitations.html`); await page.waitForLoadState('networkidle');
  check(`${tag}: the invitation wall shows every occasion with an envelope`, (await page.locator('.wall-tile .env').count()) >= 10);
  await shot(page, `${tag}-invitations`);
  await page.goto(`${BASE}/invitations/kids-birthday.html`); await page.waitForLoadState('networkidle');
  check(`${tag}: the kids' birthday gallery shows designs`, (await page.locator('.thumb').count()) >= 20);
  await shot(page, `${tag}-invitations-kids-birthday`);
  const d = INVITES.find((x) => x.occasion === 'kids-birthday');
  await page.goto(`${BASE}/invitation/${d.slug}.html`); await page.waitForSelector('#f');
  await page.fill('#e-title', 'Tilly Turns Five'); await page.fill('#e-venue', 'Our place'); await page.fill('#e-addr', '12 Example St, Fitzroy'); await page.fill('#e-host', 'Naomi'); await page.fill('#e-dress', 'Fancy dress');
  await page.fill('#e-note', 'Pick-up at four.'); await page.check('input[name="allow_plus_ones"]'); await page.fill('#e-max', '2');
  await page.click('details.more summary'); await page.fill('#e-q', 'Cake or cupcake?'); await page.fill('#e-qc', 'Cake\nCupcake');
  await sleep(200);
  check(`${tag}: the invitation preview follows the form`, (await page.locator('#pc .ttl').textContent()).includes('Tilly') && (await page.locator('#pc .when').textContent()).includes('Our place') && (await page.locator('#pc .host').textContent()).includes('Naomi'));
  await shot(page, `${tag}-invite-editor`);
  await Promise.all([page.waitForURL(/\/manage\//), page.click('#go')]);
  await page.waitForSelector('[data-link]');
  const guestLink = await page.locator('[data-link]').first().inputValue();
  check(`${tag}: creating lands on the host page with the guest link and the private link`, /\/i\/[a-km-z2-9]{10}$/.test(guestLink) && (await page.locator('[data-link]').count()) === 2, guestLink);
  check(`${tag}: the host page shows the invitation preview`, (await page.locator('.ed-card .ttl').textContent()).includes('Tilly'));
  await shot(page, `${tag}-manage-new`);
  const manageUrl = page.url();

  // a guest, in a fresh browser
  const guest = await newPage(width);
  await guest.goto(guestLink); await guest.waitForSelector('.env');
  check(`${tag}: the guest sees the sealed envelope`, await guest.locator('.env-wrap').isVisible());
  await shot(guest, `${tag}-invite-sealed`);
  await guest.click('.env'); await sleep(1400);
  check(`${tag}: breaking the seal shows the card, countdown and reply form`, (await guest.locator('#opened .ttl').textContent()).includes('Tilly') && (await guest.locator('#cd b').count()) === 4 && (await guest.locator('.rsvp').isVisible()));
  await shot(guest, `${tag}-invite-open`);
  await guest.fill('#r-name', 'The Smiths'); await guest.click('.choice label:has-text("Yes")'); await sleep(150);
  await guest.fill('#r-plus', '2'); await guest.fill('#r-diet', 'No nuts'); await guest.click('.choice label:has-text("Cupcake")'); await guest.fill('#r-msg', 'Can’t wait!');
  await guest.click('.rsvp button.btn--primary'); await guest.waitForSelector('.rsvp.done');
  check(`${tag}: the reply is received`, (await guest.locator('.rsvp.done .big').textContent()).includes('Joyfully accepting, plus 2'));
  await shot(guest, `${tag}-invite-replied`);
  await guest.reload(); await guest.waitForSelector('.rsvp.done');
  check(`${tag}: coming back, the guest's reply is remembered and the envelope stays open`, await guest.locator('.rsvp.done').isVisible());
  await guest.context().close();

  // back to the host
  await page.goto(manageUrl.replace('?new=1', '')); await page.waitForSelector('table.guests');
  check(`${tag}: the host sees the reply with dietary needs and the answer`, (await page.locator('table.guests').textContent()).includes('The Smiths') && (await page.locator('table.guests').textContent()).includes('No nuts') && (await page.locator('table.guests').textContent()).includes('Cupcake'));
  check(`${tag}: the headcount counts the plus-twos`, (await page.locator('.cd b').first().textContent()) === '3');
  await shot(page, `${tag}-manage-replies`);
  await page.click('#edit'); await page.waitForSelector('#editor-slot #f');
  await page.fill('#editor-slot #e-title', 'Tilly Turns Five (moved)'); await page.click('#editor-slot #go');
  await sleep(800);
  check(`${tag}: editing the details updates the page`, (await page.locator('h1').first().textContent()).includes('moved'));
  await page.context().close();
}
await browser.close();
console.log(`\n${passed} passed, ${failures.length} failed, ${consoleErrors.length} console errors`);
if (consoleErrors.length) console.log(consoleErrors.map((e) => '  ! ' + e).join('\n'));
console.log(`screenshots: ${OUT}`);
if (failures.length || consoleErrors.length) process.exit(1);
