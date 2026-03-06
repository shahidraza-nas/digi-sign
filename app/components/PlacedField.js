"use client";

/**
 * PlacedField — a draggable + resizable field overlay on top of the PDF page.
 *
 * Uses `react-draggable` for positioning and `re-resizable` for sizing.
 * Constrained within the rendered PDF page bounds.
 *
 * @param {{ field: object, initialX: number, initialY: number, containerWidth: number, containerHeight: number, onUpdate: Function, onRemove: Function }} props
 */

import { useRef, useState, memo } from "react";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";
import { FieldIcon, FIELD_DEFAULTS, FIELD_SIZE_LIMITS } from "../constants/fields";

function PlacedField({
  field,
  initialX,
  initialY,
  containerWidth,
  containerHeight,
  onUpdate,
  onRemove,
}) {
  const nodeRef = useRef(null);
  const defaults = FIELD_DEFAULTS[field.type] || FIELD_DEFAULTS.signature;
  const [size, setSize] = useState({ width: defaults.width, height: defaults.height });
  const [position, setPosition] = useState({ x: initialX || 20, y: initialY || 20 });

  const emitUpdate = (pos, sz) => {
    if (onUpdate) {
      onUpdate(field.id, { x: pos.x, y: pos.y, width: sz.width, height: sz.height });
    }
  };

  const handleDrag = (_e, data) => {
    const newPos = { x: data.x, y: data.y };
    setPosition(newPos);
    emitUpdate(newPos, size);
  };

  const handleResizeStop = (_e, _direction, _ref, delta) => {
    const newSize = {
      width: size.width + delta.width,
      height: size.height + delta.height,
    };
    setSize(newSize);
    emitUpdate(position, newSize);
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      bounds={{
        left: 0,
        top: 0,
        right: Math.max(0, (containerWidth || 650) - size.width),
        bottom: Math.max(0, (containerHeight || 841) - size.height),
      }}
      position={position}
      onDrag={handleDrag}
    >
      <div
        ref={nodeRef}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 20, cursor: "move" }}
        role="group"
        aria-label={`${field.label} field — drag to reposition`}
      >
        <Resizable
          size={size}
          onResizeStop={handleResizeStop}
          minWidth={FIELD_SIZE_LIMITS.minWidth}
          minHeight={FIELD_SIZE_LIMITS.minHeight}
          maxWidth={FIELD_SIZE_LIMITS.maxWidth}
          maxHeight={FIELD_SIZE_LIMITS.maxHeight}
          enable={{
            top: false, right: true, bottom: true, left: false,
            topRight: false, bottomRight: true, bottomLeft: false, topLeft: false,
          }}
          style={{
            border: "2px solid #1976d2",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            userSelect: "none",
            padding: "0 8px",
            gap: "6px",
          }}
        >
          {/* Grip dots */}
          <span style={{ color: "#b0bec5", fontSize: "14px", lineHeight: 1, cursor: "grab" }} aria-hidden="true">⠿</span>
          {/* Icon */}
          <span style={{ color: "#546e7a", display: "flex", alignItems: "center" }}>
            <FieldIcon type={field.type} />
          </span>
          {/* Label */}
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#37474f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
            {field.label}
          </span>
          {/* Remove button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove && onRemove(field.id); }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "2px",
              color: "#90a4ae", display: "flex", alignItems: "center",
            }}
            aria-label={`Remove ${field.label} field`}
            title={`Remove ${field.label}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </Resizable>
      </div>
    </Draggable>
  );
}

export default memo(PlacedField);
