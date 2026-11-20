import { IRateLimiter, RateLimitResult } from './RateLimiterInterface';

export interface InMemoryRateLimiterOptions {
  windowMs: number;
  maxAttempts: number;
  /** Relógio injetável (útil em testes). */
  now?: () => number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const SWEEP_THRESHOLD = 10_000;

/**
 * Janela fixa por chave, em memória do processo. Serve para uma instância só:
 * com várias réplicas, troque por uma implementação em Redis (mesma interface).
 */
export class InMemoryRateLimiter implements IRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs: number;
  private readonly maxAttempts: number;
  private readonly now: () => number;

  constructor({ windowMs, maxAttempts, now = Date.now }: InMemoryRateLimiterOptions) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.now = now;
  }

  async consume(key: string): Promise<RateLimitResult> {
    const now = this.now();
    if (this.buckets.size >= SWEEP_THRESHOLD) this.sweep(now);

    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true };
    }

    if (bucket.count >= this.maxAttempts) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now };
    }

    bucket.count += 1;
    return { allowed: true };
  }

  /** Remove janelas expiradas para a memória não crescer sem limite. */
  private sweep(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  async status(key: string): Promise<RateLimitResult> {
    const now = this.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now || bucket.count < this.maxAttempts) return { allowed: true };

    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
}
