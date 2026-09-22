// site-config.mjs. The few settings that are Naomi's to fill in, kept out of the code.

/**
 * Google Analytics 4 measurement ID, e.g. 'G-XXXXXXXXXX'.
 *
 * EMPTY ON PURPOSE. There is no GA4 property for littlepoppin.com yet, and injecting a
 * fake id would give the appearance of analytics while collecting nothing. To turn it on:
 *   1. analytics.google.com → Admin → Create property → Web → littlepoppin.com
 *   2. copy the Measurement ID (starts with G-)
 *   3. paste it here, then `npm run build:site` and deploy
 * Everything else. The snippet on all 135 pages, the ecommerce events. Is already wired.
 */
export const GA4_ID = '';

/** Canonical site origin, used for sitemap and structured data. */
export const SITE_URL = 'https://littlepoppin.com';
