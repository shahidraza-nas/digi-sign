# DigiSign — PDF Digital Signature

A browser-based PDF signing application built with **Next.js 16** (App Router). Users upload a PDF, drag-and-drop signature and date fields onto the document, and sign it digitally using a PKCS#7 certificate.

## Features

- **Drag-and-drop field placement** — position signature and date fields visually on the PDF
- **Digital signing** — PKCS#7 signatures via `@signpdf/signpdf` with P12 certificates
- **Multi-page support** — navigate between pages and place fields on any page
- **Coordinate conversion** — pixel-accurate browser-to-PDF coordinate mapping
- **Server-side validation** — magic-byte PDF verification, field coordinate validation
- **Self-hosted PDF.js worker** — no external CDN dependency
- **Accessible** — ARIA labels, keyboard skip-link, screen-reader support

## Quick Start

```bash
# Install dependencies
npm install

# Generate a self-signed certificate (development only)
node scripts/generate-cert.js

# Copy the env template and configure
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CERT_PATH` | `certs/certificate.p12` | Path to PKCS#12 certificate |
| `CERT_PASSPHRASE` | *(empty)* | P12 certificate passphrase |
| `SIGNER_NAME` | `DigiSign User` | Name displayed on signed PDFs |
| `SIGNER_EMAIL` | `digisign@example.com` | Contact info in digital signature |

## Project Structure

```
app/
  api/sign-pdf/route.js    — POST endpoint: validate → annotate → sign → respond
  components/
    PdfSigner.js            — Main orchestrator (wizard steps, layout)
    PdfViewer.js            — react-pdf Document/Page wrapper
    PlacedField.js          — Draggable + resizable field overlay
    FieldsSidebar.js        — Sidebar with draggable field chips
    Stepper.js              — Step progress indicator
    ErrorBoundary.js        — React error boundary
  constants/fields.js       — Shared field definitions, icons, sizing constants
  hooks/
    useFileUpload.js        — File selection, ArrayBuffer loading, blob URL lifecycle
    usePlacedFields.js      — Field CRUD, drop positioning
    useSigning.js           — API call, download, status management
  utils/
    pdfCoords.js            — Pixel → PDF coordinate conversion
    validation.js           — Server-side input validation
scripts/
  generate-cert.js          — Generate a self-signed P12 certificate
```

## Signing Pipeline

1. **Upload** — User selects a PDF, read as ArrayBuffer
2. **Place fields** — Drag signature/date chips onto the rendered PDF
3. **Sign** — Client sends PDF + field coordinates to `/api/sign-pdf`
   - Server validates inputs (magic bytes, field bounds, JSON schema)
   - `pdf-lib` draws visible text annotations (signer name, date)
   - `@signpdf/placeholder-plain` injects a PKCS#7 placeholder
   - `@signpdf/signpdf` signs with the P12 certificate
4. **Download** — Signed PDF returned as a binary attachment

## Tech Stack

- **Next.js 16** (App Router, React 19)
- **react-pdf** — PDF rendering
- **react-draggable** + **re-resizable** — DnD field placement
- **pdf-lib** — PDF annotation
- **@signpdf/*** — PKCS#7 digital signatures
- **node-forge** — Certificate generation (dev only)

## License

Private
