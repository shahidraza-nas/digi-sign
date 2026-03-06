"use client";

/**
 * FieldsSidebar – a panel of draggable field chips.
 * Users drag these onto the PDF to place them. Once placed, they disappear from the sidebar.
 *
 * @param {{ fields: Array, placedFieldIds: string[] }} props
 */

import { FieldIcon } from "../constants/fields";

export default function FieldsSidebar({ fields, placedFieldIds }) {
  return (
    <aside className="fields-sidebar" aria-label="Document fields">
      <div className="fields-header">
        <span className="fields-title" id="fields-heading">FIELDS</span>
        <span className="fields-info" title="Drag fields onto the PDF to place them" aria-label="Info: drag fields onto the PDF to place them">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
      </div>

      <div className="fields-list" role="list" aria-labelledby="fields-heading">
        {fields.map((field) => {
          const isPlaced = placedFieldIds.includes(field.id);
          return (
            <div
              key={field.id}
              className={`field-chip ${isPlaced ? "field-chip-placed" : ""}`}
              role="listitem"
              draggable={!isPlaced}
              onDragStart={(e) => {
                if (isPlaced) { e.preventDefault(); return; }
                e.dataTransfer.setData("application/field-id", field.id);
                e.dataTransfer.effectAllowed = "copy";
                // Use the chip itself as ghost, offset to its center so
                // drop position aligns with the cursor
                const rect = e.currentTarget.getBoundingClientRect();
                e.dataTransfer.setDragImage(
                  e.currentTarget,
                  rect.width / 2,
                  rect.height / 2
                );
              }}
              aria-label={isPlaced ? `${field.label} — already placed` : `${field.label} — drag to place on PDF`}
            >
              {isPlaced ? (
                <span className="field-check" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : (
                <span className="field-grip" aria-hidden="true">⠿</span>
              )}
              <span className="field-icon">
                <FieldIcon type={field.type} />
              </span>
              <span className="field-label">{field.label}</span>
              {isPlaced && <span className="field-placed-badge">Placed</span>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
