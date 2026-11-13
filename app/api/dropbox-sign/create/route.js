import { NextResponse } from "next/server";

import { createEmbeddedSignature } from "../../../utils/dropboxSign";
import { isPdfBuffer } from "../../../utils/validation";
import { rateLimit } from "../../../utils/rateLimit";

// Vercel serverless functions reject request bodies over ~4.5 MB.
const MAX_UPLOAD = 4 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  if (rateLimit(request).limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const form = await request.formData();
    const pdfFile = form.get("pdf");
    const signerName = String(form.get("name") || "").trim();
    const signerEmail = String(form.get("email") || "").trim();

    if (!pdfFile || typeof pdfFile === "string") {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }
    if (!signerName || signerName.length > 100) {
      return NextResponse.json({ error: "Enter the signer's name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(signerEmail) || signerEmail.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    if (pdfBuffer.length > MAX_UPLOAD) {
      return NextResponse.json({ error: "PDF must be 4 MB or smaller." }, { status: 413 });
    }
    if (!isPdfBuffer(pdfBuffer)) {
      return NextResponse.json({ error: "Uploaded file is not a valid PDF." }, { status: 400 });
    }

    const result = await createEmbeddedSignature({
      pdfBuffer,
      fileName: pdfFile.name || "document.pdf",
      signerName,
      signerEmail,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Dropbox Sign create error:", err);
    return NextResponse.json(
      { error: err.message || "Could not start Dropbox Sign session." },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
