"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Self-hosted worker — no CDN dependency
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/**
 * PdfViewer — renders a PDF page using react-pdf.
 *
 * @param {{ fileUrl: string, onPageLoad: Function, pageNumber: number, onNumPages: Function, containerWidth: number }} props
 */
export default function PdfViewer({
  fileUrl,
  onPageLoad,
  pageNumber,
  onNumPages,
  containerWidth,
}) {
  const [numPages, setNumPages] = useState(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }) => {
      setNumPages(total);
      if (onNumPages) onNumPages(total);
    },
    [onNumPages]
  );

  const onPageLoadSuccess = useCallback(
    (page) => {
      if (onPageLoad) {
        onPageLoad({
          width: page.originalWidth,
          height: page.originalHeight,
          pageNumber: page.pageNumber,
        });
      }
    },
    [onPageLoad]
  );

  if (!fileUrl) return null;

  return (
    <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
      <Page
        pageNumber={pageNumber || 1}
        width={containerWidth || 700}
        onLoadSuccess={onPageLoadSuccess}
        renderTextLayer={true}
        renderAnnotationLayer={true}
      />
    </Document>
  );
}
