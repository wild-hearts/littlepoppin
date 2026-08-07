// lib/personalise.js — personalised name prints.
//
// Any shop print can be turned into a keepsake by adding a child's name and birth
// details beneath the artwork. Rendering is fully automated (no manual fulfilment),
// so a personalised order is delivered instantly like any other download.
//
// Output is a single print-ready PDF containing the SAME design at three sizes —
// 8×10", A4 and 16×20" — so the buyer can print at home, at Officeworks, or at a
// professional lab without asking for a different file.
//
// FONT NOTE: the embedded Cormorant Garamond is a VARIABLE font, and fontkit's
// subsetter drops most glyphs from variable fonts (verified: "Willow Rose" rendered
// as "llow o"). We therefore embed it WITHOUT subsetting. That costs ~1.2 MB per
// PDF, which is immaterial next to the ~7 MB artwork. Do not "optimise" this back
// to subset: true without rendering the result and looking at it.

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const PERSONALISE_PRICE = 1900; // $19.00 AUD
export const ART_ASPECT = 1856 / 2304; // every design in the library is this ratio

// Cream page background — matches the site's --cream so a printed border looks intentional.
const CREAM = rgb(0xFD / 255, 0xFA / 255, 0xF7 / 255);
const INK = rgb(0x2C / 255, 0x2C / 255, 0x2C / 255);
const MUTED = rgb(0x6B / 255, 0x6B / 255, 0x6B / 255);

// Page sizes in PDF points (72pt = 1 inch).
export const PAGE_SIZES = [
  { label: '8×10 inch', w: 8 * 72, h: 10 * 72 },
  { label: 'A4', w: 595.28, h: 841.89 },
  { label: '16×20 inch', w: 16 * 72, h: 20 * 72 },
];

// Limits kept in step with the client-side customiser so the preview cannot promise
// something the renderer will not produce.
export const LIMITS = { name: 22, line2: 40, line3: 40 };

export function cleanField(value, max) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, max);
}

/** Normalise + validate buyer input. Returns { ok, data } or { ok:false, error }. */
export function parsePersonalisation(input = {}) {
  const name = cleanField(input.name, LIMITS.name);
  const line2 = cleanField(input.line2, LIMITS.line2);
  const line3 = cleanField(input.line3, LIMITS.line3);
  if (!name) return { ok: false, error: 'Please enter a name for the print.' };
  return { ok: true, data: { name, line2, line3 } };
}

/** Largest size (<= max) at which `text` fits within `maxWidth`. */
function fitSize(font, text, maxWidth, max, min = 8) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function drawCentred(page, font, text, { y, size, color, pageWidth }) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (pageWidth - w) / 2, y, size, font, color });
}

/**
 * Render the personalised print.
 * @param {Uint8Array|ArrayBuffer} artPng  high-res artwork (PNG)
 * @param {{name:string,line2?:string,line3?:string}} fields
 * @param {{regular:Uint8Array}} fonts     font file bytes
 * @returns {Promise<Uint8Array>} PDF bytes
 */
export async function renderPersonalisedPdf(artPng, fields, fonts) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // subset:false is deliberate — see FONT NOTE at the top of this file.
  const font = await doc.embedFont(fonts.regular, { subset: false });

  // Embed the artwork once; every page references the same image object.
  const art = await doc.embedPng(artPng);
  const artRatio = art.width / art.height;

  doc.setTitle(`${fields.name} — Little Poppin personalised print`);
  doc.setCreator('Little Poppin — littlepoppin.com');
  doc.setProducer('Little Poppin');

  for (const size of PAGE_SIZES) {
    const page = doc.addPage([size.w, size.h]);
    const { width: W, height: H } = page.getSize();

    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });

    // Proportional layout so all three sizes look like the same design.
    const sideMargin = W * 0.104;
    const topMargin = H * 0.058;
    const textBand = H * 0.17;

    // Fit the art inside the available box, preserving its true aspect ratio.
    const boxW = W - sideMargin * 2;
    const boxH = H - topMargin - textBand;
    let artW = boxW;
    let artH = artW / artRatio;
    if (artH > boxH) { artH = boxH; artW = artH * artRatio; }

    const artX = (W - artW) / 2;
    const artY = H - topMargin - artH;
    page.drawImage(art, { x: artX, y: artY, width: artW, height: artH });

    // Text block sits in the band beneath the artwork. Laid out top-down from a fixed
    // gap under the art so the bottom margin stays generous enough to frame or mat.
    const bandTop = artY;
    const detailLines = [fields.line2, fields.line3].filter(Boolean);
    const nameSize = fitSize(font, fields.name, boxW * 0.92, H * 0.058);
    const detailSize = Math.max(8, nameSize * 0.30);

    // Centre the whole block in the band, but never let it crowd the page edge.
    const blockH = nameSize + detailLines.length * detailSize * 1.95;
    const minBottom = H * 0.045;
    const slack = Math.max(0, bandTop - blockH - minBottom);
    let cursor = bandTop - slack / 2 - nameSize * 0.80;

    drawCentred(page, font, fields.name, { y: cursor, size: nameSize, color: INK, pageWidth: W });
    cursor -= detailSize * 2.05;

    for (const line of detailLines) {
      const s = fitSize(font, line, boxW * 0.86, detailSize);
      drawCentred(page, font, line, { y: cursor, size: s, color: MUTED, pageWidth: W });
      cursor -= detailSize * 1.95;
    }
    // Deliberately no size label printed on the page — this is a keepsake, and any
    // marker here would end up on the buyer's framed print. Page order is 8×10, A4, 16×20
    // and the delivery email says so.
  }

  return doc.save();
}
