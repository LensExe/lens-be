import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  Badge,
  type BadgeRule,
} from '../src/modules/photographer/badge.domain';

/** Danh mục mặc định giống seed của migration 006 (D11). */
const definitions: BadgeRule[] = [
  {
    code: 'top-rated',
    metric: 'average_rating',
    min_value: 4.8,
    min_reviews: 10,
    is_active: true,
  },
  {
    code: 'punctual',
    metric: 'average_punctuality',
    min_value: 4.8,
    min_reviews: 10,
    is_active: true,
  },
  {
    code: 'loyal',
    metric: 'return_customers',
    min_value: 5,
    min_reviews: 0,
    is_active: true,
  },
];

const base = {
  averageRating: 0,
  averagePunctuality: 0,
  visibleReviews: 0,
  returnCustomers: 0,
};

const earned = (stats: typeof base, defs = [...definitions]) =>
  Badge.earned(stats, defs);

test('no badges for a new photographer', () => {
  assert.deepEqual(earned(base), []);
});

test('top-rated needs average >= 4.8 over at least 10 visible reviews (D11)', () => {
  const rated = { ...base, averageRating: 4.8, visibleReviews: 10 };
  assert.deepEqual(earned(rated), ['top-rated']);
  assert.deepEqual(earned({ ...rated, averageRating: 4.79 }), []);
  assert.deepEqual(earned({ ...rated, visibleReviews: 9 }), []);
});

test('punctual needs punctuality average >= 4.8 over at least 10 visible reviews (D11)', () => {
  const punctual = { ...base, averagePunctuality: 4.8, visibleReviews: 10 };
  assert.deepEqual(earned(punctual), ['punctual']);
  assert.deepEqual(earned({ ...punctual, averagePunctuality: 4.7 }), []);
  assert.deepEqual(earned({ ...punctual, visibleReviews: 9 }), []);
});

test('loyal needs at least 5 returning customers (D11)', () => {
  assert.deepEqual(earned({ ...base, returnCustomers: 5 }), ['loyal']);
  assert.deepEqual(earned({ ...base, returnCustomers: 4 }), []);
});

test('inactive definitions are never awarded', () => {
  const defs = definitions.map((d) =>
    d.code === 'loyal' ? { ...d, is_active: false } : d,
  );
  assert.deepEqual(earned({ ...base, returnCustomers: 9 }, defs), []);
});

test('badges follow the catalog order', () => {
  assert.deepEqual(
    earned({
      averageRating: 5,
      averagePunctuality: 5,
      visibleReviews: 20,
      returnCustomers: 8,
    }),
    ['top-rated', 'punctual', 'loyal'],
  );
});
