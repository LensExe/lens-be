export interface ComputeRetryDelayWithJitterParams {
  retryCount: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Calculate a jittered retry delay to avoid simultaneous retries.
 *
 * @param param Input object containing the fields retryCount, baseDelayMs, maxDelayMs cho compute retry delay with jitter.
 * @returns Result returned by `round`.
 */
export const computeRetryDelayWithJitter = ({
  retryCount,
  baseDelayMs,
  maxDelayMs,
}: ComputeRetryDelayWithJitterParams): number => {
  const attempt = Math.max(0, retryCount - 1);
  const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
  const jitter = Math.random() * Math.min(baseDelayMs, maxDelayMs - backoff);
  return Math.round(backoff + jitter);
};
