import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeVerifiedSubscriptionTransaction,
  SubscriptionTransactionError,
} from './appleSubscriptionTransaction';

const expectedAccountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    productId: 'com.alaniselin.numisma.pro.monthly',
    transactionId: '2000000123456789',
    originalTransactionId: '2000000123456789',
    appAccountToken: expectedAccountToken,
    expiresDate: 1_800_000_000_000,
    environment: 'Sandbox',
    ...overrides,
  };
}

test('normalizes an Apple-verified allowed subscription transaction', () => {
  const normalized = normalizeVerifiedSubscriptionTransaction(transaction(), expectedAccountToken);

  assert.deepEqual(normalized, {
    productId: 'com.alaniselin.numisma.pro.monthly',
    transactionId: '2000000123456789',
    originalTransactionId: '2000000123456789',
    appAccountToken: expectedAccountToken,
    expiresAt: '2027-01-15T08:00:00.000Z',
    environment: 'sandbox',
  });
});

test('rejects a verified transaction assigned to another Firebase account token', () => {
  assert.throws(
    () => normalizeVerifiedSubscriptionTransaction(transaction({ appAccountToken: 'a3e3dbde-7d47-41a8-a173-5a0ac6b07e1e' }), expectedAccountToken),
    (error: unknown) => error instanceof SubscriptionTransactionError && error.code === 'subscription/account-token-mismatch',
  );
});

test('rejects malformed account-token bindings even when both values match', () => {
  assert.throws(
    () => normalizeVerifiedSubscriptionTransaction(
      transaction({ appAccountToken: 'firebase-user-123' }),
      'firebase-user-123',
    ),
    (error: unknown) => error instanceof SubscriptionTransactionError
      && error.code === 'subscription/invalid-transaction',
  );
});

test('rejects products and expiry data outside the Pro subscription contract', () => {
  assert.throws(
    () => normalizeVerifiedSubscriptionTransaction(transaction({ productId: 'com.alaniselin.numisma.pro.weekly' }), expectedAccountToken),
    (error: unknown) => error instanceof SubscriptionTransactionError && error.code === 'subscription/product-not-allowed',
  );
  assert.throws(
    () => normalizeVerifiedSubscriptionTransaction(transaction({ expiresDate: 'tomorrow' }), expectedAccountToken),
    (error: unknown) => error instanceof SubscriptionTransactionError && error.code === 'subscription/invalid-transaction',
  );
  assert.throws(
    () => normalizeVerifiedSubscriptionTransaction(transaction({ expiresDate: Number.MAX_VALUE }), expectedAccountToken),
    (error: unknown) => error instanceof SubscriptionTransactionError && error.code === 'subscription/invalid-transaction',
  );
});

test('rejects non-integer Apple timestamps instead of rounding them during normalization', () => {
  for (const overrides of [
    { expiresDate: 1_800_000_000_000.5 },
    { revocationDate: 1_799_999_000_000.5 },
  ]) {
    assert.throws(
      () => normalizeVerifiedSubscriptionTransaction(transaction(overrides), expectedAccountToken),
      (error: unknown) => error instanceof SubscriptionTransactionError
        && error.code === 'subscription/invalid-transaction',
    );
  }
});

test('rejects malformed Apple transaction identifiers', () => {
  for (const overrides of [
    { transactionId: 'transaction-123' },
    { originalTransactionId: '2000000123456789.1' },
    { transactionId: '1'.repeat(65) },
  ]) {
    assert.throws(
      () => normalizeVerifiedSubscriptionTransaction(transaction(overrides), expectedAccountToken),
      (error: unknown) => error instanceof SubscriptionTransactionError
        && error.code === 'subscription/invalid-transaction',
    );
  }
});
