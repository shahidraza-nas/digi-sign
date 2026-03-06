/**
 * Server-side validation helpers for the sign-pdf API route.
 */

/** PDF magic bytes: %PDF- */
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

/** Maximum allowed PDF file size in bytes (50 MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate that a buffer starts with the PDF magic bytes.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
export function isPdfBuffer(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.subarray(0, 5).equals(PDF_MAGIC);
}

/**
 * Validate the shape and values of field coordinate objects.
 *
 * @param {unknown} fields - Parsed JSON from the request
 * @returns {{ valid: boolean, error?: string, data?: Array }}
 */
export function validateFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return { valid: false, error: "At least one field is required." };
  }

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (typeof f !== "object" || f === null) {
      return { valid: false, error: `Field at index ${i} is not an object.` };
    }

    // Required numeric coords
    for (const key of ["left", "bottom", "right", "top"]) {
      if (typeof f[key] !== "number" || !Number.isFinite(f[key])) {
        return {
          valid: false,
          error: `Field "${f.fieldId || i}": "${key}" must be a finite number.`,
        };
      }
      if (f[key] < -1000 || f[key] > 10000) {
        return {
          valid: false,
          error: `Field "${f.fieldId || i}": "${key}" value ${f[key]} is out of reasonable range.`,
        };
      }
    }

    // Bounding box sanity
    if (f.left >= f.right) {
      return {
        valid: false,
        error: `Field "${f.fieldId || i}": left (${f.left}) must be less than right (${f.right}).`,
      };
    }
    if (f.bottom >= f.top) {
      return {
        valid: false,
        error: `Field "${f.fieldId || i}": bottom (${f.bottom}) must be less than top (${f.top}).`,
      };
    }

    // fieldType must be a known type
    const allowedTypes = ["signature", "date"];
    if (!allowedTypes.includes(f.fieldType)) {
      return {
        valid: false,
        error: `Field "${f.fieldId || i}": unknown fieldType "${f.fieldType}".`,
      };
    }

    // pageIndex must be a non-negative integer
    const pi = f.pageIndex ?? 0;
    if (!Number.isInteger(pi) || pi < 0) {
      return {
        valid: false,
        error: `Field "${f.fieldId || i}": pageIndex must be a non-negative integer.`,
      };
    }
  }

  return { valid: true, data: fields };
}
