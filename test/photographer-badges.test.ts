import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { PhotographerBadges } from '../src/modules/photographer/photographer-badge.domain';

const base = {
  averageRating: 0,
  averagePunctuality: 0,
  visibleReviews: 0,
  returnCustomers: 0,
};

test('no badges for a new photographer', () => {
  assert.deepEqual(PhotographerBadges.of(base), []);
});

test('top-rated needs average >= 4.8 over at least 10 visible reviews (D11)', () => {
  const rated = { ...base, averageRating: 4.8, visibleReviews: 10 };
  assert.deepEqual(PhotographerBadges.of(rated), ['top-rated']);
  assert.deepEqual(
    PhotographerBadges.of({ ...rated, averageRating: 4.79 }),
    [],
  );
  assert.deepEqual(PhotographerBadges.of({ ...rated, visibleReviews: 9 }), []);
});

test('punctual needs punctuality average >= 4.8 over at least 10 visible reviews (D11)', () => {
  const punctual = { ...base, averagePunctuality: 4.8, visibleReviews: 10 };
  assert.deepEqual(PhotographerBadges.of(punctual), ['punctual']);
  assert.deepEqual(
    PhotographerBadges.of({ ...punctual, averagePunctuality: 4.7 }),
    [],
  );
  assert.deepEqual(
    PhotographerBadges.of({ ...punctual, visibleReviews: 9 }),
    [],
  );
});

test('loyal needs at least 5 returning customers (D11)', () => {
  assert.deepEqual(PhotographerBadges.of({ ...base, returnCustomers: 5 }), [
    'loyal',
  ]);
  assert.deepEqual(PhotographerBadges.of({ ...base, returnCustomers: 4 }), []);
});

test('badges are returned in a stable order', () => {
  assert.deepEqual(
    PhotographerBadges.of({
      averageRating: 5,
      averagePunctuality: 5,
      visibleReviews: 20,
      returnCustomers: 8,
    }),
    ['top-rated', 'punctual', 'loyal'],
  );
});
