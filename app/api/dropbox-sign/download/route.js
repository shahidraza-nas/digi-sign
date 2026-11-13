import { NextResponse } from "next/server";

import { downloadSignedPdf } from "../../../utils/dropboxSign";

const ID_RE = /^[A-Za-z0-9]{10,64}$/;

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid signature request ID." }, { status: 400 });
  }

  try {
    const result = await downloadSignedPdf(id);
    if (!result.ready) {
      // Dropbox Sign is still generating the final PDF — client should retry.
      return NextResponse.json({ pending: true }, { status: 409 });
    }
    return new NextResponse(result.pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dropbox-signed-${id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Dropbox Sign download error:", err);
    return NextResponse.json(
      { error: err.message || "Could not download signed PDF." },
      { status: 500 }
    );
  }
}
