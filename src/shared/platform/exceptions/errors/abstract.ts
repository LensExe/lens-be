/**
 * Base abstract exception class for all custom domain / application exceptions.
 */
export class AbstractException extends Error {
  /** Unique error code for identification (e.g. 'BOOKING_NOT_FOUND') */
  readonly code: string;

  /** Additional metadata for debugging or error details */
  readonly metadata?: Record<string, unknown>;

  /** Optional HTTP status override for REST responses (defaults to 500) */
  readonly httpStatus?: number;

  constructor(
    message: string,
    code: string,
    metadata?: Record<string, unknown>,
    httpStatus?: number,
  ) {
    super(message);
    this.name = code;
    this.code = code;
    this.metadata = metadata;
    this.httpStatus = httpStatus;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Map error details to a JSON structure that can be returned to the client.
   *
   * @returns Result returned by `stringify`.
   */
  toJSON(): string {
    return JSON.stringify({
      message: this.message,
      code: this.code,
      metadata: this.metadata,
    });
  }

  /**
   * Get the root exception wrapped by the current error.
   *
   * @returns Result of the operation described above.
   */
  getOriginalError(): Error | undefined {
    return this.metadata?.originalError as Error | undefined;
  }
}
