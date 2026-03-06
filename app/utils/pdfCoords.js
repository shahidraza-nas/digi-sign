import { PDF_RENDER_WIDTH } from "../constants/fields";

/**
 * Convert pixel-position on the rendered PDF page to PDF-coordinate-space points.
 *
 * Browser uses a top-left origin; PDF uses a bottom-left origin.
 * The rendered page is scaled to `PDF_RENDER_WIDTH` pixels, so we reverse
 * that scale and flip the Y-axis.
 *
 * @param {{ x: number, y: number, width: number, height: number, fieldId: string, pageIndex: number }} placed
 *   The placed field's pixel position/size relative to the rendered page.
 * @param {{ width: number, height: number }} pageInfo
 *   The original PDF page dimensions in points (from react-pdf).
 * @returns {{ left: number, bottom: number, right: number, top: number, pageIndex: number } | null}
 */
export function convertToPdfCoords(placed, pageInfo) {
  if (!pageInfo) return null;

  const scale = PDF_RENDER_WIDTH / pageInfo.width;

  const pdfX = placed.x / scale;
  const pdfY = placed.y / scale;
  const pdfW = placed.width / scale;
  const pdfH = placed.height / scale;

  return {
    left: round2(pdfX),
    bottom: round2(pageInfo.height - pdfY - pdfH),
    right: round2(pdfX + pdfW),
    top: round2(pageInfo.height - pdfY),
    pageIndex: placed.pageIndex,
  };
}

/** Round to 2 decimal places */
function round2(n) {
  return Math.round(n * 100) / 100;
}
