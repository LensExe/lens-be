import { ensure } from '@shared/domain/domain.error';

/** Ordering and membership rules for media IDs stored in a portfolio. */
export class Portfolio {
  static add(items: readonly string[], mediaId: string) {
    ensure(!items.includes(mediaId), 'Media already belongs to portfolio');
    return [...items, mediaId];
  }

  static remove(items: readonly string[], mediaId: string) {
    ensure(items.includes(mediaId), 'Portfolio item not found', 'missing');
    return items.filter((id) => id !== mediaId);
  }

  static reorder(items: readonly string[], requested: readonly string[]) {
    ensure(
      new Set(requested).size === items.length &&
        requested.length === items.length &&
        items.every((id) => requested.includes(id)),
      'Provide every item ID exactly once',
    );
    return [...requested];
  }
}
