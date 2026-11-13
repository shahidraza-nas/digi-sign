import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { SignPdf } from "@signpdf/signpdf";
import { P12Signer } from "@signpdf/signer-p12";
import { plainAddPlaceholder } from "@signpdf/placeholder-plain";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { isPdfBuffer, MAX_FILE_SIZE, validateFields } from "../../utils/validation";
import { SIGNATURE_PLACEHOLDER_LENGTH } from "../../constants/fields";
import { rateLimit } from "../../utils/rateLimit";


const CERT_PATH = process.env.CERT_PATH || "certs/certificate.p12";
const CERT_PASSPHRASE = process.env.CERT_PASSPHRASE ?? "";
const SIGNER_NAME = process.env.SIGNER_NAME || "DigiSign User";
const SIGNER_EMAIL = process.env.SIGNER_EMAIL || "digisign@example.com";


let cachedP12Buffer = null;

async function getSigner() {
  // On serverless hosts (e.g. Vercel) the cert file isn't deployed, so allow
  // supplying the P12 as a base64 env var instead.
  if (!cachedP12Buffer && process.env.CERT_P12_BASE64) {
    cachedP12Buffer = Buffer.from(process.env.CERT_P12_BASE64, "base64");
  }

  if (!cachedP12Buffer) {
    const certAbsPath = path.isAbsolute(CERT_PATH)
      ? CERT_PATH
      : path.join(process.cwd(), CERT_PATH);

    try {
      await fs.access(certAbsPath);
    } catch {
      throw new Error(
        "P12 certificate not found. Run `node scripts/generate-cert.js` first."
      );
    }
    cachedP12Buffer = await fs.readFile(certAbsPath);
  }

  const signer = new P12Signer(cachedP12Buffer, { passphrase: CERT_PASSPHRASE });
  const signPdf = new SignPdf();
  return { signer, signPdf };
}

export async function POST(request) {
  const rl = rateLimit(request);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const fieldsJson = formData.get("fields");
    console.log({formData, pdfFile, fieldsJson})
    if (!pdfFile) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }
    if (!fieldsJson) {
      return NextResponse.json({ error: "No field data provided." }, { status: 400 });
    }

    const pdfArrayBuffer = await pdfFile.arrayBuffer();
    let pdfBuffer = Buffer.from(pdfArrayBuffer);

    if (pdfBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    if (!isPdfBuffer(pdfBuffer)) {
      return NextResponse.json(
        { error: "Uploaded file is not a valid PDF." },
        { status: 400 }
      );
    }

    let fields;
    try {
      fields = JSON.parse(fieldsJson);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in fields parameter." },
        { status: 400 }
      );
    }

    const validation = validateFields(fields);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const originalName = pdfFile.name || "document.pdf";
    const signedName = originalName.replace(/\.pdf$/i, "-signed.pdf");
    console.log({originalName})
    console.log({signedName})
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    for (const field of fields) {
      const pages = pdfDoc.getPages();
      const page = pages[field.pageIndex || 0];
      if (!page) continue;

      if (field.fieldType === "date") {
        page.drawText(dateStr, {
          x: field.left + 4,
          y: field.bottom + 8,
          size: 11,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      if (field.fieldType === "signature") {
        const boxH = field.top - field.bottom;
        page.drawText(`Signed by: ${SIGNER_NAME}`, {
          x: field.left + 4,
          y: field.bottom + boxH / 2 - 4,
          size: 9,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }

    pdfBuffer = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));

    const sigField = fields.find((f) => f.fieldType === "signature");
    if (!sigField) {
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${signedName}"`,
        },
      });
    }

    const pdfWithPlaceholder = plainAddPlaceholder({
      pdfBuffer,
      reason: "Document digitally signed",
      contactInfo: SIGNER_EMAIL,
      name: sigField.label || SIGNER_NAME,
      location: "Digital",
      signatureLength: SIGNATURE_PLACEHOLDER_LENGTH,
      widgetRect: [sigField.left, sigField.bottom, sigField.right, sigField.top],
    });

    const { signer, signPdf } = await getSigner();
    const signedPdf = await signPdf.sign(pdfWithPlaceholder, signer);

    return new NextResponse(signedPdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${signedName}"`,
      },
    });
  } catch (err) {
    console.error("Sign PDF error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
