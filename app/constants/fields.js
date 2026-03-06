/**
 * Shared field definitions, icons, and constants used across components.
 * Single source of truth to avoid duplication.
 */

/** Width (px) at which the PDF is rendered in the browser */
export const PDF_RENDER_WIDTH = 650;

/** Length of the PKCS#7 signature placeholder (bytes) */
export const SIGNATURE_PLACEHOLDER_LENGTH = 8192;

/** Default dimensions for placed fields (px) */
export const FIELD_DEFAULTS = {
  signature: { width: 200, height: 44 },
  date: { width: 200, height: 44 },
};

/** Resizable constraints for placed fields (px) */
export const FIELD_SIZE_LIMITS = {
  minWidth: 80,
  minHeight: 28,
  maxWidth: 400,
  maxHeight: 120,
};

/** Default field definitions */
export const DEFAULT_FIELDS = [
  { id: "dixie-sig", label: "Signature", type: "signature" },
  { id: "dixie-date", label: "Signed Date", type: "date" },
];

/**
 * SVG icons keyed by field type.
 * Used in FieldsSidebar (chip) and PlacedField (overlay).
 */
export const FIELD_ICONS = {
  signature: {
    viewBox: "0 0 24 24",
    paths: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />',
  },
  date: {
    viewBox: "0 0 24 24",
    paths:
      '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />' +
      '<line x1="16" y1="2" x2="16" y2="6" />' +
      '<line x1="8" y1="2" x2="8" y2="6" />' +
      '<line x1="3" y1="10" x2="21" y2="10" />',
  },
};

/**
 * Render a field icon as a React SVG element.
 * @param {string} type - Field type key (e.g. "signature", "date")
 * @param {number} [size=18] - Icon width & height
 * @returns {JSX.Element}
 */
export function FieldIcon({ type, size = 18 }) {
  const icon = FIELD_ICONS[type] || FIELD_ICONS.signature;
  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon.paths }}
    />
  );
}
