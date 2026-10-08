import { ensure } from '@shared/domain/domain.error';

/**
 * Validate and return a valid VND amount.
 *
 * @param value Numeric value used by the operation: value.
 * @returns Processed value.
 * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
 */
export function money(value: number) {
  ensure(
    Number.isSafeInteger(value) && value > 0 && value <= 9e12,
    'Invalid VND amount',
  );
  return value;
}
