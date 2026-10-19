// lib/keepsakes/pay.js. Stripe Checkout for a card or an invitation, and what happens once it is paid.
// Server only. Sessions are tagged brand=little_poppin like every shop order, so the shared Wild Hearts
// webhook knows whose they are, and type=card|invitation so the shop webhook hands them here.
import Stripe from 'stripe';
import { CARD_PRICE, INVITE_PRICE } from '../../keepsakes/designs.js';
import { cardById, markCardPaid, setCardPaid, eventById, markEventPaid, setEventPaid, isLive } from './store.js';
import { send, senderLinks, notifyShop } from './mail.js';

export const BRAND = 'little_poppin';
export const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);
// Without Stripe keys in development the card goes live unpaid so the flow can be tried end to end.
// Production never does: without a key the API answers 503.
export const devUnpaid = !stripeReady && process.env.NODE_ENV !== 'production';
const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCardCheckout(c, origin, { toName, title }) {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'aud', unit_amount: CARD_PRICE, product_data: {
      name: `${title} e-card${toName ? ` for ${toName}` : ''}`.slice(0, 200), description: 'A Little Poppin e-card, opened from a wax-sealed envelope on their phone. Delivered by link.',
      metadata: { brand: BRAND, type: 'card' } } } }],
    customer_email: c.sender_email || undefined,
    success_url: `${origin}/sent/${c.sender_key}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/sent/${c.sender_key}?cancelled=1`,
    metadata: { brand: BRAND, type: 'card', card_id: c.id },
    payment_intent_data: { metadata: { brand: BRAND, type: 'card', card_id: c.id }, description: `Little Poppin e-card${toName ? ` for ${toName}` : ''}`.slice(0, 200) },
  });
  await setCardPaid(c.id, { stripe_session: session.id });
  return session;
}
export async function createEventCheckout(ev, origin) {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { currency: 'aud', unit_amount: INVITE_PRICE, product_data: {
      name: `Party invitation: ${ev.title}`.slice(0, 200), description: 'A Little Poppin online invitation with a wax-sealed envelope, replies, headcount and guest list. Delivered by link.',
      metadata: { brand: BRAND, type: 'invitation' } } } }],
    customer_email: ev.host_email || undefined,
    success_url: `${origin}/manage/${ev.id}?paid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/manage/${ev.id}?cancelled=1`,
    metadata: { brand: BRAND, type: 'invitation', event_id: ev.id },
    payment_intent_data: { metadata: { brand: BRAND, type: 'invitation', event_id: ev.id }, description: `Little Poppin invitation: ${ev.title}`.slice(0, 200) },
  });
  await setEventPaid(ev.id, { stripe_session: session.id });
  return session;
}

export const getSession = (id) => stripe().checkout.sessions.retrieve(id);
export const cardPaidFor = (s, cardId) => s?.metadata?.brand === BRAND && s.metadata.type === 'card' && s.metadata.card_id === cardId && s.payment_status === 'paid';
export const eventPaidFor = (s, eventId) => s?.metadata?.brand === BRAND && s.metadata.type === 'invitation' && s.metadata.event_id === eventId && s.payment_status === 'paid';

// Called by the shop webhook for type=card|invitation, and by the return pages. Idempotent: the links
// email goes once, when the record first turns live.
export async function keepsakePaid(session, origin) {
  const site = (origin || process.env.SITE_URL || 'https://www.littlepoppin.com').replace(/\/$/, '');
  const amount = ((session.amount_total || 0) / 100).toFixed(2);
  if (session.metadata?.type === 'card') {
    const c = await cardById(session.metadata.card_id);
    if (!c || !cardPaidFor(session, c.id)) return null;
    const wasLive = isLive(c);
    const paid = await markCardPaid(c, session);
    if (!wasLive) {
      const email = c.sender_email || session.customer_details?.email;
      await send(email, 'Your Little Poppin card is ready to send', senderLinks({ to_name: c.to_name, link: `${site}/c/${c.slug}` }));
      await notifyShop('card', amount, session);
    }
    return paid;
  }
  if (session.metadata?.type === 'invitation') {
    const ev = await eventById(session.metadata.event_id);
    if (!ev || !eventPaidFor(session, ev.id)) return null;
    const wasLive = isLive(ev);
    const paid = await markEventPaid(ev, session);
    if (!wasLive) await notifyShop('invitation', amount, session);
    return paid;
  }
  return null;
}
