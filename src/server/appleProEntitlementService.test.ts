import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveAuthenticatedAppleProEntitlement,
  type AppleAccountTokenStore,
} from './appleProEntitlementService';

const firebaseUid = 'firebase-user-123';
const serverStoredAccountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

test('binds the verified Apple transaction to the server-stored token for the authenticated user', async () => {
  const lookedUpUids: string[] = [];
  const accountTokens: AppleAccountTokenStore = {
    async getForFirebaseUid(uid) {
      lookedUpUids.push(uid);
      return serverStoredAccountToken;
    },
  };
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      return {
        productId: 'com.alaniselin.numisma.pro.monthly',
        transactionId: '2000000123456789',
        originalTransactionId: '2000000123456789',
        appAccountToken: serverStoredAccountToken,
        expiresDate: 1_800_000_000_000,
        environment: 'Sandbox',
      };
    },
  };

  assert.deepEqual(await resolveAuthenticatedAppleProEntitlement({
    firebaseUid,
    signedTransaction: 'signed-apple-transaction',
    expectedEnvironment: 'sandbox',
    now: new Date('2027-01-15T07:59:59.999Z'),
  }, accountTokens, verifier), {
    active: true,
    productId: 'com.alaniselin.numisma.pro.monthly',
    originalTransactionId: '2000000123456789',
    latestTransactionId: '2000000123456789',
    expiresAt: '2027-01-15T08:00:00.000Z',
    environment: 'sandbox',
  });
  assert.deepEqual(lookedUpUids, [firebaseUid]);
});

test('fails closed without invoking Apple verification when the authenticated user has no token binding', async () => {
  let verificationCalls = 0;
  const accountTokens: AppleAccountTokenStore = {
    async getForFirebaseUid() {
      return null;
    },
  };
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      verificationCalls += 1;
      return {};
    },
  };

  assert.deepEqual(await resolveAuthenticatedAppleProEntitlement({
    firebaseUid,
    signedTransaction: 'signed-apple-transaction',
    expectedEnvironment: 'sandbox',
    now: new Date('2027-01-15T07:59:59.999Z'),
  }, accountTokens, verifier), {
    active: false,
    reason: 'account-token-not-found',
  });
  assert.equal(verificationCalls, 0);
});

test('fails closed when the server-side token lookup fails', async () => {
  const accountTokens: AppleAccountTokenStore = {
    async getForFirebaseUid() {
      throw new Error('database unavailable');
    },
  };
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      throw new Error('must not be called');
    },
  };

  assert.deepEqual(await resolveAuthenticatedAppleProEntitlement({
    firebaseUid,
    signedTransaction: 'signed-apple-transaction',
    expectedEnvironment: 'sandbox',
    now: new Date('2027-01-15T07:59:59.999Z'),
  }, accountTokens, verifier), {
    active: false,
    reason: 'account-token-lookup-failed',
  });
});

test('fails closed before Apple verification when the stored account token is malformed', async () => {
  let verificationCalls = 0;
  const accountTokens: AppleAccountTokenStore = {
    async getForFirebaseUid() {
      return 'not-an-app-account-token';
    },
  };
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      verificationCalls += 1;
      return {};
    },
  };

  assert.deepEqual(await resolveAuthenticatedAppleProEntitlement({
    firebaseUid,
    signedTransaction: 'signed-apple-transaction',
    expectedEnvironment: 'sandbox',
    now: new Date('2027-01-15T07:59:59.999Z'),
  }, accountTokens, verifier), {
    active: false,
    reason: 'account-token-invalid',
  });
  assert.equal(verificationCalls, 0);
});

test('rejects an invalid authenticated Firebase UID before token lookup', async () => {
  let lookupCalls = 0;
  const accountTokens: AppleAccountTokenStore = {
    async getForFirebaseUid() {
      lookupCalls += 1;
      return serverStoredAccountToken;
    },
  };
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      throw new Error('must not be called');
    },
  };

  assert.deepEqual(await resolveAuthenticatedAppleProEntitlement({
    firebaseUid: '   ',
    signedTransaction: 'signed-apple-transaction',
    expectedEnvironment: 'sandbox',
    now: new Date('2027-01-15T07:59:59.999Z'),
  }, accountTokens, verifier), {
    active: false,
    reason: 'invalid-request',
  });
  assert.equal(lookupCalls, 0);

  assert.deepEqual(await resolveAuthenticatedAppleProEntitlement({
    firebaseUid: 'u'.repeat(129),
    signedTransaction: 'signed-apple-transaction',
    expectedEnvironment: 'sandbox',
    now: new Date('2027-01-15T07:59:59.999Z'),
  }, accountTokens, verifier), {
    active: false,
    reason: 'invalid-request',
  });
  assert.equal(lookupCalls, 0);
});

test('rejects malformed entitlement request fields before token lookup', async () => {
  let lookupCalls = 0;
  const accountTokens: AppleAccountTokenStore = {
    async getForFirebaseUid() {
      lookupCalls += 1;
      return serverStoredAccountToken;
    },
  };
  const verifier = {
    async verifyAndDecodeTransaction(): Promise<unknown> {
      throw new Error('must not be called');
    },
  };

  const invalidRequests = [
    { signedTransaction: '   ' },
    { signedTransaction: 'a'.repeat(64 * 1024 + 1) },
    { expectedEnvironment: 'staging' },
    { now: new Date('invalid') },
  ];

  for (const invalidRequest of invalidRequests) {
    assert.deepEqual(await resolveAuthenticatedAppleProEntitlement({
      firebaseUid,
      signedTransaction: 'signed-apple-transaction',
      expectedEnvironment: 'sandbox',
      now: new Date('2027-01-15T07:59:59.999Z'),
      ...invalidRequest,
    } as Parameters<typeof resolveAuthenticatedAppleProEntitlement>[0], accountTokens, verifier), {
      active: false,
      reason: 'invalid-request',
    });
  }
  assert.equal(lookupCalls, 0);
});