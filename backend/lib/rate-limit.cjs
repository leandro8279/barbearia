function createRateLimiter({windowMs, maxAttempts, maxKeys = 10000, clock = Date.now}) {
  const attemptsByKey = new Map()

  function activeAttempts(key, now) {
    const cutoff = now - windowMs
    const active = (attemptsByKey.get(key) || []).filter(at => at > cutoff)
    if (active.length) attemptsByKey.set(key, active)
    else attemptsByKey.delete(key)
    return active
  }

  function status(key) {
    const normalizedKey = String(key || 'unknown')
    const now = clock()
    const attempts = activeAttempts(normalizedKey, now)
    return {
      allowed: attempts.length < maxAttempts,
      retryAfterMs: attempts.length >= maxAttempts ? Math.max(0, attempts[0] + windowMs - now) : 0
    }
  }

  function consume(key) {
    const normalizedKey = String(key || 'unknown')
    const currentStatus = status(normalizedKey)
    if (!currentStatus.allowed) return currentStatus

    const now = clock()
    const attempts = attemptsByKey.get(normalizedKey) || []
    if (!attempts.length && attemptsByKey.size >= maxKeys) {
      for (const savedKey of attemptsByKey.keys()) {
        activeAttempts(savedKey, now)
      }
      if (attemptsByKey.size >= maxKeys) attemptsByKey.delete(attemptsByKey.keys().next().value)
    }
    attemptsByKey.set(normalizedKey, [...attempts, now])
    return {allowed: true, retryAfterMs: 0}
  }

  return {status, consume}
}

module.exports = {createRateLimiter}
