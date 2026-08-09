// inject-analytics.mjs — stamp GA4 into every page as a post-build step.
//
// WHY A SEPARATE PASS: the shop pages are generated, but index.html, the swaddle pages and
// the legal pages are hand-written. Anything added only to the generators would silently
// miss a third of the site — including the homepage, which is the page that matters most.
// This walks every .html and injects once, idempotently.
//
// GA4_ID is empty until Naomi creates a GA4 property. With no id, NOTHING is injected —
// no dead script tag, no cookie banner obligation, no pretending we have data we do not.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GA4_ID } from './site-config.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARK = 'data-lp-analytics';

const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'etsy-stage', '.vercel'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.html')) pages.push(full);
  }
})(REPO);

if (!GA4_ID) {
  // Strip any previously-injected snippet, so removing the id genuinely removes tracking.
  let cleaned = 0;
  for (const f of pages) {
    const src = fs.readFileSync(f, 'utf8');
    if (!src.includes(MARK)) continue;
    fs.writeFileSync(f, src.replace(/\n?\s*<!-- analytics -->[\s\S]*?<!-- \/analytics -->/g, ''));
    cleaned++;
  }
  console.log(`analytics: GA4_ID not set — no tracking injected${cleaned ? `, removed from ${cleaned} pages` : ''}`);
  process.exit(0);
}

const snippet = `
  <!-- analytics -->
  <script ${MARK} async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
  <script ${MARK}>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    // anonymize_ip and no ad signals: this is a shop, not an ad network, and it keeps the
    // privacy policy honest for EU/UK visitors.
    gtag('config', '${GA4_ID}', { anonymize_ip: true, allow_google_signals: false });
  </script>
  <!-- /analytics -->`;

let done = 0, skipped = 0;
for (const f of pages) {
  let src = fs.readFileSync(f, 'utf8');
  if (src.includes(MARK)) { skipped++; continue; }
  if (!src.includes('</head>')) { skipped++; continue; }
  src = src.replace('</head>', `${snippet}\n</head>`);
  fs.writeFileSync(f, src);
  done++;
}
console.log(`analytics: injected into ${done} pages (${skipped} already had it or had no <head>)`);
