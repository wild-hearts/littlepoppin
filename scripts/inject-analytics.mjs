// inject-analytics.mjs. Stamp GA4 into every page as a post-build step.
//
// WHY A SEPARATE PASS: the shop pages are generated, but index.html, the swaddle pages and
// the legal pages are hand-written. Anything added only to the generators would silently
// miss a third of the site. Including the homepage, which is the page that matters most.
// This walks every .html and injects once, idempotently.
//
// GA4_ID is empty until Naomi creates a GA4 property. With no id, NOTHING is injected, // no dead script tag, no cookie banner obligation, no pretending we have data we do not.
//
// READ THIS BEFORE SETTING GA4_ID (noted 3 Sep 2026). GA4 id G-TD4975MVCS is ALREADY
// live on 128 pages, hand-added, without this script's marker and without its
// anonymize_ip / allow_google_signals: false settings. So:
//   - setting GA4_ID without the guard below would inject a SECOND snippet on all 128
//     pages and double-count every pageview from day one;
//   - clearing GA4_ID does NOT remove the hand-added tags, so "removing the id genuinely
//     removes tracking" is only true for snippets this script wrote.
// Both paths below now match on the id itself, not just the marker.
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
    if (!src.includes(MARK) && !/gtag\(\s*'config'/.test(src)) continue;
    let out = src.replace(/\n?\s*<!-- analytics -->[\s\S]*?<!-- \/analytics -->/g, '');
    // Hand-added snippets carry no marker. Strip those too, or clearing the id leaves
    // tracking running while the config claims there is none.
    out = out.replace(/\n?\s*<script[^>]*googletagmanager\.com\/gtag\/js[^>]*><\/script>/g, '')
             .replace(/\n?\s*<script>\s*window\.dataLayer[\s\S]*?gtag\(\s*'config'[\s\S]*?<\/script>/g, '');
    if (out === src) continue;
    fs.writeFileSync(f, out);
    cleaned++;
  }
  console.log(`analytics: GA4_ID not set. No tracking injected${cleaned ? `, removed from ${cleaned} pages` : ''}`);
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
  // Match on the ID, not only the marker: a hand-added snippet has no marker, and
  // injecting alongside it double-counts every pageview.
  if (src.includes(MARK) || src.includes(`gtag('config', '${GA4_ID}'`) || src.includes(`id=${GA4_ID}`)) { skipped++; continue; }
  if (!src.includes('</head>')) { skipped++; continue; }
  src = src.replace('</head>', `${snippet}\n</head>`);
  fs.writeFileSync(f, src);
  done++;
}
console.log(`analytics: injected into ${done} pages (${skipped} already had it or had no <head>)`);
