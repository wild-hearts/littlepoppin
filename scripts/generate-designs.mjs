// generate-designs.mjs — Little Poppin design generator via Replicate.
// Reads prompts from ../docs/COLLECTION-*.md, strips Midjourney params, runs a Replicate
// image model, downloads PNGs to ~/Downloads/LittlePoppin-Designs/. Skips images already made.
//
// Usage: node scripts/generate-designs.mjs <01|02|03|all> [limit]
// Token: ../.env.local  ->  REPLICATE_API_TOKEN=...   (git-ignored; never commit it)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(SCRIPT_DIR, '..');
const DOCS = path.join(REPO, 'docs');
const OUT_ROOT = path.join(os.homedir(), 'Downloads', 'LittlePoppin-Designs');
const MODEL = process.env.REPLICATE_MODEL || 'black-forest-labs/flux-1.1-pro-ultra';

function loadToken() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  const envPath = path.join(REPO, '.env.local');
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, 'utf8').match(/REPLICATE_API_TOKEN\s*=\s*(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function parseCollection(file, tag) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out = [];
  let name = null, inBlock = false, buf = [];
  for (const line of lines) {
    if (line.startsWith('### ')) { name = line.slice(4).trim(); continue; }
    if (line.trim() === '```') {
      if (!inBlock) { inBlock = true; buf = []; }
      else {
        inBlock = false;
        const raw = buf.join(' ').trim();
        if (name && raw) {
          const arM = raw.match(/--ar\s+([0-9]+:[0-9]+)/);
          const aspect = arM ? arM[1] : '4:5';
          const prompt = raw.replace(/--\S+(\s+\S+)?/g, '').replace(/\s+/g, ' ').trim();
          const num = ((name.match(/^(\d+)/) || [])[1] || String(out.length + 1)).padStart(2, '0');
          const title = name.replace(/^\d+\.\s*/, '').split('—')[0].trim();
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          out.push({ tag, num, name: title, slug, prompt, aspect });
        }
      }
      continue;
    }
    if (inBlock) buf.push(line);
  }
  return out;
}

async function generate(token, d, outFile) {
  const body = { input: { prompt: d.prompt, aspect_ratio: d.aspect, output_format: 'png', safety_tolerance: 2, raw: false } };
  let res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify(body),
  });
  let pred = await res.json();
  if (!res.ok) throw new Error(`API ${res.status}: ${JSON.stringify(pred).slice(0, 200)}`);
  while (pred.status && !['succeeded', 'failed', 'canceled'].includes(pred.status)) {
    await new Promise(r => setTimeout(r, 2000));
    pred = await (await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } })).json();
  }
  if (pred.status !== 'succeeded') throw new Error(`status=${pred.status} ${pred.error || ''}`);
  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(outFile, buf);
}

async function main() {
  const which = process.argv[2] || 'all';
  const limit = process.argv[3] ? parseInt(process.argv[3], 10) : Infinity;
  const token = loadToken();
  if (!token) { console.error('NO TOKEN: put REPLICATE_API_TOKEN=... in ' + path.join(REPO, '.env.local')); process.exit(1); }

  let files = fs.readdirSync(DOCS).filter(f => /^COLLECTION-\d+.*\.md$/.test(f)).sort();
  if (which !== 'all') files = files.filter(f => f.startsWith(`COLLECTION-${which}`));

  let designs = [];
  for (const f of files) {
    const tag = (f.match(/^COLLECTION-(\d+)/) || [])[1] || '00';
    designs.push(...parseCollection(path.join(DOCS, f), tag));
  }
  designs = designs.slice(0, limit);

  console.log(`Model: ${MODEL}\nQueued ${designs.length} design(s) across collections ${[...new Set(designs.map(d => d.tag))].join(', ')}\n`);
  let made = 0, skipped = 0, failed = 0;
  for (const d of designs) {
    const outDir = path.join(OUT_ROOT, `collection-${d.tag}`);
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${d.num}-${d.slug}.png`);
    if (fs.existsSync(outFile)) { console.log(`  • [${d.tag}] ${d.num} ${d.name} — skip (exists)`); skipped++; continue; }
    process.stdout.write(`  … [${d.tag}] ${d.num} ${d.name} `);
    try { await generate(token, d, outFile); console.log('✓'); made++; }
    catch (e) { console.log('✗ ' + e.message); failed++; }
  }
  console.log(`\nDone. made=${made} skipped=${skipped} failed=${failed} → ${OUT_ROOT.replace(os.homedir(), '~')}`);
}

main();
