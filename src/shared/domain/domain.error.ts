export class DomainError extends Error {
  constructor(
    public readonly code:
      'invalid' | 'forbidden' | 'missing' | 'conflict' | 'unavailable',
    message: string,
  ) {
    super(message);
  }
}

/**
 * Throw a domain error when a condition is not met.
 *
 * @param condition Value used by the operation: condition.
 * @param message Command or query message to execute.
 * @param code Business or configuration code to process.
 * @returns No value is returned.
 */
export function ensure(
  condition: unknown,
  message: string,
  code: DomainError['code'] = 'invalid',
): asserts condition {
  if (!condition) throw new DomainError(code, message);
}
