import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Customer } from '../src/modules/customer/customer.domain';

test('customer styles are normalized before persistence', () => {
  assert.deepEqual(Customer.normalizeStyles([' Wedding ', 'PORTRAIT']), [
    'wedding',
    'portrait',
  ]);
});

test('customer styles cannot be empty or duplicated after normalization', () => {
  assert.throws(
    () => Customer.normalizeStyles(['wedding', ' Wedding ']),
    /must be unique/,
  );
  assert.throws(() => Customer.normalizeStyles(['   ']), /must not be empty/);
});

test('customer styles must belong to the shared photography vocabulary', () => {
  assert.deepEqual(Customer.normalizeStyles([' Wedding ', 'PORTRAIT']), [
    'wedding',
    'portrait',
  ]);
  assert.throws(
    () => Customer.normalizeStyles(['unknown-style']),
    /Unsupported photography style/,
  );
});

test('blank customer locations are stored as null', () => {
  assert.equal(Customer.normalizeLocation('  Hà Nội  '), 'Hà Nội');
  assert.equal(Customer.normalizeLocation('   '), null);
  assert.equal(Customer.normalizeLocation(null), null);
});
