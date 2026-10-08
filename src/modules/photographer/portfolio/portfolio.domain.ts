import { ensure } from '@shared/domain/domain.error';

/** Ordering and membership rules for media IDs stored in a portfolio. */
export class Portfolio {
  /**
   * Add media to a portfolio after checking ownership and media status.
   *
   * @param items List of items to process.
   * @param mediaId Media ID to process.
   * @returns List of results from the operation.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  static add(items: readonly string[], mediaId: string) {
    ensure(!items.includes(mediaId), 'Media already belongs to portfolio');
    return [...items, mediaId];
  }

  /**
   * Delete a portfolio or portfolio item after checking ownership.
   *
   * @param items List of items to process.
   * @param mediaId Media ID to process.
   * @returns Result returned by `filter`.
   * @throws {DomainError} Thrown when required data is missing or a resource does not exist.
   */
  static remove(items: readonly string[], mediaId: string) {
    ensure(items.includes(mediaId), 'Portfolio item not found', 'missing');
    return items.filter((id) => id !== mediaId);
  }

  /**
   * Update the display order using the supplied list of IDs.
   *
   * @param items List of items to process.
   * @param requested List of requesters to process.
   * @returns List of results from the operation.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
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
