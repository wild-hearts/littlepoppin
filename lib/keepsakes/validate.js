// lib/keepsakes/validate.js. What a sender, a host or a guest may save. Server only.
import { card, design, cleanLettering } from '../../keepsakes/designs.js';
import { validTz } from '../../keepsakes/time.js';

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^\d{2}:\d{2}$/;
// Up to six short answer choices, from a list or one per line. Empty means a free-text question.
function choices(v) {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\n|,/) : [];
  return [...new Set(list.map((x) => (typeof x === 'string' ? x.trim().slice(0, 40) : '')).filter(Boolean))].slice(0, 6);
}

// Returns { ok, value, errors } for an invitation create or update.
export function cleanEvent(body, { partial = false } = {}) {
  const errors = {};
  const v = {
    design: str(body.design, 80), title: str(body.title, 80), lede: str(body.lede, 240), label: str(body.label, 60),
    date: str(body.date, 10), time: str(body.time, 5), tz: str(body.tz, 60) || 'Australia/Sydney',
    venue: str(body.venue, 100), address: str(body.address, 200), host_name: str(body.host_name, 60),
    host_email: str(body.host_email, 120).toLowerCase(), rsvp_by: str(body.rsvp_by, 10),
    dress: str(body.dress, 100), note: str(body.note, 600),
    ask_dietary: body.ask_dietary !== false, allow_plus_ones: Boolean(body.allow_plus_ones),
    max_plus_ones: Math.max(1, Math.min(10, parseInt(body.max_plus_ones, 10) || 1)),
    question: str(body.question, 140), question_choices: choices(body.question_choices),
    surprise_for: str(body.surprise_for, 60), font: cleanLettering(body.font),
  };
  if (partial) for (const k of Object.keys(v)) if (body[k] === undefined) delete v[k];
  const need = (k, test, msg) => { if ((!partial || k in v) && !test(v[k])) errors[k] = msg; };
  need('design', (x) => design(x), 'Choose a design.');
  need('title', (x) => x.length > 0, 'Give the party a name.');
  need('date', (x) => DATE.test(x), 'Choose a date.');
  need('time', (x) => TIME.test(x), 'Choose a start time.');
  need('tz', (x) => validTz(x), 'That time zone isn’t recognised.');
  if (v.host_email && !EMAIL.test(v.host_email)) errors.host_email = 'That email doesn’t look right.';
  if (v.rsvp_by && !DATE.test(v.rsvp_by)) errors.rsvp_by = 'Choose a reply-by date.';
  if (v.question_choices?.length === 1) errors.question_choices = 'Give at least two choices, or none for a written answer.';
  return { ok: Object.keys(errors).length === 0, value: v, errors };
}

export function cleanRsvp(body, ev) {
  const errors = {};
  const v = {
    name: str(body.name, 80), status: ['yes', 'no', 'maybe'].includes(body.status) ? body.status : '',
    plus_ones: ev.allow_plus_ones ? Math.max(0, Math.min(ev.max_plus_ones || 1, parseInt(body.plus_ones, 10) || 0)) : 0,
    dietary: ev.ask_dietary ? str(body.dietary, 200) : '', message: str(body.message, 500),
    guest_key: str(body.guest_key, 32), email: str(body.email, 120).toLowerCase(), answer: '',
  };
  v.updates = Boolean(v.email) && body.updates === true;
  if (v.email && !EMAIL.test(v.email)) errors.email = 'That email doesn’t look right.';
  if (ev.question) {
    const a = str(body.answer, 300), cs = ev.question_choices || [];
    v.answer = cs.length ? (cs.includes(a) ? a : '') : a;
  }
  if (!v.name) errors.name = 'Add your name so the host knows who you are.';
  if (!v.status) errors.status = 'Choose whether you can come.';
  if (v.status !== 'yes') v.plus_ones = 0;
  return { ok: Object.keys(errors).length === 0, value: v, errors };
}

// An e-card from the sender's form.
export function cleanCard(body) {
  const errors = {};
  const v = {
    card: str(body.card, 120), to_name: str(body.to_name, 60), from_name: str(body.from_name, 60),
    message: str(body.message, 700), sender_email: str(body.sender_email, 120).toLowerCase(), font: cleanLettering(body.font),
  };
  if (!card(v.card)) errors.card = 'Choose a card.';
  if (!v.to_name) errors.to_name = 'Who is the card for?';
  if (!v.from_name) errors.from_name = 'Add your name so they know who it’s from.';
  if (!v.message) errors.message = 'Write a message for the inside.';
  if (v.sender_email && !EMAIL.test(v.sender_email)) errors.sender_email = 'That email doesn’t look right.';
  return { ok: Object.keys(errors).length === 0, value: v, errors };
}
