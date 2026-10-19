// keepsakes-server.mjs. A small local stand-in for Vercel: serves the static site and mounts the
// api/ functions with Vercel's request helpers (req.query, parsed req.body, res.status().json()),
// and applies the rewrites from vercel.json. For trying the cards and invitations without `vercel dev`.
//   node scripts/dev/keepsakes-server.mjs [port]
// Without BLOB_READ_WRITE_TOKEN records go to .data/keepsakes/; without STRIPE_SECRET_KEY cards and
// invitations go live unpaid (NODE_ENV must not be "production").
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = Number(process.argv[2] || process.env.PORT || 3050);
const rewrites = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8')).rewrites || [];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

function applyRewrites(pathname) {
  for (const r of rewrites) {
    const names = [];
    const re = new RegExp('^' + r.source.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
    const m = pathname.match(re);
    if (m) return r.destination.replace(/:(\w+)/g, (_, n) => m[names.indexOf(n) + 1]);
  }
  return pathname;
}
const handlers = new Map();
async function handlerFor(name) {
  if (!handlers.has(name)) handlers.set(name, import(pathToFileURL(path.join(REPO, 'api', `${name}.js`)).href).then((m) => m.default));
  return handlers.get(name);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = applyRewrites(url.pathname);
  const t = new URL(target, `http://${req.headers.host}`);
  for (const [k, v] of url.searchParams) if (!t.searchParams.has(k)) t.searchParams.set(k, v);
  if (t.pathname.startsWith('/api/')) {
    const name = t.pathname.slice(5).replace(/\/$/, '');
    if (!fs.existsSync(path.join(REPO, 'api', `${name}.js`))) { res.writeHead(404); return res.end('no such function'); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    req.headers['x-forwarded-proto'] ||= 'http';
    req.query = Object.fromEntries(t.searchParams);
    req.body = /json/.test(req.headers['content-type'] || '') ? (() => { try { return JSON.parse(raw.toString('utf8') || '{}'); } catch { return {}; } })() : raw.toString('utf8');
    res.status = (n) => { res.statusCode = n; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
    res.send = (b) => { res.end(b); return res; };
    res.redirect = (code, loc) => { if (typeof code === 'string') { loc = code; code = 302; } res.writeHead(code, { Location: loc }); res.end(); };
    try { await (await handlerFor(name))(req, res); }
    catch (e) { console.error(e); if (!res.headersSent) { res.writeHead(500); res.end('error'); } }
    return;
  }
  let file = path.join(REPO, decodeURIComponent(t.pathname));
  if (t.pathname.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
server.listen(PORT, () => console.log(`keepsakes dev server: http://localhost:${PORT}  (store: ${process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : '.data/keepsakes'}, stripe: ${process.env.STRIPE_SECRET_KEY ? 'on' : 'off, records go live unpaid'})`));
