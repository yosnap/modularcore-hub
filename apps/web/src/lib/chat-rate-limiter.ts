/**
 * Fixed-window, in-memory rate limiter for the `/api/chat` proxy, keyed by client IP.
 *
 * In-memory is a known MVP limitation: the counters reset on process restart and are not shared
 * across multiple instances/replicas. That is acceptable for this single-instance demo
 * playground; a production multi-instance deployment would need a shared store (Redis, etc.).
 */
export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  /** Injectable for tests; defaults to `Date.now`. */
  now?: () => number;
}

export interface RateLimiter {
  /** Records one request attempt for `key` and returns whether it exceeds the limit. */
  isRateLimited: (key: string) => boolean;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, maxRequests, now = Date.now } = options;
  const requestLog = new Map<string, number[]>();

  return {
    isRateLimited(key) {
      const currentTime = now();
      const recent = (requestLog.get(key) ?? []).filter(
        (timestamp) => currentTime - timestamp < windowMs,
      );
      recent.push(currentTime);
      requestLog.set(key, recent);
      return recent.length > maxRequests;
    },
  };
}
