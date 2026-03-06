"use client";

import { useState, useCallback } from "react";
import { FIELD_DEFAULTS } from "../constants/fields";

/**
 * usePlacedFields — manages the lifecycle of fields placed on the PDF.
 * Handles drop positioning, updates (drag/resize), and removal.
 *
 * @param {number} renderWidth - Width of the rendered PDF in pixels
 * @returns {{ placedFields, handleDropField, handleFieldUpdate, handleFieldRemove, resetFields }}
 */
export function usePlacedFields(renderWidth) {
  const [placedFields, setPlacedFields] = useState([]);

  /**
   * Drop a field from the sidebar onto the PDF at the given browser coordinates.
   *
   * @param {string} fieldId
   * @param {{ clientX: number, clientY: number }} dropPos - Browser mouse position
   * @param {DOMRect} wrapperRect - Bounding rect of the PDF wrapper element
   * @param {number|null} renderedPageHeight - Computed page height in pixels
   * @param {number} currentPage - 1-based page number
   * @param {Array} fieldDefinitions - Array of { id, label, type }
   */
  const handleDropField = useCallback(
    (fieldId, dropPos, wrapperRect, renderedPageHeight, currentPage, fieldDefinitions) => {
      if (!fieldId || !wrapperRect) return;

      setPlacedFields((prev) => {
        // Already placed?
        if (prev.find((f) => f.fieldId === fieldId)) return prev;

        const field = fieldDefinitions.find((f) => f.id === fieldId);
        const defaults = FIELD_DEFAULTS[field?.type] || FIELD_DEFAULTS.signature;
        const dropX = dropPos.clientX - wrapperRect.left;
        const dropY = dropPos.clientY - wrapperRect.top;

        const maxX = renderWidth - defaults.width;
        const maxY = renderedPageHeight
          ? renderedPageHeight - defaults.height
          : wrapperRect.height - defaults.height;

        const clampedX = Math.max(0, Math.min(dropX - defaults.width / 2, maxX));
        const clampedY = Math.max(0, Math.min(dropY - defaults.height / 2, maxY));

        return [
          ...prev,
          {
            fieldId,
            x: clampedX,
            y: clampedY,
            width: defaults.width,
            height: defaults.height,
            pageIndex: currentPage - 1,
          },
        ];
      });
    },
    [renderWidth]
  );

  /** Update position/size of a placed field after drag or resize. */
  const handleFieldUpdate = useCallback((fieldId, data) => {
    setPlacedFields((prev) =>
      prev.map((f) =>
        f.fieldId === fieldId
          ? { ...f, x: data.x, y: data.y, width: data.width, height: data.height }
          : f
      )
    );
  }, []);

  /** Remove a placed field (return it to the sidebar). */
  const handleFieldRemove = useCallback((fieldId) => {
    setPlacedFields((prev) => prev.filter((f) => f.fieldId !== fieldId));
  }, []);

  /** Reset all placed fields. */
  const resetFields = useCallback(() => {
    setPlacedFields([]);
  }, []);

  return { placedFields, handleDropField, handleFieldUpdate, handleFieldRemove, resetFields };
}
