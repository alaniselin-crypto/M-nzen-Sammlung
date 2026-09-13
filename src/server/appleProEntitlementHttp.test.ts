import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveFirebaseAuthenticatedAppleProEntitlementRequest,
  type FirebaseAuthenticatedAppleProEntitlementDependencies,
} from './appleProEntitlementHttp';

const firebaseUid = 'firebase-user-123';
const firebaseIdToken = 'firebase-id-token';
const appAccountToken = 'f8a16ceb-0f30-4d8a-ab21-5b9ca54658e7';
const signedTransaction = 'signed-apple-transaction';

function dependencies(
  overrides: Partial<FirebaseAuthenticatedAppleProEntitlementDependencies> = {},
): FirebaseAuthenticatedAppleProEntitlementDependencies {
  return {
    firebaseAuth: {
      async verifyIdToken() {
        return { uid: firebaseUid };
      },
    },
    entitlement: {
      expectedEnvironment: 'sandbox',
      now: () => new Date('2027-01-15T07:59:59.999Z'),
      accountTokens: {
        async getForFirebaseUid() {
          return appAccountToken;
        },
      },
      entitlements: {
        async recordForFirebaseUid() {},
      },
      verifier: {
        async verifyAndDecodeTransaction() {
          return {
            productId: 'com.alaniselin.numisma.pro.monthly',
            transactionId: '2000000123456789',
            originalTransactionId: '2000000123456789',
            appAccountToken,
            expiresDate: 1_800_000_000_000,
            environment: 'Sandbox',
          };
        },
      },
    },
    ...overrides,
  };
}

test('verifies a non-revoked Firebase ID token and binds its uid to the entitlement lookup', async () => {
  const verificationCalls: Array<[string, boolean]> = [];
  const lookedUpUids: string[] = [];
  const deps = dependencies({
    firebaseAuth: {
      async verifyIdToken(idToken, checkRevoked) {
        verificationCalls.push([idToken, checkRevoked]);
        return { uid: firebaseUid };
      },
    },
  });
  deps.entitlement.accountTokens = {
    async getForFirebaseUid(uid) {
      lookedUpUids.push(uid);
      return appAccountToken;
    },
  };

  assert.deepEqual(await resolveFirebaseAuthenticatedAppleProEntitlementRequest(
    `Bearer ${firebaseIdToken}`,
    { signedTransaction },
    deps,
  ), {
    status: 200,
    body: {
      active: true,
      productId: 'com.alaniselin.numisma.pro.monthly',
      expiresAt: '2027-01-15T08:00:00.000Z',
    },
  });
  assert.deepEqual(verificationCalls, [[firebaseIdToken, true]]);
  assert.deepEqual(lookedUpUids, [firebaseUid]);
});

test('rejects missing, malformed, and oversized bearer credentials before Firebase verification', async () => {
  let verificationCalls = 0;
  const deps = dependencies({
    firebaseAuth: {
      async verifyIdToken() {
        verificationCalls += 1;
        return { uid: firebaseUid };
      },
    },
  });

  for (const authorization of [
    undefined,
    '',
    `Basic ${firebaseIdToken}`,
    'Bearer',
    `Bearer ${firebaseIdToken} extra`,
    `Bearer ${'a'.repeat(8193)}`,
  ]) {
    assert.deepEqual(await resolveFirebaseAuthenticatedAppleProEntitlementRequest(
      authorization,
      { signedTransaction },
      deps,
    ), {
      status: 401,
      body: { active: false, error: 'auth/missing-token' },
    });
  }
  assert.equal(verificationCalls, 0);
});

test('fails closed without entitlement lookup when Firebase rejects the credential', async () => {
  let lookupCalls = 0;
  const deps = dependencies({
    firebaseAuth: {
      async verifyIdToken() {
        throw new Error('sensitive Firebase detail');
      },
    },
  });
  deps.entitlement.accountTokens = {
    async getForFirebaseUid() {
      lookupCalls += 1;
      return appAccountToken;
    },
  };

  assert.deepEqual(await resolveFirebaseAuthenticatedAppleProEntitlementRequest(
    `Bearer ${firebaseIdToken}`,
    { signedTransaction },
    deps,
  ), {
    status: 401,
    body: { active: false, error: 'auth/invalid-token' },
  });
  assert.equal(lookupCalls, 0);
});

test('fails closed when Firebase returns an invalid uid', async () => {
  for (const uid of ['', '   ', 'u'.repeat(129)]) {
    const deps = dependencies({
      firebaseAuth: {
        async verifyIdToken() {
          return { uid };
        },
      },
    });

    assert.deepEqual(await resolveFirebaseAuthenticatedAppleProEntitlementRequest(
      `Bearer ${firebaseIdToken}`,
      { signedTransaction },
      deps,
    ), {
      status: 401,
      body: { active: false, error: 'auth/invalid-token' },
    });
  }
});
