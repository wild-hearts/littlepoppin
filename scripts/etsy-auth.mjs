// etsy-auth.mjs — one-time OAuth so the publisher can create listings on Naomi's behalf.
//
// Etsy's API is OAuth 2.0 with PKCE. There is no way around the browser step: Etsy has to
// show Naomi what the app is asking for and have her approve it. This script does the rest —
// generates the challenge, opens the consent page, catches the redirect on localhost, swaps
// the code for tokens, and stores them.
//
//   node scripts/etsy-auth.mjs
//
// Needs ETSY_KEYSTRING in .env.local (the "keystring" from your registered app), and the app
// must have http://localhost:3003/callback listed as a redirect URI.
//
// Tokens go to dist/.etsy-tokens.json (gitignored). The access token lasts an hour; the
// refresh token lasts 90 days and the publisher renews automatically, so this is a one-off
// unless it sits unused for three months.
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = path.join(REPO, 'dist', '.etsy-tokens.json');
const REDIRECT = 'http://localhost:3003/callback';
const SCOPES = ['listings_r', 'listings_w', 'shops_r', 'shops_w'].join(' ');

const KEY = (() => {
  if (process.env.ETSY_KEYSTRING) return process.env.ETSY_KEYSTRING;
  const p = path.join(REPO, '.env.local');
  const m = fs.existsSync(p) && fs.readFileSync(p, 'utf8').match(/^ETSY_KEYSTRING=(.+)$/m);
  return m ? m[1].trim() : null;
})();
if (!KEY) {
  console.error('No ETSY_KEYSTRING in .env.local.');
  console.error('Register an app at https://www.etsy.com/developers/create then add:');
  console.error('  ETSY_KEYSTRING=<your keystring>');
  process.exit(1);
}

// PKCE: a random verifier, and its SHA-256 as the challenge. Etsy only ever sees the hash
// until the final exchange, so an intercepted redirect is not enough to steal the token.
const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const state = crypto.randomBytes(16).toString('base64url');

const authUrl = 'https://www.etsy.com/oauth/connect?' + new URLSearchParams({
  response_type: 'code',
  redirect_uri: REDIRECT,
  scope: SCOPES,
  client_id: KEY,
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
});

const code = await new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost:3003');
    if (url.pathname !== '/callback') { res.writeHead(404); return res.end(); }
    const err = url.searchParams.get('error');
    const got = url.searchParams.get('code');
    // Reject a mismatched state: it means the redirect did not come from the request we made.
    if (url.searchParams.get('state') !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h2>State mismatch — not the request we started. Nothing was saved.</h2>');
      server.close(); return reject(new Error('state mismatch'));
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(err
      ? `<h2>Etsy returned an error: ${err}</h2><p>You can close this tab.</p>`
      : '<h2>Connected. You can close this tab and go back to Claude.</h2>');
    server.close();
    err ? reject(new Error(err)) : resolve(got);
  });
  server.listen(3003, () => {
    console.log('Waiting for you to approve access in the browser...\n');
    console.log('If a browser did not open, paste this in yourself:\n');
    console.log('  ' + authUrl + '\n');
    execFile('open', [authUrl], () => {});
  });
  setTimeout(() => { server.close(); reject(new Error('timed out after 5 minutes')); }, 300000);
});

const r = await fetch('https://api.etsy.com/v3/public/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: KEY,
    redirect_uri: REDIRECT,
    code,
    code_verifier: verifier,
  }),
});
if (!r.ok) { console.error('Token exchange failed:', (await r.text()).slice(0, 300)); process.exit(1); }
const tok = await r.json();

fs.mkdirSync(path.dirname(TOKENS), { recursive: true });
fs.writeFileSync(TOKENS, JSON.stringify({ ...tok, obtained_at: Date.now() }, null, 2), { mode: 0o600 });
console.log('Connected. Tokens saved to dist/.etsy-tokens.json (gitignored, never printed).');
console.log('Next: node scripts/etsy-publish.mjs --dry');
