import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Rank } from '../src/modules/photographer/rank.domain';
import { DomainError } from '../src/shared/platform/exceptions/domain.error';

/** Danh mục mặc định giống seed của migration 006 (D3, D4). */
const tiers = [
  {
    code: 'newbie',
    name: 'Tân binh',
    min_completed: 0,
    commission_percent: 10,
  },
  { code: 'bronze', name: 'Đồng', min_completed: 10, commission_percent: 9 },
  { code: 'silver', name: 'Bạc', min_completed: 30, commission_percent: 8 },
  { code: 'gold', name: 'Vàng', min_completed: 60, commission_percent: 7 },
  {
    code: 'diamond',
    name: 'Kim cương',
    min_completed: 120,
    commission_percent: 5,
  },
];

const invalid = (error: unknown) =>
  error instanceof DomainError && error.code === 'invalid';

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
  for (const [completed, code, commission] of cases) {
    const tier = Rank.of(completed, tiers);
    assert.equal(tier.code, code, `${completed} completed bookings`);
    assert.equal(tier.commission_percent, commission);
  }
});

test('tier order in the catalog does not matter', () => {
  assert.equal(Rank.of(35, [...tiers].reverse()).code, 'silver');
});

test('rank rejects a negative or fractional booking count', () => {
  for (const completed of [-1, 1.5])
    assert.throws(() => Rank.of(completed, tiers), invalid);
});

test('the catalog must start at 0 completed bookings', () => {
  assert.throws(() => Rank.assertCatalog(tiers.slice(1)), invalid);
  assert.doesNotThrow(() => Rank.assertCatalog(tiers));
});
