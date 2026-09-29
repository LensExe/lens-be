import { ensure } from '@shared/domain/domain.error';

/** Kiểm tra và trả về số tiền VND hợp lệ. */
export function money(value: number) {
  ensure(
    Number.isSafeInteger(value) && value > 0 && value <= 9e12,
    'Invalid VND amount',
  );
  return value;
}
