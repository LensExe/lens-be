import { ensure } from '@shared/platform/exceptions/domain.error';
import {
  isPhotographyStyle,
  type PhotographyStyle,
} from '@shared/domain/values/photography-style.values';

export class Customer {
  static readonly MAX_PREFERRED_STYLES = 10;

  static normalizeDescription(description: string | null): string | null {
    if (description === null) return null;

    const normalized = description.trim();
    return normalized || null;
  }

  /**
   * Kiểm tra danh sách phong cách yêu thích của khách hàng.
   * Ném lỗi nếu số lượng phong cách vượt quá giới hạn.
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

  static normalizeStyles(styles: string[]): PhotographyStyle[] {
    Customer.assertStylesValid(styles);
    return styles.map((style) =>
      style.trim().toLowerCase(),
    ) as PhotographyStyle[];
  }

  static normalizeLocation(location: string | null): string | null {
    if (location === null) return null;

    const normalized = location.trim();
    return normalized || null;
  }
}
