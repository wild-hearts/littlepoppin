// publish-prints.mjs — ONE-COMMAND launch for the digital prints shop.
// Uploads every print's high-res original to Vercel Blob and writes the resulting
// `file` URLs into lib/digital-products.generated.js — flipping the shop from
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

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(os.homedir(), 'Downloads', 'LittlePoppin-Designs');
const COLLS = ['collection-01', 'collection-02', 'collection-03', 'collection-05', 'collection-06'];
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
function findSource(base) {
  for (const c of COLLS) { const f = path.join(SRC, c, base + '.png'); if (fs.existsSync(f)) return f; }
  return null;
}

const tok = token();
if (!tok) { console.error('Set BLOB_READ_WRITE_TOKEN in .env.local (Vercel → Storage → Blob).'); process.exit(1); }

let gen = fs.readFileSync(GEN, 'utf8');
const matches = [...gen.matchAll(/'(?<sku>[^']+)':\s*\{[^}]*preview:\s*'(?<preview>[^']+)'[^}]*\}/g)];
console.log(`Publishing ${matches.length} prints to Vercel Blob...\n`);

let done = 0, missing = 0;
for (const mm of matches) {
  const { sku, preview } = mm.groups;
  const base = path.basename(preview).replace(/\.jpg$/, '');
  const src = findSource(base);
  if (!src) { console.log(`  ✗ ${sku} — original not found (${base}.png)`); missing++; continue; }
  try {
    const blob = await put('prints/' + base + '.png', fs.readFileSync(src), {
      access: 'public', token: tok, addRandomSuffix: true, contentType: 'image/png',
    });
    gen = gen.replace(new RegExp(`('${sku}':\\s*\\{[^}]*?file:\\s*)null`), `$1'${blob.url}'`);
    done++; process.stdout.write('.');
  } catch (e) { console.log(`\n  ✗ ${sku} — ${e.message}`); }
}
fs.writeFileSync(GEN, gen);
console.log(`\n\nDone — ${done} uploaded & wired${missing ? `, ${missing} missing` : ''}.`);
console.log('Next: git add -A && commit && push, then add an "Art Prints" link to index.html nav.');
