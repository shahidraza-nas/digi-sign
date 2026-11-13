/**
 * Minimal server-side client for the Dropbox Sign (formerly HelloSign) REST API.
 * Docs: https://developers.hellosign.com/api/reference/
 *
 * Requires env vars:
 *   DROPBOX_SIGN_API_KEY    — API key (Settings → API in Dropbox Sign)
 *   DROPBOX_SIGN_CLIENT_ID  — Client ID of an API app (needed for embedded signing)
 */

const API_BASE = "https://api.hellosign.com/v3";

export function getDropboxSignConfig() {
  const apiKey = process.env.DROPBOX_SIGN_API_KEY;
  const clientId = process.env.DROPBOX_SIGN_CLIENT_ID;
  if (!apiKey || !clientId) {
    throw new Error(
      "Dropbox Sign is not configured. Set DROPBOX_SIGN_API_KEY and DROPBOX_SIGN_CLIENT_ID."
    );
  }
  return { apiKey, clientId };
}

function authHeader(apiKey) {
  return "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
}

async function callApi(path, { apiKey, method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: authHeader(apiKey) },
    body,
    cache: "no-store",
  });
  return res;
}

async function readError(res) {
  try {
    const json = await res.json();
    return json?.error?.error_msg || `Dropbox Sign API error (${res.status})`;
  } catch {
    return `Dropbox Sign API error (${res.status})`;
  }
}

/**
 * Create an embedded signature request for a single signer and return the
 * URL to open in the embedded signing iframe.
 */
export async function createEmbeddedSignature({ pdfBuffer, fileName, signerName, signerEmail }) {
  const { apiKey, clientId } = getDropboxSignConfig();

  const form = new FormData();
  form.append("client_id", clientId);
  form.append("test_mode", "1"); // demo: free, non-legally-binding requests
  form.append("title", fileName);
  form.append("subject", `Please sign ${fileName}`);
  form.append("message", "Signature requested via the DigiSign Dropbox Sign demo.");
  form.append("signers[0][name]", signerName);
  form.append("signers[0][email_address]", signerEmail);
  // No form fields given → Dropbox Sign appends a signature page to the document.
  form.append("file[0]", new Blob([pdfBuffer], { type: "application/pdf" }), fileName);

  const createRes = await callApi("/signature_request/create_embedded", {
    apiKey,
    method: "POST",
    body: form,
  });
  if (!createRes.ok) throw new Error(await readError(createRes));

  const { signature_request: request } = await createRes.json();
  const signatureId = request?.signatures?.[0]?.signature_id;
  if (!signatureId) throw new Error("Dropbox Sign did not return a signature ID.");

  const urlRes = await callApi(`/embedded/sign_url/${signatureId}`, { apiKey });
  if (!urlRes.ok) throw new Error(await readError(urlRes));
  const { embedded } = await urlRes.json();

  return {
    clientId,
    signUrl: embedded.sign_url,
    signatureRequestId: request.signature_request_id,
  };
}

/**
 * Download the signed PDF. Returns { ready: false } while Dropbox Sign is
 * still processing the final document (it can take a few seconds after signing).
 */
export async function downloadSignedPdf(signatureRequestId) {
  const { apiKey } = getDropboxSignConfig();
  const res = await callApi(`/signature_request/files/${signatureRequestId}?file_type=pdf`, {
    apiKey,
  });
  if (res.status === 409) return { ready: false };
  if (!res.ok) throw new Error(await readError(res));
  return { ready: true, pdf: Buffer.from(await res.arrayBuffer()) };
}
