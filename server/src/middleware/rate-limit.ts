import { RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  scope: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so the map can't grow unbounded under a
// flood of distinct clients. `.unref()` keeps this timer from holding the
// process open.
const SWEEP_INTERVAL_MS = 60_000;
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweepTimer.unref?.();

const getClientKey = (req: Parameters<RequestHandler>[0]) => {
  if (req.user?.id) return `user:${req.user.id}`;
  // req.ip is derived from the trusted proxy chain (see `trust proxy` in app.ts),
  // so it can't be spoofed by an arbitrary X-Forwarded-For header.
  return `ip:${req.ip || "unknown"}`;
};

const nowMs = () => Date.now();

// Integration tests drive hundreds of auth writes from a single loopback address,
// which would exhaust an IP-keyed bucket and make the suite order/timing
// dependent. Opt out explicitly (never keyed off NODE_ENV alone).
const rateLimitDisabled = process.env.DISABLE_RATE_LIMIT?.trim().toLowerCase() === "true";

export const rateLimit = (options: RateLimitOptions): RequestHandler => {
  const { windowMs, max, scope } = options;

  if (rateLimitDisabled) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const now = nowMs();
    const key = `${scope}:${getClientKey(req)}`;
    const current = buckets.get(key);

    if (!current || now > current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
          requestId: req.requestId
        }
      });
    }

    current.count += 1;
    buckets.set(key, current);
    return next();
  };
};
