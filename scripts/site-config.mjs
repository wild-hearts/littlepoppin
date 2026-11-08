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

/**
 * Pinterest site claim for littlepoppin.com (the `p:domain_verify` meta tag).
 *
 * Pinterest Business → Settings → Claimed accounts → Websites → Claim → "Add HTML tag" gives a
 * tag like <meta name="p:domain_verify" content="…"/>. The content value goes here; the page
 * builders (build-product-pages, keepsakes-pages, build-prints-shop) put the tag in every head,
 * and index.html carries the same tag by hand (keep the two in step). The site was claimed on
 * 14 Aug 2026 with this value; an empty string leaves the tag out. Deleting the tag un-claims
 * the domain, which drops the brand name and attribution from every Pin that links here.
 * Full steps: docs/PINTEREST.md.
 */
export const PINTEREST_DOMAIN_VERIFY = 'aaaa0d318e1401846a8670b54eeb84ba';

/** The <meta> tag for the claim, or '' when there is no value. Builders drop this into <head>. */
export const pinterestClaimTag = () => PINTEREST_DOMAIN_VERIFY
  ? `<meta name="p:domain_verify" content="${PINTEREST_DOMAIN_VERIFY}" />`
  : '';
