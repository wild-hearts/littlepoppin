// lib/events.js. A minimal, durable record of things that happen to an order.
//
// WHY THIS EXISTS: until now nothing recorded whether a buyer ever collected their file.
// A download either worked or didn't, and the only way to find out was for the customer to
// complain. There is no database on this project, so events are written as small JSON
// objects into the same private Vercel Blob store the artwork lives in. That is enough to
// answer the questions that actually matter:
//   • did this order's file ever get downloaded?
//   • which orders paid but never collected?
//   • did the Printify order go through, and where is it?
//
// Deliberately fire-and-forget: recording must NEVER break delivery. If the store is
// unreachable, the customer still gets their download and we lose a log line. The right
// trade, given the alternative is a paid customer staring at an error.
import { put, list } from '@vercel/blob';

const PREFIX = 'events/';

/**
 * Record one event. Never throws.
 * @param {string} type  e.g. 'download', 'printify-submitted', 'printify-shipped'
 * @param {object} data  small, non-sensitive payload (no tokens, no full addresses)
 */
export async function recordEvent(type, data = {}) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const at = new Date().toISOString();
    // Path sorts chronologically, so `list` with a prefix returns events in order.
    const pathname = `${PREFIX}${type}/${at.slice(0, 10)}/${at}-${Math.random().toString(36).slice(2, 8)}.json`;
    await put(pathname, JSON.stringify({ type, at, ...data }), {
      access: 'private', token, contentType: 'application/json', addRandomSuffix: false,
    });
    return pathname;
  } catch (err) {
    console.error('recordEvent failed (non-fatal):', err.message);
    return null;
  }
}

/** Read recent events of a type, newest first. Used by the ops endpoint. */
export async function readEvents(type, limit = 100) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return [];
  const out = [];
  let cursor;
  do {
    const page = await list({ token, prefix: `${PREFIX}${type}/`, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor && out.length < 5000);
  return out.sort((a, b) => (a.pathname < b.pathname ? 1 : -1)).slice(0, limit);
}
