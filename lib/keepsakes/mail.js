// lib/keepsakes/mail.js. The emails a card or an invitation sends. Server only, over Resend's HTTP API,
// the same way the shop sends order notices. Without a key nothing is sent and the text is logged, so
// nothing is lost in testing. Subjects stay generic: no guest names, no message text.
const from = () => process.env.ORDER_FROM_EMAIL || 'Little Poppin <onboarding@resend.dev>';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function send(to, subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!to) return { sent: false };
  if (!key) { console.log(`[keepsake email to ${to}: set RESEND_API_KEY]\n${subject}\n${text}`); return { sent: false, dev: true }; }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: from(), to: [to], subject, text }) });
  if (!r.ok) { console.error('Resend (keepsake) error:', r.status, await r.text()); return { sent: false }; }
  return { sent: true };
}

// The sender's copy of their card link, once it is paid for.
export function senderLinks({ to_name, link }) {
  return [
    `Your card for ${to_name} is paid for and ready to send.`, '',
    'This is the link to send them. Anyone with it can open the card, so send it only to them:', link, '',
    'Thank you for sending something lovely.', '', '. Little Poppin',
  ].join('\n');
}
// Sent the moment a card or an invitation is saved, if the maker gave an email: their private page is the
// only way back to it, and this is the one time the key is known in plain text.
export function savedCard({ to_name, mine }) {
  return [`Your card for ${to_name} is saved.`, '', 'Your private page, where you pay for it (if you haven’t yet) and find the link to send:', mine, '', 'Keep this email: the page is only reachable from this link.', '', '. Little Poppin'].join('\n');
}
export function savedEvent({ title, link, host }) {
  return [`Your invitation "${title}" is saved.`, '', 'Your private host page, where replies, the headcount and the guest list live. Keep it to yourself and bookmark it; it is the only way back in:', host, '', 'The link for your guests, once the invitation is paid for and live:', link, '', 'Have a wonderful party.', '', '. Little Poppin'].join('\n');
}
// A one-line notice to the shop, like every other order.
export async function notifyShop(kind, amount, session) {
  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!to) return;
  await send(to, `New order. ${kind === 'card' ? 'E-card' : 'Invitation'} ($${amount})`, `A ${kind === 'card' ? 'card' : 'party invitation'} was paid for: $${amount} AUD.\nBuyer: ${session.customer_details?.email || '(no email)'}\nStripe session: ${session.id}\n\nNothing to fulfil: it is delivered by link.`);
  await sleep(700);
}
