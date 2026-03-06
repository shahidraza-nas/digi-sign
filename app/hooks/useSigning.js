"use client";

import { useState, useCallback } from "react";
import { convertToPdfCoords } from "../utils/pdfCoords";
import { DEFAULT_FIELDS } from "../constants/fields";

/**
 * useSigning — manages the signing workflow (API call, download, step transitions).
 *
 * @returns {{ signing, signStatus, handleSign }}
 */
export function useSigning() {
  const [signing, setSigning] = useState(false);
  const [signStatus, setSignStatus] = useState("");

  /**
   * Build field coordinates, call the sign API, and download the result.
   *
   * @param {{ fileData: ArrayBuffer, fileName: string, placedFields: Array, pageInfo: object }} params
   * @returns {Promise<boolean>} true on success
   */
  const handleSign = useCallback(async ({ fileData, fileName, placedFields, pageInfo }) => {
    if (!fileData || !pageInfo) {
      setSignStatus("Please upload a PDF first.");
      return false;
    }
    if (placedFields.length === 0) {
      setSignStatus("Please place at least one field on the document.");
      return false;
    }

    // Build field coordinate data
    const fieldCoords = placedFields.map((pf) => {
      const field = DEFAULT_FIELDS.find((f) => f.id === pf.fieldId);
      const coords = convertToPdfCoords(pf, pageInfo);
      return {
        ...coords,
        fieldId: pf.fieldId,
        fieldType: field?.type || "signature",
        label: field?.label || pf.fieldId,
      };
    });

    setSigning(true);
    setSignStatus("Signing document...");

    try {
      const formData = new FormData();
      const blob = new Blob([fileData], { type: "application/pdf" });
      formData.append("pdf", blob, fileName);
      formData.append("fields", JSON.stringify(fieldCoords));

      const res = await fetch("/api/sign-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Signing failed");
      }

      // Download the signed PDF
      const signedBlob = await res.blob();
      const url = URL.createObjectURL(signedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(".pdf", "-signed.pdf");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSignStatus("Document signed and downloaded successfully!");
      return true;
    } catch (err) {
      console.error("Signing error:", err);
      setSignStatus(`Error: ${err.message}`);
      return false;
    } finally {
      setSigning(false);
    }
  }, []);

  const resetSignStatus = useCallback(() => setSignStatus(""), []);

  return { signing, signStatus, setSignStatus: setSignStatus, resetSignStatus, handleSign };
}
