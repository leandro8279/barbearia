export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

export interface IRateLimiter {
  /** Registra uma tentativa para a chave (ex.: IP) e diz se ela é permitida. */
  consume(key: string): Promise<RateLimitResult>;
}
