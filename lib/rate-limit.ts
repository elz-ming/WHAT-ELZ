/**
 * v1 in-memory rate limiter. Best-effort only.
 *
 * TODO(launch-blocker): swap to Vercel KV / Upstash before public launch.
 * Edge runtime instances are short-lived and per-region, so this map can
 * be reset arbitrarily and does not coordinate across regions. Acceptable
 * for sprint 005 (single-instance UAT, low traffic) — not for production.
 */

type Bucket = {
  count: number;
  windowStartMs: number;
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 20;

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(ip);

  if (!existing || now - existing.windowStartMs >= WINDOW_MS) {
    const fresh: Bucket = { count: 1, windowStartMs: now };
    buckets.set(ip, fresh);
    return {
      allowed: true,
      remaining: MAX_PER_WINDOW - 1,
      resetMs: now + WINDOW_MS,
    };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: existing.windowStartMs + WINDOW_MS,
    };
  }

  const updated: Bucket = {
    count: existing.count + 1,
    windowStartMs: existing.windowStartMs,
  };
  buckets.set(ip, updated);
  return {
    allowed: true,
    remaining: MAX_PER_WINDOW - updated.count,
    resetMs: updated.windowStartMs + WINDOW_MS,
  };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
