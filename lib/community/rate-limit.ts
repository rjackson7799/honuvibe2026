// In-memory token bucket. Per Vercel function instance — acceptable for MVP.
// Swap to Vercel KV / Redis when we need cross-instance fairness.

type Bucket = { tokens: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function tryConsume(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { tokens: limit - 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.tokens <= 0) return false;
  existing.tokens -= 1;
  return true;
}
