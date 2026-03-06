"use client";

import { useState, useCallback, useRef } from "react";

/**
 * useFileUpload — manages PDF file selection, ArrayBuffer loading, and blob URL lifecycle.
 *
 * @returns {{ fileUrl, fileData, fileName, status, handleFileUpload, reset }}
 */
export function useFileUpload() {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const prevUrlRef = useRef(null);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      setStatus("Please select a valid PDF file.");
      return false;
    }

    setFileName(file.name);
    setStatus("");

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Revoke previous blob URL to prevent memory leak
        if (prevUrlRef.current) {
          URL.revokeObjectURL(prevUrlRef.current);
        }
        const url = URL.createObjectURL(file);
        prevUrlRef.current = url;

        setFileData(ev.target.result);
        setFileUrl(url);
        resolve(true);
      };
      reader.onerror = () => {
        setStatus("Failed to read file. Please try again.");
        resolve(false);
      };
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const reset = useCallback(() => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setFileUrl(null);
    setFileData(null);
    setFileName("");
    setStatus("");
  }, []);

  return { fileUrl, fileData, fileName, status, setStatus, handleFileUpload, reset };
}
