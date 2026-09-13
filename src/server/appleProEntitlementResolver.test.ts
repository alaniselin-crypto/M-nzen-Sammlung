import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAppleProEntitlement } from './appleProEntitlementResolver';

const request = {
  signedTransaction: 'signed-apple-transaction',
  expectedAppAccountToken: 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7',
  expectedEnvironment: 'sandbox' as const,
  now: new Date('2027-01-15T07:59:59.999Z'),
};

test('resolves an active entitlement only from verifier-decoded transaction data', async () => {
  const verifiedInputs: string[] = [];
  const verifier = {
    async verifyAndDecodeTransaction(signedTransaction: string): Promise<unknown> {
      verifiedInputs.push(signedTransaction);
      return {
        productId: 'com.alaniselin.numisma.pro.monthly',
        transactionId: '2000000123456789',
        originalTransactionId: '2000000123456789',
        appAccountToken: request.expectedAppAccountToken,
        expiresDate: 1_800_000_000_000,
        environment: 'Sandbox',
      };
    },
  };

  assert.deepEqual(await resolveAppleProEntitlement(request, verifier), {
    active: true,
    productId: 'com.alaniselin.numisma.pro.monthly',
    originalTransactionId: '2000000123456789',
    latestTransactionId: '2000000123456789',
    expiresAt: '2027-01-15T08:00:00.000Z',
    environment: 'sandbox',
  });
  assert.deepEqual(verifiedInputs, [request.signedTransaction]);
});

test('fails closed when Apple marks a verified transaction as revoked', async () => {
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      return {
        productId: 'com.alaniselin.numisma.pro.monthly',
        transactionId: '2000000123456789',
        originalTransactionId: '2000000123456789',
        appAccountToken: request.expectedAppAccountToken,
        expiresDate: 1_800_000_000_000,
        revocationDate: 1_799_999_000_000,
        environment: 'Sandbox',
      };
    },
  };

  assert.deepEqual(
    await resolveAppleProEntitlement(request, verifier),
    {
      active: false,
      reason: 'revoked',
      productId: 'com.alaniselin.numisma.pro.monthly',
      originalTransactionId: '2000000123456789',
      latestTransactionId: '2000000123456789',
      expiresAt: '2027-01-15T08:00:00.000Z',
      environment: 'sandbox',
    },
  );
});

test('fails closed when Apple verification rejects the signed transaction', async () => {
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      throw new Error('signature verification failed');
    },
  };

  assert.deepEqual(
    await resolveAppleProEntitlement(request, verifier),
    { active: false, reason: 'verification-failed' },
  );
});

test('rejects a missing signed transaction without throwing', async () => {
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      throw new Error('must not be called');
    },
  };

  assert.deepEqual(
    await resolveAppleProEntitlement(
      { ...request, signedTransaction: undefined as unknown as string },
      verifier,
    ),
    { active: false, reason: 'verification-failed' },
  );
});

test('rejects an empty signed transaction before invoking the verifier', async () => {
  let verificationCalls = 0;
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      verificationCalls += 1;
      return {
        productId: 'com.alaniselin.numisma.pro.monthly',
        transactionId: '2000000123456789',
        originalTransactionId: '2000000123456789',
        appAccountToken: request.expectedAppAccountToken,
        expiresDate: 1_800_000_000_000,
        environment: 'Sandbox',
      };
    },
  };

  assert.deepEqual(
    await resolveAppleProEntitlement({ ...request, signedTransaction: '   ' }, verifier),
    { active: false, reason: 'verification-failed' },
  );
  assert.equal(verificationCalls, 0);
});

test('rejects an oversized signed transaction before invoking the verifier', async () => {
  let verificationCalls = 0;
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      verificationCalls += 1;
      return {};
    },
  };

  assert.deepEqual(
    await resolveAppleProEntitlement({
      ...request,
      signedTransaction: 'a'.repeat(64 * 1024 + 1),
    }, verifier),
    { active: false, reason: 'verification-failed' },
  );
  assert.equal(verificationCalls, 0);
});

test('rejects malformed verification context before invoking the verifier', async () => {
  let verificationCalls = 0;
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      verificationCalls += 1;
      return {};
    },
  };
  const invalidRequests = [
    { expectedAppAccountToken: 'not-a-uuid' },
    { expectedEnvironment: 'staging' },
    { now: new Date('invalid') },
  ];

  for (const invalidRequest of invalidRequests) {
    assert.deepEqual(
      await resolveAppleProEntitlement({
        ...request,
        ...invalidRequest,
      } as Parameters<typeof resolveAppleProEntitlement>[0], verifier),
      { active: false, reason: 'verification-failed' },
    );
  }
  assert.equal(verificationCalls, 0);
});
