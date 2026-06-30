// upload-to-blob.mjs — upload chosen high-res prints to Vercel Blob (private CDN).
// Prints the resulting URLs to paste as `file` into lib/products.js DIGITAL_PRODUCTS.
//
// Setup: enable Blob in Vercel (Storage → Create → Blob), then put its token in
//   littlepoppin/.env.local  ->  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
// Install dep once:  npm i @vercel/blob
//
// Usage: node scripts/upload-to-blob.mjs <file.png> [more.png ...]
//   e.g. node scripts/upload-to-blob.mjs ~/Downloads/LittlePoppin-Designs/collection-04/21-moon-goddess.png

import { put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function token() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const p = path.join(REPO, '.env.local');
  if (fs.existsSync(p)) {
    const m = fs.readFileSync(p, 'utf8').match(/BLOB_READ_WRITE_TOKEN\s*=\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const files = process.argv.slice(2);
if (!files.length) { console.error('Usage: node scripts/upload-to-blob.mjs <file.png> ...'); process.exit(1); }
const tok = token();
if (!tok) { console.error('Set BLOB_READ_WRITE_TOKEN in .env.local (Vercel → Storage → Blob)'); process.exit(1); }

console.log('Uploading to Vercel Blob...\n');
for (const f of files) {
  try {
    const data = fs.readFileSync(f);
    const key = 'prints/' + path.basename(f);
    const blob = await put(key, data, {
      access: 'public',          // URL carries an unguessable random suffix
      token: tok,
      addRandomSuffix: true,
      contentType: 'image/png',
    });
    console.log(`${path.basename(f)}\n  file: ${blob.url}\n`);
  } catch (e) {
    console.error(`${path.basename(f)} — ✗ ${e.message}\n`);
  }
}
console.log('Paste each "file" URL into lib/products.js → DIGITAL_PRODUCTS.');
