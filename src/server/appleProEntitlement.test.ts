import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAppleProEntitlement } from './appleProEntitlement';
import type { NormalizedAppleSubscriptionTransaction } from './appleSubscriptionTransaction';

const transaction: NormalizedAppleSubscriptionTransaction = {
  productId: 'com.alaniselin.numisma.pro.monthly',
  transactionId: '2000000123456789',
  originalTransactionId: '2000000123456789',
  appAccountToken: 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7',
  expiresAt: '2027-01-15T08:00:00.000Z',
  environment: 'sandbox',
};

test('grants Pro only for an unexpired transaction from the expected Apple environment', () => {
  assert.deepEqual(
    evaluateAppleProEntitlement(transaction, 'sandbox', new Date('2027-01-15T07:59:59.999Z')),
    {
      active: true,
      productId: 'com.alaniselin.numisma.pro.monthly',
      originalTransactionId: '2000000123456789',
      latestTransactionId: '2000000123456789',
      expiresAt: '2027-01-15T08:00:00.000Z',
      environment: 'sandbox',
    },
  );

  assert.deepEqual(
    evaluateAppleProEntitlement(transaction, 'sandbox', new Date('2027-01-15T08:00:00.000Z')),
    {
      active: false,
      reason: 'expired',
      productId: 'com.alaniselin.numisma.pro.monthly',
      originalTransactionId: '2000000123456789',
      latestTransactionId: '2000000123456789',
      expiresAt: '2027-01-15T08:00:00.000Z',
      environment: 'sandbox',
    },
  );

  assert.deepEqual(
    evaluateAppleProEntitlement(transaction, 'production', new Date('2027-01-15T07:59:59.999Z')),
    { active: false, reason: 'environment-mismatch' },
  );
});

test('fails closed when expiry or evaluation time is invalid', () => {
  assert.deepEqual(
    evaluateAppleProEntitlement({ ...transaction, expiresAt: 'invalid' }, 'sandbox', new Date()),
    { active: false, reason: 'invalid-time' },
  );
  assert.deepEqual(
    evaluateAppleProEntitlement(transaction, 'sandbox', new Date('invalid')),
    { active: false, reason: 'invalid-time' },
  );
});
