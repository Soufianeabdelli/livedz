type Entry = { count: number; reset: number };

// In-memory fixed window limiter. DEV ONLY: replace with Redis before production.
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, Entry>();

  return function allow(key: string): boolean {
    const t = now();

    // Clean expired entries so memory does not grow forever
    if (hits.size > 10_000) {
      for (const [k, e] of hits) if (t >= e.reset) hits.delete(k);
    }

    const e = hits.get(key);
    if (!e || t >= e.reset) {
      hits.set(key, { count: 1, reset: t + windowMs });
      return true;
    }
    if (e.count >= limit) return false;
    e.count++;
    return true;
  };
}

// Order form: 5 submissions per 10 minutes per client
export const orderLimiter = createRateLimiter(5, 10 * 60 * 1000);