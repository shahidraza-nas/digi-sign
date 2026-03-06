# Drag & Drop Digital Signature — Implementation Guide

## How It Works

Users drag signature/date fields from a sidebar onto a rendered PDF page. When saved, the browser pixel positions are converted to PDF coordinates and sent to the server, which stamps visible text and embeds a cryptographic digital signature at the exact placed position.

---

## 1. Rendering the PDF

We use **react-pdf** (v10.4.1) to render PDF pages in the browser. The page is rendered at a fixed pixel width (`650px`). On load, we capture the PDF's original dimensions (in points) — these are needed later for coordinate conversion.

```js
// PdfViewer.js
onPageLoadSuccess = (page) => {
  onPageLoad({
    width: page.originalWidth,    // e.g. 612 (US Letter)
    height: page.originalHeight,  // e.g. 792
  });
};
```

---

## 2. Drag & Drop Field Placement

The sidebar contains draggable chips ("Signature", "Signed Date"). When a chip is dropped onto the PDF wrapper div, we record its **pixel position** relative to the wrapper.

```js
// PdfSigner.js — handleDropOnPdf
const dropX = e.clientX - rect.left;
const dropY = e.clientY - rect.top;

// Clamp within rendered page bounds
const maxX = PDF_RENDER_WIDTH - fieldWidth;
const maxY = renderedPageHeight - fieldHeight;
const x = Math.max(0, Math.min(dropX - fieldWidth / 2, maxX));
const y = Math.max(0, Math.min(dropY - fieldHeight / 2, maxY));
```

The rendered page height is derived from the aspect ratio:
```js
renderedPageHeight = (pageInfo.height / pageInfo.width) * PDF_RENDER_WIDTH;
```

---

## 3. Dragging & Resizing on the PDF

Once placed, each field is a **react-draggable** + **re-resizable** component positioned absolutely over the PDF canvas.

Drag movement is constrained to the page area using explicit pixel bounds (not `bounds="parent"`):

```js
// SignatureBox.js
<Draggable
  bounds={{
    left: 0,
    top: 0,
    right: containerWidth - size.width,
    bottom: containerHeight - size.height,
  }}
  position={position}
/>
```

The wrapper div must have `top: 0; left: 0` set explicitly — without this, the browser places the absolutely-positioned element after the PDF content (below the page), and the Draggable transform shifts it even further down.

---

## 4. Pixel → PDF Coordinate Conversion

PDF origin is **bottom-left** (Y goes up). Browser origin is **top-left** (Y goes down). On save, we convert:

```
scale  = 650 / 612 = 1.062

pdfX   = pixelX / scale
pdfY   = pixelY / scale
pdfW   = pixelWidth / scale
pdfH   = pixelHeight / scale

left   = pdfX
right  = pdfX + pdfW
top    = pageHeight - pdfY              ← Y flip
bottom = pageHeight - pdfY - pdfH       ← Y flip
```

**Example**: Field at pixel `(113, 768)` with size `200×50` on a 612×792pt page:

| | Value |
|--|-------|
| left | 106.4 |
| right | 294.7 |
| top | 68.8 |
| bottom | 21.7 |

---

## 5. Server-Side Signing Pipeline

The API route (`/api/sign-pdf`) receives the PDF + field coordinates and processes in 3 steps:

### Step 1 — Stamp visible text (pdf-lib)

- **Date fields** → draws the current date as text (e.g. "March 5, 2026")
- **Signature fields** → draws "Signed by: DigiSign User" as bold text

```js
page.drawText(`Signed by: ${signerName}`, {
  x: field.left + 4,
  y: field.bottom + (boxH / 2) - 4,  // vertically centered
  size: 9,
  font: helveticaBold,
});
```

### Step 2 — Inject signature placeholder (@signpdf/placeholder-plain)

Reserves space in the PDF's internal structure for the PKCS#7 signature data at the exact widget rectangle:

```js
plainAddPlaceholder({
  pdfBuffer,
  reason: "Document digitally signed",
  name: "DigiSign User",
  signatureLength: 8192,
  widgetRect: [left, bottom, right, top],  // from step 4 above
});
```

### Step 3 — Cryptographic signing (@signpdf/signpdf + @signpdf/signer-p12)

Signs the PDF with a P12 certificate, filling the placeholder with a real PKCS#7 digital signature:

```js
const signer = new P12Signer(p12Buffer, { passphrase: "" });
const signedPdf = await new SignPdf().sign(pdfWithPlaceholder, signer);
```

The output is a cryptographically signed PDF verifiable by Adobe Reader, Foxit, etc.

---

## 6. Key Gotchas We Solved

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Fields invisible after drop | `overflow: hidden` on wrapper clipped absolutely-positioned fields | Changed to `overflow: visible` |
| Fields appeared below PDF page | Missing `top: 0; left: 0` on the field div — browser placed it at static flow position | Added explicit `top: 0; left: 0` |
| Fields draggable outside page | `bounds="parent"` used wrapper's full DOM height (includes text/annotation layers) | Switched to explicit pixel bounds `{ left, top, right, bottom }` |
| react-pdf layers covered fields | Text/annotation layers had higher z-index | Set layers to `z-index: 1`, fields to `z-index: 20` |
| Turbopack build failure | `pdfjs-dist` imports `canvas` (Node-only module) | Aliased `canvas` to empty string in Turbopack + webpack config |

---

## 7. Libraries Used

| Library | What it does in this feature |
|---------|------------------------------|
| **react-pdf** | Renders the PDF page in browser so users can see where they're placing fields |
| **react-draggable** | Makes placed fields draggable with constrained bounds |
| **re-resizable** | Makes placed fields resizable (width/height) |
| **pdf-lib** | Draws visible text (signer name, date) onto the PDF at exact coordinates |
| **@signpdf/placeholder-plain** | Injects a signature placeholder into PDF structure at the field position |
| **@signpdf/signpdf** | Fills the placeholder with a PKCS#7 cryptographic signature |
| **@signpdf/signer-p12** | Reads the P12 certificate and produces signature bytes |
