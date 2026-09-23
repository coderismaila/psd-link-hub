interface Bucket {
  failures: number
  resetAt: number
}

/**
 * Failed attempts, held in memory. Good enough for a single-instance deployment, which is what
 * the SQLite file already implies; behind several instances each would count separately, so this
 * would need to move into shared storage.
 */
const buckets = new Map<string, Bucket>()

/** Keeps the map from growing without bound when many different keys are tried. */
function prune(now: number) {
  if (buckets.size < 500) return

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitVerdict {
  limited: boolean
  retryAfterSeconds: number
}

/** Reads the current state without counting an attempt. Call before doing any real work. */
export function checkRateLimit(key: string, limit: number): RateLimitVerdict {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    return { limited: false, retryAfterSeconds: 0 }
  }

  return bucket.failures >= limit
    ? { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
    : { limited: false, retryAfterSeconds: 0 }
}

/** Counts one failure against a key, starting a fresh window if the last one has expired. */
export function recordFailure(key: string, windowMs: number) {
  const now = Date.now()
  prune(now)

  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { failures: 1, resetAt: now + windowMs })
    return
  }

  bucket.failures += 1
}

/** Clears a key. Called on a successful sign-in so one typo does not haunt a real user. */
export function clearFailures(key: string) {
  buckets.delete(key)
}
