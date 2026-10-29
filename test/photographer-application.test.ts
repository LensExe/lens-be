import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { PhotographerApplication } from '../src/modules/photographer/photographer.domain';
import { DomainError } from '../src/shared/platform/exceptions/domain.error';

/**
 * Check that the operation throws a conflict with the expected error code.
 *
 * @param error Caught error to convert or log.
 * @returns Result of the operation described above.
 */
const conflict = (error: unknown) =>
  error instanceof DomainError && error.code === 'conflict';

test('a customer can submit a first application or resubmit after rejection', () => {
  assert.doesNotThrow(() => PhotographerApplication.assertCanSubmit(undefined));
  assert.doesNotThrow(() =>
    PhotographerApplication.assertCanSubmit('rejected'),
  );
});

test('a pending or verified application cannot be submitted again', () => {
  assert.throws(
    () => PhotographerApplication.assertCanSubmit('pending'),
    conflict,
  );
  assert.throws(
    () => PhotographerApplication.assertCanSubmit('verified'),
    conflict,
  );
});

test('only pending applications can be approved or rejected', () => {
  assert.doesNotThrow(() =>
    PhotographerApplication.assertReviewable('pending'),
  );
  for (const status of ['verified', 'rejected', 'unverified'] as const)
    assert.throws(
      () => PhotographerApplication.assertReviewable(status),
      conflict,
    );
});
