"use client";

import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import FieldsSidebar from "./FieldsSidebar";
import PlacedField from "./PlacedField";
import { PDF_RENDER_WIDTH, DEFAULT_FIELDS } from "../constants/fields";
import { useFileUpload } from "../hooks/useFileUpload";
import { usePlacedFields } from "../hooks/usePlacedFields";
import { useSigning } from "../hooks/useSigning";

const PdfViewer = dynamic(() => import("./PdfViewer"), { ssr: false });

export default function PdfSigner() {
  // Wizard step: 0=Upload, 1=Signature, 2=Complete
  const [step, setStep] = useState(0);
  const [pageInfo, setPageInfo] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Custom hooks
  const { fileUrl, fileData, fileName, status: uploadStatus, setStatus: setUploadStatus, handleFileUpload: onFileSelect, reset: resetUpload } = useFileUpload();
  const { placedFields, handleDropField, handleFieldUpdate, handleFieldRemove, resetFields } = usePlacedFields(PDF_RENDER_WIDTH);
  const { signing, signStatus, handleSign, resetSignStatus } = useSigning();

  const pdfWrapperRef = useRef(null);

  // Active status message (upload status or sign status)
  const status = signStatus || uploadStatus;

  /* ---- File Upload ---- */
  const handleFileUpload = async (e) => {
    const success = await onFileSelect(e);
    if (success) {
      setStep(1); // Move to Signature step
    }
  };

  const handlePageLoad = useCallback((info) => {
    setPageInfo(info);
  }, []);

  // Compute the actual rendered height of the PDF page in pixels
  const renderedPageHeight = pageInfo
    ? (pageInfo.height / pageInfo.width) * PDF_RENDER_WIDTH
    : null;

  /* ---- Drop a field from the sidebar onto the PDF ---- */
  const handleDropOnPdf = (e) => {
    e.preventDefault();
    const fieldId = e.dataTransfer.getData("application/field-id");
    if (!fieldId) return;

    const rect = pdfWrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    handleDropField(
      fieldId,
      { clientX: e.clientX, clientY: e.clientY },
      rect,
      renderedPageHeight,
      currentPage,
      DEFAULT_FIELDS
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  /* ---- Save / Sign ---- */
  const handleSaveDocument = async () => {
    const success = await handleSign({ fileData, fileName, placedFields, pageInfo });
    if (success) {
      setStep(2); // Move to Complete step
    }
  };

  /* ---- Reset / Start New ---- */
  const handleStartNew = () => {
    setStep(0);
    resetUpload();
    resetFields();
    resetSignStatus();
    setPageInfo(null);
    setNumPages(null);
    setCurrentPage(1);
  };

  /* ---- Render ---- */
  const placedIds = placedFields.map((f) => f.fieldId);
  const currentPagePlaced = placedFields.filter(
    (f) => f.pageIndex === currentPage - 1
  );

  return (
    <div className="app-root">
      {/* Main Card */}
      <main className="main-card" id="main-content">
        {/* Upload Step */}
        {step === 0 && (
          <div className="upload-step">
            <label className="upload-label" htmlFor="pdf-upload">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="upload-text">
                {fileName ? fileName : "Click to upload a PDF document"}
              </span>
              <span className="upload-hint">PDF files up to 50 MB</span>
              <input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="visually-hidden"
              />
            </label>
          </div>
        )}

        {/* Signature Step */}
        {step >= 1 && step < 2 && fileUrl && (
          <div className="signature-step">
            {/* PDF + Fields Layout */}
            <div className="signature-layout">
              {/* PDF area */}
              <div className="pdf-area">
                <div
                  className="pdf-wrapper"
                  ref={pdfWrapperRef}
                  style={{
                    width: PDF_RENDER_WIDTH,
                    height: renderedPageHeight || "auto",
                    position: "relative",
                  }}
                  onDrop={handleDropOnPdf}
                  onDragOver={handleDragOver}
                  role="region"
                  aria-label="PDF document — drop fields here to place them"
                >
                  <PdfViewer
                    fileUrl={fileUrl}
                    onPageLoad={handlePageLoad}
                    pageNumber={currentPage}
                    onNumPages={setNumPages}
                    containerWidth={PDF_RENDER_WIDTH}
                  />

                  {/* Placed fields on current page */}
                  {currentPagePlaced.map((pf) => {
                    const field = DEFAULT_FIELDS.find((f) => f.id === pf.fieldId);
                    return (
                      <PlacedField
                        key={pf.fieldId}
                        field={field}
                        initialX={pf.x}
                        initialY={pf.y}
                        containerWidth={PDF_RENDER_WIDTH}
                        containerHeight={renderedPageHeight}
                        onUpdate={handleFieldUpdate}
                        onRemove={handleFieldRemove}
                      />
                    );
                  })}
                </div>

                {/* Page Navigation */}
                {numPages && numPages > 1 && (
                  <nav className="page-nav" aria-label="PDF page navigation">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                    <span aria-live="polite">
                      Page {currentPage} of {numPages}
                    </span>
                    <button
                      disabled={!numPages || currentPage >= numPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </nav>
                )}
              </div>

              {/* Fields Sidebar */}
              <div className="sidebar-area">
                <FieldsSidebar
                  fields={DEFAULT_FIELDS}
                  placedFieldIds={placedIds}
                />

                {/* Save / Skip */}
                <button
                  className="btn-save"
                  onClick={handleSaveDocument}
                  disabled={signing || placedFields.length === 0}
                >
                  {signing ? (
                    <><span className="spinner" aria-hidden="true" /> Signing...</>
                  ) : (
                    "Save Document"
                  )}
                </button>
                <button className="btn-skip" onClick={() => setStep(2)}>
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete step */}
        {step === 2 && (
          <div className="email-step">
            <div className="email-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <h3>Document Saved!</h3>
              <p>Your signed document has been downloaded. You can now share it via email.</p>
              <button className="btn-save" onClick={handleStartNew}>
                Start New Template
              </button>
            </div>
          </div>
        )}

        {/* Status bar */}
        {status && (
          <div
            className={`status-bar ${status.startsWith("Error") ? "status-error" : "status-info"}`}
            role="alert"
          >
            {status}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        DigiSign &copy; {new Date().getFullYear()} v1.0.0 · <Link href="/dropbox-sign">Try the Dropbox Sign demo →</Link>
      </footer>
    </div>
  );
}
