import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { PhotographerRank } from '../src/modules/photographer/photographer-rank.domain';
import { DomainError } from '../src/shared/platform/exceptions/domain.error';

test('rank and commission follow completed booking thresholds (D3, D4)', () => {
  const cases: [number, string, number][] = [
    [0, 'newbie', 10],
    [9, 'newbie', 10],
    [10, 'bronze', 9],
    [29, 'bronze', 9],
    [30, 'silver', 8],
    [59, 'silver', 8],
    [60, 'gold', 7],
    [119, 'gold', 7],
    [120, 'diamond', 5],
    [5000, 'diamond', 5],
  ];
  for (const [completed, rank, commission] of cases)
    assert.deepEqual(
      PhotographerRank.of(completed),
      { rank, commission_percent: commission },
      `${completed} completed bookings`,
    );
});

test('rank rejects a negative or fractional booking count', () => {
  for (const completed of [-1, 1.5])
    assert.throws(
      () => PhotographerRank.of(completed),
      (error) => error instanceof DomainError && error.code === 'invalid',
    );
});
