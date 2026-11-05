// print-series.mjs. The photorealistic print series added in November 2026.
//
// Shared by build-prints-shop.mjs (previews, catalogue, shop sections) and
// publish-prints.mjs (uploading the originals to Vercel Blob). The originals live
// outside the repo, one folder per series under SERIES_SRC; override with LP_SERIES_SRC.
//
// Each series becomes its own shop section. Every artwork is its own $12 print with
// its own product page; nothing is bundled here, so a buyer browses a collection and
// buys the pieces they want.
import fs from 'node:fs';
import path from 'node:path';

export const SERIES_SRC = process.env.LP_SERIES_SRC
  || '/Users/naomi/Documents/Codex/2026-11-03/www/outputs';

// Upscaled masters (scripts/upscale-series.mjs) live here, mirroring the SERIES_SRC
// folder layout. When a file exists here it is the master: the shop reads its pixel
// size and publish-prints.mjs uploads it. The originals stay untouched in SERIES_SRC.
export const SERIES_MASTERS = process.env.LP_SERIES_MASTERS
  || '/Users/naomi/Downloads/littlepoppin-masters-upscaled';

export const SERIES = [
  { id: 'magical-stories', nav: 'Magical Stories', title: '📖 Magical Stories',
    blurb: 'Photoreal storybook scenes: a wardrobe that opens onto snow, a lantern boat, a bakery in the woods. Every one a bedtime story waiting to be told.',
    dir: 'little-poppin-photorealistic-magical-stories-series-01', price: 1200 },
  { id: 'magical-realms', nav: 'Magical Realms', title: '🐉 Magical Realms',
    blurb: 'Dragons, phoenixes, fairy rings and a library grown inside a tree. Rich, luminous worlds for a room that dreams big.',
    dir: 'little-poppin-photorealistic-magical-series-03', price: 1200 },
  { id: 'photo-art', nav: 'Photo Art', title: '📸 Photo Art',
    blurb: 'Fairies, unicorns, a baby dragon, a blue whale, an astronaut, a digger and a little red car. Photoreal prints for every kind of kid.',
    dir: 'little-poppin-photo-art-collection', price: 1200 },
  { id: 'australian-wildlife', nav: 'Australian Wildlife', title: '🦘 Australian Wildlife',
    blurb: 'Koala, wombat, quokka, echidna, cockatoo and kangaroo, photographed-looking and full of character. Home-grown friends for the nursery wall.',
    dir: 'little-poppin-australian-wildlife-series-01', price: 1200 },
  { id: 'mermaid', nav: 'Mermaid Dreams', title: '🧜‍♀️ Mermaid Dreams',
    blurb: 'Coral palaces, kelp forests, luminous caves and the mermaids who live there. Turquoise water and pearl light for a little sea-dreamer.',
    dir: 'little-poppin-mermaid-series-01', price: 1200 },
  { id: 'dog', nav: 'Dogs', title: '🐶 Dogs',
    blurb: 'Ten beloved breeds, each caught mid-happiness. The print for the family whose first baby had four legs.',
    dir: 'little-poppin-dog-series-01', price: 1200 },
  // Series 02 (November 2026): one source folder with four themed subfolders, each its
  // own shop section. The nested dir works everywhere because every reader joins
  // SERIES_SRC/SERIES_MASTERS with s.dir, and previews/skus key off s.id, not the path.
  { id: 'woodland-magic', nav: 'Woodland Magic', title: '🦊 Woodland Magic',
    blurb: 'A fox in the ferns, an owl at dusk, a fairy door in the tree roots and a bakery for mice. Photoreal woodland wonder for a room that believes in it.',
    dir: 'little-poppin-photorealistic-series-02/Magic', price: 1200 },
  { id: 'ocean', nav: 'Ocean', title: '🐋 Ocean',
    blurb: 'A humpback mother and calf, a turtle over the reef, a manta ray and a seal pup. Big blue calm, photographed-looking and gentle.',
    dir: 'little-poppin-photorealistic-series-02/Ocean', price: 1200 },
  { id: 'space', nav: 'Space', title: '🚀 Space',
    blurb: 'An astronaut and rover on the moon, a lunar lander and Saturn with her rings. For the kid who asks what is up there.',
    dir: 'little-poppin-photorealistic-series-02/Space', price: 1200 },
  { id: 'vehicles', nav: 'Vehicles', title: '🚒 Vehicles',
    blurb: 'A fire engine at the station, a yellow dump truck and a classic camper van. Big machines, beautifully lit, for a room that goes vroom.',
    dir: 'little-poppin-photorealistic-series-02/Vehicles', price: 1200 },
];
export const SERIES_IDS = new Set(SERIES.map((s) => s.id));

/** "07_Blue_Whale_in_Sunlit_Water.png" -> "blue-whale-in-sunlit-water" */
export function slugFromFile(name) {
  return name.replace(/\.png$/i, '').replace(/^\d+[_-]/, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export const seriesSku = (series, slug) => `print-${series.id}-${slug}`;

/** PNG pixel size from the IHDR chunk; no image library needed. */
export function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(24); fs.readSync(fd, buf, 0, 24, 0); fs.closeSync(fd);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/**
 * Every master in a series folder, in filename order. [] when the folder is absent.
 * `file` is the upscaled master when one exists, else the original; `original` is
 * always the source PNG.
 */
export function listSeriesMasters(series) {
  const dir = path.join(SERIES_SRC, series.dir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).sort()
    .map((f) => {
      const slug = slugFromFile(f);
      const original = path.join(dir, f);
      const upscaled = path.join(SERIES_MASTERS, series.dir, f);
      const file = fs.existsSync(upscaled) ? upscaled : original;
      return { file, original, slug, sku: seriesSku(series, slug) };
    });
}

/** The original PNG for a series sku, or null. */
export function findSeriesOriginal(sku) {
  for (const s of SERIES) {
    if (!sku.startsWith(`print-${s.id}-`)) continue;
    const hit = listSeriesMasters(s).find((m) => m.sku === sku);
    if (hit) return hit.file;
  }
  return null;
}
