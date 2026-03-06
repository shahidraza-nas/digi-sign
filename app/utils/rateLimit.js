/**
 * Simple in-memory rate limiter for API routes.
 * Tracks requests per IP within a sliding window.
 *
 * NOTE: For production with multiple server instances, replace with
 * Redis-backed rate limiting (e.g. @upstash/ratelimit).
 */

const store = new Map();

const DEFAULT_OPTS = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // per window
};

/**
 * Check if a request should be rate-limited.
 *
 * @param {Request} request - The incoming request
 * @param {object} [opts] - Override window/max
 * @returns {{ limited: boolean, remaining: number, resetAt: number }}
 */
export function rateLimit(request, opts = {}) {
  const { windowMs, maxRequests } = { ...DEFAULT_OPTS, ...opts };

  // Best-effort IP extraction (works in Vercel, Cloudflare, and locally)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "127.0.0.1";

  const now = Date.now();
  const entry = store.get(ip);

  // Clean up old entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [key, val] of store) {
      if (now - val.windowStart > windowMs * 2) store.delete(key);
    }
  }

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    store.set(ip, { windowStart: now, count: 1 });
    return { limited: false, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  entry.count += 1;

  if (entry.count > maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: entry.windowStart + windowMs,
    };
  }

  return {
    limited: false,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}
