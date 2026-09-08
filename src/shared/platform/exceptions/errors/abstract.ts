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

  toJSON(): string {
    return JSON.stringify({
      message: this.message,
      code: this.code,
      metadata: this.metadata,
    });
  }

  getOriginalError(): Error | undefined {
    return this.metadata?.originalError as Error | undefined;
  }
}
