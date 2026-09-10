import { RateLimitError } from "./errors";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter using a Map.
 * Suitable for V1 single-process deployment.
 * Replace with Redis-backed rate limiting (e.g., @upstash/ratelimit) for
 * multi-instance deployments.
 */
export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  /**
   * Check and increment the counter for a given key.
   * Throws RateLimitError if the limit is exceeded.
   */
  check(key: string): void {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      throw new RateLimitError();
    }
  }

  /**
   * Purge expired entries to prevent memory leak.
   * Call periodically (e.g., every 5 minutes) in a background task.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) this.store.delete(key);
    }
  }
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

/** Public verification endpoint: 10 requests per minute per IP */
export const verificationRateLimiter = new InMemoryRateLimiter(10, 60_000);

/** Auth endpoints: 5 attempts per 15 minutes per IP */
export const authRateLimiter = new InMemoryRateLimiter(5, 15 * 60_000);

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    verificationRateLimiter.cleanup();
    authRateLimiter.cleanup();
  }, 5 * 60_000);
}
