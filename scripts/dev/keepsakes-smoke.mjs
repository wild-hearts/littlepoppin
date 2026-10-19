// keepsakes-smoke.mjs. Exercises the cards-and-invitations API against a running dev server
// (scripts/dev/keepsakes-server.mjs, started without Stripe keys so records go live unpaid).
//   node scripts/dev/keepsakes-smoke.mjs http://localhost:3050
import { CARDS, INVITES } from '../../keepsakes/designs.js';

const BASE = (process.argv[2] || 'http://localhost:3050').replace(/\/$/, '');
let passed = 0; const failures = [];
const check = (what, ok, detail = '') => { if (ok) { passed++; console.log(`  ✓ ${what}`); } else { failures.push(what); console.log(`  ✗ ${what}${detail ? `\n      ${detail}` : ''}`); } };
const api = async (op, { method = 'GET', body, query = '', headers = {} } = {}) => {
  const r = await fetch(`${BASE}/api/keepsakes?op=${op}${query}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  let j = null; try { j = await r.clone().json(); } catch {}
  return { r, j, text: j ? '' : await r.text() };
};

console.log('\nCards');
let x = await api('create-card', { method: 'POST', body: { card: CARDS[0].slug, to_name: '', from_name: 'Nan', message: 'x' } });
check('a card without a recipient is refused with field errors', x.r.status === 422 && x.j?.errors?.to_name, JSON.stringify(x.j));
x = await api('create-card', { method: 'POST', body: { card: CARDS[0].slug, to_name: 'Willow', from_name: 'Nan', message: 'Happy birthday, little one.', website: 'spam' } });
check('the honeypot rejects bots', x.r.status === 400);
x = await api('create-card', { method: 'POST', body: { card: 'nope--nope', to_name: 'Willow', from_name: 'Nan', message: 'Hi' } });
check('an unknown card is refused', x.r.status === 422 && x.j?.errors?.card);
x = await api('create-card', { method: 'POST', body: { card: CARDS[3].slug, to_name: 'Willow', from_name: 'Nan', message: 'Happy birthday, little one.\nLove you to the moon.', font: 'pinyon', sender_email: 'nan@example.com' } });
check('a card is created and the sender gets a key', x.r.status === 200 && /^[a-km-z2-9]{24}$/.test(x.j?.sender_key || ''), JSON.stringify(x.j));
const senderKey = x.j.sender_key;
x = await api('sent', { query: `&key=${senderKey}` });
check('the sender page shows the card, live without Stripe, with the link', x.r.status === 200 && x.j.status === 'live' && /\/c\/[a-km-z2-9]{10}$/.test(x.j.link) && x.j.font === 'pinyon', JSON.stringify(x.j));
check('the sender page never carries the key hash or Stripe ids', !('sender_key_hash' in x.j) && !('stripe_session' in x.j));
const cardSlug = x.j.link.split('/c/')[1];
x = await api('card', { query: `&slug=${cardSlug}` });
check('the recipient gets the words and nothing else', x.r.status === 200 && x.j.status === 'live' && x.j.to_name === 'Willow' && x.j.message.includes('moon') && !('sender_email' in x.j) && !('id' in x.j), JSON.stringify(x.j));
x = await api('card', { query: '&slug=zzzzzzzzzz' });
check('a made-up card link is 404', x.r.status === 404);
x = await api('sent', { query: '&key=zzzzzzzzzzzzzzzzzzzzzzzz' });
check('a made-up sender key is 404', x.r.status === 404);

console.log('\nInvitations');
const d = INVITES.find((i) => i.occasion === 'kids-birthday');
x = await api('create-invite', { method: 'POST', body: { design: d.slug, title: '' } });
check('an invitation without a title or date is refused with field errors', x.r.status === 422 && x.j?.errors?.title && x.j?.errors?.date, JSON.stringify(x.j));
const ev = { design: d.slug, title: 'Tilly Turns Five', label: 'You’re invited', lede: 'Cake, games and one very excited birthday girl.', date: '2027-03-06', time: '14:00', tz: 'Australia/Melbourne', venue: 'Our place', address: '12 Example St, Fitzroy', host_name: 'Naomi', host_email: 'host@example.com', rsvp_by: '2027-02-27', dress: 'Fancy dress', note: 'Pick-up at four. Parents welcome to stay.', ask_dietary: true, allow_plus_ones: true, max_plus_ones: 2, question: 'Cake or cupcake?', question_choices: 'Cake\nCupcake' };
x = await api('create-invite', { method: 'POST', body: ev });
check('an invitation is created with a host key and a cookie', x.r.status === 200 && /^[a-km-z2-9]{24}$/.test(x.j?.host_key || '') && /lp_host_/.test(x.r.headers.get('set-cookie') || ''), JSON.stringify(x.j) + (x.r.headers.get('set-cookie') || ''));
const { id, slug, host_key } = x.j;
const cookie = `lp_host_${id}=${host_key}`;
x = await api('manage', { query: `&id=${id}` });
check('the host page needs the cookie', x.r.status === 403);
x = await api('manage', { query: `&id=${id}`, headers: { cookie } });
check('with the cookie the host sees the event and an empty guest list', x.r.status === 200 && x.j.event?.title === ev.title && Array.isArray(x.j.rsvps) && x.j.rsvps.length === 0 && !('host_key_hash' in x.j.event), JSON.stringify(x.j).slice(0, 300));
const hostRedirect = await fetch(`${BASE}/host/${host_key}`, { redirect: 'manual' });
check('the private host link sets the cookie and redirects to the host page', hostRedirect.status === 302 && hostRedirect.headers.get('location') === `/manage/${id}` && /lp_host_/.test(hostRedirect.headers.get('set-cookie') || ''), `${hostRedirect.status} ${hostRedirect.headers.get('location')}`);
const badHost = await fetch(`${BASE}/host/zzzzzzzzzzzzzzzzzzzzzzzz`, { redirect: 'manual' });
check('a wrong host link is a 404 page', badHost.status === 404);
x = await api('invite', { query: `&slug=${slug}` });
check('guests get the public fields only', x.r.status === 200 && x.j.status === 'live' && x.j.event.title === ev.title && x.j.event.question_choices.length === 2 && !('host_email' in x.j.event) && !('id' in x.j.event), JSON.stringify(x.j).slice(0, 300));
x = await api('rsvp', { method: 'POST', body: { slug, name: '', status: 'yes' } });
check('a reply without a name is refused', x.r.status === 422 && x.j.errors?.name);
x = await api('rsvp', { method: 'POST', body: { slug, name: 'The Smiths', status: 'yes', plus_ones: 5, dietary: 'No nuts', answer: 'Cupcake', message: 'Can’t wait!', email: 'smiths@example.com', updates: true } });
check('a reply is saved and the plus-ones are capped at the host’s limit', x.r.status === 200 && /^[a-km-z2-9]{16}$/.test(x.j.guest_key), JSON.stringify(x.j));
const guestKey = x.j.guest_key;
x = await api('rsvp', { method: 'POST', body: { slug, name: 'The Smiths', status: 'maybe', guest_key: guestKey, email: 'smiths@example.com', updates: true } });
check('sending again with the guest key updates the same reply', x.r.status === 200 && x.j.guest_key === guestKey);
x = await api('rsvp', { method: 'POST', body: { slug, name: 'The Browns', status: 'no', message: 'Sorry, away that weekend.' } });
check('a second guest replies', x.r.status === 200);
x = await api('manage', { query: `&id=${id}`, headers: { cookie } });
check('the host sees two replies, the first one updated, plus-ones capped at 2, no guest emails', x.r.status === 200 && x.j.rsvps.length === 2 && x.j.rsvps[0].status === 'maybe' && x.j.rsvps[0].plus_ones === 0 && x.j.rsvps[0].gets_updates === true && !('email' in x.j.rsvps[0]), JSON.stringify(x.j.rsvps));
x = await api('manage', { method: 'PATCH', query: `&id=${id}`, headers: { cookie }, body: { title: 'Tilly Turns Five (moved)', venue: 'The park', design: 'halloween--the-cauldron' } });
check('the host can edit the words, but not swap the design', x.r.status === 200 && x.j.event.title === 'Tilly Turns Five (moved)' && x.j.event.venue === 'The park' && x.j.event.design === d.slug, JSON.stringify(x.j).slice(0, 200));
x = await api('manage', { method: 'PATCH', query: `&id=${id}`, body: { title: 'Hacked' } });
check('editing without the cookie is refused', x.r.status === 403);
const csv = await fetch(`${BASE}/api/keepsakes?op=csv&id=${id}`, { headers: { cookie } });
const csvText = await csv.text();
check('the guest list downloads as CSV with both guests', csv.status === 200 && /text\/csv/.test(csv.headers.get('content-type')) && csvText.includes('The Smiths') && csvText.includes('The Browns') && csvText.includes('Cake or cupcake?'), csvText.slice(0, 200));
x = await api('invite', { query: '&slug=zzzzzzzzzz' });
check('a made-up invitation link is 404', x.r.status === 404);

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log(failures.map((f) => '  - ' + f).join('\n')); process.exit(1); }
