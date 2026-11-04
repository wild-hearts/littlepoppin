// publish-prints.mjs. ONE-COMMAND launch for the digital prints shop.
// Uploads every print's high-res original to Vercel Blob and writes the resulting
// `file` URLs into lib/digital-products.generated.js. Flipping the shop from
// "blocked" to "sellable". Run this AFTER enabling Vercel Blob.
//
// Setup once: Vercel → Storage → Create → Blob → connect, then put the token in
//   littlepoppin/.env.local  ->  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
// Run:  node scripts/publish-prints.mjs
// Then: git commit + push, and add an "Art Prints" link to the homepage nav.

import { put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { findSeriesOriginal } from './print-series.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(os.homedir(), 'Downloads', 'LittlePoppin-Designs');
const COLLS = ['collection-01', 'collection-02', 'collection-03', 'collection-05', 'collection-06', 'collection-07', 'collection-08', 'collection-09', 'collection-10'];
const GEN = path.join(REPO, 'lib', 'digital-products.generated.js');

function token() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const p = path.join(REPO, '.env.local');
  if (fs.existsSync(p)) {
    const m = fs.readFileSync(p, 'utf8').match(/BLOB_READ_WRITE_TOKEN\s*=\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}
function findSource(base, sku) {
  for (const c of COLLS) { const f = path.join(SRC, c, base + '.png'); if (fs.existsSync(f)) return f; }
  // The photorealistic series live outside ~/Downloads/LittlePoppin-Designs.
  return findSeriesOriginal(sku);
}

const tok = token();
if (!tok) { console.error('Set BLOB_READ_WRITE_TOKEN in .env.local (Vercel → Storage → Blob).'); process.exit(1); }

let gen = fs.readFileSync(GEN, 'utf8');
const matches = [...gen.matchAll(/'(?<sku>[^']+)':\s*\{[^}]*preview:\s*'(?<preview>[^']+)'[^}]*file:\s*(?<file>null|'[^']*')/g)]
  .filter((m) => m.groups.file === 'null'); // skip already-published entries
console.log(`Publishing ${matches.length} prints to Vercel Blob...\n`);

let done = 0, missing = 0;
for (const mm of matches) {
  const { sku, preview } = mm.groups;
  const base = path.basename(preview).replace(/\.jpg$/, '');
  const src = findSource(base, sku);
  if (!src) { console.log(`  ✗ ${sku}, original not found (${base}.png)`); missing++; continue; }
  try {
    // Series skus carry their series in the pathname so two series can share a slug.
    const blobName = sku.startsWith('print-') && !/^print-\d/.test(sku) && preview.split('/').length > 3
      ? preview.split('/').slice(-2).join('-').replace(/\.jpg$/, '') : base;
    const blob = await put('prints/' + blobName + '.png', fs.readFileSync(src), {
      access: 'private', token: tok, addRandomSuffix: true, contentType: 'image/png',
    });
    // Store the PATHNAME (not URL): the store is private, so /api/download mints a
    // short-lived presigned URL from this pathname at delivery time.
    gen = gen.replace(new RegExp(`('${sku}':\\s*\\{[^}]*?file:\\s*)null`), `$1'${blob.pathname}'`);
    done++; process.stdout.write('.');
  } catch (e) { console.log(`\n  ✗ ${sku}, ${e.message}`); }
}
fs.writeFileSync(GEN, gen);
console.log(`\n\nDone. ${done} uploaded & wired${missing ? `, ${missing} missing` : ''}.`);
console.log('Next: git add -A && commit && push, then add an "Art Prints" link to index.html nav.');
