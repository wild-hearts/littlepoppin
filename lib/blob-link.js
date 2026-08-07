// lib/blob-link.js — one place to mint presigned download URLs for the private Blob store.
//
// The store rejects unauthenticated reads entirely, so every delivery path (purchase,
// Print Club, free welcome print) has to presign. Centralised here because of a hard
// platform limit that is easy to trip and fails at RUN time, not build time:
//
//   Vercel Blob refuses a validUntil more than 7 DAYS out.
//
// A 30-day link throws "validUntil cannot be more than 7 days after the request time".
// Callers wrap delivery in try/catch so a signup still succeeds, which means an
// over-long TTL fails SILENTLY — the customer simply never receives their file. Keep
// every TTL at or below MAX_TTL_MS.
import { issueSignedToken, presignUrl } from '@vercel/blob';

/** Platform ceiling is 7 days; 6 leaves margin for clock skew and request latency. */
export const MAX_TTL_MS = 6 * 24 * 3600e3;

/** A just-purchased file: short-lived, and the buyer can always re-open the emailed link. */
export const PURCHASE_TTL_MS = 3600e3;

/**
 * Mint a presigned GET URL for a private blob pathname.
 * NOTE: the signature covers the GET operation only — a HEAD request against the
 * resulting URL returns 403. Fetch it with GET.
 */
export async function presignGet(pathname, ttlMs = PURCHASE_TTL_MS) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN not set');
  const validUntil = Date.now() + Math.min(ttlMs, MAX_TTL_MS);
  const st = await issueSignedToken({ token, pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(st, { operation: 'get', pathname, access: 'private' });
  return presignedUrl;
}
