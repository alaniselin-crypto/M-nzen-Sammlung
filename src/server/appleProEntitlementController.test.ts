import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveAppleProEntitlementRequest,
  type AppleProEntitlementControllerDependencies,
} from './appleProEntitlementController';

const firebaseUid = 'firebase-user-123';
const signedTransaction = 'signed-apple-transaction';
const accountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';

function dependencies(
  overrides: Partial<AppleProEntitlementControllerDependencies> = {},
): AppleProEntitlementControllerDependencies {
  return {
    expectedEnvironment: 'sandbox',
    now: () => new Date('2027-01-15T07:59:59.999Z'),
    accountTokens: {
      async getForFirebaseUid() {
        return accountToken;
      },
    },
    entitlements: {
      async recordForFirebaseUid() {
        // Default no-op store; focused tests override this dependency.
      },
    },
    verifier: {
      async verifyAndDecodeTransaction() {
        return {
          productId: 'com.alaniselin.numisma.pro.monthly',
          transactionId: '2000000123456789',
          originalTransactionId: '2000000123456789',
          appAccountToken: accountToken,
          expiresDate: 1_800_000_000_000,
          environment: 'Sandbox',
        };
      },
    },
    ...overrides,
  };
}

test('returns a minimal active entitlement for a valid authenticated request', async () => {
  assert.deepEqual(await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies(),
  ), {
    status: 200,
    body: {
      active: true,
      productId: 'com.alaniselin.numisma.pro.monthly',
      expiresAt: '2027-01-15T08:00:00.000Z',
    },
  });
});

test('records an Apple-verified active state for later desktop access', async () => {
  const recorded: Array<{ uid: string; entitlement: unknown }> = [];
  const entitlements = {
    async recordForFirebaseUid(uid: string, entitlement: unknown) {
      recorded.push({ uid, entitlement });
    },
  };

  await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({ entitlements }),
  );

  assert.deepEqual(recorded, [
    {
      uid: firebaseUid,
      entitlement: {
        schemaVersion: 1,
        status: 'active',
        source: 'app-store',
        environment: 'sandbox',
        productId: 'com.alaniselin.numisma.pro.monthly',
        originalTransactionId: '2000000123456789',
        latestTransactionId: '2000000123456789',
        expiresAt: '2027-01-15T08:00:00.000Z',
        trialEndsAt: null,
        updatedAt: '2027-01-15T07:59:59.999Z',
      },
    },
  ]);
});

test('records an Apple-verified expired state with the complete persistence schema', async () => {
  const recorded: unknown[] = [];
  const result = await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({
      now: () => new Date('2027-01-15T08:00:00.000Z'),
      entitlements: {
        async recordForFirebaseUid(_uid, entitlement) {
          recorded.push(entitlement);
        },
      },
    }),
  );

  assert.deepEqual(result, {
    status: 200,
    body: { active: false, reason: 'expired' },
  });
  assert.deepEqual(recorded, [{
    schemaVersion: 1,
    status: 'expired',
    source: 'app-store',
    environment: 'sandbox',
    productId: 'com.alaniselin.numisma.pro.monthly',
    originalTransactionId: '2000000123456789',
    latestTransactionId: '2000000123456789',
    expiresAt: '2027-01-15T08:00:00.000Z',
    trialEndsAt: null,
    updatedAt: '2027-01-15T08:00:00.000Z',
  }]);
});

test('records an Apple-verified revoked state with the complete persistence schema', async () => {
  const recorded: unknown[] = [];
  const result = await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({
      entitlements: {
        async recordForFirebaseUid(_uid, entitlement) {
          recorded.push(entitlement);
        },
      },
      verifier: {
        async verifyAndDecodeTransaction() {
          return {
            productId: 'com.alaniselin.numisma.pro.yearly',
            transactionId: '2000000123456790',
            originalTransactionId: '2000000123456789',
            appAccountToken: accountToken,
            expiresDate: 1_800_000_000_000,
            revocationDate: 1_799_999_999_000,
            environment: 'Sandbox',
          };
        },
      },
    }),
  );

  assert.deepEqual(result, {
    status: 200,
    body: { active: false, reason: 'revoked' },
  });
  assert.deepEqual(recorded, [{
    schemaVersion: 1,
    status: 'revoked',
    source: 'app-store',
    environment: 'sandbox',
    productId: 'com.alaniselin.numisma.pro.yearly',
    originalTransactionId: '2000000123456789',
    latestTransactionId: '2000000123456790',
    expiresAt: '2027-01-15T08:00:00.000Z',
    trialEndsAt: null,
    updatedAt: '2027-01-15T07:59:59.999Z',
  }]);
});

test('does not persist an environment-mismatched transaction over trusted server state', async () => {
  let recordCalls = 0;
  const result = await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({
      expectedEnvironment: 'production',
      entitlements: {
        async recordForFirebaseUid() {
          recordCalls += 1;
        },
      },
    }),
  );

  assert.deepEqual(result, {
    status: 200,
    body: { active: false, reason: 'environment-mismatch' },
  });
  assert.equal(recordCalls, 0);
});

test('fails closed when a verified entitlement cannot be recorded', async () => {
  assert.deepEqual(await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({
      entitlements: {
        async recordForFirebaseUid() {
          throw new Error('sensitive database detail');
        },
      },
    }),
  ), {
    status: 503,
    body: { active: false, error: 'subscription/unavailable' },
  });
});

test('rejects malformed request bodies before account lookup or verification', async () => {
  let lookupCalls = 0;
  let verificationCalls = 0;
  const deps = dependencies({
    accountTokens: {
      async getForFirebaseUid() {
        lookupCalls += 1;
        return accountToken;
      },
    },
    verifier: {
      async verifyAndDecodeTransaction() {
        verificationCalls += 1;
        return {};
      },
    },
  });

  for (const body of [
    null,
    [],
    {},
    { signedTransaction: '   ' },
    { signedTransaction, unexpected: true },
  ]) {
    assert.deepEqual(await resolveAppleProEntitlementRequest(firebaseUid, body, deps), {
      status: 400,
      body: { active: false, error: 'subscription/invalid-request' },
    });
  }
  assert.equal(lookupCalls, 0);
  assert.equal(verificationCalls, 0);
});

test('returns inactive subscription states without internal transaction identifiers', async () => {
  const result = await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({
      now: () => new Date('2027-01-15T08:00:00.000Z'),
    }),
  );

  assert.deepEqual(result, {
    status: 200,
    body: { active: false, reason: 'expired' },
  });
  assert.equal('originalTransactionId' in result.body, false);
});

test('maps verifier and token-store failures to one non-sensitive unavailable response', async () => {
  const unavailable = {
    status: 503,
    body: { active: false, error: 'subscription/unavailable' },
  } as const;

  assert.deepEqual(await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({
      verifier: {
        async verifyAndDecodeTransaction() {
          throw new Error('sensitive verifier detail');
        },
      },
    }),
  ), unavailable);

  assert.deepEqual(await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({
      accountTokens: {
        async getForFirebaseUid() {
          throw new Error('sensitive database detail');
        },
      },
    }),
  ), unavailable);
});

test('fails closed when controller time or environment dependencies are invalid', async () => {
  assert.deepEqual(await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({ now: () => new Date('invalid') }),
  ), {
    status: 503,
    body: { active: false, error: 'subscription/unavailable' },
  });

  assert.deepEqual(await resolveAppleProEntitlementRequest(
    firebaseUid,
    { signedTransaction },
    dependencies({ expectedEnvironment: 'staging' as 'sandbox' }),
  ), {
    status: 503,
    body: { active: false, error: 'subscription/unavailable' },
  });
});
