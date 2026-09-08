/** Client metadata extracted from an incoming request for audit / anti-cheat. */
export interface ClientContext {
  /** Best-effort client IP (X-Forwarded-For first hop, else socket address). */
  ipAddress: string | null;
  /** Raw User-Agent header, or null when absent. */
  userAgent: string | null;
  /** Client-generated device fingerprint (FingerprintJS), or null when absent. */
  fingerprint: string | null;
}
