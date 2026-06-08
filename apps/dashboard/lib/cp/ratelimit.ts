// In-memory sliding-window rate limiter. Single-node (self-host) friendly; back it
// with Redis for multi-instance. Protects the control plane from brute-force (account
// takeover) and abuse.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;

  // Bound memory: prune expired buckets occasionally.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  }

  const ok = b.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - b.count),
    retryAfter: ok ? 0 : Math.ceil((b.resetAt - now) / 1000),
  };
}

// Identify a caller by IP (proxy-aware) + the bearer-token prefix, so one leaked IP
// or token can't exhaust everyone's quota.
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") || "local").trim();
  const auth = req.headers.get("authorization") || "";
  return `${scope}:${ip}:${auth.slice(7, 31)}`;
}

// Returns a 429 Response if over the limit, else null (proceed).
export function limited(
  req: Request,
  scope: string,
  limit: number,
  windowMs = 60_000,
): Response | null {
  const r = rateLimit(clientKey(req, scope), limit, windowMs);
  if (r.ok) return null;
  return Response.json(
    { error: "rate limit exceeded — slow down" },
    { status: 429, headers: { "retry-after": String(r.retryAfter) } },
  );
}
