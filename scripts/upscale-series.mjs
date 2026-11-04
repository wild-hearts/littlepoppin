// upscale-series.mjs. Upscale the photorealistic series masters with Real-ESRGAN on
// Replicate, so they can be sold at the same print sizes as the rest of the library.
//
// The originals are 1122 x 1402 px (140 DPI at 8x10). At the default 3x they become
// 3366 x 4208 px (~420 DPI at 8x10, 210 DPI at 16x20) and the product pages use the
// library's standard wording. Upscaled masters are written to SERIES_MASTERS (see
// print-series.mjs), one folder per series with the original filenames, and both the
// shop build and publish-prints.mjs prefer them over the originals when present.
//
//   node scripts/upscale-series.mjs            # every master not yet upscaled
//   node scripts/upscale-series.mjs --force    # redo them all
//   node scripts/upscale-series.mjs --scale 2  # a different factor
//
// Token: REPLICATE_API_TOKEN in the environment, else ~/.mmp-keys.env.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SERIES, SERIES_SRC, SERIES_MASTERS, pngSize } from './print-series.mjs';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const SCALE = Number(args[args.indexOf('--scale') + 1]) || 3;
const CONCURRENCY = 4;
const MODEL = 'nightmareai/real-esrgan';

function token() {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN;
  const p = path.join(os.homedir(), '.mmp-keys.env');
  if (fs.existsSync(p)) {
    const m = fs.readFileSync(p, 'utf8').match(/REPLICATE_API_TOKEN\s*=\s*"?([^"\n]+)/);
    if (m) return m[1].trim();
  }
  return null;
}
const TOKEN = token();
if (!TOKEN) { console.error('No REPLICATE_API_TOKEN (environment or ~/.mmp-keys.env).'); process.exit(1); }
const H = { Authorization: `Bearer ${TOKEN}` };

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${url} -> ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

async function latestVersion() {
  const m = await api(`https://api.replicate.com/v1/models/${MODEL}`);
  return m.latest_version.id;
}

async function uploadFile(file) {
  const form = new FormData();
  form.append('content', new Blob([fs.readFileSync(file)], { type: 'image/png' }), path.basename(file));
  const f = await api('https://api.replicate.com/v1/files', { method: 'POST', body: form });
  return f.urls.get;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upscaleOne(version, src, out) {
  const image = await uploadFile(src);
  let p = await api('https://api.replicate.com/v1/predictions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, input: { image, scale: SCALE, face_enhance: false } }),
  });
  const started = Date.now();
  while (!['succeeded', 'failed', 'canceled'].includes(p.status)) {
    if (Date.now() - started > 10 * 60 * 1000) throw new Error('timed out');
    await sleep(3000);
    p = await api(p.urls.get);
  }
  if (p.status !== 'succeeded') throw new Error(`${p.status}: ${p.error || ''}`);
  const r = await fetch(p.output);
  if (!r.ok) throw new Error(`output fetch ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`output is not a PNG (${r.headers.get('content-type')})`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  return { secs: p.metrics?.predict_time, bytes: buf.length };
}

const jobs = [];
for (const s of SERIES) {
  const dir = path.join(SERIES_SRC, s.dir);
  if (!fs.existsSync(dir)) { console.warn(`! missing ${dir}`); continue; }
  for (const f of fs.readdirSync(dir).filter((n) => /\.png$/i.test(n)).sort()) {
    const src = path.join(dir, f);
    const out = path.join(SERIES_MASTERS, s.dir, f);
    if (!FORCE && fs.existsSync(out)) {
      const [w] = pngSize(out); const [sw] = pngSize(src);
      if (Math.abs(w - sw * SCALE) <= 2) continue;
    }
    jobs.push({ src, out, label: `${s.id}/${f}` });
  }
}
console.log(`${jobs.length} masters to upscale at ${SCALE}x via ${MODEL} -> ${SERIES_MASTERS}`);
if (!jobs.length) process.exit(0);

const version = await latestVersion();
let done = 0, failed = 0, totalSecs = 0;
const queue = jobs.slice();
async function worker() {
  while (queue.length) {
    const j = queue.shift();
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await upscaleOne(version, j.src, j.out);
        const [w, h] = pngSize(j.out);
        totalSecs += r.secs || 0; done++;
        console.log(`  ok  ${j.label}  ${w}x${h}  ${(r.bytes / 1e6).toFixed(1)} MB  ${(r.secs || 0).toFixed(0)}s  [${done}/${jobs.length}]`);
        break;
      } catch (e) {
        console.warn(`  retry ${attempt} ${j.label}: ${e.message}`);
        if (attempt === 3) { failed++; console.error(`  FAIL ${j.label}`); }
        else await sleep(5000 * attempt);
      }
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`\n${done} upscaled, ${failed} failed, ${totalSecs.toFixed(0)}s of GPU time.`);
process.exit(failed ? 1 : 0);
