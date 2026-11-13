"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Dropbox Sign embedded-signing demo.
 * Flow: upload PDF + signer details → server creates an embedded signature
 * request (test mode) → Dropbox Sign's signing window opens on this page →
 * after signing, the final PDF can be downloaded.
 */
export default function DropboxSignDemo() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState("form"); // form | starting | signing | signed
  const [requestId, setRequestId] = useState(null);
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => () => clientRef.current?.close?.(), []);

  const isError = status.startsWith("Error");

  async function handleStart(e) {
    e.preventDefault();
    if (!file) return setStatus("Error: choose a PDF first.");
    if (file.size > 4 * 1024 * 1024) return setStatus("Error: PDF must be 4 MB or smaller.");

    setPhase("starting");
    setStatus("Creating signature request…");

    try {
      const body = new FormData();
      body.append("pdf", file);
      body.append("name", name);
      body.append("email", email);

      const res = await fetch("/api/dropbox-sign/create", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      // hellosign-embedded touches `window`, so load it only in the browser.
      const { default: HelloSign } = await import("hellosign-embedded");
      const client = new HelloSign({ clientId: data.clientId });
      clientRef.current = client;

      client.on("sign", () => {
        setPhase("signed");
        setStatus("Signed! Dropbox Sign is preparing the final PDF.");
      });
      client.on("cancel", () => {
        setPhase("form");
        setStatus("Signing was cancelled.");
      });
      client.on("error", (err) => {
        setPhase("form");
        setStatus(`Error: ${err?.code || "the signing window reported an error"}`);
      });
      client.on("close", () => {
        setPhase((p) => (p === "signing" ? "form" : p));
      });

      setRequestId(data.signatureRequestId);
      setPhase("signing");
      setStatus("");
      client.open(data.signUrl, { testMode: true, skipDomainVerification: true });
    } catch (err) {
      setPhase("form");
      setStatus(`Error: ${err.message}`);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setStatus("Fetching signed PDF…");
    try {
      // The final file can take a few seconds to be ready after signing.
      for (let attempt = 0; attempt < 10; attempt++) {
        const res = await fetch(`/api/dropbox-sign/download?id=${requestId}`);
        if (res.status === 409) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Download failed");
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (file?.name || "document.pdf").replace(/\.pdf$/i, "-dropbox-signed.pdf");
        a.click();
        URL.revokeObjectURL(url);
        setStatus("Downloaded.");
        return;
      }
      throw new Error("The signed PDF is still processing. Try again in a moment.");
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  }

  function handleReset() {
    clientRef.current?.close?.();
    setFile(null);
    setRequestId(null);
    setPhase("form");
    setStatus("");
  }

  return (
    <div className="app-root">
      <main className="main-card dbx-card" id="main-content">
        <div className="dbx-header">
          <h1>Dropbox Sign demo</h1>
          <p>
            Sign a PDF with Dropbox Sign&apos;s embedded signing window. Runs in{" "}
            <strong>test mode</strong>: free and not legally binding.
          </p>
        </div>

        {phase !== "signed" ? (
          <form className="dbx-form" onSubmit={handleStart}>
            <label className="upload-label" htmlFor="dbx-pdf">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="upload-text">{file ? file.name : "Click to choose a PDF"}</span>
              <span className="upload-hint">PDF files up to 4 MB</span>
              <input
                id="dbx-pdf"
                type="file"
                accept="application/pdf"
                className="visually-hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="dbx-fields">
              <label>
                Signer name
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </label>
              <label>
                Signer email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </label>
            </div>

            <button className="btn-save" type="submit" disabled={phase !== "form"}>
              {phase === "starting" ? (
                <><span className="spinner" aria-hidden="true" /> Starting…</>
              ) : phase === "signing" ? (
                "Signing window open…"
              ) : (
                "Sign with Dropbox Sign"
              )}
            </button>
          </form>
        ) : (
          <div className="email-placeholder">
            <h3>Document signed!</h3>
            <p>Dropbox Sign has the signed copy, with its audit trail attached.</p>
            <button className="btn-save" onClick={handleDownload} disabled={downloading}>
              {downloading ? <><span className="spinner" aria-hidden="true" /> Downloading…</> : "Download signed PDF"}
            </button>
            <button className="btn-skip dbx-auto" onClick={handleReset}>
              Sign another document
            </button>
          </div>
        )}

        {status && (
          <div className={`status-bar ${isError ? "status-error" : "status-info"}`} role="alert">
            {status}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <Link href="/">← Back to DigiSign</Link> · Powered by Dropbox Sign (test mode)
      </footer>
    </div>
  );
}
