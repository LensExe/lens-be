import { ensure } from '@shared/platform/exceptions/domain.error';
import {
  isPhotographyStyle,
  type PhotographyStyle,
} from '@shared/domain/values/photography-style.values';

export class Customer {
  static readonly MAX_PREFERRED_STYLES = 10;

  /**
   * Normalize the customer description before saving it.
   *
   * @param description Value used by the operation: description.
   * @returns Result of the operation described above.
   */
  static normalizeDescription(description: string | null): string | null {
    if (description === null) return null;

    const normalized = description.trim();
    return normalized || null;
  }

  /**
   * Validate the customer’s preferred photography styles.
   * Throw an error if the number of styles exceeds the limit.
   *
   * @param styles Photography styles to process.
   * @returns No value is returned.
   * @throws {DomainError} Thrown when input is invalid, a business condition is not met, or the current state or data conflicts with the operation.
   */
  static assertStylesValid(styles: string[]): void {
    ensure(
      styles.length <= Customer.MAX_PREFERRED_STYLES,
      `Maximum ${Customer.MAX_PREFERRED_STYLES} styles allowed`,
      'conflict',
    );

    const normalized = styles.map((style) => style.trim().toLowerCase());
    ensure(
      normalized.every(Boolean),
      'Preferred styles must not be empty',
      'invalid',
    );
    ensure(
      normalized.every(isPhotographyStyle),
      'Unsupported photography style',
      'invalid',
    );
    ensure(
      new Set(normalized).size === normalized.length,
      'Preferred styles must be unique',
      'invalid',
    );
  }

  /**
   * Normalize and deduplicate the list of photography styles.
   *
   * @param styles Photography styles to process.
   * @returns Result returned by `map`.
   */
  static normalizeStyles(styles: string[]): PhotographyStyle[] {
    Customer.assertStylesValid(styles);
    return styles.map((style) =>
      style.trim().toLowerCase(),
    ) as PhotographyStyle[];
  }

  /**
   * Normalize the location name for consistent search and matching.
   *
   * @param location Location.
   * @returns Result of the operation described above.
   */
  static normalizeLocation(location: string | null): string | null {
    if (location === null) return null;

    const normalized = location.trim();
    return normalized || null;
  }
}
